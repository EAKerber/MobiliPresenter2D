#!/usr/bin/env python3
"""Compose role-selected candidate sets over deterministic target variants."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parents[1]


class CandidateSetError(RuntimeError):
    def __init__(self, code: str, detail: str):
        super().__init__(detail)
        self.code = code
        self.detail = detail


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def nonzero_pixel_count(image: Image.Image) -> int:
    bands = image.split()
    mask = bands[0]
    for band in bands[1:]:
        mask = ImageChops.lighter(mask, band)
    histogram = mask.histogram()
    return sum(histogram[1:])


def count_diff_outside_rois(diff: Image.Image, rois: list[tuple[int, int, int, int]]) -> int:
    pixels = diff.load()
    count = 0
    for y in range(diff.height):
        for x in range(diff.width):
            if any(x0 <= x < x1 and y0 <= y < y1 for x0, y0, x1, y1 in rois):
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
                draw.rectangle(
                    (x, y, min(x + cell - 1, size[0] - 1), min(y + cell - 1, size[1] - 1)),
                    fill=(205, 205, 205, 255),
                )
    return image


def fit(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    result = image.copy()
    result.thumbnail(box, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", box, (245, 245, 245, 255))
    canvas.alpha_composite(result, ((box[0] - result.width) // 2, (box[1] - result.height) // 2))
    return canvas


def add_label(canvas: Image.Image, xy: tuple[int, int], text: str) -> None:
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    x, y = xy
    draw.rectangle((x, y, x + 380, y + 24), fill=(255, 255, 255, 238))
    draw.text((x + 6, y + 6), text, fill=(20, 20, 20, 255), font=font)


def build_review_sheet(
    baseline: Image.Image,
    selected: list[tuple[str, Image.Image]],
    composed: Image.Image,
) -> Image.Image:
    panels = [("target variant", baseline)]
    for role, candidate in selected:
        preview = checkerboard(candidate.size)
        preview = Image.alpha_composite(preview, candidate)
        panels.append((role, preview))
    panels.append(("combined", composed))
    panel_w, panel_h = 512, 342
    sheet = Image.new("RGBA", (panel_w * len(panels), panel_h + 24), (250, 250, 250, 255))
    for index, (label, image) in enumerate(panels):
        sheet.alpha_composite(fit(image, (panel_w, panel_h)), (index * panel_w, 24))
        add_label(sheet, (index * panel_w, 0), label)
    return sheet.convert("RGB")


def validate_set_human_review(
    set_doc: dict[str, Any],
    selected_records: list[dict[str, Any]],
) -> tuple[str, bool]:
    review = set_doc.get("humanReview") or {}
    status = review.get("status")
    if status not in {"PENDING", "APPROVED", "REJECTED"}:
        raise CandidateSetError("SET_REVIEW_STATUS_INVALID", repr(status))
    if status != "APPROVED":
        return status, False

    if not review.get("reviewer") or not review.get("reviewedAt"):
        raise CandidateSetError("SET_REVIEW_INCOMPLETE", "reviewer/reviewedAt required")

    expected_hashes = review.get("candidateSha256ByRole") or {}
    actual_hashes = {record["role"]: record["imageSha256"] for record in selected_records}
    if expected_hashes != actual_hashes:
        raise CandidateSetError(
            "SET_APPROVAL_HASH_MISMATCH",
            f"{expected_hashes!r} != {actual_hashes!r}",
        )
    checklist = review.get("checklist") or {}
    missing = [item for item in set_doc.get("visualChecklist", []) if checklist.get(item) is not True]
    if missing:
        raise CandidateSetError("SET_REVIEW_INCOMPLETE", ", ".join(missing))
    return status, True


def render_sets(
    sets_doc: dict[str, Any],
    variant_manifest: dict[str, Any],
    intake: dict[str, Any],
    variant_render_dir: Path,
    output_dir: Path,
) -> dict[str, Any]:
    if sets_doc.get("schemaVersion") != "CandidateAssetSets 0.1":
        raise CandidateSetError("SET_SCHEMA_UNSUPPORTED", repr(sets_doc.get("schemaVersion")))
    if variant_manifest.get("schemaVersion") != "VariantRenderManifest 0.1":
        raise CandidateSetError("VARIANT_SCHEMA_UNSUPPORTED", repr(variant_manifest.get("schemaVersion")))
    if intake.get("schemaVersion") != "CandidateAssetIntakeReport 0.1":
        raise CandidateSetError("INTAKE_SCHEMA_UNSUPPORTED", repr(intake.get("schemaVersion")))
    if intake.get("status") != "PASS":
        raise CandidateSetError("INTAKE_NOT_PASS", repr(intake.get("status")))
    scene_id = sets_doc.get("sceneId")
    if scene_id != variant_manifest.get("sceneId"):
        raise CandidateSetError("SET_SCENE_MISMATCH", f"{scene_id!r} != {variant_manifest.get('sceneId')!r}")

    cases = {case["id"]: case for case in variant_manifest["cases"]}
    output_dir.mkdir(parents=True, exist_ok=True)
    reviews: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    hard_failure = False

    for set_doc in sets_doc.get("sets", []):
        set_id = set_doc.get("id")
        if not isinstance(set_id, str) or not set_id or set_id in seen_ids:
            reviews.append({"id": set_id, "setState": "FAIL", "errorCode": "SET_ID_INVALID_OR_DUPLICATE"})
            hard_failure = True
            continue
        seen_ids.add(set_id)
        target_variant = set_doc.get("targetVariant")
        if target_variant not in cases:
            reviews.append({"id": set_id, "setState": "FAIL", "errorCode": "SET_VARIANT_UNKNOWN"})
            hard_failure = True
            continue
        role_order = set_doc.get("roleOrder")
        if not isinstance(role_order, list) or not role_order or len(role_order) != len(set(role_order)):
            reviews.append({"id": set_id, "setState": "FAIL", "errorCode": "SET_ROLE_ORDER_INVALID"})
            hard_failure = True
            continue

        selected_records: list[dict[str, Any]] = []
        incomplete_roles: list[str] = []
        ambiguous_roles: list[str] = []
        for role in role_order:
            matches = [
                record for record in intake.get("candidates", [])
                if record.get("structuralGate") == "PASS"
                and record.get("role") == role
                and record.get("targetVariant") == target_variant
            ]
            if len(matches) == 0:
                incomplete_roles.append(role)
            elif len(matches) > 1:
                ambiguous_roles.append(role)
            else:
                selected_records.append(matches[0])

        base_review = {
            "id": set_id,
            "targetVariant": target_variant,
            "roleOrder": role_order,
            "resolvesDebtCodes": set_doc.get("resolvesDebtCodes", []),
            "visualChecklist": set_doc.get("visualChecklist", []),
            "incompleteRoles": incomplete_roles,
            "ambiguousRoles": ambiguous_roles,
            "promotionEligible": False,
        }
        if ambiguous_roles:
            base_review.update({"setState": "FAIL", "errorCode": "SET_ROLE_AMBIGUOUS"})
            reviews.append(base_review)
            hard_failure = True
            continue
        if incomplete_roles:
            base_review.update({
                "setState": "INCOMPLETE",
                "machineVisualGate": "NOT_RUN",
                "humanVisualGate": set_doc.get("humanReview", {}).get("status", "PENDING"),
            })
            reviews.append(base_review)
            continue

        baseline_path = variant_render_dir / f"{target_variant}.png"
        if not baseline_path.exists():
            base_review.update({"setState": "FAIL", "errorCode": "SET_VARIANT_RENDER_MISSING"})
            reviews.append(base_review)
            hard_failure = True
            continue

        with Image.open(baseline_path) as opened:
            baseline = opened.convert("RGBA")
        composed = baseline.copy()
        selected_images: list[tuple[str, Image.Image]] = []
        rois: list[tuple[int, int, int, int]] = []
        try:
            for record in selected_records:
                image_path = (REPO_ROOT / record["imagePath"]).resolve()
                image_path.relative_to(REPO_ROOT.resolve())
                with Image.open(image_path) as opened:
                    candidate = opened.convert("RGBA")
                if candidate.size != baseline.size:
                    raise CandidateSetError("SET_CANDIDATE_CANVAS_MISMATCH", record["id"])
                composed = Image.alpha_composite(composed, candidate)
                selected_images.append((record["role"], candidate))
                rois.append(tuple(record["authorizedRoi"]))

            difference = ImageChops.difference(composed.convert("RGB"), baseline.convert("RGB"))
            bounds = difference.getbbox()
            changed = nonzero_pixel_count(difference) if bounds else 0
            if changed == 0:
                raise CandidateSetError("SET_NO_VISIBLE_CHANGE", set_id)
            outside = count_diff_outside_rois(difference, rois)
            machine_gate = "PASS" if outside == 0 else "FAIL"
            human_status, human_approved = validate_set_human_review(set_doc, selected_records)
            candidate_promotion = all(record.get("promotionEligible") is True for record in selected_records)
            promotion = machine_gate == "PASS" and human_approved and candidate_promotion

            set_dir = output_dir / set_id
            set_dir.mkdir(parents=True, exist_ok=True)
            composed.save(set_dir / "combined.png")
            difference.save(set_dir / "difference.png")
            build_review_sheet(baseline, selected_images, composed).save(set_dir / "review-sheet.jpg", quality=92)

            base_review.update({
                "setState": "COMPLETE",
                "targetVariantFingerprint": cases[target_variant]["fingerprint"],
                "selectedCandidates": [
                    {"id": record["id"], "role": record["role"], "imageSha256": record["imageSha256"]}
                    for record in selected_records
                ],
                "differenceBounds": list(bounds) if bounds else None,
                "changedPixelCount": changed,
                "outsideAuthorizedRoisChangedPixelCount": outside,
                "machineVisualGate": machine_gate,
                "humanVisualGate": human_status,
                "humanApproved": human_approved,
                "allCandidatesPromotionEligible": candidate_promotion,
                "promotionEligible": promotion,
                "reviewSheet": f"{set_id}/review-sheet.jpg",
            })
            if machine_gate != "PASS":
                hard_failure = True
        except (OSError, ValueError, KeyError, CandidateSetError) as exc:
            code = exc.code if isinstance(exc, CandidateSetError) else "SET_RENDER_ERROR"
            base_review.update({"setState": "FAIL", "errorCode": code, "detail": str(exc)})
            hard_failure = True
        reviews.append(base_review)

    complete = sum(1 for item in reviews if item.get("setState") == "COMPLETE")
    incomplete = sum(1 for item in reviews if item.get("setState") == "INCOMPLETE")
    summary = {
        "schemaVersion": "CandidateAssetSetReviewSummary 0.1",
        "sceneId": scene_id,
        "status": "FAIL" if hard_failure else "PASS",
        "code": "SETS_INCOMPLETE" if not hard_failure and incomplete else "SETS_REVIEWED",
        "setCount": len(reviews),
        "completeSetCount": complete,
        "incompleteSetCount": incomplete,
        "promotionEligibleCount": sum(1 for item in reviews if item.get("promotionEligible") is True),
        "reviews": reviews,
    }
    (output_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return summary


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sets", type=Path, required=True)
    parser.add_argument("--variant-manifest", type=Path, required=True)
    parser.add_argument("--variant-render-dir", type=Path, required=True)
    parser.add_argument("--intake-report", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        summary = render_sets(
            load_json(args.sets),
            load_json(args.variant_manifest),
            load_json(args.intake_report),
            args.variant_render_dir,
            args.output_dir,
        )
    except (OSError, json.JSONDecodeError, CandidateSetError) as exc:
        code = exc.code if isinstance(exc, CandidateSetError) else "SET_GATE_ERROR"
        print(json.dumps({"status": "FAIL", "code": code, "detail": str(exc)}, ensure_ascii=False))
        return 1
    print(json.dumps({
        "status": summary["status"],
        "code": summary["code"],
        "setCount": summary["setCount"],
        "completeSetCount": summary["completeSetCount"],
        "promotionEligibleCount": summary["promotionEligibleCount"],
    }, sort_keys=True))
    return 0 if summary["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
