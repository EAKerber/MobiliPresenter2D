#!/usr/bin/env python3
from __future__ import annotations
import base64, io, json, re
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'stone-data-audit-output'; OUT.mkdir(exist_ok=True)
text=(ROOT/'app/data/stone-data.js').read_text(encoding='utf-8')
pat=re.compile(r'[\"\'](?P<key>neutral|under|objects|upperMask|plinthMask|plinthShade)[\"\']\s*:\s*[\"\']data:image/png;base64,(?P<data>[A-Za-z0-9+/=]+)[\"\']')
records=[]
pans={'left_pan':(541,490,633,551),'right_pan':(641,491,722,551)}
obj_n=0
for idx,m in enumerate(pat.finditer(text)):
    key=m.group('key'); raw=base64.b64decode(m.group('data'))
    arr=np.asarray(Image.open(io.BytesIO(raw)).convert('RGBA'),dtype=np.uint8)
    rec={'index':idx,'key':key,'size':[arr.shape[1],arr.shape[0]],'alpha_bbox':None,'alpha_pixels_ge8':int((arr[...,3]>=8).sum())}
    ys,xs=np.nonzero(arr[...,3]>=8)
    if len(xs): rec['alpha_bbox']=[int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1]
    if key=='objects':
        rec['pan_rectangles']={}
        for name,(x0,y0,x1,y1) in pans.items():
            a=arr[y0:y1,x0:x1,3]
            rec['pan_rectangles'][name]={'total':int(a.size),'ge8':int((a>=8).sum()),'ge64':int((a>=64).sum()),'ge128':int((a>=128).sum()),'ge200':int((a>=200).sum()),'mean_alpha':round(float(a.mean()),3)}
        crop=Image.fromarray(arr,'RGBA').crop((500,460,750,590))
        # checker composite
        data=np.asarray(crop,dtype=np.uint8); h,w=data.shape[:2]
        yy,xx=np.indices((h,w)); c=np.where(((xx//10+yy//10)%2)[...,None],220,245).astype(np.uint8); bg=np.repeat(c,3,axis=2)
        alpha=data[...,3:4].astype(np.float32)/255
        rgb=(data[...,:3]*alpha+bg*(1-alpha)).clip(0,255).astype(np.uint8)
        Image.fromarray(rgb,'RGB').save(OUT/f'objects_{obj_n}.png',optimize=True)
        obj_n+=1
    records.append(rec)
report={'matches':len(records),'records':records}
(OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
(OUT/'report.md').write_text('# Stone-data object audit\n\n'+ '\n'.join(f'- {r}' for r in records if r['key']=='objects')+'\n',encoding='utf-8')
print(json.dumps(report))
