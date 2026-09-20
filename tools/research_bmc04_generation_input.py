#!/usr/bin/env python3
"""Reproducibly materialize BMC-04 cooktop generation inputs.

No image generation happens here. The tool prepares a clean canonical crop,
hard target footprint/protection masks, the current object reference, the
existing generated donor and a hash receipt.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw

try:
    from tools.render_variant_fidelity import render_case, safe_app_path
    from tools.materialize_stone_cleanplate import masks
except ModuleNotFoundError:
    from render_variant_fidelity import render_case, safe_app_path
    from materialize_stone_cleanplate import masks

ROOT = Path(__file__).resolve().parents[1]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def crop_points(points, crop):
    x0, y0, _, _ = crop
    return [(float(x) - x0, float(y) - y0) for x, y in points]


def make_polygon_mask(size, points):
    out = Image.new("L", size, 0)
    ImageDraw.Draw(out).polygon([(round(x), round(y)) for x, y in points], fill=255)
    return out


def materialize(config: dict, manifest: dict, output_dir: Path) -> dict:
    size = (manifest["canvas"]["width"], manifest["canvas"]["height"])
    with Image.open(safe_app_path(manifest["baseAsset"])) as image:
        base = image.convert("RGBA")

    case = next(row for row in manifest["cases"] if row["id"] == config["targetVariant"])
    source = render_case(base, case, size)

    clean_cfg = json.loads((ROOT / config["stoneCleanplateConfig"]).read_text(encoding="utf-8"))
    part_masks, _ = masks(clean_cfg)
    pans = part_masks["pans-02"]
    cleanplate = Image.open(ROOT / config["stoneCleanplateComposed"]).convert("RGBA")
    without_pans = Image.composite(cleanplate, source, pans)
    removal = Image.open(ROOT / config["cooktopRemovalMask"]).convert("L")
    backing = Image.open(ROOT / config["stoneBacking"]).convert("RGBA")
    cooktop_free = Image.composite(backing, without_pans, removal)

    footprint = json.loads((ROOT / config["footprintReport"]).read_text(encoding="utf-8"))
    q = footprint["targetQuadPx"]
    quad_global = [
        tuple(q["frontLeft"]),
        tuple(q["frontRight"]),
        tuple(q["backRight"]),
        tuple(q["backLeft"]),
    ]

    crop = tuple(map(int, config["crop"]))
    x0, y0, x1, y1 = crop
    crop_size = (x1 - x0, y1 - y0)
    quad_crop = crop_points(quad_global, crop)
    footprint_mask = make_polygon_mask(crop_size, quad_crop)
    protection_mask = footprint_mask.point(lambda value: 0 if value else 255)

    clean_crop = cooktop_free.crop(crop)
    reference_crop = source.crop(crop)

    guide = clean_crop.copy()
    overlay = Image.new("RGBA", crop_size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    fill_alpha = int(config["guide"]["footprintFillAlpha"])
    line_width = int(config["guide"]["lineWidthPx"])
    radius = int(config["guide"]["anchorRadiusPx"])
    draw.polygon(quad_crop, fill=(255, 255, 255, fill_alpha))
    draw.line(quad_crop + [quad_crop[0]], fill=(255, 0, 0, 255), width=line_width)
    for label, (x, y) in zip(("FL", "FR", "BR", "BL"), quad_crop):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(0, 255, 0, 255))
        draw.text((x + radius + 2, y - radius - 1), label, fill=(0, 0, 0, 255))
    guide = Image.alpha_composite(guide, overlay)

    output_dir.mkdir(parents=True, exist_ok=True)
    outputs = {
        "clean-cooktop-free.png": clean_crop,
        "reference-current.png": reference_crop,
        "footprint-guide.png": guide,
        "footprint-max-support.png": footprint_mask,
        "protection-mask.png": protection_mask,
    }
    for name, image in outputs.items():
        image.save(output_dir / name, optimize=True)

    donor_target = output_dir / "existing-generated-donor.png"
    shutil.copyfile(ROOT / config["existingGeneratedDonor"], donor_target)

    files = {}
    for path in sorted(output_dir.iterdir()):
        if path.is_file():
            files[path.name] = {
                "sha256": sha256(path),
                "sizeBytes": path.stat().st_size,
            }

    receipt = {
        "schemaVersion": "BMC04GenerationInputReceipt 0.2",
        "sceneId": config["sceneId"],
        "operationId": config["operationId"],
        "status": "READY_FOR_BOUNDED_GENERATION",
        "promotionEligible": False,
        "generationExecuted": False,
        "cropGlobal": list(crop),
        "targetFootprintGlobalPx": {
            "frontLeft": list(quad_global[0]),
            "frontRight": list(quad_global[1]),
            "backRight": list(quad_global[2]),
            "backLeft": list(quad_global[3]),
        },
        "targetFootprintCropPx": {
            "frontLeft": list(quad_crop[0]),
            "frontRight": list(quad_crop[1]),
            "backRight": list(quad_crop[2]),
            "backLeft": list(quad_crop[3]),
        },
        "footprintPixels": sum(1 for value in footprint_mask.getdata() if value),
        "files": files,
        "postFitBudget": config["postFitBudget"],
        "perceptualTarget": config["perceptualTarget"],
        "generationContract": {
            "cleanReference": "clean-cooktop-free.png",
            "currentReference": "reference-current.png",
            "existingGeneratedDonor": "existing-generated-donor.png",
            "hardGuide": "footprint-guide.png",
            "maximumSupportMask": "footprint-max-support.png",
            "protectionMask": "protection-mask.png",
            "desiredOutput": "isolated transparent cooktop already matching target footprint/perspective",
            "forbidden": "scene/background/stone/cabinet edits",
            "largePostGenerationWarpAllowed": False,
            "directGeneratedPromotionAllowed": False
        },
    }
    receipt_path = output_dir / "receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--variant-manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    config = json.loads(args.config.read_text(encoding="utf-8"))
    manifest = json.loads(args.variant_manifest.read_text(encoding="utf-8"))
    receipt = materialize(config, manifest, args.output_dir)
    print(json.dumps(receipt, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
