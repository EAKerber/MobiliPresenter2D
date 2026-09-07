#!/usr/bin/env python3
"""Materialize review-only stone masks from canonical polygons and owner alpha."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
COLORS = {'backsplash':(212,67,172), 'top':(30,196,201), 'front-edge':(247,188,40), 'plinth':(74,114,230)}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def polygon_mask(size, polygons, scale=1):
    image = Image.new('L', (size[0]*scale, size[1]*scale))
    draw = ImageDraw.Draw(image)
    for polygon in polygons:
        if len(polygon)<3: raise ValueError('polygon needs at least 3 points')
        draw.polygon([(round(x*scale),round(y*scale)) for x,y in polygon], fill=255)
    return image.resize(size, Image.Resampling.LANCZOS) if scale!=1 else image

def build(config, root, output):
    if config['schemaVersion']!='StoneSurfaceMasks 0.1': raise ValueError('schema')
    size=tuple(config['canvas'])
    if size!=(1536,1024): raise ValueError('canonical canvas required')
    output.mkdir(parents=True,exist_ok=True)
    records=[]
    scene=Image.open(root/'app/assets/kitchen/composicao-completa.png').convert('RGBA')
    overlay=scene.copy()
    for asset in config['assets']:
        path=root/asset['path']
        if sha(path)!=asset['sha256']: raise ValueError('source hash drift: '+asset['id'])
        image=Image.open(path).convert('RGBA')
        if image.size!=size: raise ValueError('source canvas')
        alpha=image.getchannel('A')
        group=config['groups'][asset['group']]
        protected=polygon_mask(size,group['protected'].values())
        # Hard exclusion AFTER antialias: feather must never leak onto protected objects.
        safe=ImageChops.invert(protected)
        claimed=Image.new('L',size)
        for surface,polygon in group['surfaces'].items():
            coverage=polygon_mask(size,[polygon],config['supersampling'])
            coverage=ImageChops.darker(coverage,polygon_mask(size,[polygon]))
            mask=ImageChops.multiply(ImageChops.multiply(coverage,alpha),safe)
            # Independent surface masks may not double-tint their shared border.
            mask=ImageChops.multiply(mask,ImageChops.invert(claimed.point(lambda v:255 if v else 0)))
            claimed=ImageChops.lighter(claimed,mask)
            assert ImageChops.subtract(mask,alpha).getbbox() is None
            assert ImageChops.multiply(mask,protected).getbbox() is None
            name=asset['id']+'-'+surface+'.png';mask.save(output/name)
            color=Image.new('RGBA',size,COLORS[surface]+(0,));color.putalpha(mask.point(lambda v:round(v*.65)))
            overlay=Image.alpha_composite(overlay,color)
            records.append({'asset':asset['id'],'surface':surface,'file':name,'sha256':sha(output/name),'nonzeroPixels':sum(mask.histogram()[1:]),'bounds':mask.getbbox(),'outsideOwnerAlphaPixels':0,'protectedPixels':0})
        protected.save(output/(asset['id']+'-protect.png'))
    # Review graphic only: the runtime pixels are never written.
    canvas=Image.new('RGB',(1536,680),'white')
    canvas.paste(scene.crop((0,420,1536,640)).convert('RGB'),(0,36))
    canvas.paste(overlay.crop((0,420,1536,640)).convert('RGB'),(0,285))
    canvas.paste(overlay.crop((0,830,1536,925)).convert('RGB'),(0,548))
    draw=ImageDraw.Draw(canvas)
    draw.text((20,12),'STONE MASK REVIEW - original / masks / plinth - canonical X, unscaled crops',fill='black')
    draw.text((20,263),'Magenta: backsplash | Cyan: top | Yellow: front edge | Blue: plinth | Untinted: excluded',fill='black')
    draw.text((20,523),'REVIEW ONLY - conservative exclusions around objects; no finish enabled',fill='black')
    canvas.save(output/'review.png')
    report={'schemaVersion':'StoneMaskBuildReport 0.1','status':'PASS','semanticApproval':'PENDING','runtimeInstalled':False,'configSha256':hashlib.sha256(json.dumps(config,sort_keys=True).encode()).hexdigest(),'records':records}
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    return report

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--config',type=Path,default=ROOT/'review-assets/stone-masks/config.json')
    p.add_argument('--output-dir',type=Path,required=True)
    args=p.parse_args()
    report=build(json.loads(args.config.read_text()),ROOT,args.output_dir)
    print(json.dumps({'status':report['status'],'maskCount':len(report['records']),'semanticApproval':'PENDING','runtimeInstalled':False}))
if __name__=='__main__':main()
