#!/usr/bin/env python3
"""Pinned joint approval and real runtime host-visibility checks."""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
IDS={'sink-approved','cooktop-approved','drainer-approved'}
def historical_manifest(manifest):
    return {**manifest,'cases':[{**c,'visibleEntities':[e for e in c['visibleEntities'] if e['id'] not in IDS]} for c in manifest['cases']]}
def approved_layers():
    r=json.loads((ROOT/'review-assets/approved/components/approval.json').read_text())
    layers=[]
    for row in r['components']:
        p=ROOT/row['asset'];assert hashlib.sha256(p.read_bytes()).hexdigest()==row['assetSha256'],'approved layer drift'
        layers.append((row,Image.open(p).convert('RGBA')))
    return r,layers

def run(manifest,out):
    from render_variant_fidelity import render_case
    from materialize_stone_cleanplate import changed,count
    receipt,layers=approved_layers();base=Image.open(ROOT/'app'/manifest['baseAsset']).convert('RGBA')
    historical=historical_manifest(manifest);records=[];sheet=Image.new('RGB',(1000,880),'white');draw=ImageDraw.Draw(sheet)
    for i,(case,old) in enumerate(zip(manifest['cases'],historical['cases'])):
        ids={e['id'] for e in case['visibleEntities']};clean=render_case(base,old,base.size);actual=render_case(base,case,base.size);expected=clean.copy();support=Image.new('L',base.size)
        for row,layer in layers:
            active=row['hostId'] in ids
            assert (row['id'] in ids)==active,'component host mismatch'
            if active:
                entities=[e for e in case['visibleEntities'] if e['id']==row['id']]
                assert entities[0]['asset']==row['asset'][4:],'wrong runtime asset'
                expected=Image.alpha_composite(expected,layer);support=ImageChops.lighter(support,layer.getchannel('A'))
        assert actual.tobytes()==expected.tobytes(),'runtime composition differs'
        delta=changed(actual,clean);assert not ImageChops.multiply(delta,ImageChops.invert(support)).getbbox(),'outside approved support'
        if case['id']=='default':assert hashlib.sha256(actual.tobytes()).hexdigest()==receipt['jointPixelsSha256'],'approved joint mismatch'
        records.append({'case':case['id'],'changedPixels':count(delta),'outsideApprovedSupportPixels':0,'compositionMismatchPixels':0})
        draw.text((8,i*220+8),case['id'],fill='black');sheet.paste(actual.crop((450,420,1250,615)).convert('RGB'),(0,i*220+25))
    out.mkdir(parents=True,exist_ok=True);sheet.save(out/'review.png');(out/'gate.json').write_text(json.dumps({'status':'PASS','humanAppearance':'APPROVED','cases':records},indent=2)+'\n');return records
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();print(json.dumps(run(json.loads(a.manifest.read_text()),a.output_dir)))
