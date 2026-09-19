#!/usr/bin/env python3
"""Build a review-only BMC-01 geometry contact sheet.

No candidate is promoted. The tool renders the exact current target variant,
renders the same variant without the historical exposed-side overlay, and
places historical/local geometry guides over the clean frame.
"""
from __future__ import annotations
import argparse, copy, hashlib, json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
from render_variant_fidelity import render_case, safe_app_path

ROOT=Path(__file__).resolve().parents[1]

def sha_bytes(im):
    return hashlib.sha256(im.tobytes()).hexdigest()

def count_nonzero(im):
    return sum(1 for p in im.getdata() if any(p) if isinstance(p,tuple)) if im.mode!="L" else sum(1 for p in im.getdata() if p)

def mask(size,quad):
    im=Image.new("L",size,0)
    ImageDraw.Draw(im).polygon([(round(x),round(y)) for x,y in quad],fill=255)
    return im

def outline(base,quads,width=2,fill=False):
    out=base.copy()
    d=ImageDraw.Draw(out,"RGBA")
    for quad in quads:
        pts=[(round(x),round(y)) for x,y in quad]
        if fill:
            d.polygon(pts,fill=(245,245,245,110))
        d.line(pts+[pts[0]],fill=(30,30,30,255),width=width,joint="curve")
    return out

def panel(image,crop,scale,label):
    c=image.crop(tuple(crop)).convert("RGB")
    c=c.resize((c.width*scale,c.height*scale),Image.Resampling.NEAREST)
    top=24
    canvas=Image.new("RGB",(c.width,c.height+top),"white")
    canvas.paste(c,(0,top))
    ImageDraw.Draw(canvas).text((6,6),label,fill="black")
    return canvas

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--config",type=Path,required=True)
    ap.add_argument("--variant-manifest",type=Path,required=True)
    ap.add_argument("--output-dir",type=Path,required=True)
    args=ap.parse_args()
    cfg=json.loads(args.config.read_text(encoding="utf-8"))
    manifest=json.loads(args.variant_manifest.read_text(encoding="utf-8"))
    local=json.loads((ROOT/cfg["localTransferReport"]).read_text(encoding="utf-8"))
    case=next(x for x in manifest["cases"] if x["id"]==cfg["targetVariant"])
    size=(manifest["canvas"]["width"],manifest["canvas"]["height"])
    with Image.open(safe_app_path(manifest["baseAsset"])) as im:
        base=im.convert("RGBA")

    current=render_case(base,case,size)
    clean_case=copy.deepcopy(case)
    clean_case["visibleEntities"]=[e for e in case["visibleEntities"] if e["id"]!=cfg["excludeEntityForClean"]]
    clean=render_case(base,clean_case,size)

    diff=ImageChops.difference(current,clean)
    diff_mask=diff.convert("RGB").point(lambda v:255 if v else 0).convert("L")
    # RGB point above can duplicate channels; getbbox/count over pixel tuples instead.
    changed=sum(1 for a,b in zip(current.getdata(),clean.getdata()) if a!=b)
    changed_bbox=ImageChops.difference(current.convert("RGB"),clean.convert("RGB")).getbbox()

    local_quads=[local["target"]["carcass"]["quad"],local["target"]["plinth"]["quad"]]
    hist_quads=[cfg["historical"]["carcassQuad"],cfg["historical"]["plinthQuad"]]
    local_mask=Image.new("L",size,0)
    hist_mask=Image.new("L",size,0)
    for q in local_quads: local_mask=ImageChops.lighter(local_mask,mask(size,q))
    for q in hist_quads: hist_mask=ImageChops.lighter(hist_mask,mask(size,q))
    intersection=ImageChops.multiply(local_mask,hist_mask)
    union=ImageChops.lighter(local_mask,hist_mask)
    local_n=sum(1 for v in local_mask.getdata() if v)
    hist_n=sum(1 for v in hist_mask.getdata() if v)
    inter_n=sum(1 for v in intersection.getdata() if v)
    union_n=sum(1 for v in union.getdata() if v)

    panels=[
      panel(clean,cfg["crop"],cfg["scale"],"A clean target - historical overlay removed"),
      panel(current,cfg["crop"],cfg["scale"],"B current target - historical overlay"),
      panel(outline(clean,hist_quads),cfg["crop"],cfg["scale"],"C historical geometry outline"),
      panel(outline(clean,local_quads),cfg["crop"],cfg["scale"],"D local physical-depth geometry outline"),
      panel(outline(clean,local_quads,fill=True),cfg["crop"],cfg["scale"],"E local neutral geometry guide - review only"),
    ]
    w=max(p.width for p in panels); h=sum(p.height for p in panels)
    sheet=Image.new("RGB",(w,h),"white")
    y=0
    for p in panels:
        sheet.paste(p,(0,y)); y+=p.height

    args.output_dir.mkdir(parents=True,exist_ok=True)
    sheet_path=args.output_dir/"contact-sheet.png"
    sheet.save(sheet_path)
    report={
      "schemaVersion":"BMC01GuideReviewReport 0.1",
      "sceneId":cfg["sceneId"],
      "targetVariant":cfg["targetVariant"],
      "reviewOnly":True,
      "currentRenderPixelSha256":sha_bytes(current),
      "cleanRenderPixelSha256":sha_bytes(clean),
      "historicalOverlayChangedPixelCount":changed,
      "historicalOverlayDifferenceBounds":list(changed_bbox) if changed_bbox else None,
      "localGeometryPixels":local_n,
      "historicalGeometryPixels":hist_n,
      "geometryIntersectionPixels":inter_n,
      "geometryUnionPixels":union_n,
      "geometryIoU":inter_n/union_n if union_n else 0,
      "localTransferReport":cfg["localTransferReport"],
      "contactSheet":"contact-sheet.png",
      "promotionEligible":False
    }
    (args.output_dir/"report.json").write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(report,sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
