#!/usr/bin/env python3
"""Audit current raster support inside the locally projected BMC-01 plinth."""
from __future__ import annotations
import argparse, json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]

def pmask(size,quad):
    im=Image.new("L",size,0)
    ImageDraw.Draw(im).polygon([(round(float(x)),round(float(y))) for x,y in quad],fill=255)
    return im

def count(m):
    return sum(1 for v in m.getdata() if v)

def rgb_diff(a,b):
    return sum(abs(int(a[i])-int(b[i])) for i in range(3))/3

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--config",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    cfg=json.loads(args.config.read_text(encoding="utf-8"))
    local=json.loads((ROOT/cfg["localTransferReport"]).read_text(encoding="utf-8"))
    base=Image.open(ROOT/cfg["baseAsset"]).convert("RGB")
    images={x["id"]:Image.open(ROOT/x["path"]).convert("RGBA") for x in cfg["assets"]}
    geom=pmask(base.size,local["target"]["plinth"]["quad"])
    gp=geom.load(); bounds=geom.getbbox(); total=count(geom)
    thresholds=[]
    for t in cfg["alphaThresholds"]:
        per={}
        union=0
        # union is counted explicitly by pixel to avoid alpha arithmetic ambiguity.
        union_pixels=0
        if bounds:
            for aid,im in images.items():
                apx=im.getchannel("A").load()
                owned=0; diffs=[]
                for y in range(bounds[1],bounds[3]):
                    for x in range(bounds[0],bounds[2]):
                        if not gp[x,y] or apx[x,y]<t: continue
                        owned+=1
                        diffs.append(rgb_diff(im.getpixel((x,y))[:3],base.getpixel((x,y))))
                per[aid]={
                  "pixels":owned,
                  "ratio":owned/total if total else 0,
                  "meanRgbDifferenceToBase":sum(diffs)/len(diffs) if diffs else None
                }
            for y in range(bounds[1],bounds[3]):
                for x in range(bounds[0],bounds[2]):
                    if not gp[x,y]: continue
                    if any(im.getpixel((x,y))[3]>=t for im in images.values()):
                        union_pixels+=1
        thresholds.append({
          "alphaThreshold":t,
          "geometryPixels":total,
          "unionSupportPixels":union_pixels,
          "unionSupportRatio":union_pixels/total if total else 0,
          "assets":per
        })

    # Dominant alpha owner per geometry pixel, including zero support.
    dominant={aid:0 for aid in images}; dominant["none"]=0; ties=0
    if bounds:
        for y in range(bounds[1],bounds[3]):
            for x in range(bounds[0],bounds[2]):
                if not gp[x,y]: continue
                vals={aid:im.getpixel((x,y))[3] for aid,im in images.items()}
                m=max(vals.values())
                if m==0:
                    dominant["none"]+=1
                    continue
                owners=[aid for aid,v in vals.items() if v==m]
                dominant[owners[0]]+=1
                if len(owners)>1: ties+=1

    report={
      "schemaVersion":"BMC01PlinthSupportAuditReport 0.1",
      "sceneId":cfg["sceneId"],
      "promotionEligible":False,
      "plinthQuad":local["target"]["plinth"]["quad"],
      "physicalDepthMm":local["target"]["plinth"]["physicalDepthMm"],
      "geometryPixels":total,
      "thresholdSweep":thresholds,
      "dominantAlphaOwnerPixels":dominant,
      "dominantAlphaTies":ties,
      "interpretationRules":[
        "alpha support quantifies compositing contribution, not automatically physical plinth ownership",
        "RGB similarity to base helps identify background-like support",
        "plinth must remain separate from carcass because physical depth and likely material/lighting differ"
      ]
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps({
      "geometryPixels":total,
      "dominant":dominant,
      "sweep":[{"t":x["alphaThreshold"],"union":x["unionSupportRatio"],"assets":x["assets"]} for x in thresholds]
    },sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
