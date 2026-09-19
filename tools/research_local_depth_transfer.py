#!/usr/bin/env python3
"""Research-only adjacent-region physical-depth transfer.

Transfers a measured reference depth vector by the ratio of confirmed physical
depths. This is a local affine hypothesis, not a global camera model.
"""
from __future__ import annotations
import argparse, json, math
from pathlib import Path

def vec(a,b):
    return [float(b[0])-float(a[0]), float(b[1])-float(a[1])]

def add(a,v):
    return [float(a[0])+float(v[0]), float(a[1])+float(v[1])]

def scale(v,k):
    return [float(v[0])*k,float(v[1])*k]

def dist(a,b):
    return math.hypot(float(a[0])-float(b[0]),float(a[1])-float(b[1]))

def transfer(reference,target):
    ref_front=reference["frontPx"]; ref_back=reference["backPx"]
    ref_depth=float(reference["physicalDepthMm"])
    if ref_depth<=0: raise ValueError("reference depth must be positive")
    front_top=target["frontTopPx"]; front_bottom=target["frontBottomPx"]
    depth=float(target["physicalDepthMm"])
    if depth<=0: raise ValueError("target depth must be positive")
    reference_vector=vec(ref_front,ref_back)
    ratio=depth/ref_depth
    target_vector=scale(reference_vector,ratio)
    back_top=add(front_top,target_vector)
    back_bottom=add(front_bottom,target_vector)
    return {
      "physicalDepthMm":depth,
      "referenceDepthMm":ref_depth,
      "depthRatio":ratio,
      "referenceFrontToBackVectorPx":reference_vector,
      "targetFrontToBackVectorPx":target_vector,
      "quad":[list(map(float,front_top)),back_top,back_bottom,list(map(float,front_bottom))]
    }

def compare_quad(current,historical):
    if len(current)!=len(historical): return None
    ds=[dist(a,b) for a,b in zip(current,historical)]
    return {"cornerDisplacementPx":ds,"maxCornerDisplacementPx":max(ds),"meanCornerDisplacementPx":sum(ds)/len(ds)}

def evaluate(cfg):
    reference=cfg["reference"]; target=cfg["target"]
    carcass=transfer(reference,target["carcass"])
    plinth=transfer(reference,target["plinth"])
    return {
      "schemaVersion":"LocalDepthTransferProbeReport 0.2" if cfg.get("schemaVersion")=="LocalDepthTransferProbe 0.2" else "LocalDepthTransferProbeReport 0.1",
      "sceneId":cfg["sceneId"],
      "status":"RESEARCH_CANDIDATE",
      "promotionEligible":False,
      "model":cfg["policy"]["model"],
      "reference":{
        "id":reference["id"],
        "frontPx":reference["frontPx"],
        "backPx":reference["backPx"],
        "physicalDepthMm":reference["physicalDepthMm"],
        "frontToBackVectorPx":vec(reference["frontPx"],reference["backPx"]),
        "status":reference["status"],
        "sourceAlphaThreshold":reference.get("sourceAlphaThreshold"),
        "evidence":reference["evidence"]
      },
      "target":{
        "id":target["id"],
        "frontSeamX":target["frontSeamX"],
        "frontSeamStatus":target["frontSeamStatus"],
        "carcass":carcass,
        "plinth":plinth
      },
      "historicalComparison":{
        "carcass":compare_quad(carcass["quad"],cfg["historical"]["sidePanelQuad"]),
        "plinth":compare_quad(plinth["quad"],cfg["historical"]["plinthQuad"]),
        "historicalStatus":cfg["historical"]["status"],
        "warning":cfg["historical"]["warning"]
      },
      "limitations":[
        "assumes adjacent lower-zone projection can be approximated locally as affine over the transferred depth",
        "does not establish a global camera or vanishing point",
        "does not yet model depth-dependent vertical scale at the rear edge",
        "geometry candidate must be raster-benchmarked against the current composition before promotion"
      ]
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--config",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    cfg=json.loads(args.config.read_text(encoding="utf-8"))
    if cfg.get("schemaVersion") not in {"LocalDepthTransferProbe 0.1","LocalDepthTransferProbe 0.2"}:
        raise SystemExit("unsupported schema")
    report=evaluate(cfg)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps({
      "status":report["status"],
      "carcassVector":report["target"]["carcass"]["targetFrontToBackVectorPx"],
      "plinthVector":report["target"]["plinth"]["targetFrontToBackVectorPx"],
      "carcassQuad":report["target"]["carcass"]["quad"]
    },sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
