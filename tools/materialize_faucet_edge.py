#!/usr/bin/env python3
"""Confine a generated RGB donor to a fixed-alpha faucet boundary."""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def delta(a,b):
    r,g,b=ImageChops.difference(a.convert('RGB'),b.convert('RGB')).split()
    return ImageChops.lighter(ImageChops.lighter(r,g),b).point(lambda p:255 if p else 0)
def count(m):return sum(m.histogram()[1:])
def run(donor_path,out):
    cfg=json.loads((ROOT/'review-assets/faucet-edge-donor/config.json').read_text())
    for path,sha in cfg['sha256'].items():
        if digest(ROOT/path)!=sha:raise ValueError('source drift: '+path)
    obj=Image.open(ROOT/cfg['object']).convert('RGBA');a=obj.getchannel('A')
    band=Image.open(ROOT/cfg['allowedBand']).convert('L')
    allowed=ImageChops.multiply(band,a.point(lambda p:255 if p else 0))
    x0,y0,x1,y1=cfg['crop'];donor=Image.open(donor_path).convert('RGB')
    if donor.size!=(x1-x0,y1-y0):raise ValueError('donor crop canvas mismatch')
    full=Image.new('RGB',obj.size);full.paste(donor,(x0,y0))
    candidate=Image.composite(full,obj.convert('RGB'),allowed).convert('RGBA');candidate.putalpha(a)
    d=delta(candidate,obj)
    if count(ImageChops.multiply(d,ImageChops.invert(allowed))):raise ValueError('RGB outside authorized edge')
    if candidate.getchannel('A').tobytes()!=a.tobytes():raise ValueError('alpha drift')
    out.mkdir(parents=True,exist_ok=True);candidate.save(out/'faucet.png');allowed.save(out/'allowed.png')
    scene=Image.open(ROOT/cfg['source']).convert('RGB')
    # Color-only review replacement in the original frame; interior and exterior fixed.
    replacement_alpha=ImageChops.multiply(allowed,a)
    composed=Image.composite(full,scene,replacement_alpha);scene_delta=delta(scene,composed)
    if count(ImageChops.multiply(scene_delta,ImageChops.invert(allowed))):raise ValueError('scene outside edge')
    composed.save(out/'scene.png')
    sheet=Image.new('RGB',(960,640),'white');draw=ImageDraw.Draw(sheet);checks=[]
    box=(986,438,1032,562)
    for col,color in enumerate(('#ff00ff','#151515','#eeeeee')):
        views=[Image.alpha_composite(Image.new('RGBA',obj.size,color),im).convert('RGB') for im in (obj,candidate)]
        diff=delta(*views);outside=count(ImageChops.multiply(diff,ImageChops.invert(allowed)))
        if outside:raise ValueError('contrast outside edge')
        checks.append({'background':color,'changedPixels':count(diff),'outsideEdgePixels':outside})
        for row,im in enumerate(views):
            crop=im.crop(box).resize((92,248),Image.Resampling.NEAREST)
            sheet.paste(crop,(col*320+112,row*320+40));draw.text((col*320+20,row*320+12),('AA original' if row==0 else 'Generated edge only')+' '+color,fill='black')
    sheet.save(out/'comparison.png')
    report={'technicalStatus':'PASS','semanticReview':'PENDING','runtimeInstalled':False,'rgbChangedPixels':count(d),'alphaChangedPixels':0,'outsideEdgePixels':0,'interiorChangedPixels':0,'sceneChangedPixels':count(scene_delta),'sceneOutsideEdgePixels':0,'contrasts':checks,'candidateSha256':digest(out/'faucet.png'),'sceneSha256':digest(out/'scene.png'),'donorSha256':digest(donor_path),'limitations':['Fixed silhouette from PR16; generated geometry is not adopted.','Boundary RGB donor can include gray matte contamination and altered highlights; semantic review required.','This replaces edge color only and does not establish object-off roundtrip.']}
    (out/'gate.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--donor',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();print(json.dumps(run(a.donor,a.output_dir)))
