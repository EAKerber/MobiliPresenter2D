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

def alpha_confidence(raw,geom,seam,bins,solid_threshold,strong_threshold):
    rp=raw.load(); gp=geom.load()
    gb=geom.getbbox()
    values=[]
    by_x={}
    if gb:
        for y in range(gb[1],gb[3]):
            for x in range(max(gb[0],int(seam)+1),gb[2]):
                if not gp[x,y]:
                    continue
                a=int(rp[x,y])
                values.append(a)
                rec=by_x.setdefault(x,{"geometryPixels":0,"alphaPositivePixels":0,"solidPixels":0,"strongPixels":0,"alphaMass":0.0,"alphaSum":0,"maxAlpha":0})
                rec["geometryPixels"]+=1
                rec["alphaSum"]+=a
                rec["alphaMass"]+=a/255.0
                rec["maxAlpha"]=max(rec["maxAlpha"],a)
                if a>0: rec["alphaPositivePixels"]+=1
                if a>=solid_threshold: rec["solidPixels"]+=1
                if a>=strong_threshold: rec["strongPixels"]+=1
    hist=[]
    for lo,hi in bins:
        n=sum(1 for v in values if lo<=v<=hi)
        hist.append({"minAlpha":lo,"maxAlpha":hi,"pixels":n,"ratio":n/len(values) if values else 0})
    columns=[]
    for x in sorted(by_x):
        r=by_x[x]
        g=r["geometryPixels"]
        columns.append({
          "x":x,
          **r,
          "meanAlpha":r["alphaSum"]/g if g else 0,
          "effectiveOpaqueCoverageRatio":r["alphaMass"]/g if g else 0,
          "alphaPositiveRatio":r["alphaPositivePixels"]/g if g else 0,
          "solidRatio":r["solidPixels"]/g if g else 0,
          "strongRatio":r["strongPixels"]/g if g else 0
        })
    n=len(values)
    nonzero=[v for v in values if v>0]
    solid=sum(v>=solid_threshold for v in values)
    strong=sum(v>=strong_threshold for v in values)
    mass=sum(values)/255.0
    sorted_nonzero=sorted(nonzero)
    def q(frac):
        if not sorted_nonzero: return None
        return sorted_nonzero[round((len(sorted_nonzero)-1)*frac)]
    return {
      "geometrySidePixels":n,
      "alphaZeroPixels":sum(v==0 for v in values),
      "alphaPositivePixels":len(nonzero),
      "alphaPositiveRatio":len(nonzero)/n if n else 0,
      "solidThreshold":solid_threshold,
      "solidPixels":solid,
      "solidRatio":solid/n if n else 0,
      "strongThreshold":strong_threshold,
      "strongPixels":strong,
      "strongRatio":strong/n if n else 0,
      "alphaMassEquivalentOpaquePixels":mass,
      "effectiveOpaqueCoverageRatio":mass/n if n else 0,
      "meanAlphaAll":sum(values)/n if n else 0,
      "meanAlphaPositive":sum(nonzero)/len(nonzero) if nonzero else 0,
      "nonzeroAlphaQuantiles":{"q10":q(.10),"q25":q(.25),"q50":q(.50),"q75":q(.75),"q90":q(.90)},
      "histogram":hist,
      "columns":columns
    }

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

    confidence_cfg=cfg.get("alphaConfidence") or {}
    confidence=alpha_confidence(
      m02,geom,cfg["frontSeamX"],
      confidence_cfg.get("bins",[[1,127],[128,254],[255,255]]),
      int(confidence_cfg.get("solidThreshold",128)),
      int(confidence_cfg.get("strongThreshold",224))
    )
    report={
      "schemaVersion":"BMC01UnderlayerReuseAuditReport 0.2",
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
      "alphaConfidence":confidence,
      "interpretation":[
        "sameObjectSidePixels are exact current Module 02 layer pixels inside the locally projected side and to the right of the measured front seam",
        "coveredByModule03Pixels quantify how much of that exact side is hidden by current Module 03 body/stone alpha in the default state",
        "nonzero alpha alone is compositing support, not proof of opaque physical side occupancy",
        "solid/strong alpha tiers are reported separately so later completion can preserve true same-object face evidence without mistaking soft antialias/shadow support for completed geometry"
      ]
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(report,sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
