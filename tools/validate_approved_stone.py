#!/usr/bin/env python3
"""Gate current neutral runtime against independently rebuilt, approved PR23."""
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
        before=render_case(base,next(c for c in historical['cases'] if c['id']==case['id']),SIZE)
        expected=before.copy();support=Image.new('L',SIZE)
        for host in ['02','03']:
            key='approved-stone-'+host
            assert (key in ids)==('module-'+host in ids),'host mismatch'
            if key in ids:
                expected=Image.alpha_composite(expected,patches[key])
                support=ImageChops.lighter(support,patches[key].getchannel('A'))
        actual=render_case(base,case,SIZE)
        assert actual.tobytes()==expected.tobytes(),'runtime differs from approved composition'
        rgb=ImageChops.difference(actual.convert('RGB'),before.convert('RGB')).split()
        diff=ImageChops.lighter(ImageChops.lighter(rgb[0],rgb[1]),rgb[2]).point(lambda v:255 if v else 0)
        assert not ImageChops.multiply(diff,ImageChops.invert(support)).getbbox(),'outside approval'
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

        records.append({'case':case['id'],'approvedReplayMismatchPixels':0,'outsideApprovalPixels':0,'changedPixels':sum(diff.histogram()[1:])})
    (out/'gate.json').write_text(json.dumps({'status':'PASS','cases':records,'colors':color_records,'resetOverlayEmpty':True},indent=2)+'\n')
    sheet.save(out/'color-review.png')
    return records

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args()
    print(json.dumps(run(json.loads(a.manifest.read_text()),a.output_dir)))
