#!/usr/bin/env python3
from __future__ import annotations
from collections import deque
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
K=ROOT/'app/assets/kitchen'; OUT=ROOT/'hard-r2-stone-boundary-output'; OUT.mkdir(exist_ok=True)

def rgba(path): return np.asarray(Image.open(path).convert('RGBA'),dtype=np.uint8)
def alpha_over(bottom,top):
    b=bottom.astype(np.float32)/255;t=top.astype(np.float32)/255
    ta=t[...,3:4];ba=b[...,3:4];oa=ta+ba*(1-ta)
    rgb=np.where(oa>0,(t[...,:3]*ta+b[...,:3]*ba*(1-ta))/np.maximum(oa,1e-6),0)
    return np.clip(np.rint(np.concatenate([rgb,oa],axis=2)*255),0,255).astype(np.uint8)
def checker(a):
    h,w=a.shape[:2];yy,xx=np.indices((h,w));bg=np.where(((xx//12+yy//12)%2)[...,None],212,242).astype(np.uint8);bg=np.repeat(bg,3,axis=2)
    al=a[...,3:4].astype(np.float32)/255
    return np.clip(a[...,:3]*al+bg*(1-al),0,255).astype(np.uint8)
def bb(mask):
    yy,xx=np.nonzero(mask);return None if not len(xx) else [int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)]

def flood(cand,seeds):
    h,w=cand.shape; seen=np.zeros_like(cand); q=deque()
    for y,x in seeds:
        if 0<=y<h and 0<=x<w and cand[y,x] and not seen[y,x]:seen[y,x]=1;q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                if dx==0 and dy==0:continue
                ny,nx=y+dy,x+dx
                if 0<=ny<h and 0<=nx<w and cand[ny,nx] and not seen[ny,nx]:seen[ny,nx]=1;q.append((ny,nx))
    return seen

BASE=rgba(K/'base.png'); GLASS=rgba(K/'overlays/tempered-glass.png')
M05=rgba(K/'layers/05_aereo_fogao.png')
STONE=rgba(K/'variants/stone-02-cozinha-exposed-right.png')
H,W=M05.shape[:2]

# ---- module 05 hard T25, then micro-restore around dark lower detail ----
A=M05[...,3]; RGB=M05[...,:3].astype(np.float32); ROI=np.zeros((H,W),bool);ROI[250:325,492:526]=1
SEED=np.zeros((H,W),bool);SEED[255:271,496:504]=1;SEED[311:322,496:504]=1
SEED &= (A>=8)&(RGB.mean(axis=2)>190)
wall=np.median(RGB[SEED],axis=0); dist=np.linalg.norm(RGB-wall,axis=2)
hardmask=flood((A>=8)&ROI&(dist<=25),list(zip(*np.nonzero(SEED))))
hard=M05.copy();hard[hardmask,:3]=0;hard[hardmask,3]=0
# Any removed light pixel touching a genuinely dark source pixel in the knob zone is suspicious antialias/edge ownership.
dark=(A>=8)&(RGB.mean(axis=2)<105)
adj_dark=np.zeros_like(dark)
for dy in (-1,0,1):
  for dx in (-1,0,1):
    if dx==0 and dy==0:continue
    shifted=np.zeros_like(dark); y0=max(0,dy);y1=H+min(0,dy);x0=max(0,dx);x1=W+min(0,dx)
    shifted[y0:y1,x0:x1]=dark[y0-dy:y1-dy,x0-dx:x1-dx];adj_dark|=shifted
micro=hardmask & adj_dark
micro &= (np.indices((H,W))[0]>=304) & (np.indices((H,W))[0]<=322)
# Rank by closeness to dark source and restore at most two most object-like pixels: lowest original luminance first.
ys,xs=np.nonzero(micro); candidates=sorted([(float(RGB[y,x].mean()),int(y),int(x)) for y,x in zip(ys,xs)])
restore=np.zeros_like(hardmask)
for _,y,x in candidates[:2]:restore[y,x]=1
hard_r2=hard.copy();hard_r2[restore]=M05[restore]
Image.fromarray(hard,'RGBA').save(OUT/'module05-hard-t25.png',optimize=True)
Image.fromarray(hard_r2,'RGBA').save(OUT/'module05-hard-r2.png',optimize=True)

# ---- stone 02 x glass boundary ----
SA=STONE[...,3]; GA=GLASS[...,3]
overlap=(SA>=8)&(GA>=8)
# Semantic union: all generated stone-02-exposed/bridge masks except broad owner-ish protect is still treated as semantic ownership.
semantic=np.zeros((H,W),bool); semantic_files=[]
for p in sorted((ROOT/'review-assets/stone-masks/generated').glob('stone-02-*.png')):
    try: m=np.asarray(Image.open(p).convert('L'),dtype=np.uint8)>=8
    except Exception: continue
    semantic |= m; semantic_files.append(str(p.relative_to(ROOT)))
unexplained=overlap & ~semantic
# Photometric comparison with canonical base. Keep thresholds as review candidates.
err=np.abs(STONE[...,:3].astype(np.int16)-BASE[...,:3].astype(np.int16)).mean(axis=2)
# Seed only from unexplained pixels touching the left/exterior side of the overlap; this prevents isolated beige stone from being deleted.
edge_seed=[]
yy,xx=np.nonzero(unexplained)
for y,x in zip(yy,xx):
    if x<=500 or not overlap[y,max(0,x-1)]: edge_seed.append((int(y),int(x)))
stone_records={}; stone_panels=[]
back=alpha_over(BASE,GLASS)
for t in (8,12,16,20,24):
    cand=unexplained & (err<=t)
    rm=flood(cand,edge_seed)
    out=STONE.copy();out[rm,:3]=0;out[rm,3]=0
    Image.fromarray(out,'RGBA').save(OUT/f'stone02-t{t}.png',optimize=True)
    scene_cur=alpha_over(back,STONE);scene_new=alpha_over(back,out)
    crop=(478,475,610,915)
    panel=Image.new('RGB',(528,880),'white')
    for i,(lab,a) in enumerate((('current',scene_cur),('candidate',scene_new))):
        c=Image.fromarray(a,'RGBA').convert('RGB').crop(crop).resize((264,880),Image.Resampling.NEAREST);ImageDraw.Draw(c).text((7,7),lab,fill='red');panel.paste(c,(i*264,0))
    stone_panels.append((t,panel))
    stone_records[str(t)]={'removedPixels':int(rm.sum()),'bbox':bb(rm),'meanBaseErrorRemoved':round(float(err[rm].mean()),3) if rm.any() else None}
# choose conservative middle threshold for focused review only
chosen_t=16; chosen=unexplained & (err<=chosen_t); chosen=flood(chosen,edge_seed)
stone16=STONE.copy();stone16[chosen,:3]=0;stone16[chosen,3]=0
# visual ownership/removal overlay
vis=STONE.copy();vis[unexplained,:3]=[255,190,0];vis[unexplained,3]=255;vis[chosen,:3]=[255,0,255];vis[chosen,3]=255
Image.fromarray(vis,'RGBA').crop((478,475,610,915)).resize((528,1760),Image.Resampling.NEAREST).save(OUT/'stone02-unexplained-and-removed.png',optimize=True)
sheet=Image.new('RGB',(528*len(stone_panels),880),'white')
for i,(t,p) in enumerate(stone_panels):ImageDraw.Draw(p).text((270,7),f'T{t}',fill='blue');sheet.paste(p,(i*528,0))
sheet.save(OUT/'stone02-threshold-sheet.png',optimize=True)

# module05 scene comparison with glass
mback=alpha_over(BASE,GLASS); mscene=[]
for lab,a in [('current',M05),('hard',hard),('hard-r2',hard_r2)]:
    s=alpha_over(mback,a); c=Image.fromarray(s,'RGBA').convert('RGB').crop((488,245,530,330)).resize((420,850),Image.Resampling.NEAREST);ImageDraw.Draw(c).text((8,8),lab,fill='red');mscene.append(c)
ms=Image.new('RGB',(1260,850),'white')
for i,c in enumerate(mscene):ms.paste(c,(i*420,0))
ms.save(OUT/'module05-current-hard-r2.png',optimize=True)

report={
 'module05':{'hardRemoved':int(hardmask.sum()),'microCandidates':[{'luma':round(v,2),'x':x,'y':y} for v,y,x in candidates], 'restored':[{'x':int(x),'y':int(y)} for y,x in zip(*np.nonzero(restore))]},
 'stone02':{'semanticFiles':semantic_files,'overlapPixels':int(overlap.sum()),'unexplainedOverlapPixels':int(unexplained.sum()),'edgeSeeds':len(edge_seed),'thresholds':stone_records,'chosenReviewThreshold':chosen_t}
}
(OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
