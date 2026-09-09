#!/usr/bin/env python3
"""Confined drainer repair and joint sink/cooktop review, never runtime promotion."""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw,ImageFilter
from materialize_stone_cleanplate import masks,changed,count
from render_variant_fidelity import render_case
from fit_regenerated_sink import run as sink_run
from fit_regenerated_cooktop import run as cooktop_run
ROOT=Path(__file__).resolve().parents[1]
def run(manifest,out):
    from validate_approved_components import historical_manifest
    manifest=historical_manifest(manifest)
    p=ROOT/'review-assets/drainer-clean-review';cfg=json.loads((p/'config.json').read_text())
    for name,digest in cfg['sha256'].items():
        assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==digest,'input drift'
    out.mkdir(parents=True,exist_ok=True)
    sink_run(manifest,out/'sink');cooktop_run(manifest,out/'cooktop')
    base=Image.open(ROOT/'app'/manifest['baseAsset']).convert('RGBA')
    source=render_case(base,next(c for c in manifest['cases'] if c['id']=='default'),base.size)
    parts,_=masks(json.loads((ROOT/'review-assets/stone-cleanplate/config.json').read_text()));mask=parts['drainer-03']
    old=Image.open(ROOT/'review-assets/stone-cleanplate/generated/composed.png').convert('RGBA')
    removed=Image.composite(old,source,mask)
    band=Image.new('L',base.size);ImageDraw.Draw(band).rectangle((0,cfg['repairBand'][0],1535,cfg['repairBand'][1]-1),fill=255)
    repair=ImageChops.multiply(mask,band)
    # Feather inward only; do not blend across horizontal plane boundaries.
    alpha=ImageChops.multiply(mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6)),repair)
    donor=Image.new('RGBA',base.size);donor.paste(Image.open(p/'donor.png').convert('RGBA'),tuple(cfg['crop'][:2]))
    removed=Image.composite(donor,removed,alpha)
    diff=changed(source,removed)
    assert not ImageChops.multiply(diff,ImageChops.invert(mask)).getbbox(),'outside drainer mask'
    assert not diff.crop((0,575,1536,1024)).getbbox(),'front or body changed'
    joint=removed;support=mask.copy()
    for key in ['sink','cooktop']:
        candidate=Image.open(out/key/'scene.png').convert('RGBA');allowed=Image.open(out/key/'allowed.png').convert('L')
        assert not ImageChops.multiply(support,allowed).getbbox(),'candidate supports overlap'
        joint=Image.composite(candidate,joint,allowed);support=ImageChops.lighter(support,allowed)
        assert not ImageChops.multiply(changed(candidate,joint),allowed).getbbox(),'candidate pixels changed'
    joint_diff=changed(source,joint)
    assert not ImageChops.multiply(joint_diff,ImageChops.invert(support)).getbbox(),'outside joint support'
    patch=Image.new('RGBA',base.size);patch.paste(removed,(0,0),diff);patch.save(out/'drainer-removal.png')
    assert Image.alpha_composite(source,patch).tobytes()==removed.tobytes(),'roundtrip mismatch'
    joint.save(out/'scene.png');support.save(out/'allowed.png')
    sheet=Image.new('RGB',(1200,790),'white');d=ImageDraw.Draw(sheet)
    for i,(label,im) in enumerate([('Original runtime',source),('Joint candidate: sink + cooktop + no drainer',joint)]):
        y=i*270;d.text((10,y+8),label,fill='black');sheet.paste(im.crop((470,410,1210,620)).convert('RGB'),(10,y+30))
        sheet.paste(im.crop((780,510,882,575)).resize((408,260),Image.Resampling.NEAREST).convert('RGB'),(780,y+10))
    d.text((10,550),'Native scene overview (scaled) / visual approval pending',fill='black')
    sheet.paste(joint.resize((330,220)).convert('RGB'),(10,570));sheet.save(out/'review.png')
    report={'technicalStatus':'PASS','semanticReview':'PENDING','runtimeInstalled':False,'drainerChangedPixels':count(diff),'jointChangedPixels':count(joint_diff),'outsideDrainerMaskPixels':0,'outsideJointSupportPixels':0,'candidateOverlapPixels':0,'roundtripMismatchPixels':0,'limitations':['Reconstructed hidden stone texture is inferred, not recovered.','Sink and cooktop retain their individual pending visual reviews.','Joint review is default-state only; no runtime visibility integration.']}
    (out/'gate.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();print(json.dumps(run(json.loads(a.manifest.read_text()),a.output_dir)))
