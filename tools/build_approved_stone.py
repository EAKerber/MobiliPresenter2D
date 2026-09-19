#!/usr/bin/env python3
"""Replay approved PR23 and build finish inputs; original assets stay immutable."""
import argparse, base64, hashlib, json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat
from review_drainer_clean import run as review
from render_variant_fidelity import render_case
from build_stone_surface_masks import polygon_mask

ROOT = Path(__file__).resolve().parents[1]
RECORD = ROOT / 'review-assets/approved/stone-components'
SIZE = (1536, 1024)

def load(path):
    return Image.open(path).convert('RGBA')

def host_id(asset):
    return 'module-' + asset['group'][-2:]

def asset_visible_in_case(asset, ids):
    required = asset.get('requiresVisibleIds')
    if required:
        return all(entity_id in ids for entity_id in required)
    return host_id(asset) in ids

def plinth_shade(under, mask):
    """Encode low-frequency scene lighting without preserving stone granulation."""
    gray=under.convert('L')
    mean=max(1.0,ImageStat.Stat(gray,mask=mask).mean[0])
    fill=Image.new('L',SIZE,round(mean))
    isolated=Image.composite(gray,fill,mask)
    low=isolated.filter(ImageFilter.GaussianBlur(8))
    encoded=low.point(lambda v:max(112,min(140,round(128*v/mean))))
    return Image.composite(encoded,Image.new('L',SIZE,128),mask)

def material_mask(config, ids, surfaces=None):
    mask=Image.new('L',SIZE)
    allowed=set(surfaces) if surfaces is not None else None
    for asset in config['assets']:
        if not asset_visible_in_case(asset, ids): continue
        alpha=load(ROOT/asset['path']).getchannel('A')
        for surface,poly in config['groups'][asset['group']]['surfaces'].items():
            if allowed is not None and surface not in allowed: continue
            if surface in ['front-edge','plinth']:
                m=Image.open(ROOT/f"review-assets/stone-masks/generated/{asset['id']}-{surface}.png").convert('L')
            else:
                coverage=polygon_mask(SIZE,[poly],config['supersampling'])
                coverage=ImageChops.darker(coverage,polygon_mask(SIZE,[poly]))
                m=ImageChops.multiply(coverage,alpha)
            mask=ImageChops.lighter(mask,m)
    return mask

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
        upper_mask=material_mask(config,ids,{'backsplash','top','front-edge'})
        plinth_mask=material_mask(config,ids,{'plinth'})
        plinth_shading=plinth_shade(under,plinth_mask)
        combined_mask=ImageChops.lighter(upper_mask,plinth_mask)
        # Upper stone and lower plinth are distinct physical regions.
        folder=out/case['id'];folder.mkdir(exist_ok=True)
        for name,im in [('under',under),('neutral',neutral),('objects',foreground),('upperMask',upper_mask),('plinthMask',plinth_mask),('plinthShade',plinth_shading)]:
            if name in ['under','neutral']:
                clipped=Image.new('RGBA',SIZE);clipped.paste(im,(0,0),combined_mask.point(lambda v:255 if v else 0));im=clipped
            im.save(folder/(name+'.png'))
        bundle_names=['under','neutral','objects','upperMask','plinthMask','plinthShade']
        bundles[case['id']]={name:'data:image/png;base64,'+base64.b64encode((folder/(name+'.png')).read_bytes()).decode() for name in bundle_names}
        records.append({'case':case['id'],'upperPixels':sum(upper_mask.histogram()[1:]),'plinthPixels':sum(plinth_mask.histogram()[1:])})
    (out/'stone-data.js').write_text('window.CASA_STONE_DATA = '+json.dumps(bundles,separators=(',',':'))+';\n')
    return records

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args()
    print(json.dumps(build(a.output_dir)))
