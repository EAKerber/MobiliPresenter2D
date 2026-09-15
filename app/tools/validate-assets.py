#!/usr/bin/env python3
"""Validate the current deterministic 2D asset set and default golden.

Historical reconstruction checks against pre-R4 combined source images are intentionally
not authoritative here: accepted R4/R5A edits remove contaminated alpha from those
sources. Those edit-specific invariants live in validate-r5a-pixelperfect.py.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageChops
import hashlib, json

ROOT = Path(__file__).resolve().parent.parent
TECH = ROOT / "data" / "technical-data.json"
REPORT = ROOT / "reports" / "current-asset-validation.json"
COMPOSED = ROOT / "reports" / "default-composed.png"
FRONT_MASK_HOSTS = {
    "01": "01_modulo_lavanderia.png",
    "02": "02_inferior_fogao.png",
    "03": "03_inferior_pia.png",
    "04": "04_lateral_geladeira.png",
    "05": "05_aereo_fogao.png",
    "06": "06_aereo_pia.png",
    "07": "07_aereo_geladeira.png",
}

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def image_meta(path: Path):
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        bbox = rgba.getchannel("A").getbbox()
        return image.size, list(bbox) if bbox else None

def binary_support(alpha: Image.Image) -> Image.Image:
    return alpha.point(lambda value: 255 if value else 0)

def front_mask_host_errors() -> list[dict[str, object]]:
    errors: list[dict[str, object]] = []
    for key, host_name in FRONT_MASK_HOSTS.items():
        mask_path = ROOT / f"assets/kitchen/masks/{key}.png"
        host_path = ROOT / "assets/kitchen/layers" / host_name
        with Image.open(mask_path) as mask_image, Image.open(host_path) as host_image:
            mask = binary_support(mask_image.convert("RGBA").getchannel("A"))
            host = binary_support(host_image.convert("RGBA").getchannel("A"))
        outside = ImageChops.multiply(mask, ImageChops.invert(host))
        bbox = outside.getbbox()
        if bbox is None:
            continue
        pixels = sum(1 for value in outside.get_flattened_data() if value)
        errors.append({
            "path": str(mask_path.relative_to(ROOT)),
            "host": str(host_path.relative_to(ROOT)),
            "error": "mask-outside-host-alpha",
            "pixels": pixels,
            "bounds": list(bbox),
        })
    return errors

FRONT_SEAM_BRIDGE = {
    "mask": "assets/kitchen/masks/04-06-seam-bridge.png",
    "base": "assets/kitchen/masks/04.png",
    "composite": "assets/kitchen/masks/04-with-06-seam.png",
    "hosts": (
        "assets/kitchen/layers/04_lateral_geladeira.png",
        "assets/kitchen/layers/06_aereo_pia.png",
    ),
    "pixels": 23,
    "bounds": [1209, 50, 1213, 60],
}

def front_seam_bridge_errors() -> list[dict[str, object]]:
    errors: list[dict[str, object]] = []
    mask_path = ROOT / FRONT_SEAM_BRIDGE["mask"]
    with Image.open(mask_path) as mask_image:
        mask = binary_support(mask_image.convert("RGBA").getchannel("A"))
    support_pixels = sum(1 for value in mask.get_flattened_data() if value)
    bounds = list(mask.getbbox()) if mask.getbbox() else None
    if support_pixels != FRONT_SEAM_BRIDGE["pixels"] or bounds != FRONT_SEAM_BRIDGE["bounds"]:
        errors.append({
            "path": FRONT_SEAM_BRIDGE["mask"],
            "error": "finish-bridge-support-mismatch",
            "pixels": support_pixels,
            "bounds": bounds,
            "expectedPixels": FRONT_SEAM_BRIDGE["pixels"],
            "expectedBounds": FRONT_SEAM_BRIDGE["bounds"],
        })
    for host_rel in FRONT_SEAM_BRIDGE["hosts"]:
        with Image.open(ROOT / host_rel) as host_image:
            host = binary_support(host_image.convert("RGBA").getchannel("A"))
        overlap = ImageChops.multiply(mask, host)
        overlap_pixels = sum(1 for value in overlap.get_flattened_data() if value)
        if overlap_pixels:
            errors.append({
                "path": FRONT_SEAM_BRIDGE["mask"],
                "host": host_rel,
                "error": "finish-bridge-overlaps-host-alpha",
                "pixels": overlap_pixels,
                "bounds": list(overlap.getbbox()),
            })
    with Image.open(ROOT / FRONT_SEAM_BRIDGE["base"]) as base_image, Image.open(ROOT / FRONT_SEAM_BRIDGE["composite"]) as composite_image:
        base_alpha = base_image.convert("RGBA").getchannel("A")
        composite_alpha = composite_image.convert("RGBA").getchannel("A")
    with Image.open(mask_path) as seam_image:
        seam_alpha = seam_image.convert("RGBA").getchannel("A")
    expected_alpha = ImageChops.lighter(base_alpha, seam_alpha)
    composite_diff = ImageChops.difference(expected_alpha, composite_alpha)
    if composite_diff.getbbox():
        errors.append({
            "path": FRONT_SEAM_BRIDGE["composite"],
            "error": "finish-bridge-composite-mismatch",
            "bounds": list(composite_diff.getbbox()),
        })
    return errors

def main() -> int:
    data = json.loads(TECH.read_text(encoding="utf-8"))
    canvas = (data["canvas"]["width"], data["canvas"]["height"])
    errors = front_mask_host_errors() + front_seam_bridge_errors()
    files = {}
    for rel, expected in data["files"].items():
        path = ROOT / rel
        if not path.is_file():
            errors.append({"path": rel, "error": "missing"})
            continue
        size, bbox = image_meta(path)
        digest = sha(path)
        files[rel] = {"sha256": digest, "size": list(size), "alphaBounds": bbox}
        if size != canvas: errors.append({"path": rel, "error": "canvas", "actual": list(size), "expected": list(canvas)})
        if digest != expected["sha256"]: errors.append({"path": rel, "error": "sha256", "actual": digest, "expected": expected["sha256"]})
        if bbox != expected["alphaBounds"]: errors.append({"path": rel, "error": "alphaBounds", "actual": bbox, "expected": expected["alphaBounds"]})

    composed = Image.open(ROOT / "assets/kitchen/base.png").convert("RGBA")
    for rel in data["compositionOrder"]:
        layer = Image.open(ROOT / rel).convert("RGBA")
        if layer.size != canvas:
            errors.append({"path": rel, "error": "composition-canvas", "actual": list(layer.size), "expected": list(canvas)})
            continue
        composed = Image.alpha_composite(composed, layer)
    golden = Image.open(ROOT / "assets/kitchen/composicao-completa.png").convert("RGBA")
    different = sum(1 for a, b in zip(composed.get_flattened_data(), golden.get_flattened_data()) if a != b)
    if different: errors.append({"error": "golden-difference", "differentPixels": different})
    COMPOSED.parent.mkdir(parents=True, exist_ok=True)
    composed.save(COMPOSED)
    report = {
        "schemaVersion": "FidelityReport2D 2.0",
        "baselineId": data["baselineId"],
        "passed": not errors,
        "canvas": list(canvas),
        "assetCount": len(files),
        "pixelDifferenceCount": different,
        "errors": errors,
        "files": files,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": report["passed"], "assetCount": len(files), "pixelDifferenceCount": different, "errorCount": len(errors)}, ensure_ascii=False))
    return 0 if report["passed"] else 1

if __name__ == "__main__": raise SystemExit(main())
