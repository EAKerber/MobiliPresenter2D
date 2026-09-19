#!/usr/bin/env python3
"""Materialize a bounded perspective-donor candidate against an exact variant frame."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageOps

try:
    from tools.extract_candidate_delta import extract_delta, sha256_file
except ModuleNotFoundError:
    from extract_candidate_delta import extract_delta, sha256_file

ROOT = Path(__file__).resolve().parents[1]


class RecipeError(RuntimeError):
    pass


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def png_sha(image: Image.Image) -> str:
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    return sha256_bytes(stream.getvalue())


def one(items: list[dict[str, Any]], key: str, value: str, label: str) -> dict[str, Any]:
    matches = [item for item in items if item.get(key) == value]
    if len(matches) != 1:
        raise RecipeError(f"{label}: expected exactly one {key}={value!r}; got {len(matches)}")
    return matches[0]


def solve_linear(matrix: list[list[float]], vector: list[float]) -> list[float]:
    n = len(vector)
    work = [list(map(float, matrix[row])) + [float(vector[row])] for row in range(n)]
    for column in range(n):
        pivot = max(range(column, n), key=lambda row: abs(work[row][column]))
        if abs(work[pivot][column]) < 1e-12:
            raise RecipeError("PERSPECTIVE_SINGULAR")
        work[column], work[pivot] = work[pivot], work[column]
        divisor = work[column][column]
        work[column] = [value / divisor for value in work[column]]
        for row in range(n):
            if row == column:
                continue
            factor = work[row][column]
            if factor == 0:
                continue
            work[row] = [
                work[row][index] - factor * work[column][index]
                for index in range(n + 1)
            ]
    return [work[row][-1] for row in range(n)]


def perspective_coefficients(
    target_quad: list[list[float]], donor_quad: list[list[float]]
) -> list[float]:
    if len(target_quad) != 4 or len(donor_quad) != 4:
        raise RecipeError("PERSPECTIVE_QUAD_REQUIRES_FOUR_POINTS")
    matrix: list[list[float]] = []
    vector: list[float] = []
    for (x, y), (u, v) in zip(target_quad, donor_quad):
        matrix.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        vector.append(u)
        matrix.append([0, 0, 0, x, y, 1, -v * x, -v * y])
        vector.append(v)
    return solve_linear(matrix, vector)


def polygon_mask(
    size: tuple[int, int], quad: list[list[float]], supersampling: int, roi: tuple[int, int, int, int]
) -> Image.Image:
    scale = max(1, supersampling)
    mask = Image.new("L", (size[0] * scale, size[1] * scale), 0)
    points = [(round(x * scale), round(y * scale)) for x, y in quad]
    ImageDraw.Draw(mask).polygon(points, fill=255)
    if scale != 1:
        mask = mask.resize(size, Image.Resampling.LANCZOS)
    roi_mask = Image.new("L", size, 0)
    ImageDraw.Draw(roi_mask).rectangle((roi[0], roi[1], roi[2] - 1, roi[3] - 1), fill=255)
    return ImageChops.multiply(mask, roi_mask)


def build_protected_mask(size: tuple[int, int], asset_paths: list[str]) -> Image.Image:
    protected = Image.new("L", size, 0)
    for relative in asset_paths:
        path = (ROOT / relative).resolve()
        path.relative_to(ROOT.resolve())
        with Image.open(path) as opened:
            layer = opened.convert("RGBA")
        if layer.size != size:
            raise RecipeError(f"PROTECTED_ASSET_CANVAS_MISMATCH:{relative}:{layer.size}!={size}")
        binary = layer.getchannel("A").point(lambda value: 255 if value else 0)
        protected = ImageChops.lighter(protected, binary)
    return protected


def perspective_copy(
    donor: Image.Image,
    target: Image.Image,
    donor_quad: list[list[float]],
    target_quad: list[list[float]],
    roi: tuple[int, int, int, int],
    supersampling: int,
    protected_mask: Image.Image,
) -> Image.Image:
    coefficients = perspective_coefficients(target_quad, donor_quad)
    warped = donor.transform(
        donor.size,
        Image.Transform.PERSPECTIVE,
        coefficients,
        resample=Image.Resampling.BILINEAR,
    )
    mask = polygon_mask(donor.size, target_quad, supersampling, roi)
    mask = ImageChops.multiply(mask, ImageOps.invert(protected_mask))
    return Image.composite(warped, target, mask)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--recipe", type=Path, required=True)
    parser.add_argument("--source-frame", type=Path, required=True)
    parser.add_argument("--variant-manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--roles", type=Path, default=ROOT / "review-assets" / "roles.json")
    parser.add_argument("--contracts", type=Path, default=ROOT / "review-assets" / "authoring-contracts.json")
    args = parser.parse_args()

    try:
        recipe_path = args.recipe.resolve()
        output_dir = args.output_dir.resolve()
        recipe_path.relative_to(ROOT.resolve())
        output_dir.relative_to(ROOT.resolve())

        recipe = load_json(recipe_path)
        if recipe.get("schemaVersion") != "PerspectiveDonorRecipe 0.1":
            raise RecipeError(f"RECIPE_SCHEMA_UNSUPPORTED:{recipe.get('schemaVersion')!r}")

        roles_doc = load_json(args.roles.resolve())
        contracts_doc = load_json(args.contracts.resolve())
        manifest = load_json(args.variant_manifest.resolve())
        role = one(roles_doc["roles"], "id", recipe["role"], "RECIPE_ROLE")
        contract = one(contracts_doc["contracts"], "id", recipe["authoringContractId"], "RECIPE_CONTRACT")
        case = one(manifest["cases"], "id", recipe["targetVariant"], "RECIPE_VARIANT")

        if role.get("authoringContractId") != contract.get("id"):
            raise RecipeError("RECIPE_ROLE_CONTRACT_MISMATCH")
        if contract.get("role") != recipe["role"] or contract.get("targetVariant") != recipe["targetVariant"]:
            raise RecipeError("RECIPE_CONTRACT_SCOPE_MISMATCH")
        if case.get("fingerprint") != recipe.get("targetVariantFingerprint"):
            raise RecipeError(
                f"RECIPE_VARIANT_FINGERPRINT_MISMATCH:{case.get('fingerprint')}!={recipe.get('targetVariantFingerprint')}"
            )
        if "derived" not in contract.get("allowedMethods", []):
            raise RecipeError("RECIPE_DERIVED_METHOD_NOT_ALLOWED")

        source_path = args.source_frame.resolve()
        source_sha = sha256_file(source_path)
        if recipe.get("expectedSourceFrameSha256") and source_sha != recipe["expectedSourceFrameSha256"]:
            raise RecipeError(f"RECIPE_SOURCE_HASH_MISMATCH:{source_sha}!={recipe['expectedSourceFrameSha256']}")
        with Image.open(source_path) as opened:
            source = opened.convert("RGBA")
        expected_size = (roles_doc["canvas"]["width"], roles_doc["canvas"]["height"])
        if source.size != expected_size:
            raise RecipeError(f"RECIPE_SOURCE_CANVAS_MISMATCH:{source.size}!={expected_size}")

        roi = tuple(role["authorizedRoi"])
        protected_assets = recipe.get("protectedAssets") or []
        protected_mask = build_protected_mask(source.size, protected_assets)
        edited = source.copy()
        supersampling = int(recipe.get("supersampling", 4))
        for operation in recipe.get("operations", []):
            if operation.get("type") != "perspective-copy":
                raise RecipeError(f"RECIPE_OPERATION_UNSUPPORTED:{operation.get('type')!r}")
            edited = perspective_copy(
                source,
                edited,
                operation["donorQuad"],
                operation["targetQuad"],
                roi,
                supersampling,
                protected_mask,
            )

        candidate, report, difference = extract_delta(source, edited, roi)
        expected_count = recipe.get("expectedChangedPixelCount")
        if expected_count is not None and report["changedPixelCount"] != expected_count:
            raise RecipeError(f"RECIPE_ACTUAL_CHANGE_COUNT:{report['changedPixelCount']}!={expected_count}")
        expected_bounds = recipe.get("expectedPixelBounds")
        if expected_bounds is not None and report["differenceBounds"] != expected_bounds:
            raise RecipeError(f"RECIPE_DIFF_BOUNDS:{report['differenceBounds']}!={expected_bounds}")

        output_dir.mkdir(parents=True, exist_ok=True)
        candidate_path = output_dir / "candidate.png"
        difference_path = output_dir / "difference.png"
        report_path = output_dir / "extraction-report.json"
        metadata_path = output_dir / "candidate.json"
        candidate.save(candidate_path)
        difference.save(difference_path)

        edited_sha = png_sha(edited)
        candidate_sha = sha256_file(candidate_path)
        recipe_sha = sha256_file(recipe_path)
        recipe_rel = recipe_path.relative_to(ROOT.resolve()).as_posix()
        report.update({
            "role": recipe["role"],
            "targetVariant": recipe["targetVariant"],
            "authoringContractId": contract["id"],
            "sourceFrameSha256": source_sha,
            "editedFrameSha256": edited_sha,
            "candidateSha256": candidate_sha,
            "recipePath": recipe_rel,
            "recipeSha256": recipe_sha,
            "protectedAssets": protected_assets,
        })
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")

        metadata = {
            "schemaVersion": "CandidateAsset 0.1",
            "id": recipe["id"],
            "role": recipe["role"],
            "targetScene": roles_doc["sceneId"],
            "targetVariant": recipe["targetVariant"],
            "imagePath": candidate_path.relative_to(ROOT.resolve()).as_posix(),
            "expectedImageSha256": candidate_sha,
            "status": "REVIEW",
            "provenance": {
                "method": "derived",
                "authoringContractId": contract["id"],
                "sourceReferences": recipe["sourceReferences"],
                "sourceFrameSha256": source_sha,
                "editedFrameSha256": edited_sha,
                "deltaExtractionRequired": True,
                "extractionReport": report_path.relative_to(ROOT.resolve()).as_posix(),
                "recipe": recipe_rel,
                "recipeSha256": recipe_sha,
            },
            "humanReview": {
                "status": "PENDING",
                "reviewer": None,
                "reviewedAt": None,
                "checklist": {},
            },
        }
        metadata_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")

        print(json.dumps({
            "status": "PASS",
            "candidateId": recipe["id"],
            "candidateSha256": candidate_sha,
            "recipeSha256": recipe_sha,
            "changedPixelCount": report["changedPixelCount"],
            "differenceBounds": report["differenceBounds"],
            "outsideAuthorizedRoiChangedPixelCount": report["outsideAuthorizedRoiChangedPixelCount"],
            "roundtripMismatchPixelCount": report["roundtripMismatchPixelCount"],
        }, sort_keys=True))
        return 0
    except (OSError, KeyError, ValueError, json.JSONDecodeError, RecipeError) as exc:
        print(json.dumps({"status": "FAIL", "code": "PERSPECTIVE_RECIPE_MATERIALIZATION_FAILED", "detail": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
