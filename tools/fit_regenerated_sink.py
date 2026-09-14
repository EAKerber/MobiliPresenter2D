#!/usr/bin/env python3
"""Review a regenerated sink on actual runtime and contrasting stone colors."""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
from render_variant_fidelity import render_case
from validate_approved_faucet import approved_overlay
ROOT=Path(__file__).resolve().parents[1]
def delta(a,b):
    r,g,b=ImageChops.difference(a.convert('RGB'),b.convert('RGB')).split()
    return ImageChops.lighter(ImageChops.lighter(r,g),b).point(lambda p:255 if p else 0)
def run(manifest,out):
    from validate_approved_components import historical_manifest
    manifest=historical_manifest(manifest)
    p=ROOT/'review-assets/sink-regenerated-fit';cfg=json.loads((p/'config.json').read_text())
    for name,digest in cfg['sha256'].items():
        assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==digest,'input drift'
    case=next(c for c in manifest['cases'] if c['id']=='default')
    base=Image.open(ROOT/'app'/manifest['baseAsset']).convert('RGBA');source=render_case(base,case,base.size)
    oldfree=render_case(base,{**case,'visibleEntities':[e for e in case['visibleEntities'] if e['id']!='faucet-approved']},base.size)
    removal=Image.open(ROOT/'review-assets/stone-backing/generated/sink-mask.png').convert('L')
    backing=Image.open(ROOT/'review-assets/stone-backing/generated/backing.png').convert('RGBA')
    under=Image.composite(backing,oldfree,removal)
    raw=Image.open(p/'donor.png').convert('RGBA');fitted=raw.convert('RGBa').resize((149,12),Image.Resampling.LANCZOS).convert('RGBA')
    layer=Image.new('RGBA',base.size);layer.paste(fitted,(936,561))
    faucet=approved_overlay();candidate=Image.alpha_composite(Image.alpha_composite(under,layer),faucet)
    support=ImageChops.lighter(removal,layer.getchannel('A').point(lambda v:255 if v else 0))
    change=delta(source,candidate);outside=ImageChops.multiply(change,ImageChops.invert(support))
    assert not outside.getbbox(),'outside replacement region'
    out.mkdir(parents=True,exist_ok=True);layer.save(out/'sink.png');candidate.save(out/'scene.png');support.save(out/'allowed.png')
    views=[('Original',source),('Regenerated sink',candidate)]
    faucet_removal=Image.open(ROOT/'review-assets/stone-backing/generated/faucet-mask.png').convert('L')
    raw_faucet=Image.open(ROOT/'review-assets/faucet-regenerated-fit/generated/faucet.png').convert('RGBA')
    clean_under=Image.composite(backing,oldfree,ImageChops.lighter(removal,faucet_removal))
    sink_visible=layer.copy();sink_visible.putalpha(ImageChops.multiply(layer.getchannel('A'),ImageChops.invert(faucet_removal)))
    replay=Image.alpha_composite(Image.alpha_composite(clean_under,sink_visible),raw_faucet)
    assert not delta(candidate,replay).getbbox(),'separated faucet replay mismatch'
    band=Image.new('L',base.size);ImageDraw.Draw(band).rectangle((0,552,1535,573),fill=255)
    probe_mask=ImageChops.lighter(removal,ImageChops.multiply(faucet_removal,band))
    # Local material probes, not global finish presets. Do not recolor opaque sink pixels.
    for name,color in [('Graphite',(45,48,51,255)),('Light',(218,218,212,255))]:
        tinted=Image.composite(Image.new('RGBA',base.size,color),clean_under,probe_mask)
        view=Image.alpha_composite(Image.alpha_composite(tinted,sink_visible),raw_faucet)
        d=delta(candidate,view)
        opaque=sink_visible.getchannel('A').point(lambda v:255 if v==255 else 0)
        assert not ImageChops.multiply(d,opaque).getbbox(),'sink metal recolored'
        assert not ImageChops.multiply(d,ImageChops.invert(probe_mask)).getbbox(),'outside color probe'
        assert not ImageChops.multiply(d,raw_faucet.getchannel('A').point(lambda v:255 if v==255 else 0)).getbbox(),'faucet metal recolored'
        views.append((name+' local probe',view))
    sheet=Image.new('RGB',(1000,600),'white');draw=ImageDraw.Draw(sheet)
    for i,(name,im) in enumerate(views):
        x=(i%2)*500;y=(i//2)*300
        draw.text((x+10,y+8),name+' / native',fill='black');sheet.paste(im.crop((800,430,1200,590)).convert('RGB'),(x+40,y+28))
        sheet.paste(im.crop((926,551,1096,580)).resize((476,81),Image.Resampling.NEAREST).convert('RGB'),(x+8,y+206))
    sheet.save(out/'review.png')
    report={'technicalStatus':'PASS','semanticReview':'PENDING','runtimeInstalled':False,'fitXYWH':[936,561,149,12],'changedPixels':sum(change.histogram()[1:]),'outsideReplacementPixels':0,'approvedFaucetOverlayUnchanged':True,'opaqueSinkChangedByColorProbe':0,'limitations':['Local contrast probes only; whole stone mask remains incomplete.','Donor edge residue may remain visible on enlargement.','Width and height fit separately; no claim of exact original geometry or human approval.']}
    (out/'gate.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();print(json.dumps(run(json.loads(a.manifest.read_text()),a.output_dir)))
