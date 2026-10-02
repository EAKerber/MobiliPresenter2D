#!/usr/bin/env python3
"""Gate the approved stone slice while preserving disjoint non-stone runtime overlays."""
import argparse, hashlib, json, subprocess, base64, io
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
RECORD=ROOT/'review-assets/approved/stone-components'
SIZE=(1536,1024)
from render_variant_fidelity import render_case


def approved_patches():
    receipt=json.loads((RECORD/'approval.json').read_text())
    assert receipt['status']=='APPROVED'
    for path,digest in receipt['sha256'].items():
        # The M02 patch has since been intentionally replaced by the user-
        # supplied hot swap. Preserve the old approval receipt as history and
        # validate the current cooktop through the package and asset manifests.
        if path == 'app/assets/kitchen/overlays/approved-stone-02.png':
            continue
        assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest, 'approved source drift: '+path
    assets=ROOT/'app/assets/kitchen/overlays'
    tech=json.loads((ROOT/'app/data/technical-data.json').read_text())
    current={}
    for host in ['02','03']:
        rel=f'assets/kitchen/overlays/approved-stone-{host}.png'
        path=assets/f'approved-stone-{host}.png'
        expected=tech['files'][rel]['sha256']
        assert hashlib.sha256(path.read_bytes()).hexdigest()==expected, 'current technical-data hash mismatch: '+rel
        current['approved-stone-'+host]=Image.open(path).convert('RGBA')
    package=json.loads((ROOT/'app/HOT_SWAP_VALIDATION.json').read_text())
    cooktop=current['approved-stone-02']
    alpha=cooktop.getchannel('A')
    assert list(alpha.getbbox())==package['corrections']['cooktop']['bbox'], 'hot-swap cooktop bounds mismatch'
    assert package['checks']['cooktop-mirror-pixel-mismatch']==0, 'hot-swap cooktop mirror gate failed'
    return current


def binary_alpha(image):
    return image.getchannel('A').point(lambda value:255 if value else 0)


def entity_alpha(entity):
    return binary_alpha(Image.open(ROOT/'app'/entity['asset']).convert('RGBA'))


def material_inputs(out):
    source=ROOT/'app/data/stone-data.js'
    receipt=json.loads((ROOT/'app/reports/hot-swap-integration.json').read_text())
    assert hashlib.sha256(source.read_bytes()).hexdigest()==receipt['stoneDataSha256'], 'hot-swap stone inputs changed'
    bundled=json.loads(source.read_text().removeprefix('window.CASA_STONE_DATA = ').strip().removesuffix(';'))
    out.mkdir(parents=True,exist_ok=True)
    for case_id,inputs in bundled.items():
        folder=out/case_id;folder.mkdir(parents=True,exist_ok=True)
        for key,url in inputs.items():
            assert url.startswith('data:image/png;base64,'), f'{case_id}/{key}: invalid data URI'
            encoded=base64.b64decode(url.split(',',1)[1],validate=True)
            image=Image.open(io.BytesIO(encoded)).convert('RGBA')
            assert image.size==SIZE, f'{case_id}/{key}: canvas size mismatch'
            target='mask' if key=='upperMask' else key
            (folder/(target+'.rgba')).write_bytes(image.tobytes())
            image.save(folder/(target+'.png'))
    return bundled


def run(manifest,out):
    patches=approved_patches();bundled=material_inputs(out)
    historical=json.loads((RECORD/'source-manifest.json').read_text())
    base=Image.open(ROOT/'app'/manifest['baseAsset']).convert('RGBA')
    records=[]
    color_records=[]
    sheet=Image.new('RGB',(1000,880),'white');draw=ImageDraw.Draw(sheet)
    assert set(bundled)=={case['id'] for case in manifest['cases']}, 'stone input cases do not match scene variants'
    for case in manifest['cases']:
        ids={e['id'] for e in case['visibleEntities']}
        historical_case=next((c for c in historical['cases'] if c['id']==case['id']),None)
        if historical_case is None:
            # New host/occlusion fixtures use the current scene as their replay
            # base while keeping independently reviewed accessory pixels out.
            excluded={'faucet-approved','approved-stone-02','approved-stone-03','range-freestanding'}
            historical_case={**case,'visibleEntities':[entity for entity in case['visibleEntities'] if entity['id'] not in excluded]}
        historical_ids={e['id'] for e in historical_case['visibleEntities']}
        # The cooker is reviewed by the range gate; keep it outside the
        # stone-only replay baseline.
        stone_baseline_case={**historical_case,'visibleEntities':[entity for entity in historical_case['visibleEntities'] if entity['id'] != 'range-freestanding']}
        before=render_case(base,stone_baseline_case,SIZE)
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
            or entity['id'] == 'range-freestanding'
        ]
        stone_case={**case,'visibleEntities':[entity for entity in case['visibleEntities'] if entity not in independent]}
        stone_actual=render_case(base,stone_case,SIZE)
        if stone_actual.tobytes()!=expected.tobytes():
            mismatch=ImageChops.difference(stone_actual,expected).getbbox()
            raise AssertionError(f'runtime stone slice differs from approved composition: {case_id} {mismatch}')

        visible_stone_support=Image.new('L',SIZE)
        visible_stone_z=[]
        for entity in case['visibleEntities']:
            tags=set(entity.get('tags',[]))
            if 'stone' in tags or entity['id'].startswith('approved-stone-'):
                visible_stone_support=ImageChops.lighter(visible_stone_support,entity_alpha(entity))
                visible_stone_z.append(entity['zIndex'])
        independent_records=[]
        range_receipt=json.loads((ROOT/'review-assets/approved/range-freestanding/approval.json').read_text())
        x0,y0,x1,y1=range_receipt['authorizedRoi']
        authorized_range_roi=Image.new('L',SIZE)
        ImageDraw.Draw(authorized_range_roi).rectangle((x0,y0,x1-1,y1-1),fill=255)
        for entity in independent:
            overlap=ImageChops.multiply(entity_alpha(entity),visible_stone_support)
            overlap_pixels=sum(overlap.histogram()[1:])
            behind_stone=bool(visible_stone_z and entity['zIndex']<max(visible_stone_z))
            foreground_replacement=entity['id'] == 'range-freestanding'
            outside_range_roi=ImageChops.multiply(overlap,ImageChops.invert(authorized_range_roi)).getbbox()
            if overlap_pixels and not behind_stone and not (foreground_replacement and not outside_range_roi):
                raise AssertionError(f"independent overlay overlaps front stone: {entity['id']} ({overlap_pixels} px)")
            independent_records.append({
                'id':entity['id'],
                'stoneOverlapPixels':overlap_pixels,
                'compositedBehindStone':behind_stone and overlap_pixels>0,
                'approvedForegroundRangeOverlap':foreground_replacement and overlap_pixels>0 and not outside_range_roi
            })

        rgb=ImageChops.difference(stone_actual.convert('RGB'),before.convert('RGB')).split()
        diff=ImageChops.lighter(ImageChops.lighter(rgb[0],rgb[1]),rgb[2]).point(lambda v:255 if v else 0)
        assert not ImageChops.multiply(diff,ImageChops.invert(support)).getbbox(),'stone change outside approval'

        actual=render_case(base,case,SIZE)
        actual.save(out/(case['id']+'.png'))
        folder=out/case['id']
        if not folder.exists():
            records.append({'case':case['id'],'approvedReplayMismatchPixels':0,'outsideApprovalPixels':0,'changedPixels':sum(diff.histogram()[1:]),'independentRuntimeEntities':independent_records,'stoneColorFixture':'not-defined-for-new-variant'})
            continue
        images={key:Image.open(folder/(key+'.png')).convert('RGBA') for key in ['neutral','under','objects','mask']}
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
