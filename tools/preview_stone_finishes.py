#!/usr/bin/env python3
"""Review-only tinting beneath the approved faucet, with exact neutral replay."""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
from render_variant_fidelity import render_case
from validate_approved_faucet import approved_overlay
ROOT=Path(__file__).resolve().parents[1]
def diff(a,b):
    r,g,b=ImageChops.difference(a.convert('RGB'),b.convert('RGB')).split()
    return ImageChops.lighter(ImageChops.lighter(r,g),b).point(lambda p:255 if p else 0)
def count(m):return sum(m.histogram()[1:])
def run(manifest,out):
    from validate_approved_components import historical_manifest
    manifest=historical_manifest(manifest)
    approved_overlay() # Verify pinned approval and exact source fit before separating backing.
    cfg=json.loads((ROOT/'review-assets/stone-finish-preview/config.json').read_text())
    base=Image.open(ROOT/'app'/manifest['baseAsset']).convert('RGBA')
    faucet=Image.open(ROOT/'review-assets/faucet-regenerated-fit/generated/faucet.png').convert('RGBA')
    backing=Image.open(ROOT/'review-assets/stone-backing/generated/backing.png').convert('RGBA')
    removal=Image.open(ROOT/'review-assets/stone-backing/generated/faucet-mask.png').convert('L')
    stone_band=Image.new('L',base.size);ImageDraw.Draw(stone_band).rectangle((0,520,1535,574),fill=255)
    backing_material=ImageChops.multiply(removal,stone_band)
    records=[];views=[];out.mkdir(parents=True,exist_ok=True)
    for case in manifest['cases']:
        ids={e['id'] for e in case['visibleEntities']};has_faucet='faucet-approved' in ids
        actual=render_case(base,case,base.size)
        without=render_case(base,{**case,'visibleEntities':[e for e in case['visibleEntities'] if e['id']!='faucet-approved']},base.size)
        under=Image.composite(backing,without,removal) if has_faucet else without
        replay=Image.alpha_composite(under,faucet) if has_faucet else under
        if actual.tobytes()!=replay.tobytes():raise ValueError('neutral replay differs from current runtime')
        mask=Image.new('L',base.size)
        for group,host in [('stone-02','module-02'),('stone-03','module-03')]:
            if host not in ids:continue
            kinds=['exposed']+(['bridge'] if {'module-02','module-03'}<=ids else [])
            for kind in kinds:
                for surface in ('backsplash','top','front-edge','plinth'):
                    m=Image.open(ROOT/f'review-assets/stone-masks/generated/{group}-{kind}-{surface}.png').convert('L')
                    mask=ImageChops.lighter(mask,m)
        if has_faucet:mask=ImageChops.lighter(mask,backing_material)
        mask.save(out/(case['id']+'-material-mask.png'))
        for name,color in cfg['colors'].items():
            # Deliberately flat diagnostic color, not a promised physical material.
            tinted=Image.composite(Image.new('RGBA',base.size,tuple(color)+(255,)),under,mask)
            composed=Image.alpha_composite(tinted,faucet) if has_faucet else tinted
            changed=diff(actual,composed)
            if count(ImageChops.multiply(changed,ImageChops.invert(mask.point(lambda p:255 if p else 0)))):raise ValueError('outside material mask')
            opaque=faucet.getchannel('A').point(lambda p:255 if p==255 else 0) if has_faucet else Image.new('L',base.size)
            if ImageChops.multiply(changed,opaque).getbbox():raise ValueError('opaque faucet recolored')
            records.append({'case':case['id'],'color':name,'neutralReplayMismatchPixels':0,'changedPixels':count(changed),'outsideMaterialMaskPixels':0,'opaqueFaucetChangedPixels':0})
            if case['id']=='default':views.append((name,composed))
        if case['id']=='default':views.insert(0,('Original runtime - exact neutral replay',replay))
    sheet=Image.new('RGB',(1100,len(views)*250),'white');draw=ImageDraw.Draw(sheet)
    for i,(label,im) in enumerate(views):
        draw.text((10,i*250+8),label+' - diagnostic review, not final material',fill='black')
        sheet.paste(im.crop((450,430,1250,620)).convert('RGB'),(0,i*250+30))
        sheet.paste(im.crop((980,510,1040,575)).resize((180,195),Image.Resampling.NEAREST).convert('RGB'),(860,i*250+30))
    sheet.save(out/'review.png')
    report={'status':'REVIEW','runtimeInstalled':False,'faucetAssetSha256':hashlib.sha256((ROOT/'review-assets/faucet-regenerated-fit/generated/faucet.png').read_bytes()).hexdigest(),'cases':records,'limitations':['Conservative masks still leave original-stone islands around cooktop, sink and drainer.','Diagnostic flat colors are not a finished stone catalog.','Translucent faucet edge pixels correctly depend on the new background; the unchanged RGBA layer is the invariant.']}
    (out/'gate.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();print(json.dumps(run(json.loads(a.manifest.read_text()),a.output_dir)))
