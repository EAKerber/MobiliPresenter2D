#!/usr/bin/env python3
"""Replay approved PR23 and build finish inputs; original assets stay immutable."""
import argparse, base64, hashlib, json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
from review_drainer_clean import run as review
from render_variant_fidelity import render_case
from build_stone_surface_masks import polygon_mask

ROOT = Path(__file__).resolve().parents[1]
RECORD = ROOT / 'review-assets/approved/stone-components'
SIZE = (1536, 1024)

def load(path):
    return Image.open(path).convert('RGBA')

def build(out):
    manifest = json.loads((RECORD/'source-manifest.json').read_text())
    review(manifest, out/'replay')
    config = json.loads((ROOT/'review-assets/stone-masks/config.json').read_text())
    base = load(ROOT/'app'/manifest['baseAsset'])
    backing = load(ROOT/'review-assets/stone-backing/generated/backing.png')
    removal = {k: Image.open(ROOT/f'review-assets/stone-backing/generated/{k}-mask.png').convert('L') for k in ['sink','cooktop','faucet']}
    objects = {k:load(out/f'replay/{k}/{k}.png') for k in ['sink','cooktop']}
    objects['sink'].putalpha(ImageChops.multiply(objects['sink'].getchannel('A'),ImageChops.invert(removal['faucet'])))
    objects['faucet'] = load(ROOT/'review-assets/faucet-regenerated-fit/generated/faucet.png')
    source = render_case(base, manifest['cases'][0], SIZE)
    joint = load(out/'replay/scene.png')
    allowed = {k:Image.open(out/f'replay/{k}/allowed.png').convert('L') for k in ['sink','cooktop']}
    drainer = load(out/'replay/drainer-removal.png')
    out.mkdir(parents=True,exist_ok=True)
    for host,mask in [('02',allowed['cooktop']),('03',ImageChops.lighter(allowed['sink'],drainer.getchannel('A')))]:
        patch=Image.new('RGBA',SIZE);patch.paste(joint,(0,0),mask);patch.save(out/f'approved-{host}.png')
    bundles={}
    records=[]
    for case in manifest['cases']:
        ids={e['id'] for e in case['visibleEntities']}
        original=render_case(base,case,SIZE)
        neutral=original.copy()
        for host in ['02','03']:
            if 'module-'+host in ids: neutral=Image.alpha_composite(neutral,load(out/f'approved-{host}.png'))
        if case['id']=='default': assert neutral.tobytes()==joint.tobytes(),'approved joint mismatch'
        under=neutral.copy();foreground=Image.new('RGBA',SIZE)
        for host,keys in [('02',['cooktop']),('03',['sink','faucet'])]:
            if 'module-'+host not in ids: continue
            for key in keys:
                footprint=objects[key].getchannel('A').point(lambda v:255 if v else 0)
                under=Image.composite(original,under,footprint)
                under=Image.composite(backing,under,removal[key])
                foreground=Image.alpha_composite(foreground,objects[key])
        mask=Image.new('L',SIZE)
        for asset in config['assets']:
            host='module-'+asset['group'][-2:]
            if host not in ids or ('bridge' in asset['id'] and not {'module-02','module-03'}<=ids):continue
            alpha=load(ROOT/asset['path']).getchannel('A')
            for surface,poly in config['groups'][asset['group']]['surfaces'].items():
                if surface in ['front-edge','plinth']:
                    m=Image.open(ROOT/f"review-assets/stone-masks/generated/{asset['id']}-{surface}.png").convert('L')
                else:
                    coverage=polygon_mask(SIZE,[poly],config['supersampling'])
                    coverage=ImageChops.darker(coverage,polygon_mask(SIZE,[poly]))
                    m=ImageChops.multiply(coverage,alpha)
                mask=ImageChops.lighter(mask,m)
        # Save full-frame texture, original composition and unchanged object RGBA.
        # The renderer returns pixels only inside this material mask.
        folder=out/case['id'];folder.mkdir(exist_ok=True)
        for name,im in [('under',under),('neutral',neutral),('objects',foreground),('mask',mask)]:
            # RGB under/neutral only needed in the stone support, reducing embedded size.
            if name in ['under','neutral']:
                clipped=Image.new('RGBA',SIZE);clipped.paste(im,(0,0),mask.point(lambda v:255 if v else 0));im=clipped
            im.save(folder/(name+'.png'))
        bundles[case['id']]={name:'data:image/png;base64,'+base64.b64encode((folder/(name+'.png')).read_bytes()).decode() for name in ['under','neutral','objects','mask']}
        records.append({'case':case['id'],'materialPixels':sum(mask.histogram()[1:])})
    (out/'stone-data.js').write_text('window.CASA_STONE_DATA = '+json.dumps(bundles,separators=(',',':'))+';\n')
    return records

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args()
    print(json.dumps(build(a.output_dir)))
