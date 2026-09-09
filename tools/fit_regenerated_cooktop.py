#!/usr/bin/env python3
"""Confined cooktop review; never installs or approves the generated object."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
from render_variant_fidelity import render_case
from materialize_stone_cleanplate import masks, changed, count
ROOT=Path(__file__).resolve().parents[1]

def run(manifest,out):
    folder=ROOT/'review-assets/cooktop-regenerated-fit'
    config=json.loads((folder/'config.json').read_text())
    for name,digest in config['sha256'].items():
        assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==digest, 'input drift: '+name
    base=Image.open(ROOT/'app'/manifest['baseAsset']).convert('RGBA')
    case=next(c for c in manifest['cases'] if c['id']=='default')
    source=render_case(base,case,base.size)
    parts,_=masks(json.loads((ROOT/'review-assets/stone-cleanplate/config.json').read_text()))
    pans=parts['pans-02']
    clean=Image.open(ROOT/'review-assets/stone-cleanplate/generated/composed.png').convert('RGBA')
    without_pans=Image.composite(clean,source,pans)
    removal=Image.open(ROOT/'review-assets/stone-backing/generated/cooktop-mask.png').convert('L')
    backing=Image.open(ROOT/'review-assets/stone-backing/generated/backing.png').convert('RGBA')
    under=Image.composite(backing,without_pans,removal)
    donor=Image.open(folder/'donor.png')
    assert donor.mode=='RGBA' and donor.getchannel('A').getextrema()==(0,255), 'real transparency required'
    x,y,w,h=config['fitXYWH']
    fitted=donor.convert('RGBa').resize((w,h),Image.Resampling.LANCZOS).convert('RGBA')
    layer=Image.new('RGBA',base.size);layer.paste(fitted,(x,y))
    candidate=Image.alpha_composite(under,layer)
    support=ImageChops.lighter(ImageChops.lighter(pans,removal),layer.getchannel('A').point(lambda v:255 if v else 0))
    diff=changed(source,candidate)
    assert not ImageChops.multiply(diff,ImageChops.invert(support)).getbbox(), 'outside replacement support'
    assert not diff.crop((0,575,1536,1024)).getbbox(), 'front edge or body changed'
    assert not diff.crop((780,0,1536,1024)).getbbox(), 'sink/faucet/drainer changed'
    views=[('Runtime original',source),('Regenerated cooktop / native',candidate)]
    for name,color in [('Graphite',(45,48,51,255)),('Light',(218,218,212,255))]:
        tint=Image.composite(Image.new('RGBA',base.size,color),under,removal)
        probe=Image.alpha_composite(tint,layer);d=changed(candidate,probe)
        assert not ImageChops.multiply(d,ImageChops.invert(removal)).getbbox(), 'outside color probe'
        assert not ImageChops.multiply(d,layer.getchannel('A').point(lambda v:255 if v==255 else 0)).getbbox(), 'opaque cooktop recolored'
        views.append((name+' local probe',probe))
    out.mkdir(parents=True,exist_ok=True)
    layer.save(out/'cooktop.png');candidate.save(out/'scene.png');support.save(out/'allowed.png')
    sheet=Image.new('RGB',(1000,640),'white');draw=ImageDraw.Draw(sheet)
    for i,(label,im) in enumerate(views):
        ox=(i%2)*500;oy=(i//2)*320
        draw.text((ox+10,oy+8),label,fill='black')
        sheet.paste(im.crop((470,440,770,600)).convert('RGB'),(ox+100,oy+28))
        sheet.paste(im.crop((510,532,744,577)).resize((468,90),Image.Resampling.NEAREST).convert('RGB'),(ox+16,oy+216))
    sheet.save(out/'review.png')
    report={'technicalStatus':'PASS','semanticReview':'PENDING','runtimeInstalled':False,'fitXYWH':config['fitXYWH'],'changedPixels':count(diff),'outsideReplacementPixels':0,'sinkFaucetDrainerChangedPixels':0,'frontEdgeBodyChangedPixels':0,'opaqueCooktopChangedByProbe':0,'limitations':['Generated grate and knob geometry needs visual review.','Uses previously inferred pot-removal backing inside its mask only.','Independent width/height fit is not a perspective proof.','Solid local probes are not finished stone materials.']}
    (out/'gate.json').write_text(json.dumps(report,indent=2)+'\n')
    return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();print(json.dumps(run(json.loads(a.manifest.read_text()),a.output_dir)))
