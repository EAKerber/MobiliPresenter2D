#!/usr/bin/env python3
from __future__ import annotations

import argparse, base64, hashlib, io, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

REPO_ROOT = Path(__file__).resolve().parents[1]

def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def sha_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))

def bbox_from_bool(mask: np.ndarray):
    ys, xs = np.where(mask)
    if not len(xs):
        return None
    return [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)]

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
    cases = {c["id"]: c for c in manifest["cases"]}
    case = cases.get(recipe["targetVariant"])
    if not case:
        raise SystemExit("target variant missing")
    if case["fingerprint"] != recipe["targetVariantFingerprint"]:
        raise SystemExit(f"fingerprint mismatch: {case['fingerprint']} != {recipe['targetVariantFingerprint']}")

    donor_doc = recipe["donor"]
    if "packedBase64" in donor_doc:
        packed_b64 = donor_doc["packedBase64"]
    else:
        chunk_paths = donor_doc.get("packedBase64Chunks") or []
        if not chunk_paths:
            raise SystemExit("packed donor payload missing")
        packed_b64 = "".join((REPO_ROOT / rel).read_text(encoding="ascii").strip() for rel in chunk_paths)
    packed = base64.b64decode(packed_b64)
    if sha_bytes(packed) != donor_doc["packedSha256"]:
        raise SystemExit("packed donor sha mismatch")
    donor = Image.open(io.BytesIO(packed)).convert("RGBA")

    x0,y0,x1,y1 = recipe["placementBox"]
    donor = donor.resize((x1-x0, y1-y0), Image.Resampling.LANCZOS)
    threshold = int(recipe.get("alphaThresholdBelow", 0))
    alpha = donor.getchannel("A").point(lambda v: 0 if v < threshold else v)
    donor.putalpha(alpha)

    overlay = Image.new("RGBA", source.size, (0,0,0,0))
    shadow_cfg = recipe.get("contactShadow") or {}
    if shadow_cfg.get("enabled"):
        rows = int(shadow_cfg["sourceBottomRows"])
        radius = float(shadow_cfg["gaussianBlurRadius"])
        yoff = int(shadow_cfg["pasteYOffsetFromBottom"])
        scale = float(shadow_cfg["opacityScale"])
        bottom = alpha.crop((0, max(0, alpha.height-rows), alpha.width, alpha.height))
        bottom = bottom.filter(ImageFilter.GaussianBlur(radius))
        shadow_alpha = Image.new("L", source.size, 0)
        shadow_alpha.paste(bottom, (x0, y1+yoff))
        shadow_alpha = shadow_alpha.point(lambda v: max(0, min(255, int(v*scale))))
        shadow = Image.new("RGBA", source.size, (0,0,0,255))
        shadow.putalpha(shadow_alpha)
        overlay = Image.alpha_composite(overlay, shadow)

    overlay.alpha_composite(donor, (x0,y0))
    edited = Image.alpha_composite(source, overlay)

    s = np.array(source, dtype=np.uint8)
    e = np.array(edited, dtype=np.uint8)
    changed = np.any(s != e, axis=2)
    roi = recipe["authorizedRoi"]
    roi_mask = np.zeros(changed.shape, dtype=bool)
    roi_mask[roi[1]:roi[3], roi[0]:roi[2]] = True
    outside = int(np.count_nonzero(changed & ~roi_mask))
    if outside:
        raise SystemExit(f"outside ROI changed pixels: {outside}")

    delta = np.zeros_like(e)
    delta[changed, :3] = e[changed, :3]
    delta[changed, 3] = 255
    candidate = Image.fromarray(delta, "RGBA")

    roundtrip = source.copy()
    roundtrip.alpha_composite(candidate)
    rt = np.array(roundtrip, dtype=np.uint8)
    mismatch = int(np.count_nonzero(np.any(rt != e, axis=2)))
    if mismatch:
        raise SystemExit(f"roundtrip mismatch: {mismatch}")

    out = args.output_dir
    out.mkdir(parents=True, exist_ok=True)
    candidate_path = out / "candidate.png"
    diff_path = out / "difference.png"
    report_path = out / "extraction-report.json"
    metadata_path = out / "candidate.json"
    candidate.save(candidate_path)

    absd = np.abs(e[:,:,:3].astype(np.int16) - s[:,:,:3].astype(np.int16)).astype(np.uint8)
    boost = np.clip(absd.astype(np.int16)*4, 0, 255).astype(np.uint8)
    diff_rgba = np.zeros_like(e)
    diff_rgba[changed,:3] = boost[changed]
    diff_rgba[changed,3] = 255
    Image.fromarray(diff_rgba, "RGBA").save(diff_path)

    edited_tmp = out / "_edited-frame.png"
    edited.save(edited_tmp)
    candidate_sha = sha_file(candidate_path)
    edited_sha = sha_file(edited_tmp)
    edited_tmp.unlink()

    report = {
        "schemaVersion":"CandidateDeltaExtractionReport 0.1",
        "status":"PASS",
        "role":recipe["role"],
        "targetVariant":recipe["targetVariant"],
        "authoringContractId":recipe["authoringContractId"],
        "canvas":recipe["canvas"],
        "authorizedRoi":roi,
        "deltaMode":"opaque-replacement-pixels",
        "candidateAlphaBounds":list(candidate.getchannel("A").getbbox()),
        "differenceBounds":bbox_from_bool(changed),
        "changedPixelCount":int(np.count_nonzero(changed)),
        "outsideAuthorizedRoiChangedPixelCount":outside,
        "roundtripMismatchPixelCount":mismatch,
        "candidateSha256":candidate_sha,
        "sourceFrameSha256":source_sha,
        "editedFrameSha256":edited_sha,
        "donor":{
            "sourceMethod":recipe["donor"]["sourceMethod"],
            "sourceGenId":recipe["donor"]["sourceGenId"],
            "sourceGeneratedFrameSha256":recipe["donor"]["sourceGeneratedFrameSha256"],
            "packedSha256":recipe["donor"]["packedSha256"],
            "processing":recipe["donor"]["processing"],
            "placementBox":recipe["placementBox"]
        }
    }
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True)+"\n", encoding="utf-8")

    candidate_rel = recipe["output"]["candidatePath"]
    report_rel = recipe["output"]["extractionReportPath"]
    metadata = {
        "schemaVersion":"CandidateAsset 0.1",
        "id":recipe["output"]["candidateId"],
        "role":recipe["role"],
        "targetScene":"cozinha-01",
        "targetVariant":recipe["targetVariant"],
        "imagePath":candidate_rel,
        "expectedImageSha256":candidate_sha,
        "status":"REVIEW",
        "humanReview":{"status":"PENDING","reviewer":None,"reviewedAt":None,"checklist":{}},
        "provenance":{
            "method":"generated-donor-derived",
            "authoringContractId":recipe["authoringContractId"],
            "deltaExtractionRequired":True,
            "sourceReferences":[
                "app/assets/kitchen/base.png",
                f"variant:{recipe['targetVariant']}@{recipe['targetVariantFingerprint']}",
                f"image_gen:{recipe['donor']['sourceGenId']}"
            ],
            "sourceFrameSha256":source_sha,
            "editedFrameSha256":edited_sha,
            "extractionReport":report_rel
        }
    }
    metadata_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=False, sort_keys=True)+"\n", encoding="utf-8")

    print(json.dumps({
        "status":"PASS",
        "candidateSha256":candidate_sha,
        "sourceFrameSha256":source_sha,
        "editedFrameSha256":edited_sha,
        "changedPixelCount":report["changedPixelCount"],
        "outsideAuthorizedRoiChangedPixelCount":outside,
        "roundtripMismatchPixelCount":mismatch,
        "differenceBounds":report["differenceBounds"]
    }, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
