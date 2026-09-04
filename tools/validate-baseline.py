#!/usr/bin/env python3
"""Validate an exact materialized R0 baseline, including pixel recomposition."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "reference" / "baseline-manifest.json"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def fail(code: str, detail: str, exit_code: int = 2) -> int:
    print(json.dumps({"status": "BLOCKED" if exit_code == 2 else "FAIL", "code": code, "detail": detail}, ensure_ascii=False))
    return exit_code


def safe_path(rel: str) -> Path:
    candidate = (ROOT / rel).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError as exc:
        raise ValueError(f"path escapes repository root: {rel}") from exc
    return candidate


def main() -> int:
    if not MANIFEST.exists():
        return fail("BASELINE_MANIFEST_MISSING", str(MANIFEST))
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return fail("BASELINE_MANIFEST_INVALID", str(exc))

    if manifest.get("schemaVersion") != "BaselineManifest 0.1":
        return fail("BASELINE_SCHEMA_UNSUPPORTED", repr(manifest.get("schemaVersion")))
    if manifest.get("status") != "READY":
        reason = manifest.get("intendedSource", {}).get("reason") or "BASELINE_NOT_READY"
        return fail(reason, "Exact canonical baseline bytes have not been materialized.")

    canvas = manifest.get("canvas") or {}
    expected_size = (canvas.get("width"), canvas.get("height"))
    if expected_size != (1536, 1024) or canvas.get("origin") != [0, 0]:
        return fail("BASELINE_CANVAS_INVALID", repr(canvas))

    try:
        from PIL import Image, ImageChops
    except ImportError:
        return fail("TOOL_DEPENDENCY_MISSING", "Install tools/requirements.txt (Pillow).")

    errors: list[str] = []
    seen_paths: set[str] = set()

    files = manifest.get("files")
    if not isinstance(files, list) or not files:
        errors.append("files:missing-or-empty")
    else:
        for record in files:
            rel = record.get("path") if isinstance(record, dict) else None
            if not isinstance(rel, str) or not rel:
                errors.append(f"file-record-invalid:{record!r}")
                continue
            if rel in seen_paths:
                errors.append(f"file-duplicate:{rel}")
                continue
            seen_paths.add(rel)
            try:
                path = safe_path(rel)
            except ValueError as exc:
                errors.append(str(exc))
                continue
            if not path.is_file():
                errors.append(f"missing:{rel}")
                continue
            if path.stat().st_size != record.get("size"):
                errors.append(f"size:{rel}:{path.stat().st_size}!={record.get('size')}")
            actual_hash = sha256(path)
            if actual_hash != record.get("sha256"):
                errors.append(f"sha256:{rel}:{actual_hash}!={record.get('sha256')}")

    golden = manifest.get("golden")
    assets = manifest.get("assets")
    if not isinstance(golden, dict):
        errors.append("golden:invalid")
    if not isinstance(assets, list) or not assets:
        errors.append("assets:missing-or-empty")

    image_records = []
    if isinstance(golden, dict):
        image_records.append(("golden", golden))
    if isinstance(assets, list):
        image_records.extend(("asset", record) for record in assets if isinstance(record, dict))

    for kind, record in image_records:
        rel = record.get("path")
        if not isinstance(rel, str):
            errors.append(f"{kind}:path-invalid:{record!r}")
            continue
        try:
            path = safe_path(rel)
        except ValueError as exc:
            errors.append(str(exc))
            continue
        if not path.is_file():
            errors.append(f"{kind}-missing:{rel}")
            continue
        if sha256(path) != record.get("sha256"):
            errors.append(f"{kind}-sha256:{rel}")
        try:
            with Image.open(path) as image:
                size = image.size
                if list(size) != record.get("dimensions"):
                    errors.append(f"{kind}-dimensions:{rel}:{list(size)}!={record.get('dimensions')}")
                if record.get("canonicalCanvas") is True and size != expected_size:
                    errors.append(f"{kind}-canvas:{rel}:{size}!={expected_size}")
                if "alphaBounds" in record:
                    alpha = image.convert("RGBA").getchannel("A")
                    bbox = alpha.getbbox()
                    actual_bbox = list(bbox) if bbox else None
                    if actual_bbox != record.get("alphaBounds"):
                        errors.append(f"{kind}-alphaBounds:{rel}:{actual_bbox}!={record.get('alphaBounds')}")
        except OSError as exc:
            errors.append(f"{kind}-image-invalid:{rel}:{exc}")

    composition = manifest.get("defaultComposition")
    if not isinstance(composition, dict):
        errors.append("defaultComposition:invalid")
    elif isinstance(golden, dict):
        background_rel = composition.get("background")
        layers = composition.get("layers")
        if not isinstance(background_rel, str) or not isinstance(layers, list) or not all(isinstance(x, str) for x in layers):
            errors.append("defaultComposition:paths-invalid")
        else:
            try:
                background_path = safe_path(background_rel)
                golden_path = safe_path(golden["path"])
                with Image.open(background_path) as background_image:
                    composed = background_image.convert("RGBA")
                if composed.size != expected_size:
                    errors.append(f"composition-background-canvas:{composed.size}!={expected_size}")
                for rel in layers:
                    with Image.open(safe_path(rel)) as layer_image:
                        layer = layer_image.convert("RGBA")
                    if layer.size != expected_size:
                        errors.append(f"composition-layer-canvas:{rel}:{layer.size}!={expected_size}")
                        continue
                    composed = Image.alpha_composite(composed, layer)
                with Image.open(golden_path) as target_image:
                    target = target_image.convert("RGBA")
                difference = ImageChops.difference(composed, target)
                bbox = difference.getbbox()
                if bbox is not None:
                    errors.append(f"defaultCompositionVsGolden:pixel-difference-bounds:{list(bbox)}")
            except (KeyError, OSError, ValueError) as exc:
                errors.append(f"defaultComposition:error:{exc}")

    if errors:
        return fail("BASELINE_VALIDATION_FAILED", "; ".join(errors), 1)

    print(json.dumps({
        "status": "PASS",
        "files": len(files),
        "assets": len(assets),
        "golden": golden["path"],
        "pixelDifferenceCount": 0,
    }, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
