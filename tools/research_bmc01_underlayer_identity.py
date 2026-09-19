#!/usr/bin/env python3
"""Audit whether BMC-01 underlayer RGB is object-specific or background-like."""
from __future__ import annotations
import argparse, json, math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]

def pmask(size,quad):
    im=Image.new("L",size,0)
    ImageDraw.Draw(im).polygon([(round(float(x)),round(float(y))) for x,y in quad],fill=255)
    return im

def summarize(values):
    if not values:
        return {"pixels":0}
    ordered=sorted(values)
    def q(frac):
        return ordered[round((len(ordered)-1)*frac)]
    return {
      "pixels":len(values),
      "meanAbsChannelDifference":sum(values)/len(values),
      "q10":q(.10),"q25":q(.25),"q50":q(.50),"q75":q(.75),"q90":q(.90),
      "max":max(values)
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--config",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    cfg=json.loads(args.config.read_text(encoding="utf-8"))
    local=json.loads((ROOT/cfg["localTransferReport"]).read_text(encoding="utf-8"))
    base=Image.open(ROOT/cfg["baseAsset"]).convert("RGB")
    layer=Image.open(ROOT/cfg["module02Layer"]).convert("RGBA")
    if base.size!=layer.size:
        raise RuntimeError("base/layer size mismatch")
    geom=pmask(base.size,local["target"]["carcass"]["quad"])
    gp=geom.load(); bp=base.load(); lp=layer.load()
    seam=int(cfg["frontSeamX"])
    bounds=geom.getbbox()
    reports=[]
    for band in cfg["bands"]:
        lo=int(band["minAlpha"]); hi=int(band["maxAlpha"])
        diffs=[]; exact=near2=near5=near10=0
        samples=[]
        by_x={}
        if bounds:
            for y in range(bounds[1],bounds[3]):
                for x in range(max(bounds[0],seam+1),bounds[2]):
                    if not gp[x,y]: continue
                    r,g,b,a=lp[x,y]
                    if not (lo<=a<=hi): continue
                    br,bg,bb=bp[x,y]
                    d=(abs(r-br)+abs(g-bg)+abs(b-bb))/3
                    diffs.append(d)
                    exact+=d==0
                    near2+=d<=2
                    near5+=d<=5
                    near10+=d<=10
                    if len(samples)<24:
                        samples.append({"point":[x,y],"alpha":a,"layerRgb":[r,g,b],"baseRgb":[br,bg,bb],"meanAbsDiff":d})
                    rec=by_x.setdefault(x,[])
                    rec.append(d)
        n=len(diffs)
        reports.append({
          "id":band["id"],"alphaRange":[lo,hi],
          **summarize(diffs),
          "exactBaseMatchPixels":exact,
          "exactBaseMatchRatio":exact/n if n else 0,
          "within2Ratio":near2/n if n else 0,
          "within5Ratio":near5/n if n else 0,
          "within10Ratio":near10/n if n else 0,
          "byColumn":[{"x":x,**summarize(vals)} for x,vals in sorted(by_x.items())],
          "samples":samples
        })
    report={
      "schemaVersion":"BMC01UnderlayerIdentityAuditReport 0.1",
      "sceneId":cfg["sceneId"],
      "promotionEligible":False,
      "baseAsset":cfg["baseAsset"],
      "module02Layer":cfg["module02Layer"],
      "localCarcassQuad":local["target"]["carcass"]["quad"],
      "bands":reports,
      "interpretationRules":[
        "low RGB difference to base means the layer pixel carries little object-specific appearance evidence at that coordinate",
        "alpha magnitude alone does not establish semantic ownership",
        "high difference to base is necessary but not sufficient for calling a pixel physical side-face appearance"
      ]
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps({x["id"]:{k:x[k] for k in ("pixels","meanAbsChannelDifference","exactBaseMatchRatio","within5Ratio","q50","q90")} for x in reports},sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
