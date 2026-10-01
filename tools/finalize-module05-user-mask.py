#!/usr/bin/env python3
from __future__ import annotations
from collections import deque
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
K = ROOT / 'app/assets/kitchen'
OUT = ROOT / 'module05-user-mask-output'
OUT.mkdir(exist_ok=True)

def rgba(path):
    return np.asarray(Image.open(path).convert('RGBA'), dtype=np.uint8)

def alpha_over(bottom, top):
    b = bottom.astype(np.float32) / 255
    t = top.astype(np.float32) / 255
    ta = t[..., 3:4]
    ba = b[..., 3:4]
    oa = ta + ba * (1 - ta)
    rgb = np.where(
        oa > 0,
        (t[..., :3] * ta + b[..., :3] * ba * (1 - ta)) / np.maximum(oa, 1e-6),
        0,
    )
    return np.clip(np.rint(np.concatenate([rgb, oa], axis=2) * 255), 0, 255).astype(np.uint8)

def flood(cand, seeds):
    h, w = cand.shape
    seen = np.zeros_like(cand)
    q = deque()
    for y, x in seeds:
        if 0 <= y < h and 0 <= x < w and cand[y, x] and not seen[y, x]:
            seen[y, x] = 1
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = 1
                    q.append((ny, nx))
    return seen

BASE = rgba(K / 'base.png')
GLASS = rgba(K / 'overlays/tempered-glass.png')
M05 = rgba(K / 'layers/05_aereo_fogao.png')
H, W = M05.shape[:2]

# Reproduce the stable hard T25 base exactly.
A = M05[..., 3]
RGB = M05[..., :3].astype(np.float32)
ROI = np.zeros((H, W), bool)
ROI[250:325, 492:526] = True
SEED = np.zeros((H, W), bool)
SEED[255:271, 496:504] = True
SEED[311:322, 496:504] = True
SEED &= (A >= 8) & (RGB.mean(axis=2) > 190)
wall = np.median(RGB[SEED], axis=0)
dist = np.linalg.norm(RGB - wall, axis=2)
hardmask = flood((A >= 8) & ROI & (dist <= 25), list(zip(*np.nonzero(SEED))))
hard = M05.copy()
hard[hardmask, :3] = 0
hard[hardmask, 3] = 0

# Ground truth transcribed from the user's red annotation on the composed R2 panel.
USER_REMOVE = [
    (505,258),(505,263),(504,265),(503,266),(504,266),(502,268),
    (501,269),(502,269),(501,270),(500,271),(501,271),(499,273),
    (500,273),(498,275),(499,275),(498,276),(497,277),(498,277),
    (497,278),(496,279),(497,279),(496,280),(496,281),(496,298),
    (496,299),(497,300),(498,301),(501,302),(503,303),(503,304),
    (503,305),(503,306),(503,307),(510,307),(510,308),(506,309),
    (507,309),(508,309),
]

candidate = hard.copy()
user_mask = np.zeros((H, W), bool)
for x, y in USER_REMOVE:
    user_mask[y, x] = True
    candidate[y, x, :3] = 0
    candidate[y, x, 3] = 0

Image.fromarray(hard, 'RGBA').save(OUT / 'module05-hard-t25.png', optimize=True)
Image.fromarray(candidate, 'RGBA').save(OUT / 'module05-user-approved-contour.png', optimize=True)

# Visual: current | hard T25 | user-approved contour, composed over actual glass.
back = alpha_over(BASE, GLASS)
compare = []
for label, layer in [('current', M05), ('hard T25', hard), ('user-approved', candidate)]:
    scene = alpha_over(back, layer)
    crop = Image.fromarray(scene, 'RGBA').convert('RGB').crop((488, 245, 530, 330)).resize((420, 850), Image.Resampling.NEAREST)
    d = ImageDraw.Draw(crop)
    d.rectangle((0, 0, 200, 28), fill='white')
    d.text((8, 8), label, fill='red')
    compare.append(crop)
scene_sheet = Image.new('RGB', (1260, 850), 'white')
for i, panel in enumerate(compare):
    scene_sheet.paste(panel, (i * 420, 0))
scene_sheet.save(OUT / 'module05-current-hard-userapproved.png', optimize=True)

# Visual: exactly the user-approved source pixels in red on the unmodified original asset.
marked = M05.copy()
marked[user_mask, :3] = [255, 0, 0]
marked[user_mask, 3] = 255
mark_crop = Image.fromarray(marked, 'RGBA').crop((488, 245, 530, 330)).resize((840, 1700), Image.Resampling.NEAREST)
mark_crop.save(OUT / 'module05-user-remove-red-overlay.png', optimize=True)

# Accounting: some marked positions are already transparent in T25; report both requested and newly-effective removals.
new_effective = user_mask & (hard[..., 3] > 0)
already_t25 = user_mask & (hard[..., 3] == 0)
report = {
    'status': 'REVIEW',
    'source': 'user red annotation on composed R2 panel',
    't25RemovedPixels': int(hardmask.sum()),
    'userMarkedPixels': len(USER_REMOVE),
    'userMarkedAlreadyTransparentInT25': int(already_t25.sum()),
    'userMarkedNewEffectiveRemovals': int(new_effective.sum()),
    'finalTransparentVsOriginal': int(((M05[...,3] > 0) & (candidate[...,3] == 0)).sum()),
    'userRemoveCoordinates': [{'x': x, 'y': y} for x, y in USER_REMOVE],
}
(OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
