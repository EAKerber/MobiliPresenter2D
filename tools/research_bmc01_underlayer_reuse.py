#!/usr/bin/env python3
"""Audit exact same-object underlayer reuse for BMC-01.

The critical question is whether the hidden side needs reconstruction at all,
or whether exact Module 02 pixels already exist beneath Module 03 and simply
become visible when the occluder is hidden.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ROOT=Path(__file__).resolve().parents[1]

def raw_alpha(path):
    return Image.open(ROOT/path).convert("RGBA").getchannel("A")

def binary(a,t):
    return a.point(lambda v:255 if v>=t else 0)

def pmask(size,quad):
    m=Image.new("L",size,0)
    ImageDraw.Draw(m).polygon([(round(x),round(y)) for x,y in quad],fill=255)
    return m

def count(m):
    return sum(1 for v in m.getdata() if v)

def bbox(m):
    b=m.getbbox()
    return list(b) if b else None

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--config",type=Path,required=True)
    ap.add_argument("--variant-manifest",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    cfg=json.loads(args.config.read_text(encoding="utf-8"))
    manifest=json.loads(args.variant_manifest.read_text(encoding="utf-8"))
    local=json.loads((ROOT/cfg["localTransferReport"]).read_text(encoding="utf-8"))
    q=local["target"]["carcass"]["quad"]
    size=(manifest["canvas"]["width"],manifest["canvas"]["height"])
    geom=pmask(size,q)
    m02=raw_alpha(cfg["module02Layer"])
    m03=raw_alpha(cfg["module03Layer"])
    s03=raw_alpha(cfg["stone03Variant"])

    default=next(x for x in manifest["cases"] if x["id"]=="default")
    hidden=next(x for x in manifest["cases"] if x["id"]=="module-03-hidden")
    vis_default=default["visibilityReasons"]
    vis_hidden=hidden["visibilityReasons"]

    sweeps=[]
    for t in cfg["alphaThresholds"]:
        owner=ImageChops.multiply(geom,binary(m02,t))
        # x<=front seam is not the side-face underlayer.
        op=owner.load()
        gb=geom.getbbox()
        if gb:
            for y in range(gb[1],gb[3]):
                for x in range(gb[0],min(int(cfg["frontSeamX"])+1,gb[2])):
                    op[x,y]=0
        occluder=ImageChops.lighter(binary(m03,t),binary(s03,t))
        covered=ImageChops.multiply(owner,occluder)
        exposed_if_removed=ImageChops.multiply(owner,ImageChops.invert(occluder))
        total_geom=count(geom)
        owner_n=count(owner)
        covered_n=count(covered)
        sweeps.append({
          "alphaThreshold":t,
          "localGeometryPixels":total_geom,
          "sameObjectSidePixels":owner_n,
          "sameObjectSideGeometryRatio":owner_n/total_geom if total_geom else 0,
          "coveredByModule03Pixels":covered_n,
          "coveredByModule03Ratio":covered_n/owner_n if owner_n else 0,
          "notCoveredByModule03Pixels":count(exposed_if_removed),
          "sameObjectSideBounds":bbox(owner)
        })

    report={
      "schemaVersion":"BMC01UnderlayerReuseAuditReport 0.1",
      "sceneId":cfg["sceneId"],
      "promotionEligible":False,
      "frontSeamX":cfg["frontSeamX"],
      "targetVariantVisibility":{
        "default":{
          "module02":vis_default.get("module-02"),
          "module03":vis_default.get("module-03")
        },
        "module03Hidden":{
          "module02":vis_hidden.get("module-02"),
          "module03":vis_hidden.get("module-03")
        }
      },
      "thresholdSweep":sweeps,
      "interpretation":[
        "sameObjectSidePixels are exact current Module 02 layer pixels inside the locally projected side and to the right of the measured front seam",
        "coveredByModule03Pixels quantify how much of that exact side is hidden by current Module 03 body/stone alpha in the default state",
        "these same-object pixels should be reused as C0 canonical underlayer before any reconstruction method is attempted"
      ]
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(report,sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
