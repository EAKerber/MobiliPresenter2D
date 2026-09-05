#!/usr/bin/env python3
"""Validate quarantined photographic candidate assets without promoting them."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CANDIDATE_ROOT = REPO_ROOT / "review-assets" / "candidates"


class CandidateValidationError(RuntimeError):
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


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def contained(inner: tuple[int, int, int, int], outer: tuple[int, int, int, int]) -> bool:
    return inner[0] >= outer[0] and inner[1] >= outer[1] and inner[2] <= outer[2] and inner[3] <= outer[3]


def count_alpha_outside_roi(alpha: Image.Image, roi: tuple[int, int, int, int]) -> int:
    width, height = alpha.size
    pixels = alpha.load()
    x0, y0, x1, y1 = roi
    count = 0
    for y in range(height):
        for x in range(width):
            if x0 <= x < x1 and y0 <= y < y1:
                continue
            if pixels[x, y] != 0:
                count += 1
    return count


def find_metadata(candidate_root: Path) -> list[Path]:
    return sorted(
        path
        for path in candidate_root.rglob("*.json")
        if path.is_file()
        and not path.name.startswith("_")
        and path.name != "extraction-report.json"
    )


def validate_human_review(metadata: dict[str, Any], role: dict[str, Any], actual_sha: str) -> tuple[str, bool, list[str]]:
    review = metadata.get("humanReview") or {}
    status = review.get("status")
    if status not in {"PENDING", "APPROVED", "REJECTED"}:
        raise CandidateValidationError("HUMAN_REVIEW_STATUS_INVALID", repr(status))

    candidate_status = metadata.get("status")
    valid_pairs = {
        "REVIEW": {"PENDING"},
        "APPROVED": {"APPROVED"},
        "REJECTED": {"REJECTED"},
    }
    if candidate_status not in valid_pairs or status not in valid_pairs[candidate_status]:
        raise CandidateValidationError(
            "CANDIDATE_REVIEW_STATE_MISMATCH",
            f"candidate status {candidate_status!r} is incompatible with human review {status!r}",
        )

    missing: list[str] = []
    if status == "APPROVED":
        bound_sha = metadata.get("expectedImageSha256")
        if bound_sha != actual_sha:
            raise CandidateValidationError(
                "APPROVAL_HASH_MISMATCH",
                f"approved metadata must bind exact image SHA {actual_sha}; got {bound_sha!r}",
            )
        if not review.get("reviewer"):
            missing.append("reviewer")
        if not review.get("reviewedAt"):
            missing.append("reviewedAt")
        checklist = review.get("checklist") or {}
        for item in role.get("visualChecklist", []):
            if checklist.get(item) is not True:
                missing.append(f"checklist:{item}")
        if missing:
            raise CandidateValidationError("HUMAN_REVIEW_INCOMPLETE", ", ".join(missing))
        return status, True, []
    return status, False, missing


def validate_candidate(
    metadata_path: Path,
    roles_doc: dict[str, Any],
    cases_doc: dict[str, Any],
    candidate_root: Path,
) -> dict[str, Any]:
    metadata = load_json(metadata_path)
    if metadata.get("schemaVersion") != "CandidateAsset 0.1":
        raise CandidateValidationError("CANDIDATE_SCHEMA_UNSUPPORTED", repr(metadata.get("schemaVersion")))

    candidate_id = metadata.get("id")
    if not isinstance(candidate_id, str) or not candidate_id.strip():
        raise CandidateValidationError("CANDIDATE_ID_INVALID", repr(candidate_id))

    scene_id = roles_doc["sceneId"]
    if metadata.get("targetScene") != scene_id:
        raise CandidateValidationError(
            "CANDIDATE_SCENE_MISMATCH", f"{metadata.get('targetScene')!r} != {scene_id!r}"
        )

    roles = {role["id"]: role for role in roles_doc["roles"]}
    role_id = metadata.get("role")
    role = roles.get(role_id)
    if not role:
        raise CandidateValidationError("CANDIDATE_ROLE_UNKNOWN", repr(role_id))

    variant_ids = {item["id"] for item in cases_doc["cases"]}
    target_variant = metadata.get("targetVariant")
    if target_variant not in variant_ids:
        raise CandidateValidationError("CANDIDATE_VARIANT_UNKNOWN", repr(target_variant))
    if target_variant not in role.get("targetVariants", []):
        raise CandidateValidationError(
            "CANDIDATE_ROLE_VARIANT_MISMATCH", f"{role_id} cannot target {target_variant}"
        )

    provenance = metadata.get("provenance") or {}
    if provenance.get("method") not in {
        "image-generation",
        "image-edit",
        "manual",
        "derived",
        "generated-donor-derived",
    }:
        raise CandidateValidationError("CANDIDATE_PROVENANCE_METHOD_INVALID", repr(provenance.get("method")))
    references = provenance.get("sourceReferences")
    if not isinstance(references, list) or len(references) < 2 or not all(isinstance(item, str) and item for item in references):
        raise CandidateValidationError("CANDIDATE_PROVENANCE_REFERENCES_INVALID", repr(references))

    image_rel = metadata.get("imagePath")
    if not isinstance(image_rel, str) or not image_rel.lower().endswith(".png"):
        raise CandidateValidationError("CANDIDATE_IMAGE_PATH_INVALID", repr(image_rel))
    image_path = (REPO_ROOT / image_rel).resolve()
    try:
        image_path.relative_to(candidate_root.resolve())
    except ValueError as exc:
        raise CandidateValidationError("CANDIDATE_IMAGE_OUTSIDE_INBOX", str(image_path)) from exc
    if not image_path.exists():
        raise CandidateValidationError("CANDIDATE_IMAGE_MISSING", image_rel)

    expected_size = (roles_doc["canvas"]["width"], roles_doc["canvas"]["height"])
    with Image.open(image_path) as opened:
        opened.load()
        mode = opened.mode
        size = opened.size
        if size != expected_size:
            raise CandidateValidationError("CANDIDATE_CANVAS_MISMATCH", f"{size} != {expected_size}")
        if mode != "RGBA":
            raise CandidateValidationError("CANDIDATE_MODE_INVALID", f"{mode} != RGBA")
        alpha = opened.getchannel("A")
        bbox = alpha.getbbox()
        if bbox is None:
            raise CandidateValidationError("CANDIDATE_ALPHA_EMPTY", image_rel)
        alpha_extrema = alpha.getextrema()
        histogram = alpha.histogram()
        nontransparent_pixels = sum(histogram[1:])

    roi = tuple(role["authorizedRoi"])
    if not contained(bbox, roi):
        raise CandidateValidationError("CANDIDATE_ALPHA_OUTSIDE_AUTHORIZED_ROI", f"bbox={bbox}, roi={roi}")
    outside_pixels = count_alpha_outside_roi(alpha, roi)
    if outside_pixels != 0:
        raise CandidateValidationError("CANDIDATE_ALPHA_LEAK_OUTSIDE_ROI", str(outside_pixels))

    bbox_width = bbox[2] - bbox[0]
    bbox_height = bbox[3] - bbox[1]
    minimum = role.get("minAlphaBBox") or {}
    if bbox_width < minimum.get("width", 1) or bbox_height < minimum.get("height", 1):
        raise CandidateValidationError(
            "CANDIDATE_ALPHA_BBOX_TOO_SMALL",
            f"{bbox_width}x{bbox_height} below {minimum.get('width')}x{minimum.get('height')}",
        )
    bbox_area = bbox_width * bbox_height
    if bbox_area > role["maxAlphaBBoxArea"]:
        raise CandidateValidationError(
            "CANDIDATE_ALPHA_BBOX_TOO_LARGE", f"{bbox_area} > {role['maxAlphaBBoxArea']}"
        )

    actual_sha = sha256_file(image_path)
    expected_sha = metadata.get("expectedImageSha256")
    if expected_sha is not None and expected_sha != actual_sha:
        raise CandidateValidationError("CANDIDATE_IMAGE_HASH_MISMATCH", f"{actual_sha} != {expected_sha}")

    human_status, approved, _ = validate_human_review(metadata, role, actual_sha)

    return {
        "id": candidate_id,
        "metadataPath": metadata_path.relative_to(REPO_ROOT).as_posix(),
        "imagePath": image_rel,
        "imageSha256": actual_sha,
        "role": role_id,
        "targetScene": scene_id,
        "targetVariant": target_variant,
        "status": metadata["status"],
        "structuralGate": "PASS",
        "canvas": {"width": size[0], "height": size[1]},
        "mode": mode,
        "alphaBounds": list(bbox),
        "alphaExtrema": list(alpha_extrema),
        "nonTransparentPixels": nontransparent_pixels,
        "authorizedRoi": list(roi),
        "outsideRoiAlphaPixels": outside_pixels,
        "resolvesDebtCodes": role.get("resolvesDebtCodes", []),
        "visualChecklist": role.get("visualChecklist", []),
        "humanVisualGate": human_status,
        "humanApproved": approved,
        "promotionEligible": False,
    }


def validate_all(
    candidate_root: Path,
    roles_path: Path,
    cases_path: Path,
) -> dict[str, Any]:
    roles_doc = load_json(roles_path)
    cases_doc = load_json(cases_path)
    if roles_doc.get("schemaVersion") != "CandidateAssetRoles 0.1":
        raise CandidateValidationError("ROLE_SCHEMA_UNSUPPORTED", repr(roles_doc.get("schemaVersion")))
    if cases_doc.get("schemaVersion") != "VariantFidelityCases 0.1":
        raise CandidateValidationError("VARIANT_SCHEMA_UNSUPPORTED", repr(cases_doc.get("schemaVersion")))
    if roles_doc.get("sceneId") != cases_doc.get("sceneId"):
        raise CandidateValidationError("ROLE_VARIANT_SCENE_MISMATCH", "scene IDs differ")
    canvas = roles_doc.get("canvas") or {}
    if (canvas.get("width"), canvas.get("height"), canvas.get("origin")) != (1536, 1024, [0, 0]):
        raise CandidateValidationError("CANDIDATE_CANVAS_CONTRACT_INVALID", repr(canvas))

    records = []
    seen_ids: set[str] = set()
    for metadata_path in find_metadata(candidate_root):
        try:
            record = validate_candidate(metadata_path, roles_doc, cases_doc, candidate_root)
            if record["id"] in seen_ids:
                raise CandidateValidationError("CANDIDATE_ID_DUPLICATE", record["id"])
            seen_ids.add(record["id"])
            records.append(record)
        except CandidateValidationError as exc:
            records.append(
                {
                    "metadataPath": metadata_path.relative_to(REPO_ROOT).as_posix(),
                    "structuralGate": "FAIL",
                    "errorCode": exc.code,
                    "detail": exc.detail,
                    "promotionEligible": False,
                }
            )

    failures = [record for record in records if record["structuralGate"] != "PASS"]
    return {
        "schemaVersion": "CandidateAssetIntakeReport 0.1",
        "sceneId": roles_doc["sceneId"],
        "status": "FAIL" if failures else "PASS",
        "candidateCount": len(records),
        "failureCount": len(failures),
        "code": "NO_CANDIDATES" if not records else None,
        "candidates": records,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate-root", type=Path, default=DEFAULT_CANDIDATE_ROOT)
    parser.add_argument("--roles", type=Path, default=REPO_ROOT / "review-assets" / "roles.json")
    parser.add_argument("--cases", type=Path, default=REPO_ROOT / "reference" / "variant-cases.json")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    try:
        report = validate_all(args.candidate_root.resolve(), args.roles.resolve(), args.cases.resolve())
    except (OSError, json.JSONDecodeError, CandidateValidationError) as exc:
        if isinstance(exc, CandidateValidationError):
            code, detail = exc.code, exc.detail
        else:
            code, detail = "CANDIDATE_INTAKE_ERROR", str(exc)
        report = {
            "schemaVersion": "CandidateAssetIntakeReport 0.1",
            "status": "FAIL",
            "candidateCount": 0,
            "failureCount": 1,
            "code": code,
            "detail": detail,
            "candidates": [],
        }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "candidateCount": report.get("candidateCount", 0),
        "failureCount": report.get("failureCount", 0),
        "code": report.get("code"),
    }, sort_keys=True))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
