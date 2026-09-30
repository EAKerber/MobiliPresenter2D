#!/usr/bin/env python3
from __future__ import annotations
import base64, io, json, re
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'pan-ghost-audit-output'; OUT.mkdir(exist_ok=True)
TEXT=(ROOT/'app/data/stone-data.js').read_text(encoding='utf-8')
# stone-data is `window.CASA_STONE_DATA = <json>;`
payload=TEXT.split('=',1)[1].strip().rstrip(';')
data=json.loads(payload)
CROP=(500,470,750,590)
PAN_BOXES={'left-pan':(541,490,633,551),'right-pan':(641,491,722,551)}

def decode(url):
    raw=base64.b64decode(url.split(',',1)[1]); return Image.open(io.BytesIO(raw)).convert('RGBA')

def checker(im):
    a=np.asarray(im,dtype=np.uint8); h,w=a.shape[:2]; yy,xx=np.indices((h,w)); c=np.where(((xx//10+yy//10)%2)[...,None],220,245).astype(np.uint8); bg=np.repeat(c,3,axis=2); al=a[...,3:4].astype(np.float32)/255; rgb=(a[...,:3]*al+bg*(1-al)).clip(0,255).astype(np.uint8); return Image.fromarray(rgb,'RGB')

def recolor(neutral,under,objects,mask,rgb=(16,90,220)):
    n=np.asarray(neutral,dtype=np.uint8); u=np.asarray(under,dtype=np.uint8); o=np.asarray(objects,dtype=np.uint8); m=np.asarray(mask.convert('RGBA'),dtype=np.uint8)
    res=np.zeros_like(n); coverage=m[...,0].astype(np.float32)/255; background=1-o[...,3].astype(np.float32)/255
    lum=(u[...,0]*.2126+u[...,1]*.7152+u[...,2]*.0722)/180; shade=np.clip(lum,.35,1.35)
    for c in range(3):
        target=np.minimum(255,rgb[c]*shade)
        res[...,c]=np.rint(n[...,c]+(target-u[...,c])*background*coverage).clip(0,255).astype(np.uint8)
    res[...,3]=np.rint(255*coverage).clip(0,255).astype(np.uint8)
    return Image.fromarray(res,'RGBA')

def mask_edge(mask):
    m=np.asarray(mask.convert('L'),dtype=np.uint8)>=8
    # binary 8-neighbour erosion without scipy; edge = mask - erosion
    er=m.copy()
    for dy in (-1,0,1):
        for dx in (-1,0,1):
            if dx==0 and dy==0: continue
            shifted=np.zeros_like(m)
            y0=max(0,dy); y1=m.shape[0]+min(0,dy); x0=max(0,dx); x1=m.shape[1]+min(0,dx)
            shifted[y0:y1,x0:x1]=m[y0-dy:y1-dy,x0-dx:x1-dx]
            er &= shifted
    return m & ~er

report={}
for case_id,bundle in data.items():
    neutral=decode(bundle['neutral']); under=decode(bundle['under']); objects=decode(bundle['objects']); mask=decode(bundle['mask'])
    color=recolor(neutral,under,objects,mask)
    # diagnostic: overlay color layer on neutral to mimic canvas above scene approximately
    composed=Image.alpha_composite(neutral,color)
    edge=mask_edge(mask)
    n=np.asarray(neutral,dtype=np.uint8); u=np.asarray(under,dtype=np.uint8); o=np.asarray(objects,dtype=np.uint8); ma=np.asarray(mask.convert('L'),dtype=np.uint8)
    rec={'pan_boxes':{}}
    for name,(x0,y0,x1,y1) in PAN_BOXES.items():
        mm=ma[y0:y1,x0:x1]; oo=o[y0:y1,x0:x1,3]; ee=edge[y0:y1,x0:x1]
        diff=np.abs(n[y0:y1,x0:x1,:3].astype(np.int16)-u[y0:y1,x0:x1,:3].astype(np.int16)).mean(axis=2)
        rec['pan_boxes'][name]={
            'mask_ge8':int((mm>=8).sum()),'mask_total':int(mm.size),'mask_mean':round(float(mm.mean()),3),
            'objects_ge8':int((oo>=8).sum()),'mask_edge_pixels':int(ee.sum()),
            'neutral_under_diff_gt12':int((diff>12).sum()),'neutral_under_diff_mean':round(float(diff.mean()),3),
        }
    report[case_id]=rec
    views=[]
    for label,im in [('neutral',neutral),('under',under),('objects',objects),('mask',mask),('blue-recolor-layer',color),('neutral+blue',composed)]:
        crop=checker(im).crop(CROP).resize((500,240),Image.Resampling.NEAREST)
        draw=ImageDraw.Draw(crop); draw.text((8,8),label,fill=(255,0,0))
        views.append(crop)
    sheet=Image.new('RGB',(1000,720),'white')
    for i,v in enumerate(views): sheet.paste(v,((i%2)*500,(i//2)*240))
    sheet.save(OUT/f'{case_id}.png',optimize=True)
    # Edge-only crop
    edge_rgba=np.zeros((1024,1536,4),dtype=np.uint8); edge_rgba[...,0]=np.where(edge,255,0); edge_rgba[...,3]=np.where(edge,255,0)
    checker(Image.fromarray(edge_rgba,'RGBA')).crop(CROP).resize((1000,480),Image.Resampling.NEAREST).save(OUT/f'{case_id}-mask-edge.png',optimize=True)
(OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
