#!/usr/bin/env python3
"""Diagnostic material-slot preview for BMC-01 reconstructed faces."""
from __future__ import annotations
import argparse, json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageStat

ROOT=Path(__file__).resolve().parents[1]

def parse_hex(value):
    if not isinstance(value,str) or len(value)!=7 or not value.startswith("#"):
        raise ValueError("invalid hex color")
    return tuple(int(value[i:i+2],16) for i in (1,3,5))

def mean_luminance(image,mask):
    gray=image.convert("L")
    return max(1.0,ImageStat.Stat(gray,mask=mask).mean[0])

def colorize_with_shading(source,mask,color):
    """Preserve low-frequency/source luminance while replacing material color."""
    rgb=parse_hex(color)
    mean=mean_luminance(source,mask)
    sp=source.convert("RGB").load(); mp=mask.load()
    out=Image.new("RGBA",source.size,(0,0,0,0)); op=out.load()
    b=mask.getbbox()
    if not b: return out
    for y in range(b[1],b[3]):
      for x in range(b[0],b[2]):
        a=mp[x,y]
        if not a: continue
        r,g,bb=sp[x,y]
        lum=0.2126*r+0.7152*g+0.0722*bb
        shade=max(.72,min(1.18,lum/mean))
        op[x,y]=tuple(min(255,round(c*shade)) for c in rgb)+(a,)
    return out

def changed_outside(before,after,allowed):
    bp=before.load(); ap=after.load(); mp=allowed.load()
    w,h=before.size; n=0
    for y in range(h):
      for x in range(w):
        if not mp[x,y] and bp[x,y]!=ap[x,y]: n+=1
    return n

def panel(image,crop,scale,label):
    c=image.crop(crop).convert("RGB")
    c=c.resize((c.width*scale,c.height*scale),Image.Resampling.NEAREST)
    out=Image.new("RGB",(c.width,c.height+24),"white"); out.paste(c,(0,24))
    ImageDraw.Draw(out).text((6,6),label,fill="black")
    return out

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--config",type=Path,required=True)
    ap.add_argument("--output-dir",type=Path,required=True)
    args=ap.parse_args()
    cfg=json.loads(args.config.read_text(encoding="utf-8"))
    base=ROOT/cfg["candidateDir"]
    neutral=Image.open(base/"edited.png").convert("RGBA")
    carcass=Image.open(base/"carcass-candidate.png").convert("RGBA")
    plinth=Image.open(base/"plinth-candidate.png").convert("RGBA")
    carcass_mask=carcass.getchannel("A")
    plinth_mask=plinth.getchannel("A")
    allowed=Image.new("L",neutral.size,0)
    # union without importing ImageChops
    ap=allowed.load(); cm=carcass_mask.load(); pm=plinth_mask.load()
    for y in range(neutral.height):
      for x in range(neutral.width):
        ap[x,y]=max(cm[x,y],pm[x,y])

    results=[]; panels=[]
    crop=(720,510,785,915); scale=3
    panels.append(panel(neutral,crop,scale,"neutral research candidate"))
    for case in cfg["diagnostics"]:
      front=colorize_with_shading(carcass,carcass_mask,case["front"]["color"])
      plinth_color=case["front"]["color"] if case["plinthPolicy"]=="front" else case["stone"]["color"]
      lower=colorize_with_shading(plinth,plinth_mask,plinth_color)
      recolored=neutral.copy()
      # Replace only reconstructed slots: restore the clean pixels is unnecessary for this
      # diagnostic because alpha-compositing the opaque/AA slot colors over neutral is the
      # same bounded operation we are testing.
      recolored=Image.alpha_composite(recolored,front)
      recolored=Image.alpha_composite(recolored,lower)
      path=args.output_dir/(case["id"]+".png")
      args.output_dir.mkdir(parents=True,exist_ok=True); recolored.save(path)
      outside=changed_outside(neutral,recolored,allowed)
      results.append({
        "id":case["id"],
        "front":case["front"],
        "plinthPolicy":case["plinthPolicy"],
        "plinthColor":plinth_color,
        "outsideMaterialSlotChangedPixels":outside
      })
      panels.append(panel(recolored,crop,scale,case["id"]))

    w=max(p.width for p in panels); h=sum(p.height for p in panels)
    sheet=Image.new("RGB",(w,h),"white"); y=0
    for p in panels: sheet.paste(p,(0,y)); y+=p.height
    sheet.save(args.output_dir/"review.png")
    report={
      "schemaVersion":"BMC01MaterialSlotPreviewReport 0.1",
      "sceneId":cfg["sceneId"],
      "promotionEligible":False,
      "carcassMaskNonzeroPixels":sum(1 for v in carcass_mask.getdata() if v),
      "plinthMaskNonzeroPixels":sum(1 for v in plinth_mask.getdata() if v),
      "results":results,
      "finding":"reconstruction can be material-responsive only when carcass and plinth remain distinct masks/slots; a single static RGB exposed-side overlay cannot satisfy published finish behavior"
    }
    (args.output_dir/"report.json").write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(report,sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
