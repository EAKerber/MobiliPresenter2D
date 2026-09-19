#!/usr/bin/env python3
"""Visual/semantic audit of BMC-01 locally projected plinth support."""
from __future__ import annotations
import argparse, copy, json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
try:
    from tools.render_variant_fidelity import render_case, safe_app_path
except ModuleNotFoundError:
    from render_variant_fidelity import render_case, safe_app_path

ROOT=Path(__file__).resolve().parents[1]

def pmask(size,quad):
    im=Image.new("L",size,0)
    ImageDraw.Draw(im).polygon([(round(float(x)),round(float(y))) for x,y in quad],fill=255)
    return im

def summarize_alpha_rgb(im,base,geom,threshold):
    ip=im.load(); bp=base.load(); gp=geom.load(); b=geom.getbbox()
    vals=[]; alphas=[]; points=[]
    if b:
        for y in range(b[1],b[3]):
            for x in range(b[0],b[2]):
                if not gp[x,y]: continue
                r,g,bb,a=ip[x,y]
                if a<threshold: continue
                br,bg,bbb=bp[x,y]
                d=(abs(r-br)+abs(g-bg)+abs(bb-bbb))/3
                vals.append(d); alphas.append(a)
                if len(points)<40:
                    points.append({"point":[x,y],"alpha":a,"rgb":[r,g,bb],"baseRgb":[br,bg,bbb],"meanAbsDiff":d})
    return {
      "threshold":threshold,
      "pixels":len(vals),
      "meanRgbDifferenceToBase":sum(vals)/len(vals) if vals else None,
      "meanAlpha":sum(alphas)/len(alphas) if alphas else None,
      "minAlpha":min(alphas) if alphas else None,
      "maxAlpha":max(alphas) if alphas else None,
      "samples":points,
    }

def alpha_mask(im,threshold):
    return im.getchannel("A").point(lambda v:255 if v>=threshold else 0)

def panel_from_image(im,crop,scale,label):
    c=im.crop(crop).convert("RGB")
    c=c.resize((c.width*scale,c.height*scale),Image.Resampling.NEAREST)
    panel=Image.new("RGB",(c.width,c.height+26),"white")
    panel.paste(c,(0,26)); ImageDraw.Draw(panel).text((6,7),label,fill="black")
    return panel

def mask_panel(mask,crop,scale,label):
    rgb=Image.merge("RGB",(mask,mask,mask))
    return panel_from_image(rgb,crop,scale,label)

def alpha_composite_over_base(base,layer):
    return Image.alpha_composite(base.convert("RGBA"),layer).convert("RGBA")

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--config",type=Path,required=True)
    ap.add_argument("--variant-manifest",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    ap.add_argument("--review-image",type=Path,required=True)
    args=ap.parse_args()

    cfg=json.loads(args.config.read_text(encoding="utf-8"))
    manifest=json.loads(args.variant_manifest.read_text(encoding="utf-8"))
    local=json.loads((ROOT/cfg["localTransferReport"]).read_text(encoding="utf-8"))
    size=(manifest["canvas"]["width"],manifest["canvas"]["height"])
    base=Image.open(ROOT/cfg["baseAsset"]).convert("RGBA")
    m02=Image.open(ROOT/cfg["module02Layer"]).convert("RGBA")
    stone=Image.open(ROOT/cfg["stone02Variant"]).convert("RGBA")
    geom=pmask(size,local["target"]["plinth"]["quad"])

    case=next(x for x in manifest["cases"] if x["id"]==cfg["targetVariant"])
    clean_case=copy.deepcopy(case)
    clean_case["visibleEntities"]=[e for e in case["visibleEntities"] if e["id"]!=cfg["excludeEntityForClean"]]
    clean=render_case(base,clean_case,size)

    report={
      "schemaVersion":"BMC01PlinthIdentityAuditReport 0.1",
      "sceneId":cfg["sceneId"],
      "promotionEligible":False,
      "plinthQuad":local["target"]["plinth"]["quad"],
      "physicalDepthMm":local["target"]["plinth"]["physicalDepthMm"],
      "geometryPixels":sum(1 for v in geom.getdata() if v),
      "module02":{
        "alpha1":summarize_alpha_rgb(m02,base,geom,1),
        "alpha128":summarize_alpha_rgb(m02,base,geom,128),
      },
      "stone02":{
        "alpha1":summarize_alpha_rgb(stone,base,geom,1),
        "alpha128":summarize_alpha_rgb(stone,base,geom,128),
      },
      "interpretationRules":[
        "asset label does not establish semantic ownership of pixels far outside the intended physical surface",
        "strong alpha plus RGB distinct from base is evidence of intentional authored contribution, but its semantic role still requires visual/context review",
        "the current composited frame is shown beside raw asset composites and alpha masks for direct review"
      ]
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")

    crop=tuple(cfg["crop"]); scale=int(cfg["scale"])
    panels=[
      panel_from_image(base,crop,scale,"A base"),
      panel_from_image(alpha_composite_over_base(base,m02),crop,scale,"B base + module02"),
      panel_from_image(alpha_composite_over_base(base,stone),crop,scale,"C base + stone02"),
      panel_from_image(clean,crop,scale,"D module03-hidden clean"),
      mask_panel(ImageChops.multiply(geom,alpha_mask(m02,128)),crop,scale,"E module02 alpha>=128 in local plinth"),
      mask_panel(ImageChops.multiply(geom,alpha_mask(stone,128)),crop,scale,"F stone02 alpha>=128 in local plinth"),
      mask_panel(geom,crop,scale,"G local plinth geometry"),
    ]
    w=max(p.width for p in panels); h=sum(p.height for p in panels)
    sheet=Image.new("RGB",(w,h),"white")
    y=0
    for p in panels:
        sheet.paste(p,(0,y)); y+=p.height
    args.review_image.parent.mkdir(parents=True,exist_ok=True)
    sheet.save(args.review_image)
    print(json.dumps({
      "module02Strong":report["module02"]["alpha128"]["pixels"],
      "stone02Strong":report["stone02"]["alpha128"]["pixels"],
      "review":str(args.review_image)
    },sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
