#!/usr/bin/env python3
"""Fixed-camera replacement review with inferred backing and bounded pixel diff."""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def difference(a,b):
    r,g,b=ImageChops.difference(a.convert('RGB'),b.convert('RGB')).split()
    return ImageChops.lighter(ImageChops.lighter(r,g),b).point(lambda p:255 if p else 0)
def count(m):return sum(m.histogram()[1:])
def run(out):
    root=ROOT/'review-assets/faucet-regenerated-fit';cfg=json.loads((root/'config.json').read_text())
    for p,h in cfg['sha256'].items():
        if sha(ROOT/p)!=h:raise ValueError('input drift: '+p)
    source=Image.open(ROOT/cfg['source']).convert('RGBA')
    backing=Image.open(ROOT/cfg['backing']).convert('RGBA')
    removal=Image.open(ROOT/cfg['removalMask']).convert('L')
    donor=Image.open(root/'donor.png').convert('RGBA')
    x,y,w,h=cfg['fitXYWH']
    # Explicit premultiplication prevents transparent RGB from tinting resized edges.
    resized=donor.convert('RGBa').resize((w,h),Image.Resampling.LANCZOS).convert('RGBA')
    layer=Image.new('RGBA',source.size);layer.paste(resized,(x,y))
    clean=Image.composite(backing,source,removal)
    candidate=Image.alpha_composite(clean,layer)
    allowed=ImageChops.lighter(removal,layer.getchannel('A').point(lambda p:255 if p else 0))
    diff=difference(source,candidate)
    outside=count(ImageChops.multiply(diff,ImageChops.invert(allowed)))
    if outside:raise ValueError('outside replacement footprint')
    if allowed.crop((0,575,source.width,source.height)).getbbox():raise ValueError('protected front/plinth touched')
    out.mkdir(parents=True,exist_ok=True)
    layer.save(out/'faucet.png');candidate.save(out/'scene.png');allowed.save(out/'allowed.png')
    sheet=Image.new('RGB',(1200,620),'white');draw=ImageDraw.Draw(sheet)
    for col,(title,im) in enumerate((('Original',source),('Regenerated candidate',candidate))):
        draw.text((col*600+12,10),title+' - 1:1',fill='black')
        sheet.paste(im.crop((710,410,1310,600)).convert('RGB'),(col*600,30))
        draw.text((col*600+12,236),title+' - 3x nearest',fill='black')
        sheet.paste(im.crop((965,438,1055,560)).resize((270,366),Image.Resampling.NEAREST).convert('RGB'),(col*600+160,254))
    sheet.save(out/'fit-review.png')
    contrast=Image.new('RGB',(600,310),'white');draw=ImageDraw.Draw(contrast)
    for col,color in enumerate(('#ff00ff','#151515','#eeeeee')):
        preview=Image.alpha_composite(Image.new('RGBA',source.size,color),layer).crop((985,438,1038,562)).resize((106,248),Image.Resampling.NEAREST)
        contrast.paste(preview.convert('RGB'),(col*200+45,35));draw.text((col*200+12,10),color+' - fit 2x',fill='black')
    contrast.save(out/'contrast.png')
    report={'technicalStatus':'PASS','semanticReview':'PENDING','runtimeInstalled':False,'fitXYWH':cfg['fitXYWH'],'changedPixels':count(diff),'outsideReplacementPixels':outside,'frontAndPlinthChangedPixels':0,'alphaBounds':layer.getchannel('A').getbbox(),'sceneSha256':sha(out/'scene.png'),'layerSha256':sha(out/'faucet.png'),'limitations':['Whole-object replacement changes internal appearance.','Inferred backing removes old faucet; source remains exact outside removal/new-alpha union.','Full regeneration donor has residual edge artifacts; judging at native resolution is required.','Manual base/height fit, no physical camera calibration or human approval.']}
    (out/'gate.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,required=True);print(json.dumps(run(p.parse_args().output_dir)))
