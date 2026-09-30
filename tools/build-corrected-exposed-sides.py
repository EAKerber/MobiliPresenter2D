#!/usr/bin/env python3
"""Rebuild the accepted freestanding-cooker return and M07 exposed edge."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
SIZE = (1536, 1024)
DONORS = ROOT / "review-assets" / "exposed-sides-v2"


def donor_face(name: str, crop: tuple[int, int, int, int], box: tuple[int, int, int, int], polygon: list[tuple[int, int]], target: str, brightness: float = 1.0) -> None:
    x, y, width, height = box
    donor = Image.open(DONORS / name).convert("RGBA").crop(crop).resize((width, height), Image.Resampling.LANCZOS)
    if brightness != 1.0:
        alpha = donor.getchannel("A")
        donor = ImageEnhance.Brightness(donor.convert("RGB")).enhance(brightness).convert("RGBA")
        donor.putalpha(alpha)
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    layer.alpha_composite(donor, (x, y))
    mask = Image.new("L", SIZE, 0)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    layer.putalpha(Image.composite(layer.getchannel("A"), Image.new("L", SIZE, 0), mask))
    layer.save(ROOT / target, optimize=True)


# The disabled-module replacement is an appliance body; its side stays metallic.
donor_face(
    "range-metal-side.webp", (29, 10, 130, 500),
    (743, 543, 19, 319), [(743, 543), (762, 551), (762, 852), (743, 862)],
    "app/assets/kitchen/overlays/range-freestanding-right-side.png", brightness=1.18,
)

# Keep the previously accepted M07 edge within its observed perspective boundary.
m07_path = ROOT / "app/assets/kitchen/overlays/module-07-left-return.png"
m07 = Image.open(m07_path).convert("RGBA")
clip = Image.new("L", SIZE, 0)
ImageDraw.Draw(clip).polygon([(1223, 54), (1238, 48), (1238, 205), (1223, 205)], fill=255)
m07.putalpha(Image.composite(m07.getchannel("A"), Image.new("L", SIZE, 0), clip))
m07.save(m07_path, optimize=True)

print("Rebuilt the freestanding appliance side and clipped the accepted M07 return.")
