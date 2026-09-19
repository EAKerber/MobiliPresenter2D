#!/usr/bin/env python3
"""Research-only canonical-frame projective consistency probe."""
from __future__ import annotations

import argparse
import json
import math
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def load_alpha(path):
    return Image.open(ROOT / path).convert("RGBA").getchannel("A")


def fit_xy(points):
    if len(points) < 2:
        raise ValueError("insufficient points")
    n = float(len(points))
    sx = sum(p[0] for p in points); sy = sum(p[1] for p in points)
    sxx = sum(p[0]*p[0] for p in points); sxy = sum(p[0]*p[1] for p in points)
    den = n*sxx - sx*sx
    if abs(den) < 1e-9:
        raise ValueError("singular fit")
    a = (n*sxy - sx*sy) / den
    b = (sy - a*sx) / n
    rms = math.sqrt(sum((y-(a*x+b))**2 for x,y in points)/len(points))
    return a,b,rms


def robust_fit(points, rounds=3, sigma=2.5):
    current=list(points)
    for _ in range(rounds):
        if len(current)<4: break
        a,b,rms=fit_xy(current)
        limit=max(0.75,rms*sigma)
        filtered=[p for p in current if abs(p[1]-(a*p[0]+b))<=limit]
        if len(filtered)==len(current) or len(filtered)<2: break
        current=filtered
    a,b,rms=fit_xy(current)
    return {"slope":a,"intercept":b,"rms":rms,"count":len(current)}


def mask_bounds(alpha, threshold):
    px=alpha.load(); xs=[]; ys=[]
    for y in range(alpha.height):
        for x in range(alpha.width):
            if px[x,y] >= threshold:
                xs.append(x); ys.append(y)
    if not xs: return None
    return min(xs),min(ys),max(xs)+1,max(ys)+1


def boundary_fits(alpha, threshold):
    px=alpha.load(); bounds=mask_bounds(alpha,threshold)
    if not bounds: raise ValueError("empty mask")
    x0,y0,x1,y1=bounds
    top=[]; bottom=[]; left=[]; right=[]
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if px[x,y]>=threshold]
        if ys:
            top.append((x,min(ys))); bottom.append((x,max(ys)))
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if px[x,y]>=threshold]
        if xs:
            left.append((y,min(xs))); right.append((y,max(xs)))
    ft=robust_fit(top); fb=robust_fit(bottom); fl=robust_fit(left); fr=robust_fit(right)
    # left/right were fit as x = a*y+b, so their slope field is dx/dy.
    return {
      "threshold":threshold,
      "bounds":list(bounds),
      "top":{"dyDx":ft["slope"],"angleDeg":math.degrees(math.atan(ft["slope"])),"rms":ft["rms"],"count":ft["count"]},
      "bottom":{"dyDx":fb["slope"],"angleDeg":math.degrees(math.atan(fb["slope"])),"rms":fb["rms"],"count":fb["count"]},
      "left":{"dxDy":fl["slope"],"angleFromVerticalDeg":math.degrees(math.atan(fl["slope"])),"rms":fl["rms"],"count":fl["count"]},
      "right":{"dxDy":fr["slope"],"angleFromVerticalDeg":math.degrees(math.atan(fr["slope"])),"rms":fr["rms"],"count":fr["count"]}
    }


def residual_component(layer_alpha, front_alpha, threshold, seed_quad):
    if layer_alpha.size != front_alpha.size:
        raise ValueError("module01 alpha/mask size mismatch")
    lp=layer_alpha.load(); fp=front_alpha.load()
    x0=min(p[0] for p in seed_quad); x1=max(p[0] for p in seed_quad)
    y0=min(p[1] for p in seed_quad); y1=max(p[1] for p in seed_quad)
    starts=[]
    for y in range(max(0,y0),min(layer_alpha.height,y1+1)):
        for x in range(max(0,x0),min(layer_alpha.width,x1+1)):
            if lp[x,y]>=threshold and fp[x,y]<threshold:
                starts.append((x,y))
    if not starts:
        return {"status":"BLOCKED","reason":"seed quad contains no residual support","threshold":threshold}
    seed=starts[len(starts)//2]
    q=deque([seed]); seen={seed}
    while q:
        x,y=q.popleft()
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if nx<0 or ny<0 or nx>=layer_alpha.width or ny>=layer_alpha.height or (nx,ny) in seen:
                continue
            if lp[nx,ny]>=threshold and fp[nx,ny]<threshold:
                seen.add((nx,ny)); q.append((nx,ny))
    xs=[p[0] for p in seen]; ys=[p[1] for p in seen]
    bounds=(min(xs),min(ys),max(xs)+1,max(ys)+1)
    # Top/bottom envelopes as functions of x are candidate physical depth edges.
    byx={}
    for x,y in seen: byx.setdefault(x,[]).append(y)
    top=[(x,min(v)) for x,v in sorted(byx.items())]
    bottom=[(x,max(v)) for x,v in sorted(byx.items())]
    result={"status":"OK","threshold":threshold,"pixelCount":len(seen),"bounds":list(bounds),"seed":list(seed)}
    if len(top)>=4:
        ft=robust_fit(top); fb=robust_fit(bottom)
        result["topDepthEdge"]={"dyDx":ft["slope"],"angleDeg":math.degrees(math.atan(ft["slope"])),"rms":ft["rms"],"count":ft["count"]}
        result["bottomDepthEdge"]={"dyDx":fb["slope"],"angleDeg":math.degrees(math.atan(fb["slope"])),"rms":fb["rms"],"count":fb["count"]}
    return result


def observation_record(item):
    fx,fy=item["front"]; bx,by=item["back"]
    dx=bx-fx; dy=by-fy
    return {
      **item,
      "vector":[dx,dy],
      "magnitudePx":math.hypot(dx,dy),
      "angleDeg":math.degrees(math.atan2(dy,dx)),
      "dxDy":dx/dy if dy else None
    }


def circular_spread(angles):
    if not angles: return None
    # For undirected parallel-line orientation, work modulo 180 degrees.
    doubled=[math.radians(2*a) for a in angles]
    cx=sum(math.cos(v) for v in doubled)/len(doubled)
    cy=sum(math.sin(v) for v in doubled)/len(doubled)
    mean=0.5*math.degrees(math.atan2(cy,cx))
    diffs=[]
    for a in angles:
        d=(a-mean+90)%180-90
        diffs.append(abs(d))
    return {"meanAngleDeg":mean,"maxAbsDeviationDeg":max(diffs),"meanAbsDeviationDeg":sum(diffs)/len(diffs)}


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--config",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    cfg=json.loads(args.config.read_text(encoding="utf-8"))
    if cfg.get("schemaVersion")!="SceneProjectiveConsistencyProbe 0.1":
        raise SystemExit("unsupported schema")
    fronts={}
    for item in cfg["frontMasks"]:
        alpha=load_alpha(item["mask"])
        fronts[item["id"]]=[boundary_fits(alpha,t) for t in cfg["thresholds"]]
    probe=cfg["module01SideProbe"]
    la=load_alpha(probe["layer"]); fa=load_alpha(probe["frontMask"])
    side=[residual_component(la,fa,t,probe["seedQuad"]) for t in cfg["thresholds"]]
    depth=[observation_record(x) for x in cfg["depthObservations"]]
    # only actual/explicit observations; annotation kept separate in report.
    actual_angles=[x["angleDeg"] for x in depth if x["authority"]=="measured-from-visible-pixels"]
    module01_angles=[]
    for item in side:
        if item.get("status")=="OK":
            for key in ("topDepthEdge","bottomDepthEdge"):
                if key in item: module01_angles.append(item[key]["angleDeg"])
    report={
      "schemaVersion":"SceneProjectiveConsistencyProbeReport 0.1",
      "sceneId":cfg["sceneId"],
      "status":"DIAGNOSTIC_ONLY",
      "promotionEligible":False,
      "frontMaskBoundaryFits":fronts,
      "module01SideResidualProbe":side,
      "depthObservations":depth,
      "depthOrientationSpread":{
        "measuredOnly":circular_spread(actual_angles),
        "module01ResidualOnly":circular_spread(module01_angles),
        "combinedMeasuredPlusModule01Residual":circular_spread(actual_angles+module01_angles)
      },
      "limitations":[
        "front-mask outer boundaries are proxy evidence, not hand-confirmed physical front corners",
        "module01 side residual is derived from layer alpha minus finish mask and remains a segmentation hypothesis",
        "human-calibrated module03 line is reported separately from measured-pixel authority",
        "this probe cannot by itself classify the whole scene as geometrically valid or invalid"
      ]
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps({
      "status":report["status"],
      "module01Side":[{"threshold":x["threshold"],"status":x["status"],"bounds":x.get("bounds"),"pixels":x.get("pixelCount")} for x in side],
      "combinedDepthSpread":report["depthOrientationSpread"]["combinedMeasuredPlusModule01Residual"]
    },sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
