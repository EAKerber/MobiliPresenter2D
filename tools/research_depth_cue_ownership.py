#!/usr/bin/env python3
"""Audit ownership of the historical Module 02 depth cue.

Research-only. Determines which current assets actually carry alpha along the
historically measured line [742,586] -> [763,525], and records current
module-03-hidden visibility for those assets.
"""
from __future__ import annotations
import argparse, json, math
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]

ASSETS={
  "stone02Variant":"app/assets/kitchen/variants/stone-02-cozinha-exposed-right.png",
  "stone02Bridge":"app/assets/kitchen/bridges/stone-02-joint-bridge.png",
  "approvedStone02":"app/assets/kitchen/overlays/approved-stone-02.png",
  "module02":"app/assets/kitchen/layers/02_inferior_fogao.png",
  "stone02Original":"app/assets/kitchen/layers/stone-02-cozinha.png",
}

LINE={"front":[742,586],"back":[763,525]}

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
      "alphaBounds":list(a.getbbox()) if a.getbbox() else None,
      "sampleCount":len(vals),
      "alphaPositiveCount":sum(v>0 for v in vals),
      "alphaGe128Count":sum(v>=128 for v in vals),
      "maxAlpha":max(vals) if vals else 0,
      "samples":[{"point":list(p),"alpha":v} for p,v in zip(pts,vals) if v>0],
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--variant-manifest",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    manifest=json.loads(args.variant_manifest.read_text(encoding="utf-8"))
    case=next(c for c in manifest["cases"] if c["id"]=="module-03-hidden")
    reasons=case.get("visibilityReasons",{})
    pts=raster_line(LINE["front"],LINE["back"])
    assets={k:alpha_stats(v,pts) for k,v in ASSETS.items()}
    report={
      "schemaVersion":"DepthCueOwnershipAudit 0.1",
      "sceneId":"cozinha-01",
      "historicalMeasuredLine":LINE,
      "lineSampleCount":len(pts),
      "assets":assets,
      "currentModule03HiddenVisibility":{
        key:reasons.get(entity) for key,entity in {
          "stone02Variant":"stone-02",
          "stone02Bridge":"stone-02-joint-bridge",
          "approvedStone02":"approved-stone-02",
          "module02":"module-02",
        }.items()
      },
      "interpretation":{
        "promotionEligible":False,
        "purpose":"determine whether the historical depth cue is supported by pixels that remain visible in the current module-03-hidden composition"
      }
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps({
      "bridgePositive":assets["stone02Bridge"]["alphaPositiveCount"],
      "variantPositive":assets["stone02Variant"]["alphaPositiveCount"],
      "approvedPositive":assets["approvedStone02"]["alphaPositiveCount"],
      "bridgeVisibility":report["currentModule03HiddenVisibility"]["stone02Bridge"],
    },sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
