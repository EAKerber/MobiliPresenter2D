#!/usr/bin/env python3
"""Verify the approved alpha layer in the real ordered runtime composition."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
from render_variant_fidelity import render_case
ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    receipt = json.loads((ROOT/'review-assets/approved/range-freestanding/approval.json').read_text())
    for key in ('asset', 'mask'):
        assert hashlib.sha256((ROOT/receipt[key]).read_bytes()).hexdigest() == receipt[key+'Sha256'], key+' hash changed'
    layer = Image.open(ROOT/receipt['asset']).convert('RGBA')
    mask = Image.open(ROOT/receipt['mask']).convert('L')
    assert layer.size == mask.size == (1536, 1024)
    assert layer.getchannel('A').tobytes() == mask.tobytes(), 'mask mismatch'
    manifest = json.loads(args.manifest.read_text())
    cases = {c['id']:c for c in manifest['cases']}
    case = cases['module-02-hidden']
    assert [e['asset'] for e in case['visibleEntities'] if e['id']=='range-freestanding'] == [receipt['asset'].removeprefix('app/')]
    assert not any(e['id']=='range-freestanding' for e in cases['default']['visibleEntities'])
    clean_case = {**case, 'visibleEntities':[e for e in case['visibleEntities'] if e['id']!='range-freestanding']}
    base = Image.open(ROOT/'app'/manifest['baseAsset']).convert('RGBA')
    clean = render_case(base, clean_case, layer.size)
    composed = render_case(base, case, layer.size)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    historical_clean = render_case(base, {**clean_case, 'visibleEntities':[e for e in clean_case['visibleEntities'] if e['id'] not in {'faucet-approved','sink-approved','cooktop-approved','drainer-approved'}]}, layer.size)
    historical_clean.save(args.output_dir/'clean.png')
    assert hashlib.sha256((args.output_dir/'clean.png').read_bytes()).hexdigest() == receipt['cleanFrameSha256'], 'canonical clean frame drift'
    diff = ImageChops.difference(clean.convert('RGB'), composed.convert('RGB'))
    bands = diff.split()
    changed = ImageChops.lighter(ImageChops.lighter(bands[0], bands[1]), bands[2]).point(lambda x: 255 if x else 0)
    roi = Image.new('L', layer.size)
    x0,y0,x1,y1 = receipt['authorizedRoi']
    ImageDraw.Draw(roi).rectangle((x0,y0,x1-1,y1-1), fill=255)
    assert changed.getbbox(), 'replacement invisible'
    assert ImageChops.subtract(changed, roi).getbbox() is None, 'outside ROI changed'
    support = mask.point(lambda x: 255 if x else 0)
    assert ImageChops.subtract(changed, support).getbbox() is None, 'outside object mask changed'
    # Without either cabinet, the complete approved layer must render unchanged.
    isolated_case = cases['modules-02-03-hidden']
    isolated_ids = {e['id'] for e in isolated_case['visibleEntities']}
    assert 'range-freestanding' in isolated_ids
    assert not isolated_ids.intersection({'module-02', 'module-03', 'stone-02', 'stone-03', 'stone-02-joint-bridge', 'stone-03-joint-bridge'})
    isolated_clean = render_case(base, {**isolated_case, 'visibleEntities':[e for e in isolated_case['visibleEntities'] if e['id']!='range-freestanding']}, layer.size)
    isolated = render_case(base, isolated_case, layer.size)
    assert isolated.tobytes() == Image.alpha_composite(isolated_clean, layer).tobytes(), 'isolated range clipped or overwritten'
    isolated.save(args.output_dir/'both-hidden.png')
    historical_default = {**cases['default'], 'visibleEntities':[e for e in cases['default']['visibleEntities'] if e['id'] not in {'faucet-approved','sink-approved','cooktop-approved','drainer-approved'}]}
    default = render_case(base, historical_default, layer.size)
    golden = Image.open(ROOT/'app'/manifest['goldenAsset']).convert('RGBA')
    assert default.tobytes()==golden.tobytes(), 'default golden changed'
    composed.save(args.output_dir/'composed.png')
    report={'status':'PASS','assetSha256':receipt['assetSha256'],'changedPixels':changed.histogram()[255],'outsideRoiChangedPixels':0,'outsideMaskChangedPixels':0,'historicalDefaultGoldenChangedPixels':0,'alphaBounds':list(mask.getbbox()),'humanApprovalScope':receipt['humanAppearanceApproval']['scope'],'geometryGate':'NOT_CLAIMED','bothHiddenLayerExact':True}
    (args.output_dir/'gate.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report))

if __name__=='__main__': main()
