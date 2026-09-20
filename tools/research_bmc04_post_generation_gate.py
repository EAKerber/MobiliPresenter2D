#!/usr/bin/env python3
"""Fail-closed post-generation gate for BMC-04 isolated cooktop candidates.

The candidate is allowed one deterministic canvas normalization:
- crop to its alpha bounds;
- uniform scale by target support width;
- translation by target support bounds.

No anisotropic scale, rotation or projective warp is applied here.

A candidate whose generated silhouette/perspective does not already fit the
deterministic support must fail and be regenerated rather than distorted.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def nonzero_count(mask: Image.Image) -> int:
    return sum(mask.histogram()[1:])


def alpha_mass(mask: Image.Image) -> float:
    return sum(mask.getdata()) / 255.0


def normalize_candidate(candidate: Image.Image, support: Image.Image) -> tuple[Image.Image, dict]:
    candidate = candidate.convert("RGBA")
    support = support.convert("L")
    source_alpha = candidate.getchannel("A")
    source_box = source_alpha.getbbox()
    target_box = support.getbbox()
    if not source_box:
        raise ValueError("candidate alpha is empty")
    if not target_box:
        raise ValueError("target support is empty")

    sx0, sy0, sx1, sy1 = source_box
    tx0, ty0, tx1, ty1 = target_box
    source_width = sx1 - sx0
    source_height = sy1 - sy0
    target_width = tx1 - tx0
    target_height = ty1 - ty0
    if source_width <= 0 or source_height <= 0:
        raise ValueError("invalid candidate alpha bounds")

    # Canvas normalization is explicitly allowed by the generation request.
    # Width is authoritative for scale; height becomes a perspective/aspect gate.
    scale = target_width / source_width
    normalized_width = target_width
    normalized_height = max(1, round(source_height * scale))

    cropped = candidate.crop(source_box)
    normalized = cropped.resize(
        (normalized_width, normalized_height),
        Image.Resampling.LANCZOS,
    )

    # Align object center in X and front/bottom edge in Y. No rotation or warp.
    paste_x = tx0
    paste_y = ty1 - normalized_height
    canvas = Image.new("RGBA", support.size, (0, 0, 0, 0))
    canvas.alpha_composite(normalized, (paste_x, paste_y))

    return canvas, {
        "sourceAlphaBounds": list(source_box),
        "targetSupportBounds": list(target_box),
        "canvasNormalization": {
            "uniformScale": scale,
            "translationPx": [paste_x, paste_y],
            "rotationDeg": 0.0,
            "projectiveWarpApplied": False,
        },
        "normalizedObjectSizePx": [normalized_width, normalized_height],
        "targetSupportSizePx": [target_width, target_height],
        "heightRatioAfterWidthNormalization": normalized_height / target_height,
    }


def evaluate(candidate_path: Path, input_dir: Path, output_dir: Path) -> dict:
    receipt = json.loads((input_dir / "receipt.json").read_text(encoding="utf-8"))
    support = Image.open(input_dir / "footprint-max-support.png").convert("L")
    protection = Image.open(input_dir / "protection-mask.png").convert("L")
    clean = Image.open(input_dir / "clean-cooktop-free.png").convert("RGBA")
    candidate = Image.open(candidate_path).convert("RGBA")

    normalized, fit = normalize_candidate(candidate, support)
    alpha = normalized.getchannel("A")
    # The deterministic footprint is still the hard geometry boundary. A
    # two-pixel rasterization neighborhood is permitted only for resampling/
    # antialias coverage after arbitrary-canvas uniform normalization, never
    # as geometric occupancy. Opaque/mass checks below still bind the hard
    # polygon itself.
    antialias_band = support.filter(ImageFilter.MaxFilter(5))
    outside_hard = ImageChops.multiply(alpha, ImageChops.invert(support))
    outside_antialias_band = ImageChops.multiply(alpha, ImageChops.invert(antialias_band))
    protected_overlap = ImageChops.multiply(alpha, protection)

    target_box = support.getbbox()
    normalized_box = alpha.getbbox()
    budget = receipt["postFitBudget"]
    height_ratio = fit["heightRatioAfterWidthNormalization"]
    allowed_ratio_delta = float(budget["uniformScalePercent"]) / 100.0

    errors: list[str] = []
    source_alpha = candidate.getchannel("A")
    extrema = source_alpha.getextrema()
    if extrema[0] != 0:
        errors.append("candidate-background-is-not-transparent")
    if extrema[1] == 0:
        errors.append("candidate-alpha-empty")

    if abs(height_ratio - 1.0) > allowed_ratio_delta:
        errors.append("generated-object-aspect-does-not-match-target-footprint")

    outside_hard_pixels = nonzero_count(outside_hard)
    outside_hard_alpha_mass = alpha_mass(outside_hard)
    outside_hard_max_alpha = outside_hard.getextrema()[1]
    outside_band_pixels = nonzero_count(outside_antialias_band)

    # Precommitted raster tolerance: at most a two-pixel resampling band, no
    # >50% opaque coverage outside the hard polygon, and <=1% equivalent
    # opaque mass. The wider band does not authorize solid geometry.
    max_aa_mass = nonzero_count(support) * 0.01
    if outside_band_pixels:
        errors.append("generated-silhouette-escapes-antialias-band")
    if outside_hard_max_alpha > 128:
        errors.append("generated-silhouette-has-opaque-support-outside-footprint")
    if outside_hard_alpha_mass > max_aa_mass:
        errors.append("generated-silhouette-antialias-mass-exceeds-budget")

    if fit["canvasNormalization"]["projectiveWarpApplied"]:
        errors.append("projective-warp-forbidden")

    output_dir.mkdir(parents=True, exist_ok=True)
    normalized.save(output_dir / "normalized-object.png")

    composed = Image.alpha_composite(clean, normalized)
    composed.save(output_dir / "scene-preview.png")

    diff = ImageChops.difference(clean, composed)
    diff_mask = ImageChops.lighter(
        ImageChops.lighter(diff.getchannel("R"), diff.getchannel("G")),
        ImageChops.lighter(diff.getchannel("B"), diff.getchannel("A")),
    ).point(lambda value: 255 if value else 0)
    diff_outside_hard = ImageChops.multiply(diff_mask, ImageChops.invert(support))
    diff_outside_band = ImageChops.multiply(diff_mask, ImageChops.invert(antialias_band))
    diff_outside_hard_pixels = nonzero_count(diff_outside_hard)
    diff_outside_band_pixels = nonzero_count(diff_outside_band)
    if diff_outside_band_pixels:
        errors.append("composite-changed-outside-antialias-band")

    result = {
        "schemaVersion": "BMC04GeneratedCandidateGate 0.1",
        "operationId": receipt["operationId"],
        "status": "PASS" if not errors else "FAIL",
        "promotionEligible": False,
        "candidate": {
            "path": str(candidate_path),
            "sha256": sha256(candidate_path),
            "sourceSizePx": list(candidate.size),
            "sourceAlphaExtrema": list(extrema),
        },
        "normalization": fit,
        "gates": {
            "transparentBackground": extrema[0] == 0 and extrema[1] > 0,
            "aspectWithinPrecommittedBudget": abs(height_ratio - 1.0) <= allowed_ratio_delta,
            "outsideHardSupportPixels": outside_hard_pixels,
            "outsideHardSupportAlphaMass": round(outside_hard_alpha_mass, 6),
            "outsideHardSupportMaxAlpha": outside_hard_max_alpha,
            "maxAllowedAntialiasAlphaMass": round(max_aa_mass, 6),
            "outsideAntialiasBandPixels": outside_band_pixels,
            "protectedOverlapPixelsIncludingAntialias": nonzero_count(protected_overlap),
            "compositeChangedOutsideHardSupportPixels": diff_outside_hard_pixels,
            "compositeChangedOutsideAntialiasBandPixels": diff_outside_band_pixels,
            "projectiveWarpApplied": False,
        },
        "metrics": {
            "normalizedAlphaNonzeroPixels": nonzero_count(alpha),
            "normalizedAlphaMass": round(alpha_mass(alpha), 6),
            "targetSupportPixels": nonzero_count(support),
            "targetSupportBounds": list(target_box) if target_box else None,
            "normalizedAlphaBounds": list(normalized_box) if normalized_box else None,
        },
        "postFitBudget": budget,
        "errors": errors,
        "next": (
            "artifact/contact/hardware review"
            if not errors
            else "reject and regenerate; do not repair with projective distortion"
        ),
    }
    (output_dir / "gate.json").write_text(
        json.dumps(result, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    result = evaluate(args.candidate, args.input_dir, args.output_dir)
    print(json.dumps(result, sort_keys=True))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
