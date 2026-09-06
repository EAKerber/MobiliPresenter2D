#!/usr/bin/env python3
"""Bounded local warp experiment on an existing composite and exact clean frame.

No generated imagery. Changes only the right portion of the top plane. This is
a mesh refinement hypothesis, not a camera-pose or rigid-plane correction.
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont
from gap_pixel_gate import measure, sha256


KNOTS = [(528, 0), (550, 4), (553, 4), (567, -2), (586, 0), (608, 0)]


def displacement(y, factor):
    for (y0, a), (y1, b) in zip(KNOTS, KNOTS[1:]):
        if y0 <= y <= y1:
            return factor * (a + (b - a) * (y - y0) / (y1 - y0))
    return 0


def count(image):
    return sum(any(p) if isinstance(p, tuple) else bool(p) for p in image.getdata())


def warp(source, before, stone, factor):
    source, before = source.convert('RGBA'), before.convert('RGBA')
    diff = ImageChops.difference(source.convert('RGB'), before.convert('RGB'))
    mask = Image.new('L', before.size)
    mask.putdata([255 if any(p) else 0 for p in diff.getdata()])
    delta = before.copy()
    delta.putalpha(mask)
    out = before.copy()
    collisions = 0
    for y in range(528, 608):
        shift = displacement(y, factor)
        if abs(shift) < 1e-10:
            continue
        # Fix x=690. The displacement is specified at x=742.
        scale = 1 + shift / (742 - 690)
        row = delta.crop((690, y, 790, y + 1)).transform(
            (100, 1), Image.Transform.AFFINE, (1 / scale, 0, 0, 0, 1, 0),
            Image.Resampling.BICUBIC)
        composed = Image.alpha_composite(source.crop((690, y, 790, y + 1)), row)
        protect = stone.getchannel('A').crop((690, y, 790, y + 1)).point(lambda a: 255 if a >= 128 else 0)
        attempted = ImageChops.difference(composed.convert('RGB'), source.crop((690, y, 790, y + 1)).convert('RGB'))
        attempted = Image.composite(attempted, Image.new('RGB', attempted.size), protect)
        collisions += count(attempted)
        # Never hide an attempted overlap by reporting only the clipped output.
        composed.paste(before.crop((690, y, 790, y + 1)), (0, 0), protect)
        out.paste(composed, (690, y))
    diff = ImageChops.difference(before.convert('RGB'), out.convert('RGB'))
    outside = diff.copy()
    outside.paste((0, 0, 0), (690, 528, 790, 608))
    stone_diff = Image.composite(diff, Image.new('RGB', diff.size), stone.getchannel('A').point(lambda a: 255 if a >= 128 else 0))
    return out, {
        'changedPixels': count(diff), 'differenceBounds': diff.getbbox(),
        'outsideWarpEnvelopeChangedPixels': count(outside),
        'bodyBelow608ChangedPixels': count(diff.crop((0, 608, diff.width, diff.height))),
        'floorBelow838ChangedPixels': count(diff.crop((0, 838, diff.width, diff.height))),
        'stoneChangedPixels': count(stone_diff), 'attemptedStoneOverlapPixels': collisions,
    }


def review(before, after, report_before, report_after, outdir, factor):
    crop = (715, 515, 775, 615)
    scale = 6
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
    sheet = Image.new('RGB', (1120, 770), '#192028')
    d = ImageDraw.Draw(sheet)
    for i, (im, title, report) in enumerate([
        (before, 'BASE p8/s28 | pixels reais', report_before),
        (after, f'EXPERIMENTO local | fator {factor:g}', report_after),
        (after, 'GRID + medidas locais', report_after),
    ]):
        xoff, yoff = 10 + i * 370, 60
        sheet.paste(im.convert('RGB').crop(crop).resize((360, 600), Image.Resampling.NEAREST), (xoff, yoff))
        d.text((xoff, 20), title, font=font, fill='white')
        if i == 2:
            def pt(x, y):
                return xoff + (x-crop[0]+.5)*scale, yoff + (y-crop[1]+.5)*scale
            for y in range(520, 616, 5):
                d.line((pt(715,y), pt(775,y)), fill='#777777', width=1)
                if y % 10 == 0 and y < 615:
                    px, py = pt(715,y)
                    d.rectangle((px,py,px+36,py+20),fill='#192028')
                    d.text((px,py),str(y),font=font,fill='white')
            for x in range(715,776,5):
                d.line((pt(x,515), pt(x,615)), fill='#777777', width=1)
            hy = report['horizontalReference']['y']
            d.line((pt(715,hy),pt(775,hy)), fill='#C66BD3', width=2)
            run = report['thresholdSweep'][1]
            for row in run.get('rows', []):
                a, b = pt(row['candidateX'], row['y']), pt(row['referenceX'], row['y'])
                d.line((a,b), fill='#FFA24A', width=2)
                for p, color in ((a, '#50B9FF'), (b, '#FF5555')):
                    d.ellipse((p[0]-2,p[1]-2,p[0]+2,p[1]+2), fill=color)
            for row_y, dx in ((553, 4*factor), (567, -2*factor)):
                start = pt(728,row_y); end = (start[0]+dx*scale,start[1])
                d.line((start,end),fill='#FFD747',width=3)
                sign = 1 if dx>=0 else -1
                d.line((end,(end[0]-sign*7,end[1]-4)),fill='#FFD747',width=3)
                d.line((end,(end[0]-sign*7,end[1]+4)),fill='#FFD747',width=3)
        runs = [r for r in report['thresholdSweep'] if 'angleErrorDeg' in r]
        errors = [r['angleErrorDeg'] for r in runs]
        d.text((xoff,675), f"Gate local: {report['overall']} | erro {min(errors):.1f}..{max(errors):.1f} graus",font=font,fill='white')
    d.text((10,715),'Vermelho: alpha da pedra | azul: suporte visivel do fogao | roxo: referencia horizontal',font=font,fill='white')
    d.text((10,743),'Setas: proposta em x=742. Grade: 5 px. Geometria global e leitura visual: PENDING.',font=font,fill='#FFD747')
    sheet.save(outdir/'review.png')


def main():
    p = argparse.ArgumentParser()
    for name in ('source-frame','candidate-frame','reference-layer','config','output-dir'):
        p.add_argument('--'+name, type=Path, required=True)
    args = p.parse_args()
    config = json.loads(args.config.read_text())
    for key, path in [('source',args.source_frame),('candidate',args.candidate_frame),('reference',args.reference_layer)]:
        if sha256(path) != config['expectedSha256'][key]:
            raise ValueError(f'{key} hash mismatch')
    source, before, stone = [Image.open(p) for p in (args.source_frame,args.candidate_frame,args.reference_layer)]
    if before.size != (1536,1024):
        raise ValueError('experiment anchors require the canonical 1536x1024 canvas')
    outdir = args.output_dir
    outdir.mkdir(parents=True,exist_ok=True)
    base_report = measure(source,before,stone,config)
    records = []
    images = {}
    for factor in (-1, .75, 1, 1.25):
        result, integrity = warp(source,before,stone,factor)
        gate = measure(source,result,stone,config)
        valid = gate['overall']=='PASS' and integrity['attemptedStoneOverlapPixels']==0
        record = {'factor':factor,'gate':gate,'integrity':integrity,'eligibleForLocalReview':valid}
        records.append(record)
        images[factor] = result
    eligible = [r for r in records if r['eligibleForLocalReview']]
    pool = eligible or records
    selected = min(pool,key=lambda r:max(s.get('angleErrorDeg',180) for s in r['gate']['thresholdSweep']))
    factor = selected['factor']
    images[factor].save(outdir/'candidate-experimental.png')
    review(before,images[factor],base_report,selected['gate'],outdir,factor)
    report = {
        'status':'LOCAL_REVIEW_ONLY' if eligible else 'NO_PASSING_CANDIDATE',
        'humanReview':'PENDING','promotionEligible':False,
        'baseline':base_report,'selectedFactor':factor,'knots':KNOTS,
        'fixedX':690,'displacementAnchorX':742,'records':records,
        'inputs':{str(p.name):sha256(p) for p in (args.source_frame,args.candidate_frame,args.reference_layer,args.config)},
        'warning':'Piecewise local warp can bend internal top-plane geometry. Local parallelism is not a rigid pitch/yaw solution.',
    }
    (outdir/'experiment.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'status':report['status'],'selectedFactor':factor,'integrity':selected['integrity']}))


if __name__=='__main__':
    main()
