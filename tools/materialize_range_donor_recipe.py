#!/usr/bin/env python3
from __future__ import annotations

import argparse, base64, hashlib, io, json
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

REPO_ROOT = Path(__file__).resolve().parents[1]


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--recipe", type=Path, required=True)
    ap.add_argument("--source-frame", type=Path, required=True)
    ap.add_argument("--variant-manifest", type=Path, required=True)
    ap.add_argument("--output-dir", type=Path, required=True)
    args = ap.parse_args()

    recipe = load_json(args.recipe)
    if recipe.get("schemaVersion") != "GeneratedDonorPlacementRecipe 0.1":
        raise SystemExit("unsupported recipe schema")

    source = Image.open(args.source_frame).convert("RGBA")
    if source.size != (1536, 1024):
        raise SystemExit(f"source canvas mismatch: {source.size}")
    source_sha = sha_file(args.source_frame)
    if source_sha != recipe["sourceFrameSha256"]:
        raise SystemExit(f"source sha mismatch: {source_sha} != {recipe['sourceFrameSha256']}")

    manifest = load_json(args.variant_manifest)
    cases = {case["id"]: case for case in manifest["cases"]}
    case = cases.get(recipe["targetVariant"])
    if not case:
        raise SystemExit("target variant missing")
    if case["fingerprint"] != recipe["targetVariantFingerprint"]:
        raise SystemExit(
            f"fingerprint mismatch: {case['fingerprint']} != {recipe['targetVariantFingerprint']}"
        )

    donor_doc = recipe["donor"]
    if "packedBase64" in donor_doc:
        packed_b64 = donor_doc["packedBase64"]
    else:
        chunk_paths = donor_doc.get("packedBase64Chunks") or []
        if not chunk_paths:
            raise SystemExit("packed donor payload missing")
        packed_b64 = "".join(
            (REPO_ROOT / rel).read_text(encoding="ascii").strip()
            for rel in chunk_paths
        )

    packed = base64.b64decode(packed_b64)
    if sha_bytes(packed) != donor_doc["packedSha256"]:
        raise SystemExit("packed donor sha mismatch")
    donor = Image.open(io.BytesIO(packed)).convert("RGBA")

    x0, y0, x1, y1 = recipe["placementBox"]
    donor = donor.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS)
    threshold = int(recipe.get("alphaThresholdBelow", 0))
    alpha = donor.getchannel("A").point(lambda value: 0 if value < threshold else value)
    donor.putalpha(alpha)

    overlay = Image.new("RGBA", source.size, (0, 0, 0, 0))
    shadow_cfg = recipe.get("contactShadow") or {}
    if shadow_cfg.get("enabled"):
        rows = int(shadow_cfg["sourceBottomRows"])
        radius = float(shadow_cfg["gaussianBlurRadius"])
        yoff = int(shadow_cfg["pasteYOffsetFromBottom"])
        scale = float(shadow_cfg["opacityScale"])
        bottom = alpha.crop((0, max(0, alpha.height - rows), alpha.width, alpha.height))
        bottom = bottom.filter(ImageFilter.GaussianBlur(radius))
        shadow_alpha = Image.new("L", source.size, 0)
        shadow_alpha.paste(bottom, (x0, y1 + yoff))
        shadow_alpha = shadow_alpha.point(
            lambda value: max(0, min(255, int(value * scale)))
        )
        shadow = Image.new("RGBA", source.size, (0, 0, 0, 255))
        shadow.putalpha(shadow_alpha)
        overlay = Image.alpha_composite(overlay, shadow)

    overlay.alpha_composite(donor, (x0, y0))
    edited = Image.alpha_composite(source, overlay)

    roi = recipe["authorizedRoi"]
    rx0, ry0, rx1, ry1 = roi
    candidate = Image.new("RGBA", source.size, (0, 0, 0, 0))
    difference = Image.new("RGBA", source.size, (0, 0, 0, 0))
    sp = source.load()
    ep = edited.load()
    cp = candidate.load()
    dp = difference.load()

    changed_count = 0
    outside_count = 0
    min_x = min_y = None
    max_x = max_y = None

    for y in range(source.height):
        for x in range(source.width):
            src_px = sp[x, y]
            edit_px = ep[x, y]
            if src_px == edit_px:
                continue
            changed_count += 1
            if not (rx0 <= x < rx1 and ry0 <= y < ry1):
                outside_count += 1
            cp[x, y] = (edit_px[0], edit_px[1], edit_px[2], 255)
            dp[x, y] = (
                min(255, abs(edit_px[0] - src_px[0]) * 4),
                min(255, abs(edit_px[1] - src_px[1]) * 4),
                min(255, abs(edit_px[2] - src_px[2]) * 4),
                255,
            )
            min_x = x if min_x is None else min(min_x, x)
            min_y = y if min_y is None else min(min_y, y)
            max_x = x if max_x is None else max(max_x, x)
            max_y = y if max_y is None else max(max_y, y)

    if outside_count:
        raise SystemExit(f"outside ROI changed pixels: {outside_count}")
    if not changed_count:
        raise SystemExit("candidate changed zero pixels")

    difference_bounds = [min_x, min_y, max_x + 1, max_y + 1]
    candidate_alpha_bounds = list(candidate.getchannel("A").getbbox())

    roundtrip = source.copy()
    roundtrip.alpha_composite(candidate)
    mismatch_bbox = ImageChops.difference(roundtrip, edited).getbbox()
    if mismatch_bbox is not None:
        mismatch_count = 0
        rp = roundtrip.load()
        for y in range(source.height):
            for x in range(source.width):
                if rp[x, y] != ep[x, y]:
                    mismatch_count += 1
        raise SystemExit(f"roundtrip mismatch: {mismatch_count}")

    out = args.output_dir
    out.mkdir(parents=True, exist_ok=True)
    candidate_path = out / "candidate.png"
    diff_path = out / "difference.png"
    report_path = out / "extraction-report.json"
    metadata_path = out / "candidate.json"
    candidate.save(candidate_path)
    difference.save(diff_path)

    edited_tmp = out / "_edited-frame.png"
    edited.save(edited_tmp)
    candidate_sha = sha_file(candidate_path)
    edited_sha = sha_file(edited_tmp)
    edited_tmp.unlink()

    report = {
        "schemaVersion": "CandidateDeltaExtractionReport 0.1",
        "status": "PASS",
        "role": recipe["role"],
        "targetVariant": recipe["targetVariant"],
        "authoringContractId": recipe["authoringContractId"],
        "canvas": recipe["canvas"],
        "authorizedRoi": roi,
        "deltaMode": "opaque-replacement-pixels",
        "candidateAlphaBounds": candidate_alpha_bounds,
        "differenceBounds": difference_bounds,
        "changedPixelCount": changed_count,
        "outsideAuthorizedRoiChangedPixelCount": outside_count,
        "roundtripMismatchPixelCount": 0,
        "candidateSha256": candidate_sha,
        "sourceFrameSha256": source_sha,
        "editedFrameSha256": edited_sha,
        "donor": {
            "sourceMethod": donor_doc["sourceMethod"],
            "sourceGenId": donor_doc["sourceGenId"],
            "sourceGeneratedFrameSha256": donor_doc["sourceGeneratedFrameSha256"],
            "packedSha256": donor_doc["packedSha256"],
            "processing": donor_doc["processing"],
            "placementBox": recipe["placementBox"],
        },
    }
    report_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    metadata = {
        "schemaVersion": "CandidateAsset 0.1",
        "id": recipe["output"]["candidateId"],
        "role": recipe["role"],
        "targetScene": "cozinha-01",
        "targetVariant": recipe["targetVariant"],
        "imagePath": recipe["output"]["candidatePath"],
        "expectedImageSha256": candidate_sha,
        "status": "REVIEW",
        "humanReview": {
            "status": "PENDING",
            "reviewer": None,
            "reviewedAt": None,
            "checklist": {},
        },
        "provenance": {
            "method": "generated-donor-derived",
            "authoringContractId": recipe["authoringContractId"],
            "deltaExtractionRequired": True,
            "sourceReferences": [
                "app/assets/kitchen/base.png",
                f"variant:{recipe['targetVariant']}@{recipe['targetVariantFingerprint']}",
                f"image_gen:{donor_doc['sourceGenId']}",
            ],
            "sourceFrameSha256": source_sha,
            "editedFrameSha256": edited_sha,
            "extractionReport": recipe["output"]["extractionReportPath"],
        },
    }
    metadata_path.write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "status": "PASS",
                "candidateSha256": candidate_sha,
                "sourceFrameSha256": source_sha,
                "editedFrameSha256": edited_sha,
                "changedPixelCount": changed_count,
                "outsideAuthorizedRoiChangedPixelCount": outside_count,
                "roundtripMismatchPixelCount": 0,
                "differenceBounds": difference_bounds,
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
