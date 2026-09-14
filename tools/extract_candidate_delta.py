#!/usr/bin/env python3
"""Extract a deterministic full-canvas RGBA candidate from an edited canonical frame."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops

REPO_ROOT = Path(__file__).resolve().parents[1]


class DeltaExtractionError(RuntimeError):
    def __init__(self, code: str, detail: str):
        super().__init__(detail)
        self.code = code
        self.detail = detail


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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


def extract_delta(source: Image.Image, edited: Image.Image, roi: tuple[int, int, int, int]) -> tuple[Image.Image, dict[str, Any], Image.Image]:
    if source.size != edited.size:
        raise DeltaExtractionError("AUTHORING_FRAME_SIZE_MISMATCH", f"{source.size} != {edited.size}")

    source_rgba = source.convert("RGBA")
    edited_rgba = edited.convert("RGBA")
    source_rgb = source_rgba.convert("RGB")
    edited_rgb = edited_rgba.convert("RGB")
    difference = ImageChops.difference(edited_rgb, source_rgb)
    bounds = difference.getbbox()
    if bounds is None:
        raise DeltaExtractionError("DELTA_EMPTY", "edited frame contains no visible RGB change")

    changed = nonzero_pixel_count(difference)
    outside = count_diff_outside_roi(difference, roi)
    if outside != 0:
        raise DeltaExtractionError("DELTA_OUTSIDE_AUTHORIZED_ROI", f"{outside} changed pixels outside ROI {roi}; diffBounds={bounds}")

    candidate = Image.new("RGBA", source.size, (0, 0, 0, 0))
    candidate_pixels = candidate.load()
    edited_pixels = edited_rgb.load()
    diff_pixels = difference.load()
    x0, y0, x1, y1 = roi
    for y in range(y0, y1):
        for x in range(x0, x1):
            if any(diff_pixels[x, y]):
                r, g, b = edited_pixels[x, y]
                candidate_pixels[x, y] = (r, g, b, 255)

    alpha_bounds = candidate.getchannel("A").getbbox()
    if alpha_bounds is None:
        raise DeltaExtractionError("CANDIDATE_ALPHA_EMPTY", "delta extraction produced no candidate alpha")

    recomposed = Image.alpha_composite(source_rgba, candidate)
    roundtrip = ImageChops.difference(recomposed.convert("RGB"), edited_rgb)
    roundtrip_bounds = roundtrip.getbbox()
    roundtrip_mismatch = nonzero_pixel_count(roundtrip) if roundtrip_bounds else 0
    if roundtrip_mismatch != 0:
        raise DeltaExtractionError("DELTA_ROUNDTRIP_MISMATCH", f"{roundtrip_mismatch} pixels differ after candidate recomposition")

    report = {
        "schemaVersion": "CandidateDeltaExtractionReport 0.1",
        "status": "PASS",
        "canvas": {"width": source.size[0], "height": source.size[1]},
        "authorizedRoi": list(roi),
        "differenceBounds": list(bounds),
        "candidateAlphaBounds": list(alpha_bounds),
        "changedPixelCount": changed,
        "outsideAuthorizedRoiChangedPixelCount": outside,
        "roundtripMismatchPixelCount": roundtrip_mismatch,
        "deltaMode": "opaque-replacement-pixels"
    }
    return candidate, report, difference


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def find_by_id(items: list[dict[str, Any]], key: str, value: str, code: str) -> dict[str, Any]:
    matches = [item for item in items if item.get(key) == value]
    if len(matches) != 1:
        raise DeltaExtractionError(code, f"expected exactly one {key}={value!r}; got {len(matches)}")
    return matches[0]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-frame", type=Path, required=True)
    parser.add_argument("--edited-frame", type=Path, required=True)
    parser.add_argument("--role", required=True)
    parser.add_argument("--target-variant", required=True)
    parser.add_argument("--candidate-id", required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--roles", type=Path, default=REPO_ROOT / "review-assets" / "roles.json")
    parser.add_argument("--authoring-contracts", type=Path, default=REPO_ROOT / "review-assets" / "authoring-contracts.json")
    parser.add_argument("--source-reference", action="append", default=[])
    args = parser.parse_args()

    try:
        roles_doc = load_json(args.roles)
        contracts_doc = load_json(args.authoring_contracts)
        role = find_by_id(roles_doc["roles"], "id", args.role, "AUTHORING_ROLE_UNKNOWN_OR_DUPLICATE")
        contract_id = role.get("authoringContractId")
        if not contract_id:
            raise DeltaExtractionError("AUTHORING_CONTRACT_NOT_BOUND", args.role)
        contract = find_by_id(contracts_doc["contracts"], "id", contract_id, "AUTHORING_CONTRACT_UNKNOWN_OR_DUPLICATE")
        if contract.get("role") != args.role or contract.get("targetVariant") != args.target_variant:
            raise DeltaExtractionError("AUTHORING_CONTRACT_SCOPE_MISMATCH", contract_id)
        if contract.get("mode") != "edit-existing-canonical-frame" or contract.get("deltaExtractionRequired") is not True:
            raise DeltaExtractionError("AUTHORING_CONTRACT_MODE_INVALID", contract_id)

        required_refs = contract.get("requiredSourceReferences") or []
        missing_refs = [item for item in required_refs if item not in args.source_reference]
        if missing_refs:
            raise DeltaExtractionError("AUTHORING_SOURCE_REFERENCE_MISSING", ", ".join(missing_refs))

        expected_size = (roles_doc["canvas"]["width"], roles_doc["canvas"]["height"])
        with Image.open(args.source_frame) as opened:
            source = opened.convert("RGBA")
        with Image.open(args.edited_frame) as opened:
            edited = opened.convert("RGBA")
        if source.size != expected_size or edited.size != expected_size:
            raise DeltaExtractionError("AUTHORING_CANVAS_MISMATCH", f"source={source.size}, edited={edited.size}, expected={expected_size}")

        candidate, report, difference = extract_delta(source, edited, tuple(role["authorizedRoi"]))
        args.output_dir.mkdir(parents=True, exist_ok=True)
        candidate_path = args.output_dir / "candidate.png"
        difference_path = args.output_dir / "difference.png"
        report_path = args.output_dir / "extraction-report.json"
        metadata_path = args.output_dir / "candidate.json"
        candidate.save(candidate_path)
        difference.save(difference_path)

        source_sha = sha256_file(args.source_frame)
        edited_sha = sha256_file(args.edited_frame)
        candidate_sha = sha256_file(candidate_path)
        report.update({
            "role": args.role,
            "targetVariant": args.target_variant,
            "authoringContractId": contract_id,
            "sourceFrameSha256": source_sha,
            "editedFrameSha256": edited_sha,
            "candidateSha256": candidate_sha
        })
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")

        try:
            image_rel = candidate_path.resolve().relative_to(REPO_ROOT.resolve()).as_posix()
            report_rel = report_path.resolve().relative_to(REPO_ROOT.resolve()).as_posix()
        except ValueError as exc:
            raise DeltaExtractionError("AUTHORING_OUTPUT_OUTSIDE_REPOSITORY", "output-dir must be inside repository when emitting candidate metadata") from exc

        metadata = {
            "schemaVersion": "CandidateAsset 0.1",
            "id": args.candidate_id,
            "role": args.role,
            "targetScene": roles_doc["sceneId"],
            "targetVariant": args.target_variant,
            "imagePath": image_rel,
            "expectedImageSha256": candidate_sha,
            "status": "REVIEW",
            "provenance": {
                "method": "image-edit",
                "authoringContractId": contract_id,
                "sourceReferences": args.source_reference,
                "sourceFrameSha256": source_sha,
                "editedFrameSha256": edited_sha,
                "deltaExtractionRequired": true,
                "extractionReport": report_rel
            },
            "humanReview": {
                "status": "PENDING",
                "reviewer": null,
                "reviewedAt": null,
                "checklist": {}
            }
        }
        metadata_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps({
            "status": "PASS",
            "candidateId": args.candidate_id,
            "candidateSha256": candidate_sha,
            "changedPixelCount": report["changedPixelCount"],
            "outsideAuthorizedRoiChangedPixelCount": 0,
            "roundtripMismatchPixelCount": 0
        }, sort_keys=True))
        return 0
    except (OSError, KeyError, json.JSONDecodeError, DeltaExtractionError) as exc:
        code = exc.code if isinstance(exc, DeltaExtractionError) else "AUTHORING_EXTRACTION_ERROR"
        detail = exc.detail if isinstance(exc, DeltaExtractionError) else str(exc)
        print(json.dumps({"status": "FAIL", "code": code, "detail": detail}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
