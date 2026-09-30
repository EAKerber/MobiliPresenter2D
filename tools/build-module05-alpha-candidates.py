#!/usr/bin/env python3
from __future__ import annotations
import json, subprocess, io
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
K=ROOT/'app/assets/kitchen'
OUT=ROOT/'module05-alpha-candidates'; OUT.mkdir(exist_ok=True)
PRE='2f4173aa4d1760886029a1eba36bdd35e86d3a4b'
REGION=(490,50,530,330)

def arr(path): return np.asarray(Image.open(path).convert('RGBA'),dtype=np.uint8)
def git_arr(ref,rel):
    raw=subprocess.check_output(['git','show',f'{ref}:{rel}'],cwd=ROOT)
    return np.asarray(Image.open(io.BytesIO(raw)).convert('RGBA'),dtype=np.uint8)
def save(a,p): Image.fromarray(a.astype(np.uint8),'RGBA').save(p,optimize=True)
def bbox(mask):
    y,x=np.nonzero(mask)
    return None if len(x)==0 else [int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)]

def flood(mask,seeds):
    h,w=mask.shape; seen=np.zeros_like(mask,bool); stack=[]
    for y,x in seeds:
        if 0<=y<h and 0<=x<w and mask[y,x] and not seen[y,x]: seen[y,x]=1; stack.append((y,x))
    while stack:
        y,x=stack.pop()
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                if not dx and not dy: continue
                ny,nx=y+dy,x+dx
                if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not seen[ny,nx]: seen[ny,nx]=1; stack.append((ny,nx))
    return seen

m=arr(K/'layers/05_aereo_fogao.png'); base=arr(K/'base.png'); prev=git_arr(PRE,'app/assets/kitchen/layers/05_aereo_fogao.png')
alpha=m[...,3]
# Difference against canonical wall/base. Embedded wall should be photometrically close to base;
# real cabinet/hood metal should diverge sharply. Use max-channel + mean error to be conservative.
d=np.abs(m[...,:3].astype(np.int16)-base[...,:3].astype(np.int16))
mean=d.mean(axis=2); mx=d.max(axis=2)
y0,y1=REGION[1],REGION[3]; x0,x1=REGION[0],REGION[2]
inreg=np.zeros(alpha.shape,bool); inreg[y0:y1,x0:x1]=1
opaque=(alpha>=8)&inreg
# Seeds are only wall-like pixels touching the *outside-facing* left boundary of the suspect strip,
# plus the known lower wall band. This prevents an interior metal patch with similar color from being removed.
seeds=[]
for y in range(y0,y1):
    for x in range(x0,min(x0+8,x1)):
        if opaque[y,x]: seeds.append((y,x))
for y in range(309,322):
    for x in range(494,506):
        if opaque[y,x]: seeds.append((y,x))

records={}
views=[]
# Multiple thresholds let us inspect stability instead of trusting one magic number.
for tmean,tmx in [(3,8),(5,14),(8,22),(12,32),(18,45)]:
    wall_like=opaque&(mean<=tmean)&(mx<=tmx)
    connected=flood(wall_like,seeds)
    cand=m.copy(); cand[...,3][connected]=0; cand[...,:3][connected]=0
    name=f't{tmean}-{tmx}'
    save(cand,OUT/f'module05-{name}.png')
    records[name]={'removedPixels':int(connected.sum()),'bbox':bbox(connected),'meanErrorMedian':float(np.median(mean[connected])) if connected.any() else None}
    # crop on checker background
    crop=Image.fromarray(cand,'RGBA').crop((475,45,555,340))
    bg=Image.new('RGBA',crop.size,(235,235,235,255)); comp=Image.alpha_composite(bg,crop).convert('RGB').resize((320,1180),Image.Resampling.NEAREST)
    ImageDraw.Draw(comp).text((8,8),name,fill='red'); views.append((name,comp))

# Diagnostic contrast map: high contrast of module/base difference, never used as output pixels.
err=np.clip(mean*10,0,255).astype(np.uint8)
diag=np.zeros((*err.shape,4),np.uint8);diag[...,:3]=err[...,None];diag[...,3]=np.where(inreg,255,0)
Image.fromarray(diag,'RGBA').crop((475,45,555,340)).resize((640,2360),Image.Resampling.NEAREST).save(OUT/'difference-contrast-map.png',optimize=True)
# Current and historical coarse cut for reference only.
for label,a in [('current',m),('historical-coarse',prev)]:
    crop=Image.fromarray(a,'RGBA').crop((475,45,555,340));bg=Image.new('RGBA',crop.size,(235,235,235,255));comp=Image.alpha_composite(bg,crop).convert('RGB').resize((320,1180),Image.Resampling.NEAREST);ImageDraw.Draw(comp).text((8,8),label,fill='red');views.insert(0,(label,comp))

sheet=Image.new('RGB',(320*len(views),1180),'white')
for i,(_,v) in enumerate(views):sheet.paste(v,(i*320,0))
sheet.save(OUT/'candidate-sheet.png',optimize=True)
(OUT/'report.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
print(json.dumps(records))
