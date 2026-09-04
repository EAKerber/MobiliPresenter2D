#!/usr/bin/env python3
"""Compose candidate assets over R2 target variants and produce visual review sheets."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parents[1]


def safe_repo_path(relative: str) -> Path:
    candidate = (REPO_ROOT / relative).resolve()
    candidate.relative_to(REPO_ROOT.resolve())
    return candidate


def nonzero_pixel_count(image: Image.Image) -> int:
    bands = image.split()
    mask = bands[0]
    for band in bands[1:]:
        mask = ImageChops.lighter(mask, band)
    histogram = mask.histogram()
    return sum(histogram[1:])


def count_diff_outside_roi(diff: Image.Image, roi: tuple[int, int, int, int]) -> int:
    pixels = diff.load()
    x0, y0, x1, y1 = roi
    count = 0
    for y in range(diff.height):
        for x in range(diff.width):
            if x0 <= x < x1 and y0 <= y < y1:
                continue
            if any(pixels[x, y]):
                count += 1
    return count


def checkerboard(size: tuple[int, int], cell: int = 24) -> Image.Image:
    image = Image.new("RGBA", size, (235, 235, 235, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, min(x + cell - 1, size[0] - 1), min(y + cell - 1, size[1] - 1)), fill=(205, 205, 205, 255))
    return image


def fit(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    result = image.copy()
    result.thumbnail(box, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", box, (245, 245, 245, 255))
    x = (box[0] - result.width) // 2
    y = (box[1] - result.height) // 2
    canvas.alpha_composite(result, (x, y))
    return canvas


def add_label(canvas: Image.Image, xy: tuple[int, int], text: str) -> None:
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    x, y = xy
    draw.rectangle((x, y, x + 500, y + 24), fill=(255, 255, 255, 238))
    draw.text((x + 6, y + 6), text, fill=(20, 20, 20, 255), font=font)


def roi_crop(image: Image.Image, roi: tuple[int, int, int, int], padding: int = 32) -> Image.Image:
    x0, y0, x1, y1 = roi
    crop = (
        max(0, x0 - padding),
        max(0, y0 - padding),
        min(image.width, x1 + padding),
        min(image.height, y1 + padding),
    )
    return image.crop(crop)


def build_review_sheet(
    baseline: Image.Image,
    candidate: Image.Image,
    composed: Image.Image,
    roi: tuple[int, int, int, int],
) -> Image.Image:
    width = 1536
    panel_w = 512
    top_h = 342
    bottom_h = 342
    sheet = Image.new("RGBA", (width, top_h + bottom_h + 48), (250, 250, 250, 255))

    candidate_preview = checkerboard(candidate.size)
    candidate_preview = Image.alpha_composite(candidate_preview, candidate)

    top_images = [baseline, candidate_preview, composed]
    top_labels = ["target variant", "candidate alpha", "candidate composed"]
    for index, (image, label) in enumerate(zip(top_images, top_labels)):
        panel = fit(image, (panel_w, top_h))
        sheet.alpha_composite(panel, (index * panel_w, 24))
        add_label(sheet, (index * panel_w, 0), label)

    bottom_images = [roi_crop(baseline, roi), roi_crop(candidate_preview, roi), roi_crop(composed, roi)]
    bottom_labels = ["target ROI", "candidate ROI", "composed ROI"]
    y0 = top_h + 48
    for index, (image, label) in enumerate(zip(bottom_images, bottom_labels)):
        panel = fit(image, (panel_w, bottom_h))
        sheet.alpha_composite(panel, (index * panel_w, y0))
        add_label(sheet, (index * panel_w, y0 - 24), label)
    return sheet.convert("RGB")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--variant-manifest", type=Path, required=True)
    parser.add_argument("--variant-render-dir", type=Path, required=True)
    parser.add_argument("--intake-report", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    variant_manifest = json.loads(args.variant_manifest.read_text(encoding="utf-8"))
    intake = json.loads(args.intake_report.read_text(encoding="utf-8"))
    if variant_manifest.get("schemaVersion") != "VariantRenderManifest 0.1":
        raise RuntimeError("unsupported variant manifest schema")
    if intake.get("schemaVersion") != "CandidateAssetIntakeReport 0.1":
        raise RuntimeError("unsupported intake report schema")
    if intake.get("status") != "PASS":
        raise RuntimeError("candidate intake must pass before visual composition")

    cases = {case["id"]: case for case in variant_manifest["cases"]}
    expected_size = (variant_manifest["canvas"]["width"], variant_manifest["canvas"]["height"])
    args.output_dir.mkdir(parents=True, exist_ok=True)

    summary: dict[str, Any] = {
        "schemaVersion": "CandidateAssetReviewSummary 0.1",
        "sceneId": variant_manifest["sceneId"],
        "candidateCount": len(intake["candidates"]),
        "reviews": [],
    }

    for record in intake["candidates"]:
        if record.get("structuralGate") != "PASS":
            continue
        candidate_id = record["id"]
        target_variant = record["targetVariant"]
        if target_variant not in cases:
            raise RuntimeError(f"target variant vanished after intake: {target_variant}")
        baseline_path = args.variant_render_dir / f"{target_variant}.png"
        if not baseline_path.exists():
            raise RuntimeError(f"missing rendered target variant: {baseline_path}")
        with Image.open(baseline_path) as source:
            baseline = source.convert("RGBA")
        with Image.open(safe_repo_path(record["imagePath"])) as source:
            candidate = source.convert("RGBA")
        if baseline.size != expected_size or candidate.size != expected_size:
            raise RuntimeError(f"canvas mismatch during candidate review: {candidate_id}")

        composed = Image.alpha_composite(baseline, candidate)
        difference = ImageChops.difference(composed.convert("RGB"), baseline.convert("RGB"))
        bounds = difference.getbbox()
        diff_count = nonzero_pixel_count(difference) if bounds else 0
        if diff_count == 0:
            raise RuntimeError(f"candidate produces no visible change: {candidate_id}")
        roi = tuple(record["authorizedRoi"])
        outside_roi = count_diff_outside_roi(difference, roi)
        machine_gate = "PASS" if outside_roi == 0 else "FAIL"

        candidate_dir = args.output_dir / candidate_id
        candidate_dir.mkdir(parents=True, exist_ok=True)
        composed.save(candidate_dir / "composed.png")
        candidate.save(candidate_dir / "candidate.png")
        difference.save(candidate_dir / "difference.png")
        sheet = build_review_sheet(baseline, candidate, composed, roi)
        sheet.save(candidate_dir / "review-sheet.jpg", quality=92)

        human_gate = record["humanVisualGate"]
        promotion = machine_gate == "PASS" and human_gate == "APPROVED" and record.get("humanApproved") is True
        record["promotionEligible"] = promotion
        review = {
            "id": candidate_id,
            "role": record["role"],
            "targetVariant": target_variant,
            "targetVariantFingerprint": cases[target_variant]["fingerprint"],
            "imageSha256": record["imageSha256"],
            "authorizedRoi": record["authorizedRoi"],
            "differenceBounds": list(bounds) if bounds else None,
            "changedPixelCount": diff_count,
            "outsideRoiChangedPixelCount": outside_roi,
            "machineVisualGate": machine_gate,
            "humanVisualGate": human_gate,
            "visualChecklist": record["visualChecklist"],
            "resolvesDebtCodes": record["resolvesDebtCodes"],
            "promotionEligible": promotion,
            "reviewSheet": f"{candidate_id}/review-sheet.jpg",
        }
        summary["reviews"].append(review)
        (candidate_dir / "review.json").write_text(
            json.dumps(review, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    failures = [item for item in summary["reviews"] if item["machineVisualGate"] != "PASS"]
    summary["status"] = "FAIL" if failures else "PASS"
    summary["promotionEligibleCount"] = sum(1 for item in summary["reviews"] if item["promotionEligible"])
    summary_path = args.output_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": summary["status"],
        "candidateCount": summary["candidateCount"],
        "promotionEligibleCount": summary["promotionEligibleCount"],
    }, sort_keys=True))
    return 0 if summary["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
