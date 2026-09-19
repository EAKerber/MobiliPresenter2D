#!/usr/bin/env python3
"""Derive orientative technical front guides from approved structural seam masks.

Confirmed technical layouts remain authoritative. These guides are used only for
modules whose front count is confirmed while internal proportions remain orientative.
"""
from __future__ import annotations

from pathlib import Path
import json
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
MASK_DIR = ROOT / "assets/kitchen/masks"
OUTPUT = ROOT / "data/front-guide-data.js"

SPECS = {
    "01": {"frontCount": 2, "vertical": 1, "horizontal": 0},
    "05": {"frontCount": 2, "vertical": 1, "horizontal": 0},
    "06": {"frontCount": 3, "vertical": 2, "horizontal": 1},
    "07": {"frontCount": 2, "vertical": 1, "horizontal": 0},
}


def cluster_peaks(scores, count, threshold_ratio=0.15):
    if count == 0:
        return []
    maximum = max(scores) if scores else 0
    if maximum <= 0:
        raise RuntimeError("empty seam signal")
    threshold = maximum * threshold_ratio
    clusters = []
    current = []
    for index, score in enumerate(scores):
        if score >= threshold:
            current.append((index, score))
        elif current:
            clusters.append(current)
            current = []
    if current:
        clusters.append(current)

    ranked = []
    for cluster in clusters:
        strength = sum(score for _, score in cluster)
        coordinate = sum(index * score for index, score in cluster) / max(strength, 1e-9)
        ranked.append({"coordinate": coordinate, "strength": strength, "indices": [index for index, _ in cluster]})
    ranked.sort(key=lambda item: item["strength"], reverse=True)
    selected = ranked[:count]
    if len(selected) != count:
        raise RuntimeError(f"expected {count} seam clusters, found {len(selected)} from {ranked}")
    selected.sort(key=lambda item: item["coordinate"])
    return selected


def longest_run(flags):
    best_start = best_end = current_start = None
    for index, active in enumerate(flags + [False]):
        if active and current_start is None:
            current_start = index
        elif not active and current_start is not None:
            if best_start is None or index - current_start > best_end - best_start:
                best_start, best_end = current_start, index
            current_start = None
    return (best_start, best_end) if best_start is not None else (0, 0)


def derive(key: str, spec: dict):
    finish = Image.open(MASK_DIR / f"{key}.png").convert("RGBA").getchannel("A")
    shadow = Image.open(MASK_DIR / f"structure-{key}-shadow.png").convert("RGBA").getchannel("A")
    highlight = Image.open(MASK_DIR / f"structure-{key}-highlight.png").convert("RGBA").getchannel("A")
    energy = ImageChops.lighter(shadow, highlight)
    bounds = finish.getbbox()
    if not bounds:
        raise RuntimeError(f"empty finish mask: {key}")

    finish = finish.crop(bounds)
    energy = energy.crop(bounds)
    width, height = finish.size
    finish_pixels = list(finish.get_flattened_data())
    energy_pixels = list(energy.get_flattened_data())

    column_scores = []
    for x in range(width):
        values = [energy_pixels[y * width + x] for y in range(height) if finish_pixels[y * width + x] >= 64]
        strong = sum(1 for value in values if value >= 32)
        mean = sum(values) / max(1, len(values))
        coverage = strong / max(1, len(values))
        column_scores.append(mean * coverage)

    row_scores = []
    for y in range(height):
        values = [energy_pixels[y * width + x] for x in range(width) if finish_pixels[y * width + x] >= 64]
        strong = sum(1 for value in values if value >= 32)
        mean = sum(values) / max(1, len(values))
        coverage = strong / max(1, len(values))
        row_scores.append(mean * coverage)

    margin_x = max(1, round(width * 0.04))
    margin_y = max(1, round(height * 0.04))
    masked_columns = [0.0 if x < margin_x or x > width - margin_x - 1 else value for x, value in enumerate(column_scores)]
    masked_rows = [0.0 if y < margin_y or y > height - margin_y - 1 else value for y, value in enumerate(row_scores)]

    vertical = cluster_peaks(masked_columns, spec["vertical"])
    horizontal = cluster_peaks(masked_rows, spec["horizontal"])

    lines = []
    diagnostics = {"vertical": [], "horizontal": []}

    for peak in vertical:
        indices = peak["indices"]
        support = []
        for y in range(height):
            support.append(any(
                finish_pixels[y * width + x] >= 64 and energy_pixels[y * width + x] >= 32
                for x in indices
            ))
        y0, y1 = longest_run(support)
        if y1 <= y0:
            raise RuntimeError(f"vertical seam without support: {key} {peak}")
        coordinate = peak["coordinate"] / width
        line = {
            "x1": round(coordinate, 4), "y1": round(y0 / height, 4),
            "x2": round(coordinate, 4), "y2": round(y1 / height, 4)
        }
        lines.append(line)
        diagnostics["vertical"].append({
            "position": round(coordinate, 4),
            "strength": round(peak["strength"], 3),
            "coverageSpan": round((y1 - y0) / height, 4),
        })

    for peak in horizontal:
        indices = peak["indices"]
        support = []
        for x in range(width):
            support.append(any(
                finish_pixels[y * width + x] >= 64 and energy_pixels[y * width + x] >= 32
                for y in indices
            ))
        x0, x1 = longest_run(support)
        if x1 <= x0:
            raise RuntimeError(f"horizontal seam without support: {key} {peak}")
        coordinate = peak["coordinate"] / height
        line = {
            "x1": round(x0 / width, 4), "y1": round(coordinate, 4),
            "x2": round(x1 / width, 4), "y2": round(coordinate, 4)
        }
        lines.append(line)
        diagnostics["horizontal"].append({
            "position": round(coordinate, 4),
            "strength": round(peak["strength"], 3),
            "coverageSpan": round((x1 - x0) / width, 4),
        })

    return {
        "source": "structure-mask-seam-energy",
        "sourceMasks": [
            f"assets/kitchen/masks/structure-{key}-shadow.png",
            f"assets/kitchen/masks/structure-{key}-highlight.png",
        ],
        "frontCount": spec["frontCount"],
        "expectedVerticalSeams": spec["vertical"],
        "expectedHorizontalSeams": spec["horizontal"],
        "lines": lines,
        "diagnostics": diagnostics,
    }


def main() -> int:
    guides = {f"module-{key}": derive(key, spec) for key, spec in SPECS.items()}
    output = '''(function (global) {
  "use strict";
  global.CASA_FRONT_GUIDES = Object.freeze(%s);
})(window);
''' % json.dumps(guides, ensure_ascii=False, sort_keys=True, indent=2)
    OUTPUT.write_text(output)
    print(json.dumps({"status": "PASS", "guides": guides}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
