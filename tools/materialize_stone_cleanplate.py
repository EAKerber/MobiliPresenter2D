#!/usr/bin/env python3
"""Confine a generated clean plate to reviewed removal masks, never edit runtime."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw,ImageFilter
ROOT=Path(__file__).resolve().parents[1]

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def count(im):return sum(im.histogram()[1:])
def changed(a,b):
    bands=ImageChops.difference(a.convert('RGB'),b.convert('RGB')).split()
    return ImageChops.lighter(ImageChops.lighter(bands[0],bands[1]),bands[2]).point(lambda v:255 if v else 0)

def masks(config):
    union=Image.new('L',tuple(config['canvas']))
    result={}
    for key,polygons in config['polygons'].items():
        m=Image.new('L',union.size);d=ImageDraw.Draw(m)
        for poly in polygons:d.polygon([tuple(pt) for pt in poly],fill=255)
        m=m.filter(ImageFilter.MaxFilter(2*config['dilatePx']+1))
        result[key]=m;union=ImageChops.lighter(union,m)
    return result,union

def run(config_path,donor_path,out):
    config=json.loads(config_path.read_text());source=ROOT/config['source']
    if sha(source)!=config['sourceSha256']:raise ValueError('canonical source drift')
    src=Image.open(source).convert('RGB');donor=Image.open(donor_path).convert('RGB')
    if src.size!=donor.size or list(src.size)!=config['canvas']:raise ValueError('canvas mismatch: no resizing allowed')
    parts,allowed=masks(config)
    # No blur outside authorization. Antialias occurs inward on an already padded support.
    alpha=allowed.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(config['featherInsidePx']/2))
    alpha=ImageChops.multiply(alpha,allowed)
    composed=Image.composite(donor,src,alpha)
    diff=changed(src,composed);outside=ImageChops.multiply(diff,ImageChops.invert(allowed))
    if count(outside):raise ValueError('outside removal mask changed')
    if diff.getbbox() is None:raise ValueError('empty edit')
    out.mkdir(parents=True,exist_ok=True)
    delta=Image.new('RGBA',src.size);delta.paste(composed,(0,0),diff)
    roundtrip=Image.alpha_composite(src.convert('RGBA'),delta).convert('RGB')
    if roundtrip.tobytes()!=composed.tobytes():raise ValueError('roundtrip mismatch')
    delta.save(out/'candidate.png');composed.save(out/'composed.png');allowed.save(out/'allowed.png')
    # Retain only local donor RGB needed for exact replay; avoid keeping changed surroundings.
    local_donor=Image.new('RGB',src.size);local_donor.paste(donor,(0,0),allowed);local_donor.save(out/'donor-regions.png')
    protections={'sink-and-faucet':[928,430,1096,575],'front-edge':[490,575,1205,590],'plinth':[490,855,1205,899]}
    gates={key:count(diff.crop(tuple(box))) for key,box in protections.items()}
    if any(gates.values()):raise ValueError('protected region changed: '+str(gates))
    report={'schemaVersion':'StoneCleanPlateGate 0.1','status':'PASS','semanticReview':'PENDING','runtimePromoted':False,'sourceSha256':sha(source),'donorRegionsSha256':sha(out/'donor-regions.png'),'candidateSha256':sha(out/'candidate.png'),'composedSha256':sha(out/'composed.png'),'changedPixels':count(diff),'outsideRemovalMaskChangedPixels':0,'roundtripMismatchPixels':0,'protectedRegionChangedPixels':gates,'byRegion':{key:count(ImageChops.multiply(diff,m)) for key,m in parts.items()},'bounds':diff.getbbox()}
    (out/'gate.json').write_text(json.dumps(report,indent=2)+'\n')
    # Exact-pixel closeups: same crop before/after, enlarged uniformly for inspection only.
    crop=(510,435,905,580);before=src.crop(crop).resize((1185,435));after=composed.crop(crop).resize((1185,435))
    sheet=Image.new('RGB',(1185,930),'white');sheet.paste(before,(0,30));sheet.paste(after,(0,495));d=ImageDraw.Draw(sheet)
    d.text((12,10),'ANTES - panelas e escorredor',fill='black');d.text((12,475),'CANDIDATO - somente os pixels das mascaras de remocao mudaram',fill='black');sheet.save(out/'review.png')
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--config',type=Path,default=ROOT/'review-assets/stone-cleanplate/config.json');p.add_argument('--donor',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();print(json.dumps(run(a.config,a.donor,a.output_dir)))
