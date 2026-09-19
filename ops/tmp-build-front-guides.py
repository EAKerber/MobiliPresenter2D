#!/usr/bin/env python3
"""Derive orientative technical front guides from the approved front finish masks.

Confirmed technical layouts remain authoritative. These guides are only for modules
whose front count is confirmed but whose internal proportions are otherwise orientative.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path
import json
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
MASK_DIR = ROOT / "assets/kitchen/masks"
OUTPUT = ROOT / "data/front-guide-data.js"
EXPECTED = {"01": 2, "05": 2, "06": 3, "07": 2}


def connected_components(binary: bytearray, width: int, height: int):
    visited = bytearray(width * height)
    found = []
    for start, value in enumerate(binary):
        if not value or visited[start]:
            continue
        queue = deque([start])
        visited[start] = 1
        area = 0
        min_x, min_y, max_x, max_y = width, height, -1, -1
        while queue:
            index = queue.popleft()
            area += 1
            y, x = divmod(index, width)
            min_x, max_x = min(min_x, x), max(max_x, x)
            min_y, max_y = min(min_y, y), max(max_y, y)
            for neighbor in (
                index - 1 if x > 0 else -1,
                index + 1 if x + 1 < width else -1,
                index - width if y > 0 else -1,
                index + width if y + 1 < height else -1,
            ):
                if neighbor >= 0 and binary[neighbor] and not visited[neighbor]:
                    visited[neighbor] = 1
                    queue.append(neighbor)
        found.append({"area": area, "bbox": (min_x, min_y, max_x + 1, max_y + 1)})
    return found


def internal_lines(rects):
    edges = []
    outer_tolerance = 0.035
    for x0, y0, x1, y1 in rects:
        if x0 > outer_tolerance:
            edges.append(["v", x0, y0, y1])
        if x1 < 1 - outer_tolerance:
            edges.append(["v", x1, y0, y1])
        if y0 > outer_tolerance:
            edges.append(["h", y0, x0, x1])
        if y1 < 1 - outer_tolerance:
            edges.append(["h", y1, x0, x1])

    merged = []
    for edge in sorted(edges, key=lambda value: (value[0], value[1], value[2], value[3])):
        orientation, coordinate, start, end = edge
        if end - start < 0.10:
            continue
        match = None
        for existing in merged:
            if existing[0] != orientation or abs(existing[1] - coordinate) > 0.028:
                continue
            overlap = max(0, min(existing[3], end) - max(existing[2], start))
            if overlap >= 0.35 * min(existing[3] - existing[2], end - start):
                match = existing
                break
        if match:
            match[1] = (match[1] + coordinate) / 2
            match[2] = min(match[2], start)
            match[3] = max(match[3], end)
        else:
            merged.append([orientation, coordinate, start, end])

    lines = []
    for orientation, coordinate, start, end in merged:
        if orientation == "v":
            line = {"x1": coordinate, "y1": start, "x2": coordinate, "y2": end}
        else:
            line = {"x1": start, "y1": coordinate, "x2": end, "y2": coordinate}
        lines.append({key: round(value, 4) for key, value in line.items()})
    return lines


def derive(key: str, expected_count: int):
    alpha = Image.open(MASK_DIR / f"{key}.png").convert("RGBA").getchannel("A")
    bounds = alpha.getbbox()
    if not bounds:
        raise RuntimeError(f"empty finish mask: {key}")

    crop = alpha.crop(bounds)
    width, height = crop.size
    chosen = None
    attempts = []
    for erosion in [1, 3, 5, 7, 9]:
        work = crop if erosion == 1 else crop.filter(ImageFilter.MinFilter(erosion))
        binary = bytearray(1 if value >= 96 else 0 for value in work.tobytes())
        active = sum(binary)
        found = connected_components(binary, width, height)
        meaningful = [item for item in found if item["area"] >= max(40, int(active * 0.015))]
        meaningful.sort(key=lambda item: item["area"], reverse=True)
        selected = meaningful[:expected_count]
        coverage = sum(item["area"] for item in selected) / max(active, 1)
        attempts.append({"erosion": erosion, "components": len(meaningful), "coverage": round(coverage, 4)})
        if len(selected) == expected_count and coverage >= 0.66:
            chosen = (erosion, selected, coverage)
            break

    if not chosen:
        raise RuntimeError(f"could not derive {key}: {attempts}")

    erosion, selected, coverage = chosen
    rects = []
    for item in selected:
        x0, y0, x1, y1 = item["bbox"]
        rects.append([round(x0 / width, 4), round(y0 / height, 4), round(x1 / width, 4), round(y1 / height, 4)])
    rects.sort(key=lambda item: (item[1], item[0]))
    lines = internal_lines(rects)
    vertical = sum(1 for line in lines if abs(line["x1"] - line["x2"]) < 0.001)
    horizontal = sum(1 for line in lines if abs(line["y1"] - line["y2"]) < 0.001)
    if vertical < 1:
        raise RuntimeError(f"no vertical guide for {key}: {rects} {lines}")
    if key == "06" and horizontal < 1:
        raise RuntimeError(f"no horizontal guide for {key}: {rects} {lines}")

    return {
        "source": "finish-mask-components",
        "sourceMask": f"assets/kitchen/masks/{key}.png",
        "erosionPx": erosion,
        "componentCount": expected_count,
        "coverage": round(coverage, 4),
        "rects": [
            {"x": item[0], "y": item[1], "width": round(item[2] - item[0], 4), "height": round(item[3] - item[1], 4)}
            for item in rects
        ],
        "lines": lines,
        "attempts": attempts,
    }


def main() -> int:
    guides = {f"module-{key}": derive(key, count) for key, count in EXPECTED.items()}
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
