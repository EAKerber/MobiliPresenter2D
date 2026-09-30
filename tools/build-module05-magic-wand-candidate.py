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
# Safe wall samples only: keep bright beige pixels, excluding metal crossing the seed rectangles.
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
# Chosen review candidate: middle of the stable interval, still review-only.
chosen=flood(25);candidate=apply(chosen);Image.fromarray(candidate,'RGBA').save(OUT/'module05-candidate.png',optimize=True)
# Show actual scene behavior: glass behind module, current vs candidate.
back=alpha_over(BASE,GLASS)
cur_scene=alpha_over(back,M);new_scene=alpha_over(back,candidate)
scene_sheet=Image.new('RGB',(800,850),'white')
for i,(label,a) in enumerate((('current',cur_scene),('candidate',new_scene))):
    crop=Image.fromarray(a,'RGBA').convert('RGB').crop((485,240,565,325)).resize((400,850),Image.Resampling.NEAREST);ImageDraw.Draw(crop).text((8,8),label,fill='red');scene_sheet.paste(crop,(i*400,0))
scene_sheet.save(OUT/'scene-current-vs-candidate.png',optimize=True)
# Stability sheet.
sheet=Image.new('RGB',(420*len(panels),850),'white')
for i,p in enumerate(panels):sheet.paste(p,(i*420,0))
sheet.save(OUT/'threshold-stability.png',optimize=True)
# Removal map on original.
vis=M.copy();vis[chosen,:3]=[255,0,255];vis[chosen,3]=255
Image.fromarray(vis,'RGBA').crop((488,245,530,330)).resize((840,1700),Image.Resampling.NEAREST).save(OUT/'removed-pixels-overlay.png',optimize=True)
report={'status':'REVIEW','wallMedianRgb':[round(float(v),2) for v in wall],'chosenThreshold':25,'chosen':records['25'],'thresholds':records,'note':'Diagnostic candidate only; original RGB pixels outside removed alpha are byte-identical.'}
(OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
