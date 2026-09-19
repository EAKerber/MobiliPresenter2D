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


def load_rgba(path):
    return Image.open(ROOT / path).convert("RGBA")


def load_alpha(path):
    return load_rgba(path).getchannel("A")


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


def trace_internal_luma_edge(layer_rgba, x0, x1, anchor_y, search_radius, max_step, smoothness_penalty, min_alpha):
    gray=layer_rgba.convert("RGB").convert("L")
    alpha=layer_rgba.getchannel("A")
    candidates={}
    for x in range(max(1,x0),min(layer_rgba.width-1,x1)):
        rows=[]
        for y in range(max(1,anchor_y-search_radius),min(layer_rgba.height-1,anchor_y+search_radius+1)):
            if alpha.getpixel((x,y-1))<min_alpha or alpha.getpixel((x,y+1))<min_alpha:
                continue
            score=abs(gray.getpixel((x,y+1))-gray.getpixel((x,y-1)))
            rows.append((y,float(score)))
        if rows: candidates[x]=rows
    xs=sorted(candidates)
    if len(xs)<4:
        return {"status":"BLOCKED","reason":"insufficient interior gradient support"}
    # Dynamic programming: maximize edge energy while preferring a continuous path.
    states={}
    first=xs[0]
    for y,score in candidates[first]:
        states[y]=(score-smoothness_penalty*abs(y-anchor_y),[y])
    for x in xs[1:]:
        nxt={}
        for y,score in candidates[x]:
            best=None
            for py,(prev_score,path) in states.items():
                step=abs(y-py)
                if step>max_step: continue
                value=prev_score+score-smoothness_penalty*step
                if best is None or value>best[0]:
                    best=(value,path+[y])
            if best is not None: nxt[y]=best
        if not nxt:
            return {"status":"BLOCKED","reason":f"edge trace continuity lost at x={x}"}
        states=nxt
    _,path=max(states.values(),key=lambda item:item[0])
    points=list(zip(xs,path))
    fit=robust_fit(points)
    return {
      "status":"OK",
      "points":[list(p) for p in points],
      "dyDx":fit["slope"],
      "intercept":fit["intercept"],
      "angleDeg":math.degrees(math.atan(fit["slope"])),
      "rms":fit["rms"],
      "count":fit["count"],
      "xRange":[xs[0],xs[-1]]
    }


def residual_component(layer_alpha, front_alpha, threshold, seed_quad, side=None, margin=0):
    if layer_alpha.size != front_alpha.size:
        raise ValueError("module01 alpha/mask size mismatch")
    lp=layer_alpha.load(); fp=front_alpha.load()
    front_bounds=mask_bounds(front_alpha,threshold)
    if not front_bounds:
        return {"status":"BLOCKED","reason":"front mask empty","threshold":threshold}
    fx0,fy0,fx1,fy1=front_bounds
    def topology_ok(x,y):
        if side=="right":
            return x >= fx1 - int(margin)
        if side=="left":
            return x < fx0 + int(margin)
        return True
    x0=min(p[0] for p in seed_quad); x1=max(p[0] for p in seed_quad)
    y0=min(p[1] for p in seed_quad); y1=max(p[1] for p in seed_quad)
    starts=[]
    for y in range(max(0,y0),min(layer_alpha.height,y1+1)):
        for x in range(max(0,x0),min(layer_alpha.width,x1+1)):
            if topology_ok(x,y) and lp[x,y]>=threshold and fp[x,y]<threshold:
                starts.append((x,y))
    if not starts:
        return {"status":"BLOCKED","reason":"seed quad contains no topology-constrained residual support","threshold":threshold}
    seed=starts[len(starts)//2]
    q=deque([seed]); seen={seed}
    while q:
        x,y=q.popleft()
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if nx<0 or ny<0 or nx>=layer_alpha.width or ny>=layer_alpha.height or (nx,ny) in seen:
                continue
            if topology_ok(nx,ny) and lp[nx,ny]>=threshold and fp[nx,ny]<threshold:
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
        result["topDepthEdge"]={"dyDx":ft["slope"],"intercept":ft["intercept"],"angleDeg":math.degrees(math.atan(ft["slope"])),"rms":ft["rms"],"count":ft["count"]}
        result["bottomDepthEdge"]={"dyDx":fb["slope"],"intercept":fb["intercept"],"angleDeg":math.degrees(math.atan(fb["slope"])),"rms":fb["rms"],"count":fb["count"]}
    result["frontMaskBounds"]=list(front_bounds)
    result["topologyConstraint"]={"side":side,"marginPx":margin}
    return result


def intersect_yx_lines(first, second):
    a1,b1=first["dyDx"],first["intercept"]
    a2,b2=second["dyDx"],second["intercept"]
    if abs(a1-a2)<1e-9:
        return None
    x=(b2-b1)/(a1-a2)
    return [x,a1*x+b1]


def point_line_distance(point, front, back):
    x0,y0=point; x1,y1=front; x2,y2=back
    dx=x2-x1; dy=y2-y1
    den=math.hypot(dx,dy)
    if den<1e-9: return None
    return abs(dy*x0-dx*y0+x2*y1-y2*x1)/den


def fit_reference_alpha_observation(item):
    cfg=json.loads((ROOT/item["config"]).read_text(encoding="utf-8"))
    alpha=load_alpha(item["reference"])
    x0,x1=cfg["searchX"]; y0,y1=cfg["evaluationRows"]
    threshold=cfg["alphaThreshold"]
    points=[]
    for y in range(y0,y1+1):
        hits=[x for x in range(x0,x1+1) if alpha.getpixel((x,y))>=threshold]
        if not hits or hits[0]==x0:
            raise ValueError(f"reference alpha edge missing/clipped for {item['id']} row {y}")
        points.append((y,hits[0]-.5))
    fit=robust_fit(points)
    ox,oy=cfg.get("sceneOffset",[0,0])
    # crop line x_crop = m*y_crop+b -> scene x = m*scene_y + (b+ox-m*oy)
    m=fit["slope"]; b_scene=fit["intercept"]+ox-m*oy
    scene_points=[[x+ox,y+oy] for y,x in points]
    return {
      **item,
      "slopeDxDy":m,
      "interceptScene":b_scene,
      "rmsPx":fit["rms"],
      "scenePoints":scene_points,
      "sceneOffset":[ox,oy]
    }


def line_equation_from_points(front, back):
    x1,y1=front; x2,y2=back
    a=y1-y2; b=x2-x1; c=x1*y2-x2*y1
    norm=math.hypot(a,b)
    if norm<1e-9: raise ValueError("degenerate line")
    return [a/norm,b/norm,c/norm]


def line_equation_from_yx(edge):
    # y = m*x+b
    m=edge["dyDx"]; b=edge["intercept"]
    a=-m; bb=1.0; c=-b
    norm=math.hypot(a,bb)
    return [a/norm,bb/norm,c/norm]


def line_equation_from_xy_slope(obs):
    # x = m*y+b
    m=obs["slopeDxDy"]; b=obs["interceptScene"]
    a=1.0; bb=-m; c=-b
    norm=math.hypot(a,bb)
    return [a/norm,bb/norm,c/norm]


def least_squares_intersection(named_lines):
    # Minimize sum (a*x+b*y+c)^2 for normalized lines.
    saa=sum(line[1][0]**2 for line in named_lines)
    sab=sum(line[1][0]*line[1][1] for line in named_lines)
    sbb=sum(line[1][1]**2 for line in named_lines)
    sac=sum(line[1][0]*line[1][2] for line in named_lines)
    sbc=sum(line[1][1]*line[1][2] for line in named_lines)
    det=saa*sbb-sab*sab
    if abs(det)<1e-9: return None
    x=(-sac*sbb+sab*sbc)/det
    y=(-saa*sbc+sab*sac)/det
    residuals={name:abs(a*x+b*y+c) for name,(a,b,c) in named_lines}
    return {"point":[x,y],"residualPx":residuals,"rmsPx":math.sqrt(sum(v*v for v in residuals.values())/len(residuals))}


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
    layer_rgba=load_rgba(probe["layer"]); la=layer_rgba.getchannel("A"); fa=load_alpha(probe["frontMask"])
    side=[residual_component(la,fa,t,probe["seedQuad"],probe.get("side"),probe.get("frontBoundaryMarginPx",0)) for t in cfg["thresholds"]]
    trace_cfg=probe.get("rgbEdgeTrace",{}).get("bottom")
    module01_bottom_trace=None
    if trace_cfg:
        fb=mask_bounds(fa,128)
        if fb:
            fx0,fy0,fx1,fy1=fb
            side_bound=next((x.get("bounds") for x in side if x.get("status")=="OK"),None)
            if side_bound:
                module01_bottom_trace=trace_internal_luma_edge(
                    layer_rgba,
                    fx1-1,
                    side_bound[2],
                    fy1-1,
                    int(trace_cfg["searchRadiusPx"]),
                    int(trace_cfg["maxStepPx"]),
                    float(trace_cfg["smoothnessPenalty"]),
                    int(trace_cfg["minInteriorAlpha"]),
                )
    depth=[observation_record(x) for x in cfg["depthObservations"]]
    pixel_lines=[fit_reference_alpha_observation(x) for x in cfg.get("pixelLineObservations",[])]
    vanishing=[]
    for item in side:
        if item.get("status")!="OK" or "topDepthEdge" not in item or "bottomDepthEdge" not in item:
            continue
        vp=intersect_yx_lines(item["topDepthEdge"],item["bottomDepthEdge"])
        record={"threshold":item["threshold"],"point":vp}
        if vp is not None:
            record["observationResidualPx"]={
                obs["id"]:point_line_distance(vp,obs["front"],obs["back"]) for obs in depth
            }
        vanishing.append(record)
    # only actual/explicit observations; annotation kept separate in report.
    actual_angles=[x["angleDeg"] for x in depth if x["authority"]=="measured-from-visible-pixels"]
    module01_angles=[]
    for item in side:
        if item.get("status")=="OK":
            for key in ("topDepthEdge","bottomDepthEdge"):
                if key in item: module01_angles.append(item[key]["angleDeg"])
    common_vp=[]
    module01_two_edge_vp=None
    side_reference=next((x for x in side if x.get("status")=="OK" and "topDepthEdge" in x and "bottomDepthEdge" in x),None)
    if side_reference:
        # The outer top/bottom residual boundaries are the physical top/bottom
        # boundaries of the confirmed full-height right side panel. The earlier
        # interior luminance trace is retained only as a rejected diagnostic.
        module01_two_edge_vp=least_squares_intersection([
          ("module01-side-top",line_equation_from_yx(side_reference["topDepthEdge"])),
          ("module01-side-bottom",line_equation_from_yx(side_reference["bottomDepthEdge"])),
        ])
    module02_measured=next((x for x in depth if x["id"]=="module02-stone-visible-depth"),None)
    pixel03=next((x for x in pixel_lines if x["id"]=="module03-stone-reference-alpha-edge"),None)
    for item in side:
        if item.get("status")!="OK" or "topDepthEdge" not in item or not module02_measured or not pixel03:
            continue
        lines=[
          ("module01-side-top",line_equation_from_yx(item["topDepthEdge"])),
          ("module02-stone",line_equation_from_points(module02_measured["front"],module02_measured["back"])),
          ("module03-stone-alpha",line_equation_from_xy_slope(pixel03)),
        ]
        fit=least_squares_intersection(lines)
        common_vp.append({"threshold":item["threshold"],"fit":fit})

    module01_vp_residuals=None
    if module01_two_edge_vp and module01_two_edge_vp.get("point"):
        vp=module01_two_edge_vp["point"]
        module01_vp_residuals={
          "module02-stone-visible-depth": point_line_distance(vp,module02_measured["front"],module02_measured["back"]) if module02_measured else None,
          "module03-stone-reference-alpha-edge": abs(
              line_equation_from_xy_slope(pixel03)[0]*vp[0]
              + line_equation_from_xy_slope(pixel03)[1]*vp[1]
              + line_equation_from_xy_slope(pixel03)[2]
          ) if pixel03 else None,
        }

    report={
      "schemaVersion":"SceneProjectiveConsistencyProbeReport 0.1",
      "sceneId":cfg["sceneId"],
      "status":"DIAGNOSTIC_ONLY",
      "promotionEligible":False,
      "frontMaskBoundaryFits":fronts,
      "module01SideResidualProbe":side,
      "module01BottomInternalEdgeTrace":{
        "status":"REJECTED_AS_PHYSICAL_EDGE",
        "reason":"visual/topology review shows this luminance trace is an interior shading transition; the physical bottom depth edge is the outer side-panel boundary",
        "diagnostic":module01_bottom_trace
      },
      "module01PhysicalSideEdgeStatus":{
        "status":"CONFIRMED_FOR_RESEARCH",
        "physicalSource":"MobiliPresenter Scene Core module01 right-side: full-height 700 mm x depth 350 mm side panel",
        "rasterSource":"canonical Module 01 layer alpha residual to the right of the front finish mask",
        "thresholdStability":"same fitted top/bottom support across tested alpha thresholds",
        "visualReview":"PASS against the isolated Module 01 side screenshot supplied in the project conversation"
      },
      "module01TwoEdgeVanishingFit":module01_two_edge_vp,
      "module01VanishingResidualToOtherDepthEvidencePx":module01_vp_residuals,
      "module01DepthVanishingHypothesis":vanishing,
      "depthObservations":depth,
      "pixelLineObservations":pixel_lines,
      "commonDepthVanishingFit":{
        "status":"LEGACY_DIAGNOSTIC_ONLY",
        "reason":"includes the provenance-contaminated historical Module 02 line; do not use for current scene classification",
        "fits":common_vp
      },
      "depthOrientationSpread":{
        "measuredOnly":circular_spread(actual_angles),
        "module01ResidualOnly":circular_spread(module01_angles),
        "combinedMeasuredPlusModule01Residual":circular_spread(actual_angles+module01_angles)
      },
      "preliminaryClassification":{
        "sceneClass":"INSUFFICIENT_CURRENT_DEPTH_EVIDENCE",
        "nextClassQuestion":"FIND_CURRENT_OWNED_Y_DIRECTION_EDGE",
        "reason":"Module 01 supplies a strong local Y-direction vanishing point, but the historical Module 02 comparison line is now known to be primarily conditional joint-bridge support and is not visible in the current module-03-hidden state"
      },
      "limitations":[
        "front finish masks are authoring/control masks; their axis-aligned outer boundaries must not be used as independent camera evidence",
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
