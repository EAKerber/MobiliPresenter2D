#!/usr/bin/env python3
from __future__ import annotations
from collections import deque
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
K=ROOT/'app/assets/kitchen'; OUT=ROOT/'module05-magic-wand-candidate'; OUT.mkdir(exist_ok=True)
M=np.asarray(Image.open(K/'layers/05_aereo_fogao.png').convert('RGBA'),dtype=np.uint8)
BASE=np.asarray(Image.open(K/'base.png').convert('RGBA'),dtype=np.uint8)
GLASS=np.asarray(Image.open(K/'overlays/tempered-glass.png').convert('RGBA'),dtype=np.uint8)
H,W=M.shape[:2]
A=M[...,3]
RGB=M[...,:3].astype(np.float32)
ROI=np.zeros((H,W),bool);ROI[250:325,492:526]=1
SEED=np.zeros((H,W),bool)
SEED[255:271,496:504]=1
SEED[311:322,496:504]=1
LUMA=RGB.mean(axis=2)
SEED &= (A>=8)&(LUMA>190)
seed_colors=RGB[SEED]
wall=np.median(seed_colors,axis=0)

def flood(threshold:float):
    dist=np.linalg.norm(RGB-wall,axis=2)
    cand=(A>=8)&ROI&(dist<=threshold)
    seen=np.zeros_like(cand)
    q=deque((int(y),int(x)) for y,x in zip(*np.nonzero(SEED&cand)))
    for y,x in q: seen[y,x]=1
    while q:
        y,x=q.popleft()
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                if dx==0 and dy==0: continue
                ny,nx=y+dy,x+dx
                if 0<=ny<H and 0<=nx<W and cand[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=1;q.append((ny,nx))
    return seen

def apply(mask):
    out=M.copy();out[mask,:3]=0;out[mask,3]=0;return out

def dilate1(mask):
    out=mask.copy()
    for dy in (-1,0,1):
        for dx in (-1,0,1):
            if dx==0 and dy==0: continue
            shifted=np.zeros_like(mask)
            y0=max(0,dy);y1=H+min(0,dy);x0=max(0,dx);x1=W+min(0,dx)
            shifted[y0:y1,x0:x1]=mask[y0-dy:y1-dy,x0-dx:x1-dx]
            out|=shifted
    return out

def soft_unmatte(mask):
    out=apply(mask)
    ring=dilate1(mask)&~mask&(A>=8)&ROI
    dist=np.linalg.norm(RGB-wall,axis=2)
    # Only the first kept pixel ring is softened. Dark/metal pixels remain fully opaque.
    factor=np.clip((dist-18.0)/(75.0-18.0),0.0,1.0)
    soften=ring&(factor<0.999)
    for y,x in zip(*np.nonzero(soften)):
        f=float(factor[y,x])
        if f<=0.12:
            out[y,x,:3]=0;out[y,x,3]=0
            continue
        new_alpha=min(int(A[y,x]),int(round(A[y,x]*f)))
        # Unmatte against the measured wall background so the antialiased edge does not keep beige spill.
        c=RGB[y,x]
        fg=(c-(1.0-f)*wall)/f
        out[y,x,:3]=np.clip(np.rint(fg),0,255).astype(np.uint8)
        out[y,x,3]=np.uint8(max(0,min(255,new_alpha)))
    return out,soften

def alpha_over(bottom,top):
    b=bottom.astype(np.float32)/255;t=top.astype(np.float32)/255
    ta=t[...,3:4];ba=b[...,3:4];oa=ta+ba*(1-ta)
    rgb=np.where(oa>0,(t[...,:3]*ta+b[...,:3]*ba*(1-ta))/np.maximum(oa,1e-6),0)
    out=np.concatenate([rgb,oa],axis=2);return np.clip(np.rint(out*255),0,255).astype(np.uint8)

def checker(a):
    yy,xx=np.indices((H,W));bg=np.where(((xx//12+yy//12)%2)[...,None],210,240).astype(np.uint8);bg=np.repeat(bg,3,axis=2)
    al=a[...,3:4].astype(np.float32)/255
    return (a[...,:3]*al+bg*(1-al)).clip(0,255).astype(np.uint8)

def bb(mask):
    yy,xx=np.nonzero(mask);return None if not len(xx) else [int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)]

records={}; panels=[]
for threshold in (15,20,25,30,35):
    mask=flood(threshold);out=apply(mask);Image.fromarray(out,'RGBA').save(OUT/f'module05-t{threshold}.png',optimize=True)
    records[str(threshold)]={'removedPixels':int(mask.sum()),'bbox':bb(mask)}
    crop=Image.fromarray(checker(out),'RGB').crop((488,245,530,330)).resize((420,850),Image.Resampling.NEAREST);ImageDraw.Draw(crop).text((8,8),f't{threshold}',fill='red');panels.append(crop)
chosen=flood(25)
hard=apply(chosen)
soft,softened=soft_unmatte(chosen)
Image.fromarray(hard,'RGBA').save(OUT/'module05-candidate-hard.png',optimize=True)
Image.fromarray(soft,'RGBA').save(OUT/'module05-candidate-soft.png',optimize=True)
back=alpha_over(BASE,GLASS)
cur_scene=alpha_over(back,M);hard_scene=alpha_over(back,hard);soft_scene=alpha_over(back,soft)
scene_sheet=Image.new('RGB',(1200,850),'white')
for i,(label,a) in enumerate((('current',cur_scene),('hard',hard_scene),('soft-unmatte',soft_scene))):
    crop=Image.fromarray(a,'RGBA').convert('RGB').crop((485,240,565,325)).resize((400,850),Image.Resampling.NEAREST);ImageDraw.Draw(crop).text((8,8),label,fill='red');scene_sheet.paste(crop,(i*400,0))
scene_sheet.save(OUT/'scene-current-vs-hard-vs-soft.png',optimize=True)
sheet=Image.new('RGB',(420*len(panels),850),'white')
for i,p in enumerate(panels):sheet.paste(p,(i*420,0))
sheet.save(OUT/'threshold-stability.png',optimize=True)
vis=M.copy();vis[chosen,:3]=[255,0,255];vis[chosen,3]=255;vis[softened,:3]=[0,255,255];vis[softened,3]=255
Image.fromarray(vis,'RGBA').crop((488,245,530,330)).resize((840,1700),Image.Resampling.NEAREST).save(OUT/'removed-and-softened-overlay.png',optimize=True)
report={'status':'REVIEW','wallMedianRgb':[round(float(v),2) for v in wall],'chosenThreshold':25,'chosen':records['25'],'softenedEdgePixels':int(softened.sum()),'thresholds':records,'note':'Review candidate only. Hard removal uses connected wall-color flood; soft candidate additionally unmattes only the adjacent 1px kept ring.'}
(OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
