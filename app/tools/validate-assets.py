#!/usr/bin/env python3
"""Valida o baseline fotográfico e recompõe o estado inicial da cena."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops


PROJECT_ROOT = Path(__file__).resolve().parent.parent
TECHNICAL_DATA = PROJECT_ROOT / "data" / "technical-data.json"
REPORT_PATH = PROJECT_ROOT / "reports" / "module02-alpha-fix-validation.json"
COMPOSED_PATH = PROJECT_ROOT / "reports" / "default-composed.png"
MODULE02_PATH = PROJECT_ROOT / "tools" / "sources" / "02_inferior_fogao-combined-v3.png"
MODULE02_ALPHA_PATH = PROJECT_ROOT / "tools" / "masks" / "module02-alpha-approved-v3.png"
STONE_SPLITS = (
    (
        PROJECT_ROOT / "assets" / "kitchen" / "layers" / "02_inferior_fogao.png",
        PROJECT_ROOT / "assets" / "kitchen" / "layers" / "stone-02-cozinha.png",
        PROJECT_ROOT / "tools" / "sources" / "02_inferior_fogao-combined-v3.png",
    ),
    (
        PROJECT_ROOT / "assets" / "kitchen" / "layers" / "03_inferior_pia.png",
        PROJECT_ROOT / "assets" / "kitchen" / "layers" / "stone-03-pia.png",
        PROJECT_ROOT / "tools" / "sources" / "03_inferior_pia-combined-v1.png",
    ),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def alpha_bounds(image: Image.Image) -> list[int] | None:
    bounds = image.convert("RGBA").getchannel("A").getbbox()
    return list(bounds) if bounds else None


def different_pixel_count(left: Image.Image, right: Image.Image) -> int:
    left_rgba = left.convert("RGBA")
    right_rgba = right.convert("RGBA")
    return sum(
        1
        for left_px, right_px in zip(left_rgba.get_flattened_data(), right_rgba.get_flattened_data())
        if left_px != right_px
    )


def different_visible_pixel_count(left: Image.Image, right: Image.Image) -> int:
    """Ignora RGB oculto quando ambos os pixels são totalmente transparentes."""
    left_rgba = left.convert("RGBA")
    right_rgba = right.convert("RGBA")
    return sum(
        1
        for left_px, right_px in zip(left_rgba.get_flattened_data(), right_rgba.get_flattened_data())
        if not (left_px[3] == 0 and right_px[3] == 0) and left_px != right_px
    )


def main() -> int:
    baseline = json.loads(TECHNICAL_DATA.read_text(encoding="utf-8"))
    canvas = (baseline["canvas"]["width"], baseline["canvas"]["height"])
    errors: list[dict[str, object]] = []
    files: dict[str, dict[str, object]] = {}

    for relative_path, expected in baseline["files"].items():
        path = PROJECT_ROOT / relative_path
        if not path.is_file():
            errors.append({"path": relative_path, "error": "missing"})
            continue

        with Image.open(path) as image:
            actual_size = image.size
            actual_bounds = alpha_bounds(image)
        actual_hash = sha256(path)
        files[relative_path] = {
            "sha256": actual_hash,
            "size": list(actual_size),
            "alphaBounds": actual_bounds,
        }

        if actual_size != canvas:
            errors.append({"path": relative_path, "error": "canvas", "actual": list(actual_size), "expected": list(canvas)})
        if actual_hash != expected["sha256"]:
            errors.append({"path": relative_path, "error": "sha256", "actual": actual_hash, "expected": expected["sha256"]})
        if actual_bounds != expected["alphaBounds"]:
            errors.append({"path": relative_path, "error": "alphaBounds", "actual": actual_bounds, "expected": expected["alphaBounds"]})

    base = Image.open(PROJECT_ROOT / "assets/kitchen/base.png").convert("RGBA")
    composed = base.copy()
    for relative_path in baseline["compositionOrder"]:
        layer_path = PROJECT_ROOT / relative_path
        with Image.open(layer_path) as layer:
            composed = Image.alpha_composite(composed, layer.convert("RGBA"))

    golden = Image.open(PROJECT_ROOT / "assets/kitchen/composicao-completa.png").convert("RGBA")
    pixel_difference_count = different_pixel_count(composed, golden)
    difference_bounds = ImageChops.difference(composed, golden).getbbox()
    if pixel_difference_count:
        errors.append({"error": "golden-difference", "differentPixels": pixel_difference_count})

    module02_alpha = Image.open(MODULE02_PATH).convert("RGBA").getchannel("A")
    approved_module02_alpha = Image.open(MODULE02_ALPHA_PATH).convert("L")
    module02_alpha_difference = ImageChops.difference(module02_alpha, approved_module02_alpha)
    module02_alpha_difference_bounds = module02_alpha_difference.getbbox()
    if module02_alpha_difference_bounds:
        errors.append(
            {
                "error": "module02-alpha-difference",
                "differenceBounds": list(module02_alpha_difference_bounds),
            }
        )

    stone_split_checks = []
    for module_path, stone_path, source_path in STONE_SPLITS:
        with Image.open(module_path) as opened:
            module = opened.convert("RGBA")
        with Image.open(stone_path) as opened:
            stone = opened.convert("RGBA")
        with Image.open(source_path) as opened:
            source = opened.convert("RGBA")
        reconstructed = Image.alpha_composite(module, stone)
        difference = ImageChops.difference(reconstructed, source)
        difference_bounds = difference.getbbox()
        different_pixels = different_visible_pixel_count(reconstructed, source)
        check = {
            "module": str(module_path.relative_to(PROJECT_ROOT)),
            "stone": str(stone_path.relative_to(PROJECT_ROOT)),
            "source": str(source_path.relative_to(PROJECT_ROOT)),
            "differentPixels": different_pixels,
            "differenceBounds": list(difference_bounds) if difference_bounds else None,
        }
        stone_split_checks.append(check)
        if different_pixels:
            errors.append({"error": "stone-split-difference", **check})

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    composed.save(COMPOSED_PATH)
    report = {
        "schemaVersion": "FidelityReport2D 1.0",
        "baselineId": baseline["baselineId"],
        "passed": not errors,
        "canvas": list(canvas),
        "assetCount": len(files),
        "pixelDifferenceCount": pixel_difference_count,
        "differenceBounds": list(difference_bounds) if difference_bounds else None,
        "module02AlphaDifferenceBounds": (
            list(module02_alpha_difference_bounds) if module02_alpha_difference_bounds else None
        ),
        "stoneSplitChecks": stone_split_checks,
        "errors": errors,
        "files": files,
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ["passed", "assetCount", "pixelDifferenceCount", "differenceBounds"]}, ensure_ascii=False))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
