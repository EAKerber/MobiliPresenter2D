#!/usr/bin/env python3
from __future__ import annotations

import base64
import io
import json
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app/assets/kitchen"
PRE = "2f4173aa4d1760886029a1eba36bdd35e86d3a4b"
SIZE = (1536, 1024)
SCALE = 4


def rgba(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)


def gray(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("L"), dtype=np.uint8)


def git_rgba(ref: str, rel: str) -> np.ndarray:
    raw = subprocess.check_output(["git", "show", f"{ref}:{rel}"], cwd=ROOT)
    return np.asarray(Image.open(io.BytesIO(raw)).convert("RGBA"), dtype=np.uint8)


def bbox(mask: np.ndarray):
    ys, xs = np.nonzero(mask)
    return None if not len(xs) else [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def stats(mask: np.ndarray):
    return {"pixels": int(mask.sum()), "bbox": bbox(mask)}


def rgb_similarity(a: np.ndarray, b: np.ndarray, mask: np.ndarray):
    if not mask.any():
        return {"pixels": 0}
    d = np.abs(a[..., :3].astype(np.int16) - b[..., :3].astype(np.int16))[mask].mean(axis=1)
    return {
        "pixels": int(mask.sum()),
        "mean_abs_rgb_error": round(float(d.mean()), 3),
        "median_abs_rgb_error": round(float(np.median(d)), 3),
        "p25": round(float(np.quantile(d, .25)), 3),
        "p75": round(float(np.quantile(d, .75)), 3),
        "pixels_error_le_12": int((d <= 12).sum()),
        "pixels_error_le_24": int((d <= 24).sum()),
    }


def polygon_mask(points):
    high = Image.new("L", (SIZE[0] * SCALE, SIZE[1] * SCALE), 0)
    ImageDraw.Draw(high).polygon([(x * SCALE, y * SCALE) for x, y in points], fill=255)
    return np.asarray(high.resize(SIZE, Image.Resampling.LANCZOS), dtype=np.uint8) >= 16


def checker_composite(arr: np.ndarray) -> Image.Image:
    h, w = arr.shape[:2]
    yy, xx = np.indices((h, w))
    checker = np.where(((xx // 12 + yy // 12) % 2)[..., None], 220, 245).astype(np.uint8)
    bg = np.repeat(checker, 3, axis=2)
    alpha = arr[..., 3:4].astype(np.float32) / 255
    rgb = arr[..., :3].astype(np.float32) * alpha + bg.astype(np.float32) * (1 - alpha)
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")


def save_overlay(base: np.ndarray, masks, path: Path, crop=None):
    out = base.copy()
    for mask, color in masks:
        m = mask.astype(bool)
        if not m.any():
            continue
        rgb = out[..., :3].astype(np.float32)
        rgb[m] = rgb[m] * .3 + np.asarray(color, dtype=np.float32) * .7
        out[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
        out[..., 3][m] = 255
    im = Image.fromarray(out, "RGBA")
    if crop:
        im = im.crop(crop)
    im.save(path, optimize=True)


def decode_stone_data():
    text = (ROOT / "app/data/stone-data.js").read_text(encoding="utf-8")
    pattern = re.compile(r"(?P<key>neutral|under|objects|upperMask|plinthMask|plinthShade)\s*:\s*['\"]data:image/png;base64,(?P<data>[A-Za-z0-9+/=]+)['\"]")
    records = []
    for i, match in enumerate(pattern.finditer(text)):
        raw = base64.b64decode(match.group("data"))
        image = Image.open(io.BytesIO(raw)).convert("RGBA")
        records.append((match.group("key"), i, np.asarray(image, dtype=np.uint8)))
    return text, records


def main():
    out = ROOT / "boundary-audit-v2-output"
    out.mkdir(exist_ok=True)
    base = rgba(ASSETS / "base.png")
    glass = rgba(ASSETS / "overlays/tempered-glass.png")
    glass_support = glass[..., 3] >= 8
    m05 = rgba(ASSETS / "layers/05_aereo_fogao.png")
    m05_prev = git_rgba(PRE, "app/assets/kitchen/layers/05_aereo_fogao.png")
    reintroduced = (m05[..., 3].astype(np.int16) - m05_prev[..., 3].astype(np.int16)) >= 16

    regions = {
        "cabinet_gap": [(494, 63), (505, 63), (505, 255), (494, 255)],
        "hood_gap": [(494, 257), (522, 257), (495, 312)],
        "lower_wall_gap": [(494, 309), (505, 309), (505, 321), (494, 321)],
    }
    region_report = {}
    for name, points in regions.items():
        mask = polygon_mask(points) & reintroduced & glass_support
        alpha = m05[..., 3][mask]
        region_report[name] = {
            "coverage": stats(mask),
            "alpha_mean": round(float(alpha.mean()), 3) if len(alpha) else None,
            "alpha_median": round(float(np.median(alpha)), 3) if len(alpha) else None,
            "opaque_pixels_ge200": int((alpha >= 200).sum()) if len(alpha) else 0,
            "rgb_similarity_to_base": rgb_similarity(m05, base, mask),
        }

    current_crop = checker_composite(m05).crop((480, 45, 610, 350))
    prev_crop = checker_composite(m05_prev).crop((480, 45, 610, 350))
    sheet = Image.new("RGB", (current_crop.width * 2, current_crop.height), "white")
    sheet.paste(current_crop, (0, 0)); sheet.paste(prev_crop, (current_crop.width, 0))
    sheet.save(out / "module05_current_vs_pre_revert.png", optimize=True)

    # Semantic stone ownership: union review surfaces + protect mask.
    stone = rgba(ASSETS / "variants/stone-02-cozinha-exposed-right.png")
    stone_support = stone[..., 3] >= 8
    semantic = np.zeros(stone_support.shape, dtype=bool)
    mask_dir = ROOT / "review-assets/stone-masks/generated"
    for name in [
        "stone-02-exposed-backsplash.png", "stone-02-exposed-top.png",
        "stone-02-exposed-front-edge.png", "stone-02-exposed-plinth.png",
        "stone-02-exposed-protect.png",
    ]:
        p = mask_dir / name
        if p.exists():
            semantic |= gray(p) >= 8
    unexplained = stone_support & ~semantic
    unexplained_glass = unexplained & glass_support
    left_unexplained_glass = unexplained_glass & (np.indices(unexplained.shape)[1] <= 587)
    save_overlay(base, [(semantic & glass_support, (0, 220, 100)), (left_unexplained_glass, (255, 0, 0))], out / "stone02_semantic_vs_unexplained_glass.png", crop=(470, 470, 620, 920))

    # Inspect embedded runtime stone-data image roles, especially `objects`.
    text, records = decode_stone_data()
    stone_data_report = {"matches": len(records), "roles": {}}
    pans = {
        "left_pan": (541, 490, 633, 551),
        "right_pan": (641, 491, 722, 551),
    }
    object_index = 0
    for key, i, arr in records:
        support = arr[..., 3] >= 8
        rec = {"index": i, "alpha": stats(support)}
        if key == "objects":
            rec["pan_rectangles"] = {}
            for pan_name, (x0, y0, x1, y1) in pans.items():
                sub = arr[y0:y1, x0:x1, 3]
                rec["pan_rectangles"][pan_name] = {
                    "pixels_alpha_ge8": int((sub >= 8).sum()),
                    "pixels_alpha_ge128": int((sub >= 128).sum()),
                    "total_pixels": int(sub.size),
                    "mean_alpha": round(float(sub.mean()), 3),
                }
            crop = Image.fromarray(arr, "RGBA").crop((500, 460, 750, 590))
            checker = checker_composite(np.asarray(Image.fromarray(arr, "RGBA"), dtype=np.uint8)).crop((500, 460, 750, 590))
            checker.save(out / f"stone_data_objects_{object_index}.png", optimize=True)
            object_index += 1
        stone_data_report["roles"].setdefault(key, []).append(rec)
    if not records:
        stone_data_report["prefix"] = text[:500]

    report = {
        "module05_regions": region_report,
        "stone02_semantic": {
            "stone_support": stats(stone_support),
            "semantic_union": stats(semantic),
            "unexplained": stats(unexplained),
            "unexplained_inside_glass": stats(unexplained_glass),
            "unexplained_inside_glass_x_le_587": stats(left_unexplained_glass),
        },
        "stone_data": stone_data_report,
    }
    (out / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    lines = ["# Boundary forensic audit v2", "", "## Module 05 regions"]
    for name, data in region_report.items():
        lines.append(f"- {name}: {data}")
    lines += ["", "## Stone 02 semantic ownership", f"- {report['stone02_semantic']}", "", "## Runtime stone-data", f"- matches: {stone_data_report['matches']}"]
    for role, items in stone_data_report["roles"].items():
        lines.append(f"- {role}: {items}")
    (out / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
