#!/usr/bin/env python3
"""Validate approved faucet pixels, real visibility, and historical-scene preservation."""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
def approved_overlay():
    r=json.loads((ROOT/'review-assets/approved/faucet/approval.json').read_text())
    for key in ('asset','mask','approvedLayer'):
        assert hashlib.sha256((ROOT/r[key]).read_bytes()).hexdigest()==r[key+'Sha256'],key+' drift'
    layer=Image.open(ROOT/r['asset']).convert('RGBA');mask=Image.open(ROOT/r['mask']).convert('L')
    assert layer.getchannel('A').tobytes()==mask.tobytes()
    backing=Image.open(ROOT/'review-assets/stone-backing/generated/backing.png').convert('RGBA')
    removal=Image.open(ROOT/'review-assets/stone-backing/generated/faucet-mask.png').convert('L');backing.putalpha(removal)
    expected=Image.alpha_composite(backing,Image.open(ROOT/r['approvedLayer']).convert('RGBA'))
    for color in ('black','white'):
        bg=Image.new('RGBA',layer.size,color)
        assert Image.alpha_composite(bg,expected).tobytes()==Image.alpha_composite(bg,layer).tobytes(),'approved fit altered'
    return layer

def run(manifest,out):
    from render_variant_fidelity import render_case
    layer=approved_overlay();support=layer.getchannel('A').point(lambda p:255 if p else 0)
    base=Image.open(ROOT/'app'/manifest['baseAsset']).convert('RGBA');records=[];sheet=Image.new('RGB',(1000,800),'white');draw=ImageDraw.Draw(sheet)
    for i,case in enumerate(manifest['cases']):
        ids=[e['id'] for e in case['visibleEntities']];host='module-03' in ids
        assert ('faucet-approved' in ids)==host,'host visibility mismatch'
        clean_case={**case,'visibleEntities':[e for e in case['visibleEntities'] if e['id']!='faucet-approved']}
        clean=render_case(base,clean_case,layer.size);actual=render_case(base,case,layer.size)
        expected=Image.alpha_composite(clean,layer) if host else clean
        assert actual.tobytes()==expected.tobytes(),'ordered runtime mismatch'
        bands=ImageChops.difference(actual.convert('RGB'),clean.convert('RGB')).split();d=ImageChops.lighter(ImageChops.lighter(bands[0],bands[1]),bands[2]).point(lambda p:255 if p else 0)
        assert not ImageChops.multiply(d,ImageChops.invert(support)).getbbox()
        records.append({'id':case['id'],'faucetVisible':host,'changedPixels':sum(d.histogram()[1:]),'outsideApprovedMaskPixels':0,'approvedCompositionMismatchPixels':0})
        draw.text((8,i*200+8),case['id'],fill='black');sheet.paste(actual.crop((600,420,1536,590)).convert('RGB'),(0,i*200+30))
    out.mkdir(parents=True,exist_ok=True);sheet.save(out/'review.png');(out/'gate.json').write_text(json.dumps({'status':'PASS','humanAppearance':'APPROVED','cases':records},indent=2)+'\n')
    return records
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();print(json.dumps(run(json.loads(a.manifest.read_text()),a.output_dir)))
