#!/usr/bin/env python3
"""Reproducible fixed-camera contour review; never auto-approve edge semantics."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]

def build(out):
    config = json.loads((ROOT / 'review-assets/object-contours/config.json').read_text())
    source_path = ROOT / 'review-assets/stone-backing/source.png'
    if hashlib.sha256(source_path.read_bytes()).hexdigest() != config['sourceSha256']:
        raise ValueError('source drift')
    source = Image.open(source_path).convert('RGBA')
    out.mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGB', (1200, 720), 'white')
    draw = ImageDraw.Draw(sheet)
    records = []
    for row, (key, item) in enumerate(config['objects'].items()):
        mask = Image.new('L', source.size)
        ImageDraw.Draw(mask).polygon([tuple(p) for p in item['polygon']], fill=255)
        # A trimap is an inspection aid, not a measured confidence score.
        core = mask.filter(ImageFilter.MinFilter(3))
        outer = mask.filter(ImageFilter.MaxFilter(3))
        edge = ImageChops.subtract(outer, core)
        trimap = Image.new('L', source.size)
        trimap.paste(128, mask=edge)
        trimap.paste(255, mask=core)
        cutout = Image.new('RGBA', source.size)
        cutout.paste(source, (0, 0), mask)
        cutout.putalpha(mask)
        cutout.save(out / f'{key}.png')
        mask.save(out / f'{key}-mask.png')
        trimap.save(out / f'{key}-trimap.png')
        bbox = outer.getbbox()
        x0,y0,x1,y1 = bbox
        box = (x0-3,y0-3,x1+3,y1+3)
        for col, color in enumerate(('#ff00ff', '#00ffff', '#151515')):
            bg = Image.new('RGBA', source.size, color)
            preview = Image.alpha_composite(bg, cutout).crop(box)
            scale = min(380 / preview.width, 200 / preview.height)
            preview = preview.resize((round(preview.width*scale),round(preview.height*scale)), Image.Resampling.NEAREST)
            sheet.paste(preview.convert('RGB'), (col*400+10,row*240+30))
            draw.text((col*400+10,row*240+8), key+' / '+color+' / REVIEW', fill='black')
        old = Image.open(ROOT / item['previous']).getchannel('A').point(lambda p: 255 if p else 0)
        removed = ImageChops.subtract(old, mask)
        added = ImageChops.subtract(mask, old)
        pixel_count = lambda m: sum(m.histogram()[1:])
        records.append({'id':key, 'selectedPixels':pixel_count(mask), 'removedFromPrevious':pixel_count(removed), 'addedToPrevious':pixel_count(added), 'uncertainBandPixels':pixel_count(edge), 'semanticReview':'PENDING'})
        # The selected RGB must remain original; only the alpha is authored.
        difference = ImageChops.difference(cutout.convert('RGB'), source.convert('RGB'))
        if any(ImageChops.multiply(channel, mask).getbbox() for channel in difference.split()):
            raise ValueError('source RGB modified')
    sheet.save(out / 'contrast-review.png')
    report = {'status':'REVIEW', 'runtimeInstalled':False, 'sourceRgbModifiedPixels':0, 'trimap':{'0':'outside', '128':'one-pixel boundary to inspect, not automatic approval', '255':'polygon interior, not verified semantic ground truth'}, 'objects':records}
    (out / 'report.json').write_text(json.dumps(report, indent=2)+'\n')
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir',type=Path,required=True)
    print(json.dumps(build(parser.parse_args().output_dir)))
