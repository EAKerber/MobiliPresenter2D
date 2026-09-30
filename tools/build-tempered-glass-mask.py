"""Rasterize the glass panel shape for the 1536x1024 canonical kitchen scene."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


WIDTH, HEIGHT = 1536, 1024
SCALE = 4
POINTS = [(496, 0), (522, 0), (522, 260), (586, 320), (586, 855), (496, 899)]
BOUNDS = (496, 0, 586, 899)


def interpolate(stops: list[tuple[float, tuple[int, int, int, int]]], t: float) -> tuple[int, int, int, int]:
    for (left, left_color), (right, right_color) in zip(stops, stops[1:]):
        if left <= t <= right:
            amount = (t - left) / (right - left)
            return tuple(round(a + (b - a) * amount) for a, b in zip(left_color, right_color))
    return stops[0][1] if t < stops[0][0] else stops[-1][1]


def gradient_layer(mask: Image.Image, stops: list[tuple[float, tuple[int, int, int, int]]], diagonal: bool = False) -> Image.Image:
    left, top, right, bottom = BOUNDS
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    pixels = layer.load()
    for y in range(top, bottom + 1):
        y_ratio = y / (bottom - top)
        for x in range(left, right + 1):
            x_ratio = (x - left) / (right - left)
            t = (x_ratio + 0.15 * y_ratio) / 1.0225 if diagonal else x_ratio
            pixels[x, y] = interpolate(stops, max(0.0, min(1.0, t)))
    layer.putalpha(ImageChops.multiply(layer.getchannel("A"), mask))
    return layer


def build() -> Image.Image:
    mask_high = Image.new("L", (WIDTH * SCALE, HEIGHT * SCALE), 0)
    draw = ImageDraw.Draw(mask_high)
    draw.polygon([(x * SCALE, y * SCALE) for x, y in POINTS], fill=255)
    mask = mask_high.resize((WIDTH, HEIGHT), Image.Resampling.BOX)

    smoke = gradient_layer(mask, [
        (0.0, (16, 19, 21, 92)),
        (0.35, (20, 23, 24, 69)),
        (1.0, (16, 19, 20, 84)),
    ])
    reflection = gradient_layer(mask, [
        (0.0, (255, 255, 255, 5)),
        (0.48, (255, 255, 255, 33)),
        (0.63, (255, 255, 255, 8)),
        (1.0, (255, 255, 255, 0)),
    ], diagonal=True)
    glass = Image.alpha_composite(smoke, reflection)

    lines_high = Image.new("RGBA", (WIDTH * SCALE, HEIGHT * SCALE), (0, 0, 0, 0))
    lines = ImageDraw.Draw(lines_high)
    outline = [(x * SCALE, y * SCALE) for x, y in POINTS]
    lines.line(outline + [outline[0]], fill=(32, 39, 41, 173), width=6, joint="curve")
    lines.line([(round(497.4 * SCALE), 0), (round(497.4 * SCALE), 896 * SCALE)], fill=(235, 242, 239, 166), width=3)
    lines.line([(498 * SCALE, 897 * SCALE), (585 * SCALE, 859 * SCALE)], fill=(23, 27, 29, 204), width=10)
    lines_small = lines_high.resize((WIDTH, HEIGHT), Image.Resampling.BOX)
    return Image.alpha_composite(glass, lines_small)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "app/assets/kitchen/overlays/tempered-glass.png",
    )
    output = parser.parse_args().output
    output.parent.mkdir(parents=True, exist_ok=True)
    build().save(output, optimize=True)
    print(output)

