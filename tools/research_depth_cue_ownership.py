#!/usr/bin/env python3
"""Audit ownership of historical/local depth cues used by reconstruction research.

Research-only. It does not promote any edge to physical authority. It answers
a narrower provenance question: which current assets actually own the sampled
pixels, and are those assets visible in the corresponding current variant?
"""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]

M02_ASSETS={
  "stone02Variant":"app/assets/kitchen/variants/stone-02-cozinha-exposed-right.png",
  "stone02Bridge":"app/assets/kitchen/bridges/stone-02-joint-bridge.png",
  "approvedStone02":"app/assets/kitchen/overlays/approved-stone-02.png",
  "module02":"app/assets/kitchen/layers/02_inferior_fogao.png",
  "stone02Original":"app/assets/kitchen/layers/stone-02-cozinha.png",
}
M03_ASSETS={
  "stone03Variant":"app/assets/kitchen/variants/stone-03-pia-exposed-left.png",
  "stone03Bridge":"app/assets/kitchen/bridges/stone-03-joint-bridge.png",
  "approvedStone03":"app/assets/kitchen/overlays/approved-stone-03.png",
  "module03":"app/assets/kitchen/layers/03_inferior_pia.png",
  "stone03Original":"app/assets/kitchen/layers/stone-03-pia.png",
}

M02_LINE={"front":[742,586],"back":[763,525]}
GAP_CONFIG="review-assets/calibration/gap-pixel-v3/config.json"
GAP_REFERENCE="review-assets/calibration/gap-pixel-v3/reference.png"

def sha256_path(path):
    return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()

def raster_line(a,b):
    x1,y1=a; x2,y2=b
    n=max(abs(x2-x1),abs(y2-y1))
    pts=[]
    for i in range(n+1):
        t=i/n if n else 0
        pts.append((round(x1+(x2-x1)*t),round(y1+(y2-y1)*t)))
    out=[]
    for p in pts:
        if not out or out[-1]!=p: out.append(p)
    return out

def alpha_stats(path,pts):
    im=Image.open(ROOT/path).convert("RGBA")
    a=im.getchannel("A")
    vals=[a.getpixel(p) for p in pts]
    return {
      "path":path,
      "sha256":sha256_path(path),
      "alphaBounds":list(a.getbbox()) if a.getbbox() else None,
      "sampleCount":len(vals),
      "alphaPositiveCount":sum(v>0 for v in vals),
      "alphaGe128Count":sum(v>=128 for v in vals),
      "maxAlpha":max(vals) if vals else 0,
      "samples":[{"point":list(p),"alpha":v} for p,v in zip(pts,vals) if v>0],
    }

def gap_reference_scene_points():
    cfg=json.loads((ROOT/GAP_CONFIG).read_text(encoding="utf-8"))
    ref=Image.open(ROOT/GAP_REFERENCE).convert("RGBA")
    alpha=ref.getchannel("A")
    x0,x1=cfg["searchX"]; y0,y1=cfg["evaluationRows"]
    threshold=cfg["alphaThreshold"]
    ox,oy=cfg.get("sceneOffset",[0,0])
    pts=[]
    for y in range(y0,y1+1):
        hits=[x for x in range(x0,x1+1) if alpha.getpixel((x,y))>=threshold]
        if not hits or hits[0]==x0:
            raise ValueError(f"gap reference edge missing/clipped at row {y}")
        pts.append((hits[0]+ox,y+oy))
    return pts,cfg

def visibility(case, mapping):
    reasons=case.get("visibilityReasons",{})
    return {key:reasons.get(entity) for key,entity in mapping.items()}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--variant-manifest",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    manifest=json.loads(args.variant_manifest.read_text(encoding="utf-8"))

    m03_hidden=next(c for c in manifest["cases"] if c["id"]=="module-03-hidden")
    m02_hidden=next(c for c in manifest["cases"] if c["id"]=="module-02-hidden")

    m02_pts=raster_line(M02_LINE["front"],M02_LINE["back"])
    m02_assets={k:alpha_stats(v,m02_pts) for k,v in M02_ASSETS.items()}

    m03_pts,gap_cfg=gap_reference_scene_points()
    m03_assets={k:alpha_stats(v,m03_pts) for k,v in M03_ASSETS.items()}
    historical_full_ref=gap_cfg.get("fullFrameSha256",{}).get("reference")
    current_m03_sha=m03_assets["stone03Variant"]["sha256"]

    report={
      "schemaVersion":"DepthCueOwnershipAudit 0.2",
      "sceneId":"cozinha-01",
      "module02HistoricalCue":{
        "line":M02_LINE,
        "lineSampleCount":len(m02_pts),
        "assets":m02_assets,
        "currentModule03HiddenVisibility":visibility(m03_hidden,{
          "stone02Variant":"stone-02",
          "stone02Bridge":"stone-02-joint-bridge",
          "approvedStone02":"approved-stone-02",
          "module02":"module-02",
        }),
        "finding":"LEGACY_JOINT_CONTAMINATED"
      },
      "module03GapReferenceCue":{
        "source":GAP_REFERENCE,
        "config":GAP_CONFIG,
        "scenePoints":[list(p) for p in m03_pts],
        "sampleCount":len(m03_pts),
        "assets":m03_assets,
        "currentModule02HiddenVisibility":visibility(m02_hidden,{
          "stone03Variant":"stone-03",
          "stone03Bridge":"stone-03-joint-bridge",
          "approvedStone03":"approved-stone-03",
          "module03":"module-03",
        }),
        "historicalReferenceFullFrameSha256":historical_full_ref,
        "currentStone03VariantSha256":current_m03_sha,
        "fullFrameHashMatchesCurrentStone03Variant":bool(historical_full_ref and historical_full_ref==current_m03_sha),
        "finding":"OWNERSHIP_ONLY_NOT_Y_SEMANTICS"
      },
      "interpretation":{
        "promotionEligible":False,
        "module02":"The old long M02 cue is mostly conditional joint-bridge support and is not current exposed-side authority.",
        "module03":"If the reference-alpha points belong to the currently visible stone03 variant with bridge hidden, they are current raster evidence; a separate semantic/topology check is still required before calling them a physical Y-direction edge."
      }
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps({
      "m02BridgePositive":m02_assets["stone02Bridge"]["alphaPositiveCount"],
      "m02VariantPositive":m02_assets["stone02Variant"]["alphaPositiveCount"],
      "m02BridgeVisibility":report["module02HistoricalCue"]["currentModule03HiddenVisibility"]["stone02Bridge"],
      "m03VariantPositive":m03_assets["stone03Variant"]["alphaPositiveCount"],
      "m03BridgePositive":m03_assets["stone03Bridge"]["alphaPositiveCount"],
      "m03BridgeVisibility":report["module03GapReferenceCue"]["currentModule02HiddenVisibility"]["stone03Bridge"],
      "m03HistoricalHashMatchesCurrent":report["module03GapReferenceCue"]["fullFrameHashMatchesCurrentStone03Variant"],
    },sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
