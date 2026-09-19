#!/usr/bin/env python3
from pathlib import Path
import json
from PIL import Image, ImageChops

ROOT=Path("app")
MASKS=ROOT/"assets/kitchen/masks"
for key in ["01","05","06","07"]:
    finish=Image.open(MASKS/f"{key}.png").convert("RGBA").getchannel("A")
    shadow=Image.open(MASKS/f"structure-{key}-shadow.png").convert("RGBA").getchannel("A")
    highlight=Image.open(MASKS/f"structure-{key}-highlight.png").convert("RGBA").getchannel("A")
    energy=ImageChops.lighter(shadow,highlight)
    bbox=finish.getbbox()
    crop=energy.crop(bbox)
    support=finish.crop(bbox)
    w,h=crop.size
    e=list(crop.getdata()); m=list(support.getdata())
    cols=[]; rows=[]
    for x in range(w):
        vals=[e[y*w+x] for y in range(h) if m[y*w+x] >= 64]
        strong=sum(1 for v in vals if v>=32)
        mean=sum(vals)/max(1,len(vals))
        cov=strong/max(1,len(vals))
        cols.append((mean*cov,cov,mean,x))
    for y in range(h):
        vals=[e[y*w+x] for x in range(w) if m[y*w+x] >= 64]
        strong=sum(1 for v in vals if v>=32)
        mean=sum(vals)/max(1,len(vals))
        cov=strong/max(1,len(vals))
        rows.append((mean*cov,cov,mean,y))
    inner_cols=[v for v in cols if .04*w <= v[3] <= .96*w]
    inner_rows=[v for v in rows if .04*h <= v[3] <= .96*h]
    topc=sorted(inner_cols,reverse=True)[:20]
    topr=sorted(inner_rows,reverse=True)[:20]
    print(json.dumps({
      "key":key,"bbox":bbox,"size":[w,h],
      "topCols":[{"x":x,"n":round(x/w,4),"score":round(s,3),"coverage":round(c,3),"mean":round(mean,2)} for s,c,mean,x in topc],
      "topRows":[{"y":y,"n":round(y/h,4),"score":round(s,3),"coverage":round(c,3),"mean":round(mean,2)} for s,c,mean,y in topr],
    },sort_keys=True))
