#!/usr/bin/env python3
"""Measure visible delta support against a real stone alpha edge, never annotation lines.

Coordinates are pixel boundaries: occupied candidate pixel x ends at x+.5;
first occupied reference pixel x starts at x-.5. Distances are horizontal.
This measures visible support, not recovered object alpha or physical 3D pitch.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageChops


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def fit(points):
    ys = [p[1] for p in points]
    xs = [p[0] for p in points]
    ym, xm = sum(ys) / len(ys), sum(xs) / len(xs)
    den = sum((y - ym) ** 2 for y in ys)
    if not den:
        raise ValueError('at least two distinct rows required')
    slope = sum((y - ym) * (x - xm) for x, y in points) / den
    intercept = xm - slope * ym
    rms = math.sqrt(sum((x - slope * y - intercept) ** 2 for x, y in points) / len(points))
    return {'slopeDxDy': slope, 'intercept': intercept, 'rmsPx': rms}


def measure(source, candidate, reference, config):
    if source.size != candidate.size or source.size != reference.size:
        raise ValueError('all input canvases must match')
    if reference.mode != 'RGBA':
        raise ValueError('reference must provide actual layer alpha')
    source, candidate = source.convert('RGB'), candidate.convert('RGB')
    x0, x1 = config['searchX']
    y0, y1 = config['evaluationRows']
    if not (0 <= x0 < x1 < source.width and 0 <= y0 < y1 < source.height):
        raise ValueError('invalid measurement bounds')
    limits = config['thresholds']
    values = config['deltaThresholds']
    if not values or any(not isinstance(t, int) or not 1 <= t <= 255 for t in values):
        raise ValueError('nonempty positive byte delta thresholds required')
    if not 1 <= config['alphaThreshold'] <= 255:
        raise ValueError('positive byte alpha threshold required')
    if any(not math.isfinite(v) or v < 0 for v in limits.values()):
        raise ValueError('finite nonnegative gate thresholds required')
    delta = ImageChops.difference(source, candidate)
    alpha = reference.getchannel('A')
    reference_points = []
    for y in range(y0, y1 + 1):
        hits = [x for x in range(x0, x1 + 1) if alpha.getpixel((x, y)) >= config['alphaThreshold']]
        if not hits or hits[0] == x0:
            raise ValueError(f'reference edge missing or clipped at row {y}')
        reference_points.append([hits[0] - .5, y])
    ref_fit = fit(reference_points)
    runs = []
    for threshold in config['deltaThresholds']:
        points, missing, rows = [], [], []
        for ref_x, y in reference_points:
            hits = [x for x in range(x0, x1 + 1) if max(delta.getpixel((x, y))) >= threshold]
            if not hits or hits[-1] == x1:
                missing.append(y)
                continue
            edge = hits[-1] + .5
            points.append([edge, y])
            rows.append({'y': y, 'referenceX': ref_x, 'candidateX': edge, 'gapPx': ref_x - edge})
        if missing:
            runs.append({'deltaThreshold': threshold, 'status': 'BLOCKED', 'missingRows': missing})
            continue
        cand_fit = fit(points)
        angle = abs(math.degrees(math.atan(cand_fit['slopeDxDy']) - math.atan(ref_fit['slopeDxDy'])))
        gaps = [r['gapPx'] for r in rows]
        slope_error = abs(cand_fit['slopeDxDy'] - ref_fit['slopeDxDy'])
        gates = {
            'angle': angle <= limits['angleErrorDegMax'],
            'slope': slope_error <= limits['slopeErrorMax'],
            'minGap': min(gaps) >= limits['minGapPx'],
            'maxGap': max(gaps) <= limits['maxGapPx'],
            'gapVariation': max(gaps) - min(gaps) <= limits['maxGapVariationPx'],
            'referenceStraightness': ref_fit['rmsPx'] <= limits['lineRmsMaxPx'],
            'candidateStraightness': cand_fit['rmsPx'] <= limits['lineRmsMaxPx'],
        }
        runs.append({
            'deltaThreshold': threshold, 'status': 'PASS' if all(gates.values()) else 'FAIL',
            'candidateLine': cand_fit, 'angleErrorDeg': angle, 'slopeError': slope_error,
            'gapPx': {'min': min(gaps), 'max': max(gaps), 'variation': max(gaps) - min(gaps)},
            'gates': gates, 'rows': rows,
        })
    if any(r['status'] == 'BLOCKED' for r in runs):
        overall = 'BLOCKED'
    elif all(r['status'] == 'PASS' for r in runs):
        overall = 'PASS'
    elif all(r['status'] == 'FAIL' for r in runs):
        overall = 'FAIL'
    else:
        overall = 'BLOCKED'  # A threshold-sensitive result must not be selected as a PASS.
    return {
        'schemaVersion': 'GapPixelGate 0.1', 'overall': overall,
        'scope': 'local-visible-support-geometry', 'humanReview': 'PENDING',
        'promotionEligible': False,
        'coordinateSystem': {'origin': 'top-left', 'x': 'right', 'y': 'down', 'units': 'image pixels',
                             'sceneOffset': config.get('sceneOffset', [0, 0])},
        'horizontalReference': config['horizontalReference'],
        'evaluationRows': [y0, y1], 'referenceLine': ref_fit,
        'referencePoints': reference_points, 'thresholdSweep': runs,
        'limitations': [
            'Delta support depends on contrast against the exact clean source, not recovered donor alpha.',
            'Horizontal gap width is not a world-space distance.',
            'The local horizontal reference is recorded independently, not inferred as a vanishing horizon.',
            'A local PASS does not establish whole-cooktop planarity, pitch, or visual approval.',
        ],
    }


def run(source_path, candidate_path, reference_path, config_path, output_dir):
    config = json.loads(Path(config_path).read_text())
    paths = {'source': source_path, 'candidate': candidate_path, 'reference': reference_path}
    bindings = {key: {'sha256': sha256(path), 'filename': Path(path).name} for key, path in paths.items()}
    for key, digest in config.get('expectedSha256', {}).items():
        if bindings[key]['sha256'] != digest:
            raise ValueError(f'{key} image hash mismatch')
    source, candidate, reference = [Image.open(paths[k]) for k in ('source', 'candidate', 'reference')]
    report = measure(source, candidate, reference, config)
    report['inputs'] = bindings
    report['configSha256'] = sha256(config_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / 'gate.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--source-frame', type=Path, required=True)
    p.add_argument('--candidate-frame', type=Path, required=True)
    p.add_argument('--reference-layer', type=Path, required=True)
    p.add_argument('--config', type=Path, required=True)
    p.add_argument('--output-dir', type=Path, required=True)
    args = p.parse_args()
    try:
        result = run(args.source_frame, args.candidate_frame, args.reference_layer, args.config, args.output_dir)
    except (ValueError, OSError, KeyError) as exc:
        args.output_dir.mkdir(parents=True, exist_ok=True)
        result = {'overall': 'BLOCKED', 'error': str(exc), 'promotionEligible': False}
        (args.output_dir / 'gate.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'overall': result['overall'], 'promotionEligible': False}))
    return 0 if result['overall'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
