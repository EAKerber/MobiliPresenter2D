#!/usr/bin/env python3
"""Open the false opaque fringe around the range hood where the glass sits behind it."""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SIZE = (1536, 1024)
SCALE = 4
LAYER = ROOT / "app/assets/kitchen/layers/05_aereo_fogao.png"


def build() -> None:
    layer = Image.open(LAYER).convert("RGBA")
    if layer.size != SIZE:
        raise ValueError(f"Unexpected module 05 canvas: {layer.size}")

    # These two apertures are the wall-colored matte outside the cabinet's left
    # edge and outside the hood's sloped side. Their right boundaries follow
    # the photographed object silhouette in the canonical 1536x1024 scene.
    cut = Image.new("L", (SIZE[0] * SCALE, SIZE[1] * SCALE), 0)
    draw = ImageDraw.Draw(cut)
    cabinet_gap = [(494, 63), (505, 63), (505, 255), (494, 255)]
    hood_gap = [(494, 257), (522, 257), (495, 312)]
    lower_wall_gap = [(494, 309), (505, 309), (505, 321), (494, 321)]
    for polygon in (cabinet_gap, hood_gap, lower_wall_gap):
        draw.polygon([(x * SCALE, y * SCALE) for x, y in polygon], fill=255)
    cut = cut.resize(SIZE, Image.Resampling.LANCZOS)
    layer.putalpha(ImageChops.subtract(layer.getchannel("A"), cut))
    layer.save(LAYER, optimize=True)


if __name__ == "__main__":
    build()
    print("Opened the module 05 matte beside the glass at the cabinet and hood boundaries.")
