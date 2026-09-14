#!/usr/bin/env python3
"""Split candidate visible pixels by owner; verify all four runtime compositions."""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
from materialize_stone_cleanplate import masks,changed,count
ROOT=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def selection(size,polygons):
    m=Image.new('L',size);d=ImageDraw.Draw(m)
    for poly in polygons:d.polygon([tuple(v) for v in poly],fill=255)
    return m

def split(config,manifest,out):
    from validate_approved_components import historical_manifest
    manifest=historical_manifest(manifest)
    out.mkdir(parents=True,exist_ok=True)
    cleanpath=ROOT/'review-assets/stone-cleanplate/generated/composed.png'
    if sha(cleanpath)!=config['cleanFrameSha256']:raise ValueError('clean frame drift')
    clean=Image.open(cleanpath).convert('RGBA');size=clean.size
    removal=json.loads((ROOT/'review-assets/stone-cleanplate/config.json').read_text())
    regions,_=masks(removal)
    groups={};records=[];ownership=[]
    for asset in config['assets']:
        if sha(ROOT/asset['path'])!=asset['sha256']:raise ValueError('owner asset drift')
        host=asset['host'];original=Image.open(ROOT/asset['path']).convert('RGBA')
        allowed=regions['pans-02' if host=='stone-02' else 'drainer-03']
        below=Image.new('L',size);ImageDraw.Draw(below).rectangle((0,config['wallRevealAboveY'],size[0]-1,size[1]-1),fill=255)
        replace=ImageChops.multiply(allowed,below)
        owner=Image.composite(clean,original,replace)
        alpha=original.getchannel('A')
        wall=ImageChops.multiply(allowed,ImageChops.invert(below))
        owner.putalpha(ImageChops.multiply(alpha,ImageChops.invert(wall)))
        remaining=owner.copy();parts=[]
        targets=[(key,[o['polygon']]) for key,o in config['objects'].items() if o['host']==host]
        targets.append(('material',config['stoneRegions'][host]))
        for key,polys in targets:
            m=selection(size,polys)
            a=ImageChops.multiply(remaining.getchannel('A'),m)
            part=Image.new('RGBA',size);part.paste(remaining,(0,0),m);part.putalpha(a)
            remaining.putalpha(ImageChops.multiply(remaining.getchannel('A'),ImageChops.invert(m)))
            parts.append((key,part))
        parts.append(('context',remaining))
        reconstructed=Image.new('RGBA',size)
        for key,part in parts:reconstructed=Image.alpha_composite(reconstructed,part)
        # Invisible RGB is immaterial; compare on both black and white backgrounds.
        for color in ('black','white'):
            bg=Image.new('RGBA',size,color)
            if Image.alpha_composite(bg,reconstructed).tobytes()!=Image.alpha_composite(bg,owner).tobytes():raise ValueError('split roundtrip')
        for key,part in parts:
            path=out/(host+'-'+key+'.png');part.save(path)
            ownership.append({'id':host+'-'+key,'hostEntity':host,'path':path.name,'sha256':sha(path),'alphaBounds':part.getchannel('A').getbbox(),'independentToggleSupported':False})
        groups[asset['path'].removeprefix('app/')]=(owner,parts,allowed)
        records.append({'host':host,'splitRoundtripMismatchPixels':0,'wallAlphaRemovedPixels':count(ImageChops.multiply(alpha,wall))})
    base=Image.open(ROOT/'app'/manifest['baseAsset']).convert('RGBA');cases=[];views=[]
    for case in manifest['cases']:
        before=base.copy();expected=base.copy();actual=base.copy();allowed=Image.new('L',size)
        for e in case['visibleEntities']:
            source=Image.open(ROOT/'app'/e['asset']).convert('RGBA');before=Image.alpha_composite(before,source)
            if e['asset'] in groups:
                owner,parts,m=groups[e['asset']];expected=Image.alpha_composite(expected,owner)
                for _,part in parts:actual=Image.alpha_composite(actual,part)
                allowed=ImageChops.lighter(allowed,m)
            else:
                expected=Image.alpha_composite(expected,source);actual=Image.alpha_composite(actual,source)
        if expected.tobytes()!=actual.tobytes():raise ValueError('scene roundtrip')
        diff=changed(before,actual)
        if count(ImageChops.multiply(diff,ImageChops.invert(allowed))):raise ValueError('outside ROI')
        cases.append({'id':case['id'],'changedPixels':count(diff),'outsideAuthorizedMaskPixels':0,'splitRoundtripMismatchPixels':0})
        views.append((case['id'],actual))
    sheet=Image.new('RGB',(1536,800),'white');draw=ImageDraw.Draw(sheet)
    for i,(name,view) in enumerate(views):
        draw.text((12,i*200+8),name+' - candidate component composition',fill='black')
        sheet.paste(view.crop((0,425,1536,595)).convert('RGB'),(0,i*200+28))
    sheet.save(out/'review.png')
    # Render isolated source-pixel components for judging semantic boundaries.
    sheet=Image.new('RGB',(1000,500),(110,130,150));draw=ImageDraw.Draw(sheet)
    for i,key in enumerate(('cooktop','sink','faucet')):
        host=config['objects'][key]['host'];im=Image.open(out/(host+'-'+key+'.png'));bbox=im.getchannel('A').getbbox()
        crop=im.crop(bbox);scale=min(300/crop.width,410/crop.height);crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST);x=20+i*330;sheet.paste(crop,(x,45),crop);draw.text((x,15),key,fill='white')
    sheet.save(out/'objects-review.png')
    (out/'ownership.json').write_text(json.dumps({'status':'REVIEW','runtimeInstalled':False,'layers':ownership},indent=2)+'\n')
    report={'status':'PASS','semanticReview':'PENDING','runtimeInstalled':False,'owners':records,'cases':cases}
    (out/'gate.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args()
    print(json.dumps(split(json.loads((ROOT/'review-assets/stone-components/config.json').read_text()),json.loads(a.manifest.read_text()),a.output_dir)))
