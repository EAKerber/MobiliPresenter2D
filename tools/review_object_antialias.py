#!/usr/bin/env python3
"""Compare authored hard contours with bounded subpixel coverage, without RGB edits."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter
ROOT = Path(__file__).resolve().parents[1]

def count(mask):
    return sum(mask.histogram()[1:])

def coverage(size, polygon, hard, factor=4):
    # Work only in the object's bounds. Pixel cells use integer top-left coordinates.
    x0,y0,x1,y1 = hard.getbbox()
    box = (x0-2,y0-2,x1+2,y1+2)
    x,y,right,bottom = box
    large = Image.new('L', ((right-x)*factor,(bottom-y)*factor))
    ImageDraw.Draw(large).polygon([((px-x)*factor,(py-y)*factor) for px,py in polygon],fill=255)
    local = large.resize((right-x,bottom-y),Image.Resampling.BOX)
    alpha = Image.new('L',size)
    alpha.paste(local,(x,y))
    core = hard.filter(ImageFilter.MinFilter(3))
    outer = hard.filter(ImageFilter.MaxFilter(3))
    band = ImageChops.subtract(outer,core)
    alpha = ImageChops.lighter(ImageChops.multiply(alpha,outer),core)
    if ImageChops.multiply(ImageChops.difference(alpha,hard),ImageChops.invert(band)).getbbox():
        raise ValueError('alpha changed beyond boundary band')
    return alpha,band

def build(out):
    cfg=json.loads((ROOT/'review-assets/object-contours/config.json').read_text())
    path=ROOT/'review-assets/stone-backing/source.png'
    if hashlib.sha256(path.read_bytes()).hexdigest()!=cfg['sourceSha256']:
        raise ValueError('source drift')
    source=Image.open(path).convert('RGBA');out.mkdir(parents=True,exist_ok=True)
    sheet=Image.new('RGB',(1200,780),'white');draw=ImageDraw.Draw(sheet)
    records=[]
    for row,(key,item) in enumerate(cfg['objects'].items()):
        hard=Image.open(ROOT/f'review-assets/object-contours/generated/{key}-mask.png').convert('L')
        alpha,band=coverage(source.size,item['polygon'],hard)
        support=alpha.point(lambda p:255 if p else 0)
        cutout=Image.new('RGBA',source.size);cutout.paste(source,(0,0),support);cutout.putalpha(alpha)
        cutout.save(out/f'{key}.png');alpha.save(out/f'{key}-alpha.png');band.save(out/f'{key}-allowed-band.png')
        rgbdiff=ImageChops.difference(cutout.convert('RGB'),source.convert('RGB'))
        if any(ImageChops.multiply(c,support).getbbox() for c in rgbdiff.split()):raise ValueError('selected RGB changed')
        x0,y0,x1,y1=band.getbbox();box=(x0-3,y0-3,x1+3,y1+3)
        backdrop_results=[]
        for color_index,color in enumerate(('#ff00ff','#151515')):
            views=[]
            for a in (hard,alpha):
                obj=source.copy();obj.putalpha(a)
                views.append(Image.alpha_composite(Image.new('RGBA',source.size,color),obj).convert('RGB'))
            channels=ImageChops.difference(*views).split()
            delta=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),channels[2])
            outside=count(ImageChops.multiply(delta,ImageChops.invert(band)))
            if outside:raise ValueError('composite changed outside boundary band')
            backdrop_results.append({'background':color,'changedPixels':count(delta),'outsideBandPixels':outside})
            for variant,view in enumerate(views):
                col=color_index*2+variant
                crop=view.crop(box);scale=min(285/crop.width,222/crop.height)
                crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
                sheet.paste(crop,(col*300+8,row*260+30))
                draw.text((col*300+8,row*260+8),f'{key}: '+('hard' if variant==0 else 'AA 4x')+' '+color,fill='black')
        records.append({'id':key,'alphaChangedPixels':count(ImageChops.difference(hard,alpha)),'partialAlphaPixels':sum(alpha.histogram()[1:255]),'selectedRgbChangedPixels':0,'backgrounds':backdrop_results})
    sheet.save(out/'comparison.png')
    result={'status':'REVIEW','runtimeInstalled':False,'method':'4x polygon coverage, BOX downsample; fixed opaque core; bounded one-pixel neighborhood','sourceSha256':cfg['sourceSha256'],'objects':records,'limitations':['Coverage is based on authored polygons, not measured physical opacity.','Source RGB still contains mixed background at some boundaries; AA is not color decontamination.','No guarantee of exact recomposition on the original backing with this new alpha.']}
    (out/'report.json').write_text(json.dumps(result,indent=2)+'\n')
    return result
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,required=True)
    print(json.dumps(build(p.parse_args().output_dir)))
