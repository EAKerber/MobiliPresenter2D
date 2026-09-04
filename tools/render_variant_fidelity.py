#!/usr/bin/env python3
"""Render deterministic full-canvas variant fixtures from real Scene2D visibility."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops

REPO_ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = REPO_ROOT / "app"


def safe_app_path(relative: str) -> Path:
    candidate = (APP_ROOT / relative).resolve()
    candidate.relative_to(APP_ROOT.resolve())
    return candidate


def nonzero_pixel_count(image: Image.Image) -> int:
    return sum(1 for pixel in image.getdata() if any(pixel))


def render_case(base: Image.Image, case: dict[str, Any], expected_size: tuple[int, int]) -> Image.Image:
    composed = base.copy()
    for entity in case["visibleEntities"]:
        asset_path = safe_app_path(entity["asset"])
        with Image.open(asset_path) as source:
            layer = source.convert("RGBA")
        if layer.size != expected_size:
            raise RuntimeError(f"canvas mismatch: {entity['asset']} {layer.size} != {expected_size}")
        if entity.get("placeholder") and layer.getchannel("A").getbbox() is not None:
            raise RuntimeError(f"placeholder is no longer transparent; update the fidelity case: {entity['id']}")
        composed = Image.alpha_composite(composed, layer)
    return composed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != "VariantRenderManifest 0.1":
        raise RuntimeError("unsupported render manifest schema")
    expected_size = (manifest["canvas"]["width"], manifest["canvas"]["height"])
    args.output_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(safe_app_path(manifest["baseAsset"])) as source:
        base = source.convert("RGBA")
    if base.size != expected_size:
        raise RuntimeError(f"base canvas mismatch: {base.size} != {expected_size}")
    with Image.open(safe_app_path(manifest["goldenAsset"])) as source:
        golden = source.convert("RGBA")

    summary: dict[str, Any] = {
        "schemaVersion": "VariantFidelitySummary 0.1",
        "sceneId": manifest["sceneId"],
        "cases": [],
    }
    default_seen = False

    for case in manifest["cases"]:
        rendered = render_case(base, case, expected_size)
        output_path = args.output_dir / f"{case['id']}.png"
        rendered.save(output_path)
        record: dict[str, Any] = {
            "id": case["id"],
            "fingerprint": case["fingerprint"],
            "expectedVisualStatus": case["expectedVisualStatus"],
            "expectedDebtCodes": case["expectedDebtCodes"],
            "image": output_path.name,
            "humanReviewRequired": bool(case["expectedDebtCodes"]),
        }
        if case["id"] == "default":
            default_seen = True
            difference = ImageChops.difference(rendered, golden)
            difference_bounds = difference.getbbox()
            record["goldenDifferenceBounds"] = list(difference_bounds) if difference_bounds else None
            record["goldenPixelDifferenceCount"] = nonzero_pixel_count(difference) if difference_bounds else 0
            if record["goldenPixelDifferenceCount"] != 0:
                raise RuntimeError(f"default variant diverged from golden: {record}")
        summary["cases"].append(record)

    if not default_seen:
        raise RuntimeError("default fidelity case is required")
    summary_path = args.output_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS",
        "cases": len(summary["cases"]),
        "defaultPixelDifferenceCount": 0,
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
