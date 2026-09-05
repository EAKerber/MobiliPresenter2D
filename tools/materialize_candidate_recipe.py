#!/usr/bin/env python3
"""Materialize a deterministic candidate recipe against an exact rendered variant frame."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
from typing import Any

from PIL import Image

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
        recipe = load_json(args.recipe)
        if recipe.get("schemaVersion") != "CandidatePixelRecipe 0.1":
            raise RecipeError(f"RECIPE_SCHEMA_UNSUPPORTED:{recipe.get('schemaVersion')!r}")

        roles_doc = load_json(args.roles)
        contracts_doc = load_json(args.contracts)
        manifest = load_json(args.variant_manifest)
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
        allowed = contract.get("allowedMethods", ["image-edit"])
        if "derived" not in allowed:
            raise RecipeError("RECIPE_DERIVED_METHOD_NOT_ALLOWED")

        with Image.open(args.source_frame) as opened:
            source = opened.convert("RGBA")
        expected_size = (roles_doc["canvas"]["width"], roles_doc["canvas"]["height"])
        if source.size != expected_size:
            raise RecipeError(f"RECIPE_SOURCE_CANVAS_MISMATCH:{source.size}!={expected_size}")

        roi = tuple(role["authorizedRoi"])
        edited = source.copy()
        touched: set[tuple[int, int]] = set()
        for row in recipe.get("rows", []):
            y = row["y"]
            x0 = row["x0"]
            colors = row["rgb"]
            for offset, rgb in enumerate(colors):
                x = x0 + offset
                if not (roi[0] <= x < roi[2] and roi[1] <= y < roi[3]):
                    raise RecipeError(f"RECIPE_PIXEL_OUTSIDE_ROI:{x},{y}:{roi}")
                if (x, y) in touched:
                    raise RecipeError(f"RECIPE_PIXEL_DUPLICATE:{x},{y}")
                if not isinstance(rgb, list) or len(rgb) != 3 or not all(isinstance(v, int) and 0 <= v <= 255 for v in rgb):
                    raise RecipeError(f"RECIPE_RGB_INVALID:{x},{y}:{rgb!r}")
                touched.add((x, y))
                edited.putpixel((x, y), (*rgb, 255))

        if len(touched) != recipe.get("expectedChangedPixelCount"):
            raise RecipeError(f"RECIPE_PIXEL_COUNT_DECLARATION:{len(touched)}!={recipe.get('expectedChangedPixelCount')}")

        candidate, report, difference = extract_delta(source, edited, roi)
        if report["changedPixelCount"] != recipe.get("expectedChangedPixelCount"):
            raise RecipeError(
                f"RECIPE_ACTUAL_CHANGE_COUNT:{report['changedPixelCount']}!={recipe.get('expectedChangedPixelCount')}"
            )
        if report["differenceBounds"] != recipe.get("expectedPixelBounds"):
            raise RecipeError(f"RECIPE_DIFF_BOUNDS:{report['differenceBounds']}!={recipe.get('expectedPixelBounds')}")

        args.output_dir.mkdir(parents=True, exist_ok=True)
        candidate_path = args.output_dir / "candidate.png"
        difference_path = args.output_dir / "difference.png"
        report_path = args.output_dir / "extraction-report.json"
        metadata_path = args.output_dir / "candidate.json"
        candidate.save(candidate_path)
        difference.save(difference_path)

        source_sha = sha256_file(args.source_frame)
        edited_sha = png_sha(edited)
        candidate_sha = sha256_file(candidate_path)
        recipe_sha = sha256_file(args.recipe)
        report.update({
            "role": recipe["role"],
            "targetVariant": recipe["targetVariant"],
            "authoringContractId": contract["id"],
            "sourceFrameSha256": source_sha,
            "editedFrameSha256": edited_sha,
            "candidateSha256": candidate_sha,
            "recipePath": args.recipe.relative_to(ROOT).as_posix(),
            "recipeSha256": recipe_sha,
        })
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")

        image_rel = candidate_path.relative_to(ROOT).as_posix()
        report_rel = report_path.relative_to(ROOT).as_posix()
        recipe_rel = args.recipe.relative_to(ROOT).as_posix()
        metadata = {
            "schemaVersion": "CandidateAsset 0.1",
            "id": recipe["id"],
            "role": recipe["role"],
            "targetScene": roles_doc["sceneId"],
            "targetVariant": recipe["targetVariant"],
            "imagePath": image_rel,
            "expectedImageSha256": candidate_sha,
            "status": "REVIEW",
            "provenance": {
                "method": "derived",
                "authoringContractId": contract["id"],
                "sourceReferences": recipe["sourceReferences"],
                "sourceFrameSha256": source_sha,
                "editedFrameSha256": edited_sha,
                "deltaExtractionRequired": True,
                "extractionReport": report_rel,
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
        print(json.dumps({"status": "FAIL", "code": "RECIPE_MATERIALIZATION_FAILED", "detail": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
