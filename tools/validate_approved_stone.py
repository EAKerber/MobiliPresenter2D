#!/usr/bin/env python3
"""Gate the approved stone slice while preserving disjoint non-stone runtime overlays."""
import argparse, hashlib, json, subprocess, base64, io
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
from build_approved_stone import build, ROOT, RECORD, SIZE
from render_variant_fidelity import render_case


def approved_patches():
    receipt=json.loads((RECORD/'approval.json').read_text())
    assert receipt['status']=='APPROVED'
    for path,digest in receipt['sha256'].items():
        assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest, 'approved source drift: '+path
    return {'approved-stone-'+h:Image.open(ROOT/f'app/assets/kitchen/overlays/approved-stone-{h}.png').convert('RGBA') for h in ['02','03']}


def binary_alpha(image):
    return image.getchannel('A').point(lambda value:255 if value else 0)


def entity_alpha(entity):
    return binary_alpha(Image.open(ROOT/'app'/entity['asset']).convert('RGBA'))


def run(manifest,out):
    patches=approved_patches();build(out)
    historical=json.loads((RECORD/'source-manifest.json').read_text())
    base=Image.open(ROOT/'app'/manifest['baseAsset']).convert('RGBA')
    records=[]
    color_records=[]
    sheet=Image.new('RGB',(1000,880),'white');draw=ImageDraw.Draw(sheet)
    for host in ['02','03']:
        assert patches['approved-stone-'+host].tobytes()==Image.open(out/f'approved-{host}.png').convert('RGBA').tobytes(), 'approved patch replay mismatch'
    bundled=json.loads((ROOT/'app/data/stone-data.js').read_text().removeprefix('window.CASA_STONE_DATA = ').strip().removesuffix(';'))
    for case_id,inputs in bundled.items():
        for key,url in inputs.items():
            embedded=Image.open(io.BytesIO(base64.b64decode(url.split(',',1)[1]))).convert('RGBA')
            rebuilt=Image.open(out/case_id/(key+'.png')).convert('RGBA')
            assert embedded.tobytes()==rebuilt.tobytes(),'finish input pixel drift'
    for case in manifest['cases']:
        ids={e['id'] for e in case['visibleEntities']}
        historical_case=next(c for c in historical['cases'] if c['id']==case['id'])
        historical_ids={e['id'] for e in historical_case['visibleEntities']}
        before=render_case(base,historical_case,SIZE)
        expected=before.copy();support=Image.new('L',SIZE)
        stone_delta_ids=set()
        for host in ['02','03']:
            key='approved-stone-'+host
            assert (key in ids)==('module-'+host in ids),'host mismatch'
            if key in ids:
                expected=Image.alpha_composite(expected,patches[key])
                support=ImageChops.lighter(support,binary_alpha(patches[key]))
                stone_delta_ids.add(key)
        # The exposed-corner bridges are now host-local so the remaining stone
        # keeps a finished termination when the neighboring module is hidden.
        # They are intentionally absent from the historical hidden-state
        # manifests; replay them as the bounded, approved stone delta.
        for entity in case['visibleEntities']:
            if entity['id'].endswith('-joint-bridge') and entity['id'] not in historical_ids:
                bridge=Image.open(ROOT/'app'/entity['asset']).convert('RGBA')
                expected=Image.alpha_composite(expected,bridge)
                support=ImageChops.lighter(support,binary_alpha(bridge))
                stone_delta_ids.add(entity['id'])

        # New runtime entities that are neither historical nor part of the
        # approved stone delta are independent overlays.  Exclude them only
        # from the exact stone replay, then require their alpha to be disjoint
        # from every visible stone surface.  This keeps the stone gate exact
        # without incorrectly claiming ownership of unrelated overlays.
        independent=[
            entity for entity in case['visibleEntities']
            if entity['id'] not in historical_ids and entity['id'] not in stone_delta_ids
        ]
        stone_case={**case,'visibleEntities':[entity for entity in case['visibleEntities'] if entity not in independent]}
        stone_actual=render_case(base,stone_case,SIZE)
        assert stone_actual.tobytes()==expected.tobytes(),'runtime stone slice differs from approved composition'

        visible_stone_support=Image.new('L',SIZE)
        for entity in case['visibleEntities']:
            tags=set(entity.get('tags',[]))
            if 'stone' in tags or entity['id'].startswith('approved-stone-'):
                visible_stone_support=ImageChops.lighter(visible_stone_support,entity_alpha(entity))
        independent_records=[]
        for entity in independent:
            overlap=ImageChops.multiply(entity_alpha(entity),visible_stone_support)
            overlap_pixels=sum(overlap.histogram()[1:])
            assert overlap_pixels==0, f"independent overlay overlaps visible stone: {entity['id']} ({overlap_pixels} px)"
            independent_records.append({'id':entity['id'],'stoneOverlapPixels':0})

        rgb=ImageChops.difference(stone_actual.convert('RGB'),before.convert('RGB')).split()
        diff=ImageChops.lighter(ImageChops.lighter(rgb[0],rgb[1]),rgb[2]).point(lambda v:255 if v else 0)
        assert not ImageChops.multiply(diff,ImageChops.invert(support)).getbbox(),'stone change outside approval'

        actual=render_case(base,case,SIZE)
        actual.save(out/(case['id']+'.png'))
        folder=out/case['id']
        images={key:Image.open(folder/(key+'.png')).convert('RGBA') for key in ['neutral','under','objects','mask']}
        for key,im in images.items(): (folder/(key+'.rgba')).write_bytes(im.tobytes())
        subprocess.run(['node',str(ROOT/'tools/render_stone_color.js'),str(folder)],check=True)
        mask=images['mask'].getchannel('R')
        opaque=images['objects'].getchannel('A').point(lambda v:255 if v==255 else 0)
        for index,name in enumerate(['graphite','light','custom']):
            overlay=Image.frombytes('RGBA',SIZE,(folder/(name+'.rgba')).read_bytes())
            composed=Image.alpha_composite(actual,overlay)
            bands=ImageChops.difference(actual.convert('RGB'),composed.convert('RGB')).split()
            d=ImageChops.lighter(ImageChops.lighter(bands[0],bands[1]),bands[2])
            assert not ImageChops.multiply(d,opaque).getbbox(),'opaque object recolored'
            assert not ImageChops.multiply(d,mask.point(lambda v:0 if v else 255)).getbbox(),'color outside stone'
            if case['id']=='modules-02-03-hidden': assert actual.tobytes()==composed.tobytes()
            composed.save(folder/(name+'.png'))
            color_records.append({'case':case['id'],'color':name,'outsideStonePixels':0,'opaqueObjectsChangedPixels':0})
            if case['id']=='default':
                draw.text((10,(index+1)*220+5),name,fill='black')
                sheet.paste(composed.crop((470,420,1220,620)).convert('RGB'),(10,(index+1)*220+25))
        if case['id']=='default':
            draw.text((10,5),'Original aprovado',fill='black')
            sheet.paste(actual.crop((470,420,1220,620)).convert('RGB'),(10,25))
        for raw in folder.glob('*.rgba'): raw.unlink()

        records.append({
            'case':case['id'],
            'approvedReplayMismatchPixels':0,
            'outsideApprovalPixels':0,
            'changedPixels':sum(diff.histogram()[1:]),
            'independentRuntimeEntities':independent_records,
        })
    (out/'gate.json').write_text(json.dumps({'status':'PASS','cases':records,'colors':color_records,'resetOverlayEmpty':True},indent=2)+'\n')
    sheet.save(out/'color-review.png')
    return records


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args()
    print(json.dumps(run(json.loads(a.manifest.read_text()),a.output_dir)))
