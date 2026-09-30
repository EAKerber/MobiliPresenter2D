#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
K=ROOT/'app/assets/kitchen'; OUT=ROOT/'module05-contour-candidates'; OUT.mkdir(exist_ok=True)
M=np.asarray(Image.open(K/'layers/05_aereo_fogao.png').convert('RGBA'),dtype=np.uint8)
B=np.asarray(Image.open(K/'base.png').convert('RGBA'),dtype=np.uint8)
H,W=M.shape[:2]
Y0,Y1=50,330; X0,X1=488,532
A=M[...,3]
ERR=np.abs(M[...,:3].astype(np.int16)-B[...,:3].astype(np.int16)).mean(axis=2)
# small vertical smoothing only for boundary scoring; output pixels remain untouched
E=ERR.copy()
for y in range(Y0+2,Y1-2): E[y]=np.mean(ERR[y-2:y+3],axis=0)

# Current left alpha edge is the conservative lower bound: candidates may only move it right,
# never invent alpha where current asset is transparent.
cur={}
for y in range(Y0,Y1):
    xs=np.where(A[y,X0:X1]>=8)[0]
    if len(xs): cur[y]=int(xs.min()+X0)

# Score a proposed left boundary b. Removed pixels [current,b) should resemble base;
# kept pixels just right of b should differ from base. Gradient is the main evidence.
def row_cost(y,b,width_penalty):
    c=cur[y]
    if b<c or b>min(X1-2,c+20): return 1e9
    # use local windows robust to one noisy pixel
    if b==c:
        left=0.0; nrem=0
    else:
        vals=E[y,max(c,b-6):b]
        left=float(vals.mean()) if vals.size else 0.0; nrem=b-c
    right=float(E[y,b:min(X1,b+5)].mean())
    # Strongly prefer a low-error removed strip followed by a high-error kept strip.
    # Keep b=c cheap when current edge already sits on a true object.
    transition=max(0.0,right-left)
    base_like=max(0.0,left-18.0)
    no_transition=max(0.0,22.0-transition)
    return base_like*2.0 + no_transition*1.6 + nrem*width_penalty

def trace(width_penalty,smooth_penalty):
    ys=sorted(cur)
    states={}
    back={}
    first=ys[0]
    cs=cur[first]
    for b in range(cs,min(X1-1,cs+21)): states[b]=row_cost(first,b,width_penalty)
    for y in ys[1:]:
        c=cur[y]; cand=range(c,min(X1-1,c+21)); new={}; bck={}
        for b in cand:
            best=None; bp=None
            for p,v in states.items():
                jump=abs(b-p)
                # allow real diagonals/steps, but discourage row-to-row noise
                val=v + row_cost(y,b,width_penalty) + smooth_penalty*jump + (18 if jump>4 else 0)
                if best is None or val<best: best,bp=val,p
            new[b]=best; bck[b]=bp
        states=new; back[y]=bck
    end=min(states,key=states.get); path={ys[-1]:end}
    for y in reversed(ys[1:]): path[y-1]=back[y][path[y]]
    return path

def apply(path):
    out=M.copy(); removed=np.zeros((H,W),bool)
    for y,b in path.items():
        c=cur[y]
        if b>c:
            removed[y,c:b]=A[y,c:b]>=8
            out[y,c:b,:3]=0;out[y,c:b,3]=0
    return out,removed

def bb(mask):
    yy,xx=np.nonzero(mask)
    return None if not len(xx) else [int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)]

def checker(a):
    yy,xx=np.indices((H,W)); bg=np.where(((xx//12+yy//12)%2)[...,None],218,242).astype(np.uint8);bg=np.repeat(bg,3,axis=2)
    al=a[...,3:4].astype(np.float32)/255
    return (a[...,:3]*al+bg*(1-al)).clip(0,255).astype(np.uint8)

specs={'conservative':(2.2,1.8),'balanced':(1.0,1.2),'exploratory':(0.35,0.8)}
records={}; panels=[]
# current first
current=Image.fromarray(checker(M),'RGB').crop((475,45,555,340)).resize((320,1180),Image.Resampling.NEAREST);ImageDraw.Draw(current).text((8,8),'current',fill='red');panels.append(current)
for name,(wp,sp) in specs.items():
    path=trace(wp,sp); out,removed=apply(path)
    Image.fromarray(out,'RGBA').save(OUT/f'module05-{name}.png',optimize=True)
    panel=Image.fromarray(checker(out),'RGB').crop((475,45,555,340)).resize((320,1180),Image.Resampling.NEAREST);ImageDraw.Draw(panel).text((8,8),name,fill='red');panels.append(panel)
    records[name]={'removedPixels':int(removed.sum()),'removedBBox':bb(removed),'maxShift':max(path[y]-cur[y] for y in path),'path':[[y,path[y]] for y in sorted(path)]}
# Boundary overlay on contrast map
contrast=np.clip(E*8,0,255).astype(np.uint8); vis=np.stack([contrast]*3,axis=2)
colors={'conservative':(255,0,0),'balanced':(0,255,0),'exploratory':(0,100,255)}
for name,(wp,sp) in specs.items():
    p=trace(wp,sp)
    for y,x in p.items():
        for dx in (-1,0,1):
            if 0<=x+dx<W:vis[y,x+dx]=colors[name]
Image.fromarray(vis,'RGB').crop((475,45,555,340)).resize((640,2360),Image.Resampling.NEAREST).save(OUT/'contrast-with-contours.png',optimize=True)
sheet=Image.new('RGB',(320*len(panels),1180),'white')
for i,p in enumerate(panels):sheet.paste(p,(i*320,0))
sheet.save(OUT/'candidate-sheet.png',optimize=True)
(OUT/'report.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
print(json.dumps({k:{x:v[x] for x in ('removedPixels','removedBBox','maxShift')} for k,v in records.items()}))
