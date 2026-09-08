#!/usr/bin/env python3
"""Build fixed-position presence patches over a confined inferred backing."""
import argparse,hashlib,itertools,json
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw,ImageFilter
try:
    from .materialize_stone_cleanplate import changed,count
except ImportError:
    from materialize_stone_cleanplate import changed,count
ROOT=Path(__file__).resolve().parents[1]

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def source_frame(manifest):
    ownership=json.loads((ROOT/'review-assets/stone-components/generated/ownership.json').read_text())['layers']
    im=Image.open(ROOT/'app'/manifest['baseAsset']).convert('RGBA')
    case=next(c for c in manifest['cases'] if c['id']=='default')
    for entity in case['visibleEntities']:
        # PR14 source predates the separately validated approved faucet overlay.
        if entity['id']=='faucet-approved':continue
        layers=[o for o in ownership if o['hostEntity']==entity['id']]
        paths=[ROOT/'review-assets/stone-components/generated'/o['path'] for o in layers] if layers else [ROOT/'app'/entity['asset']]
        for path in paths:im=Image.alpha_composite(im,Image.open(path).convert('RGBA'))
    return im

def build(config,manifest,donor_path,out):
    out.mkdir(parents=True,exist_ok=True);src_rgba=source_frame(manifest);src_rgba.save(out/'source.png')
    if sha(out/'source.png')!=config['sourceSha256']:raise ValueError('source components drift')
    src=src_rgba.convert('RGB');donor=Image.open(donor_path).convert('RGB')
    if donor.size!=src.size:raise ValueError('canvas mismatch; no resizing')
    claimed=Image.new('L',src.size);masks={}
    for key in config['priority']:
        m=Image.new('L',src.size);d=ImageDraw.Draw(m)
        for polygon in config['polygons'][key]:d.polygon([tuple(p) for p in polygon],fill=255)
        m=ImageChops.subtract(m,claimed);masks[key]=m;claimed=ImageChops.lighter(claimed,m)
    if claimed.crop((0,config['protectedFrontEdgeY'],src.width,src.height)).getbbox():raise ValueError('front edge/plinth touched')
    alpha=claimed.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.7));alpha=ImageChops.multiply(alpha,claimed)
    backing=Image.composite(donor,src,alpha);diff=changed(src,backing)
    if count(ImageChops.multiply(diff,ImageChops.invert(claimed))):raise ValueError('outside backing mask')
    patches={};records=[]
    for key,m in masks.items():
        support=ImageChops.multiply(diff,m);patch=Image.new('RGBA',src.size);patch.paste(src,(0,0),support);patches[key]=patch
        patch.save(out/(key+'-present.png'));m.save(out/(key+'-mask.png'))
        records.append({'id':key,'host':'module-02' if key=='cooktop' else 'module-03','image':key+'-present.png','sha256':sha(out/(key+'-present.png')),'bounds':support.getbbox(),'kind':'fixed-position-presence-patch','movable':False})
    local=Image.new('RGB',src.size);local.paste(donor,(0,0),claimed);local.save(out/'donor-regions.png');backing.save(out/'backing.png')
    result=[];views=[];keys=list(config['priority'])
    for bits in itertools.product((False,True),repeat=len(keys)):
        composed=backing.convert('RGBA');off=Image.new('L',src.size)
        for key,present in zip(keys,bits):
            if present:composed=Image.alpha_composite(composed,patches[key])
            else:off=ImageChops.lighter(off,masks[key])
        delta=changed(src,composed)
        if count(ImageChops.multiply(delta,ImageChops.invert(off))):raise ValueError('presence changes outside absent component mask')
        if all(bits) and composed.convert('RGB').tobytes()!=src.tobytes():raise ValueError('all-present roundtrip')
        state=dict(zip(keys,bits));result.append({'present':state,'changedPixels':count(delta),'outsideAbsentMaskPixels':0});views.append((state,composed))
    sheet=Image.new('RGB',(1240,800),'white');draw=ImageDraw.Draw(sheet)
    for i,(state,im) in enumerate(views):
        x=(i%2)*620;y=(i//2)*200
        title=' | '.join(k+(' ON' if v else ' OFF') for k,v in state.items());draw.text((x+8,y+8),title,fill='black')
        sheet.paste(im.crop((490,425,1110,590)).convert('RGB'),(x,y+30))
    sheet.save(out/'review.png')
    report={'status':'PASS','semanticReview':'PENDING','runtimeInstalled':False,'sourceSha256':config['sourceSha256'],'donorRegionsSha256':sha(out/'donor-regions.png'),'backingSha256':sha(out/'backing.png'),'backingChangedPixels':count(diff),'outsideBackingMaskPixels':0,'frontEdgeAndPlinthChangedPixels':0,'allPresentMismatchPixels':0,'states':result,'layers':records,'limitations':['Reconstructed stone is inferred and needs visual review.','Presence patches contain original local context and are fixed-position, not movable objects.','Backing must be hosted with corresponding module; no runtime integration in this increment.']}
    (out/'gate.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,required=True);p.add_argument('--donor',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args()
    c=json.loads((ROOT/'review-assets/stone-backing/config.json').read_text());print(json.dumps(build(c,json.loads(a.manifest.read_text()),a.donor,a.output_dir)))
