#!/usr/bin/env python3
"""Project a physical rectangle into a local planar host quad using bilinear coordinates."""
from __future__ import annotations
import argparse, json, math
from pathlib import Path

def lerp(a,b,t):
    return [float(a[0])+(float(b[0])-float(a[0]))*t, float(a[1])+(float(b[1])-float(a[1]))*t]

def project(host_quad, host_size_mm, point_mm):
    width,depth=map(float,host_size_mm)
    x,y=map(float,point_mm)
    if width<=0 or depth<=0:
        raise ValueError("host dimensions must be positive")
    u=x/width; v=y/depth
    front=lerp(host_quad["frontLeft"],host_quad["frontRight"],u)
    back=lerp(host_quad["backLeft"],host_quad["backRight"],u)
    return lerp(front,back,v)

def rect_quad(host_quad,host_size_mm,offset,size):
    ox,oy=map(float,offset); w,d=map(float,size)
    return {
      "frontLeft":project(host_quad,host_size_mm,[ox,oy]),
      "frontRight":project(host_quad,host_size_mm,[ox+w,oy]),
      "backRight":project(host_quad,host_size_mm,[ox+w,oy+d]),
      "backLeft":project(host_quad,host_size_mm,[ox,oy+d]),
    }

def distance(a,b):
    return math.hypot(float(a[0])-float(b[0]),float(a[1])-float(b[1]))

def edge_vector(a,b):
    return [float(b[0])-float(a[0]),float(b[1])-float(a[1])]

def evaluate(cfg):
    host=cfg["host"]; target=cfg["targetRect"]
    quad=rect_quad(host["quadPx"],host["physicalSizeMm"],target["offsetMmFromHostFrontLeft"],target["sizeMm"])
    legacy=cfg["legacyComparison"]["protectedCooktopQuadPx"]
    displacement={k:distance(quad[k],legacy[k]) for k in quad}
    fit=cfg["legacyComparison"]["existingRegeneratedFitXYWH"]
    x,y,w,h=map(float,fit)
    fit_quad={
      "frontLeft":[x,y+h],
      "frontRight":[x+w,y+h],
      "backRight":[x+w,y],
      "backLeft":[x,y],
    }
    fit_displacement={k:distance(quad[k],fit_quad[k]) for k in quad}
    return {
      "schemaVersion":"PlanarRectProjectionProbeReport 0.1",
      "sceneId":cfg["sceneId"],
      "operationId":cfg["operationId"],
      "status":"RESEARCH_CANDIDATE",
      "promotionEligible":False,
      "host":host,
      "targetRect":target,
      "targetQuadPx":quad,
      "targetEdgesPx":{
        "frontWidth":edge_vector(quad["frontLeft"],quad["frontRight"]),
        "backWidth":edge_vector(quad["backLeft"],quad["backRight"]),
        "leftDepth":edge_vector(quad["frontLeft"],quad["backLeft"]),
        "rightDepth":edge_vector(quad["frontRight"],quad["backRight"]),
      },
      "legacyProtectedQuadComparison":{
        "cornerDisplacementPx":displacement,
        "maxCornerDisplacementPx":max(displacement.values()),
        "meanCornerDisplacementPx":sum(displacement.values())/len(displacement),
      },
      "existingRegeneratedFitComparison":{
        "fitQuadPx":fit_quad,
        "cornerDisplacementPx":fit_displacement,
        "maxCornerDisplacementPx":max(fit_displacement.values()),
        "meanCornerDisplacementPx":sum(fit_displacement.values())/len(fit_displacement),
      },
      "limitations":[
        "host quad is local-derived from the canonical Stone02 surface mask, not a global camera calibration",
        "cooktop slot dimensions/placement are inferred in Scene Core rather than confirmed product dimensions",
        "bilinear host-plane mapping is used only inside the bounded Stone02 top surface"
      ]
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--config",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    cfg=json.loads(args.config.read_text(encoding="utf-8"))
    if cfg.get("schemaVersion")!="PlanarRectProjectionProbe 0.1":
        raise SystemExit("unsupported schema")
    report=evaluate(cfg)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(report,sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
