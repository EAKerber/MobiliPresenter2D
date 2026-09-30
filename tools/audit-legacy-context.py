#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageEnhance
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'legacy-context-audit-output';OUT.mkdir(exist_ok=True)
K=ROOT/'app/assets/kitchen'; CROP=(500,455,750,590)
assets={
 'base':K/'base.png',
 'golden':K/'composicao-completa.png',
 'stone02-layer':K/'layers/stone-02-cozinha.png',
 'stone02-variant':K/'variants/stone-02-cozinha-exposed-right.png',
 'approved02':K/'overlays/approved-stone-02.png',
 'module02':K/'layers/02_inferior_fogao.png',
}
ims={k:Image.open(p).convert('RGBA') for k,p in assets.items()}
# Save large nearest-neighbour crops on checker/white to expose faint halos.
def show(im):
    bg=Image.new('RGBA',im.size,(238,238,238,255)); return Image.alpha_composite(bg,im).convert('RGB')
views=[]
for name,im in ims.items():
    c=show(im.crop(CROP)).resize((750,405),Image.Resampling.NEAREST)
    d=ImageDraw.Draw(c);d.rectangle((0,0,250,28),fill='white');d.text((8,7),name,fill='red');views.append((name,c))
sheet=Image.new('RGB',(1500,1215),'white')
for i,(name,c) in enumerate(views):sheet.paste(c,((i%2)*750,(i//2)*405))
sheet.save(OUT/'canonical-context-sheet.png',optimize=True)
# Contrast-amplified base/golden crops.
for name in ['base','golden']:
    c=ims[name].crop(CROP).convert('RGB')
    ImageEnhance.Contrast(c).enhance(2.5).resize((1000,540),Image.Resampling.NEAREST).save(OUT/f'{name}-contrast.png',optimize=True)
# Difference maps against base to expose what each foreground source contributes.
records={}
base=ims['base']
for name in ['golden','stone02-layer','stone02-variant','approved02','module02']:
    im=ims[name]
    diff=ImageChops.difference(base,im)
    bbox=diff.getbbox(); records[name]={'diff_bbox_vs_base':bbox}
    crop=ImageEnhance.Contrast(diff.crop(CROP).convert('RGB')).enhance(3).resize((1000,540),Image.Resampling.NEAREST)
    crop.save(OUT/f'{name}-vs-base-diff.png',optimize=True)
(OUT/'report.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
print(json.dumps(records))
