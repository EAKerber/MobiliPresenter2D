#!/usr/bin/env python3
"""Forensic alpha/boundary audit for the canonical kitchen scene.

This is intentionally diagnostic: it does not rewrite production assets.
It compares the current branch against the short-lived glass-occlusion fix,
checks mask support outside each host layer, and emits visual maps + JSON/MD.
"""
from __future__ import annotations

import argparse
import io
import json
import subprocess
from pathlib import Path
from statistics import mean, median

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app/assets/kitchen"
CANVAS = (1536, 1024)
PRE_REVERT_GLASS_FIX = "2f4173aa4d1760886029a1eba36bdd35e86d3a4b"
MAIN_BASELINE = "33bae296937cfb6edd5d44319a478e8b8baf8ca6"


def rgba(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)


def git_rgba(ref: str, rel: str) -> np.ndarray:
    raw = subprocess.check_output(["git", "show", f"{ref}:{rel}"], cwd=ROOT)
    return np.asarray(Image.open(io.BytesIO(raw)).convert("RGBA"), dtype=np.uint8)


def bbox(mask: np.ndarray) -> list[int] | None:
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return None
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def stats(mask: np.ndarray) -> dict:
    return {"pixels": int(mask.sum()), "bbox": bbox(mask)}


def save_mask(mask: np.ndarray, path: Path) -> None:
    img = np.zeros((mask.shape[0], mask.shape[1], 4), dtype=np.uint8)
    img[..., 0] = np.where(mask, 255, 0)
    img[..., 1] = np.where(mask, 64, 0)
    img[..., 2] = np.where(mask, 64, 0)
    img[..., 3] = np.where(mask, 255, 0)
    Image.fromarray(img, "RGBA").save(path, optimize=True)


def save_overlay(base: np.ndarray, masks: list[tuple[np.ndarray, tuple[int, int, int]]], path: Path, crop: tuple[int, int, int, int] | None = None) -> None:
    out = base.copy()
    for mask, color in masks:
        m = mask.astype(bool)
        if not m.any():
            continue
        rgb = out[..., :3].astype(np.float32)
        target = np.array(color, dtype=np.float32)
        rgb[m] = rgb[m] * 0.35 + target * 0.65
        out[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
        out[..., 3][m] = 255
    im = Image.fromarray(out, "RGBA")
    if crop:
        im = im.crop(crop)
    im.save(path, optimize=True)


def rgb_similarity(a: np.ndarray, b: np.ndarray, mask: np.ndarray) -> dict:
    if not mask.any():
        return {"pixels": 0, "mean_abs_rgb_error": None, "median_abs_rgb_error": None, "p90_abs_rgb_error": None}
    diffs = np.abs(a[..., :3].astype(np.int16) - b[..., :3].astype(np.int16))[mask]
    per_pixel = diffs.mean(axis=1)
    ordered = np.sort(per_pixel)
    p90 = ordered[min(len(ordered) - 1, int(round((len(ordered) - 1) * 0.90)))]
    return {
        "pixels": int(mask.sum()),
        "mean_abs_rgb_error": round(float(per_pixel.mean()), 3),
        "median_abs_rgb_error": round(float(np.median(per_pixel)), 3),
        "p90_abs_rgb_error": round(float(p90), 3),
    }


def component_summary(mask: np.ndarray, limit: int = 12) -> list[dict]:
    # 8-connected components, restricted to the mask bbox to keep this cheap.
    box = bbox(mask)
    if not box:
        return []
    x0, y0, x1, y1 = box
    work = mask[y0:y1, x0:x1].copy()
    seen = np.zeros_like(work, dtype=bool)
    comps: list[tuple[int, list[int]]] = []
    h, w = work.shape
    for yy, xx in zip(*np.nonzero(work & ~seen)):
        if seen[yy, xx]:
            continue
        stack = [(int(yy), int(xx))]
        seen[yy, xx] = True
        n = 0
        minx = maxx = int(xx)
        miny = maxy = int(yy)
        while stack:
            cy, cx = stack.pop()
            n += 1
            minx, maxx = min(minx, cx), max(maxx, cx)
            miny, maxy = min(miny, cy), max(maxy, cy)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and work[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
        comps.append((n, [minx + x0, miny + y0, maxx + x0 + 1, maxy + y0 + 1]))
    comps.sort(reverse=True, key=lambda item: item[0])
    return [{"pixels": n, "bbox": box} for n, box in comps[:limit]]


def row_spans(mask: np.ndarray, x0: int, x1: int, y0: int, y1: int, max_rows: int = 80) -> list[dict]:
    rows: list[dict] = []
    for y in range(y0, y1):
        xs = np.nonzero(mask[y, x0:x1])[0]
        if len(xs):
            rows.append({"y": y, "min_x": int(xs.min() + x0), "max_x": int(xs.max() + x0), "pixels": int(len(xs))})
    if len(rows) <= max_rows:
        return rows
    # Keep transition rows plus a few evenly spaced samples.
    keep = {0, len(rows) - 1}
    for i in range(1, len(rows)):
        if (rows[i]["min_x"], rows[i]["max_x"], rows[i]["pixels"]) != (rows[i - 1]["min_x"], rows[i - 1]["max_x"], rows[i - 1]["pixels"]):
            keep.update({i - 1, i})
    step = max(1, len(rows) // 20)
    keep.update(range(0, len(rows), step))
    return [rows[i] for i in sorted(keep)[:max_rows]]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "boundary-audit-output")
    args = parser.parse_args()
    out = args.output
    out.mkdir(parents=True, exist_ok=True)

    base = rgba(ASSETS / "base.png")
    glass = rgba(ASSETS / "overlays/tempered-glass.png")
    glass_support = glass[..., 3] >= 8

    report: dict = {
        "canvas": list(CANVAS),
        "refs": {"current": "HEAD", "pre_revert_glass_fix": PRE_REVERT_GLASS_FIX, "main_baseline": MAIN_BASELINE},
        "modules": {},
    }

    # General front/structure mask audit against each source layer.
    layer_paths = {
        "01": "01_modulo_lavanderia.png",
        "02": "02_inferior_fogao.png",
        "03": "03_inferior_pia.png",
        "04": "04_lateral_geladeira.png",
        "05": "05_aereo_fogao.png",
        "06": "06_aereo_pia.png",
        "07": "07_aereo_geladeira.png",
    }
    for key, filename in layer_paths.items():
        host = rgba(ASSETS / "layers" / filename)
        host_support = host[..., 3] >= 8
        entry: dict = {"host_alpha_bbox_ge8": bbox(host_support), "masks": {}}
        for label, rel in [
            ("front", f"masks/{key}.png"),
            ("shadow", f"masks/structure-{key}-shadow.png"),
            ("highlight", f"masks/structure-{key}-highlight.png"),
        ]:
            arr = rgba(ASSETS / rel)
            support = arr[..., 3] >= 8
            strong = arr[..., 3] >= 32
            outside = support & ~host_support
            outside_strong = strong & ~(host[..., 3] >= 32)
            data = {
                "alpha_bbox_ge8": bbox(support),
                "pixels_ge8": int(support.sum()),
                "outside_host_ge8": stats(outside),
                "outside_host_ge32": stats(outside_strong),
                "outside_components_ge8": component_summary(outside),
            }
            if key == "05":
                data["outside_host_inside_glass_ge8"] = stats(outside & glass_support)
                save_mask(outside & glass_support, out / f"module05_{label}_outside_host_inside_glass.png")
            entry["masks"][label] = data
        report["modules"][key] = entry

    # Exact regression map: current M05 versus the pre-revert alpha-cut version.
    m05 = rgba(ASSETS / "layers/05_aereo_fogao.png")
    m05_prev = git_rgba(PRE_REVERT_GLASS_FIX, "app/assets/kitchen/layers/05_aereo_fogao.png")
    cur_a = m05[..., 3].astype(np.int16)
    prev_a = m05_prev[..., 3].astype(np.int16)
    reintroduced = (cur_a - prev_a) >= 16
    removed = (prev_a - cur_a) >= 16
    reintroduced_on_glass = reintroduced & glass_support
    m05_report = {
        "current_alpha_bbox": bbox(cur_a >= 8),
        "pre_revert_alpha_bbox": bbox(prev_a >= 8),
        "reintroduced_alpha_ge16": stats(reintroduced),
        "removed_alpha_ge16": stats(removed),
        "reintroduced_inside_glass": stats(reintroduced_on_glass),
        "reintroduced_components": component_summary(reintroduced),
        "critical_row_spans": row_spans(reintroduced_on_glass, 480, 600, 40, 360),
        "rgb_similarity_to_base_on_reintroduced_glass": rgb_similarity(m05, base, reintroduced_on_glass),
    }
    report["module05_regression"] = m05_report
    save_mask(reintroduced, out / "module05_reintroduced_alpha.png")
    save_overlay(base, [(reintroduced_on_glass, (255, 0, 0)), (glass_support & ~reintroduced_on_glass, (0, 180, 255))], out / "module05_reintroduced_vs_glass_crop.png", crop=(470, 40, 620, 370))

    # Stone 02: determine whether the branch changed geometry or only RGB.
    stone = rgba(ASSETS / "variants/stone-02-cozinha-exposed-right.png")
    stone_main = git_rgba(MAIN_BASELINE, "app/assets/kitchen/variants/stone-02-cozinha-exposed-right.png")
    stone_a = stone[..., 3].astype(np.int16)
    stone_main_a = stone_main[..., 3].astype(np.int16)
    stone_added = (stone_a - stone_main_a) >= 16
    stone_removed = (stone_main_a - stone_a) >= 16
    stone_support = stone_a >= 8
    stone_glass = stone_support & glass_support
    stone_left_glass = stone_glass & (np.indices(stone_glass.shape)[1] <= 520)
    report["stone02"] = {
        "current_alpha_bbox_ge8": bbox(stone_support),
        "main_alpha_bbox_ge8": bbox(stone_main_a >= 8),
        "alpha_added_vs_main_ge16": stats(stone_added),
        "alpha_removed_vs_main_ge16": stats(stone_removed),
        "glass_overlap_ge8": stats(stone_glass),
        "left_glass_overlap_x_le_520": stats(stone_left_glass),
        "left_glass_rgb_similarity_to_base": rgb_similarity(stone, base, stone_left_glass),
        "left_boundary_rows": row_spans(stone_support, 470, 610, 480, 920),
    }
    save_overlay(base, [(stone_glass, (255, 140, 0)), (stone_added, (255, 0, 255)), (stone_removed, (0, 255, 255))], out / "stone02_glass_and_alpha_delta_crop.png", crop=(470, 470, 620, 920))

    # Combined critical map for quick visual review.
    shadow05 = rgba(ASSETS / "masks/structure-05-shadow.png")[..., 3] >= 8
    highlight05 = rgba(ASSETS / "masks/structure-05-highlight.png")[..., 3] >= 8
    host05 = m05[..., 3] >= 8
    shadow_out = shadow05 & ~host05 & glass_support
    highlight_out = highlight05 & ~host05 & glass_support
    save_overlay(
        base,
        [
            (glass_support, (0, 150, 255)),
            (reintroduced_on_glass, (255, 0, 0)),
            (shadow_out, (255, 255, 0)),
            (highlight_out, (255, 0, 255)),
            (stone_glass, (0, 255, 120)),
        ],
        out / "critical_boundary_map.png",
        crop=(470, 40, 620, 920),
    )

    (out / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = [
        "# Boundary forensic audit",
        "",
        f"Current ref: `HEAD`; pre-revert comparison: `{PRE_REVERT_GLASS_FIX}`; main baseline: `{MAIN_BASELINE}`.",
        "",
        "## Module 05 regression",
        f"- Reintroduced alpha pixels (>=16): {m05_report['reintroduced_alpha_ge16']}",
        f"- Reintroduced pixels intersecting glass: {m05_report['reintroduced_inside_glass']}",
        f"- RGB similarity to base in those pixels: {m05_report['rgb_similarity_to_base_on_reintroduced_glass']}",
        "",
        "## Module 05 structure masks outside host",
    ]
    for kind in ("front", "shadow", "highlight"):
        data = report["modules"]["05"]["masks"][kind]
        lines.append(f"- {kind}: outside host ge8={data['outside_host_ge8']}; inside glass={data.get('outside_host_inside_glass_ge8')}")
    lines.extend([
        "",
        "## Stone 02",
        f"- Alpha added vs main: {report['stone02']['alpha_added_vs_main_ge16']}",
        f"- Alpha removed vs main: {report['stone02']['alpha_removed_vs_main_ge16']}",
        f"- Glass overlap: {report['stone02']['glass_overlap_ge8']}",
        f"- Left glass overlap (x<=520): {report['stone02']['left_glass_overlap_x_le_520']}",
        f"- RGB similarity to base in left overlap: {report['stone02']['left_glass_rgb_similarity_to_base']}",
        "",
        "See `critical_boundary_map.png` and the per-mask PNGs for geometry.",
    ])
    (out / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
