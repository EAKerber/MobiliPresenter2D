#!/usr/bin/env python3
"""Measure current-owned stone top-surface termination depth edges.

The top band comes from the existing conservative StoneSurfaceMasks config.
Physical slab depth comes from Scene Core. This probe measures pixels only and
does not promote the result to a global camera calibration.
"""
from __future__ import annotations
import argparse, json, math
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]

def fit_xy(points):
    # x = a*y + b
    n=len(points)
    if n<2: return None
    sy=sum(y for x,y in points); sx=sum(x for x,y in points)
    syy=sum(y*y for x,y in points); sxy=sum(x*y for x,y in points)
    den=n*syy-sy*sy
    if den==0: return None
    a=(n*sxy-sy*sx)/den
    b=(sx-a*sy)/n
    rms=math.sqrt(sum((x-(a*y+b))**2 for x,y in points)/n)
    return {"slopeDxDy":a,"intercept":b,"rmsPx":rms,"count":n}

def trace(alpha,search_x,y_range,threshold,extreme):
    x0,x1=map(int,search_x); y0,y1=map(int,y_range)
    pts=[]
    rows=[]
    for y in range(y0,y1+1):
        hits=[x for x in range(x0,x1+1) if alpha.getpixel((x,y))>=threshold]
        if not hits:
            rows.append({"y":y,"status":"MISSING"})
            continue
        x=max(hits) if extreme=="right" else min(hits)
        clipped=(x==x1 if extreme=="right" else x==x0)
        rows.append({"y":y,"x":x,"status":"CLIPPED" if clipped else "OK"})
        if not clipped: pts.append((float(x),float(y)))
    fit=fit_xy(pts)
    if fit:
        y0f=float(y0); y1f=float(y1)
        back=[fit["slopeDxDy"]*y0f+fit["intercept"],y0f]
        front=[fit["slopeDxDy"]*y1f+fit["intercept"],y1f]
        vector=[back[0]-front[0],back[1]-front[1]]
    else:
        back=front=vector=None
    return {"threshold":threshold,"points":pts,"rows":rows,"fit":fit,"backPx":back,"frontPx":front,"frontToBackVectorPx":vector}

def surface_reference(surface_cfg,group):
    poly=surface_cfg["groups"][group]["surfaces"]["top"]
    # Existing config order is back-left, back-right, front-right, front-left.
    if group=="stone-02":
        back=poly[1]; front=poly[2]
    else:
        back=poly[0]; front=poly[3]
    return {
      "backPx":back,
      "frontPx":front,
      "frontToBackVectorPx":[back[0]-front[0],back[1]-front[1]],
      "status":"manual-conservative-surface-polygon"
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--config",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    cfg=json.loads(args.config.read_text(encoding="utf-8"))
    surf=json.loads((ROOT/cfg["surfaceConfig"]).read_text(encoding="utf-8"))
    records=[]
    for item in cfg["edges"]:
        alpha=Image.open(ROOT/item["asset"]).convert("RGBA").getchannel("A")
        sweep=[trace(alpha,item["searchX"],cfg["yRange"],int(t),item["extreme"]) for t in cfg["alphaThresholds"]]
        records.append({
          "id":item["id"],
          "asset":item["asset"],
          "extreme":item["extreme"],
          "physicalSlabDepthMm":cfg["physicalSlabDepthMm"],
          "surfaceReference":surface_reference(surf,item["surfacePolygonGroup"]),
          "thresholdSweep":sweep
        })
    report={
      "schemaVersion":"StoneDepthEdgeProbeReport 0.1",
      "sceneId":cfg["sceneId"],
      "status":"RESEARCH",
      "promotionEligible":False,
      "topBandY":cfg["yRange"],
      "physicalSlabDepthMm":cfg["physicalSlabDepthMm"],
      "records":records,
      "limitations":[
        "surface polygons are existing manual conservative review geometry, not final semantic segmentation",
        "alpha edge can contain antialiasing and local clipping artifacts",
        "a stable local depth edge does not establish a global camera"
      ]
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps({
      r["id"]:[
        {"t":x["threshold"],"v":x["frontToBackVectorPx"],"rms":x["fit"]["rmsPx"] if x["fit"] else None}
        for x in r["thresholdSweep"]
      ] for r in records
    },sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
