#!/usr/bin/env python3
"""Extract a side that changed between two pixel-aligned Promob screenshots."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "review-assets" / "exposed-sides-v3" / "module-01"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def extract(with_side: Path, without_side: Path, output: Path,
            roi: tuple[int, int, int, int], threshold: int) -> dict[str, object]:
    image_on = Image.open(with_side).convert("RGB")
    image_off = Image.open(without_side).convert("RGB")
    if image_on.size != image_off.size:
        raise SystemExit(f"Screenshots must have identical dimensions: {image_on.size} != {image_off.size}")

    width, height = image_on.size
    x, y, roi_width, roi_height = roi
    if x < 0 or y < 0 or roi_width <= 0 or roi_height <= 0 or x + roi_width > width or y + roi_height > height:
        raise SystemExit(f"ROI {roi} is outside screenshot canvas {image_on.size}")

    difference = ImageChops.difference(image_on, image_off)
    magnitude = ImageChops.lighter(ImageChops.lighter(*difference.split()[:2]), difference.split()[2])
    alpha = magnitude.point(lambda value: 0 if value <= threshold else min(255, (value - threshold) * 4))
    roi_mask = Image.new("L", image_on.size, 0)
    ImageDraw.Draw(roi_mask).rectangle((x, y, x + roi_width - 1, y + roi_height - 1), fill=255)
    alpha = ImageChops.multiply(alpha, roi_mask)
    bounds = alpha.getbbox()
    if bounds is None:
        raise SystemExit("No changed pixels found inside the requested side ROI")

    output.mkdir(parents=True, exist_ok=True)
    alpha.save(output / "difference-mask.png", optimize=True)
    extracted = image_on.convert("RGBA")
    extracted.putalpha(alpha)
    extracted.crop(bounds).save(output / "side-extracted.png", optimize=True)
    Image.merge("RGB", difference.split()).crop(bounds).save(output / "difference-crop.png", optimize=True)

    alpha_bytes = alpha.tobytes()
    result = {
        "method": "per-pixel maximum RGB difference; no registration or resampling",
        "canvas": [width, height],
        "roi": list(roi),
        "threshold": threshold,
        "changedPixelBounds": list(bounds),
        "changedPixels": len(alpha_bytes) - alpha_bytes.count(0),
        "withSide": {"file": with_side.name, "sha256": sha256(with_side)},
        "withoutSide": {"file": without_side.name, "sha256": sha256(without_side)},
    }
    (output / "extraction.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("with_side", type=Path)
    parser.add_argument("without_side", type=Path)
    parser.add_argument("--roi", nargs=4, type=int, required=True, metavar=("X", "Y", "W", "H"))
    parser.add_argument("--threshold", type=int, default=12)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    if not 0 <= args.threshold < 255:
        parser.error("--threshold must be between 0 and 254")
    print(json.dumps(extract(args.with_side, args.without_side, args.output, tuple(args.roi), args.threshold), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
