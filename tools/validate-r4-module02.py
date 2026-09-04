#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'app'
PROVENANCE = ROOT / 'reference' / 'r4-module02-fidelity.json'

def sha(path: Path) -> str:
    h=hashlib.sha256(); h.update(path.read_bytes()); return h.hexdigest()

def mask_outside_roi(size, roi):
    out=Image.new('L',size,255); ImageDraw.Draw(out).rectangle((roi[0],roi[1],roi[2]-1,roi[3]-1),fill=0); return out

def diff_count(a,b):
    aa=a.convert('RGBA'); bb=b.convert('RGBA')
    return sum(1 for x,y in zip(aa.get_flattened_data(),bb.get_flattened_data()) if x!=y)

def changed_bbox(a,b):
    aa=a.convert('RGBA'); bb=b.convert('RGBA'); minx=miny=10**9; maxx=maxy=-1; count=0
    for y in range(aa.height):
        for x in range(aa.width):
            if aa.getpixel((x,y)) != bb.getpixel((x,y)):
                count += 1; minx=min(minx,x); miny=min(miny,y); maxx=max(maxx,x); maxy=max(maxy,y)
    return None if count == 0 else [minx,miny,maxx+1,maxy+1]

def apply_color(base, mask, color, opacity):
    rgb=tuple(int(color[i:i+2],16) for i in (1,3,5)); alpha=mask.point(lambda v: round(v*opacity))
    layer=Image.new('RGBA',base.size,rgb+(0,)); layer.putalpha(alpha); return Image.alpha_composite(base,layer)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--previous-golden',type=Path,required=True); ap.add_argument('--previous-module',type=Path,required=True); ap.add_argument('--output-dir',type=Path,required=True); args=ap.parse_args()
    spec=json.loads(PROVENANCE.read_text())
    roi=tuple(spec['cleanupRoi']); protected=tuple(spec['protectedAppliance'])
    current_module=Image.open(APP/'assets/kitchen/layers/02_inferior_fogao.png').convert('RGBA')
    current_golden=Image.open(APP/'assets/kitchen/composicao-completa.png').convert('RGBA')
    previous_module=Image.open(args.previous_module).convert('RGBA'); previous_golden=Image.open(args.previous_golden).convert('RGBA')
    mask_rgba=Image.open(APP/'assets/kitchen/masks/02.png').convert('RGBA'); mask=mask_rgba.getchannel('A')
    errors=[]
    if current_module.size!=(1536,1024) or mask_rgba.size!=(1536,1024): errors.append('canvas')
    if current_module.getchannel('A').getbbox()!=tuple(spec['expectedModule02AlphaBounds']): errors.append('module-alpha-bounds')
    if mask.getbbox()!=tuple(spec['expectedFinishMaskBounds']): errors.append('finish-mask-bounds')
    if current_module.getchannel('A').crop(roi).getbbox() is not None: errors.append('artifact-roi-not-transparent')
    overflow=ImageChops.subtract(mask,current_module.getchannel('A'))
    if overflow.getbbox() is not None: errors.append('mask-outside-module-alpha')
    if mask.crop(protected).getbbox() is not None: errors.append('finish-mask-overlaps-appliance')
    mdiff=ImageChops.difference(previous_module,current_module).convert('RGBA')
    outside=mask_outside_roi(current_module.size,roi)
    if ImageChops.multiply(mdiff.getchannel('A'),outside).getbbox() is not None: errors.append('module-change-outside-roi')
    gbbox=changed_bbox(previous_golden,current_golden); mbbox=changed_bbox(previous_module,current_module)
    if gbbox != list(roi): errors.append(f'golden-diff-bounds:{gbbox}')
    if mbbox != list(roi): errors.append(f'module-diff-bounds:{mbbox}')
    gcount=diff_count(previous_golden,current_golden)
    if gcount != spec['expectedGoldenChangedPixelCount']: errors.append(f'golden-diff-count:{gcount}')
    if sha(args.previous_golden)!=spec['parentGoldenSha256']: errors.append('parent-golden-sha')
    if sha(args.previous_module)!=spec['parentModule02Sha256']: errors.append('parent-module-sha')
    if sha(APP/'assets/kitchen/composicao-completa.png')!=spec['currentGoldenSha256']: errors.append('current-golden-sha')
    if sha(APP/'assets/kitchen/layers/02_inferior_fogao.png')!=spec['currentModule02Sha256']: errors.append('current-module-sha')
    if sha(APP/'assets/kitchen/masks/02.png')!=spec['finishMaskSha256']: errors.append('finish-mask-sha')

    args.output_dir.mkdir(parents=True,exist_ok=True)
    crop=(450,540,800,900)
    before=previous_golden.crop(crop).convert('RGB'); after=current_golden.crop(crop).convert('RGB')
    sheet=Image.new('RGB',(before.width*2,before.height+28),'white'); sheet.paste(before,(0,28)); sheet.paste(after,(before.width,28)); d=ImageDraw.Draw(sheet); d.text((8,8),'ANTES',fill='black'); d.text((before.width+8,8),'DEPOIS',fill='black'); sheet.save(args.output_dir/'cleanup-before-after.png')
    presets=[('original',None,0),('gianduia','#918981',0.68),('white','#eeeae3',0.84),('black','#252422',0.78),('olive','#69705f',0.72),('petroleum','#354f55',0.72)]
    tiles=[]
    for name,color,op in presets:
        im=current_golden if color is None else apply_color(current_golden,mask,color,op)
        c=im.crop(crop).convert('RGB'); tile=Image.new('RGB',(c.width,c.height+24),'white'); tile.paste(c,(0,24)); ImageDraw.Draw(tile).text((6,6),name,fill='black'); tiles.append(tile)
    grid=Image.new('RGB',(tiles[0].width*3,tiles[0].height*2),(220,220,220))
    for i,t in enumerate(tiles): grid.paste(t,((i%3)*t.width,(i//3)*t.height))
    grid.save(args.output_dir/'finish-variants.png')
    summary={'status':'PASS' if not errors else 'FAIL','errors':errors,'goldenChangedPixelCount':gcount,'goldenDifferenceBounds':gbbox,'moduleDifferenceBounds':mbbox,'module02AlphaBounds':list(current_module.getchannel('A').getbbox()),'finishMaskBounds':list(mask.getbbox()),'protectedAppliance':list(protected)}
    (args.output_dir/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps(summary,ensure_ascii=False,sort_keys=True)); return 0 if not errors else 1

if __name__=='__main__': raise SystemExit(main())
