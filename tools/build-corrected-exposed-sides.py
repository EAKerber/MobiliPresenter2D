#!/usr/bin/env python3
"""Build corrected M02 and cooker sides and trim only the M07 lower corner."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
DONORS = ROOT / "review-assets" / "exposed-sides-v2"
SIZE = (1536, 1024)


def place_donor(name: str, target: str, rect: tuple[int, int, int, int], polygon: list[tuple[int, int]], degreen=False) -> None:
    x, y, w, h = rect
    donor = Image.open(DONORS / name).convert("RGBA")
    if degreen:
        px = donor.load()
        for yy in range(donor.height):
            for xx in range(donor.width):
                r, g, b, a = px[xx, yy]
                if g > r * 1.16 and g > b * 1.08 and a < 245:
                    px[xx, yy] = (r, g, b, round(a * max(0, 1 - (g - r) / 100)))
    donor = donor.resize((w, h), Image.Resampling.LANCZOS)
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    layer.alpha_composite(donor, (x, y))
    mask = Image.new("L", SIZE, 0)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    layer.putalpha(Image.composite(layer.getchannel("A"), Image.new("L", SIZE, 0), mask))
    layer.save(ROOT / target, optimize=True)


place_donor("module-02-right-face.webp", "app/assets/kitchen/overlays/module-02-right-exposed-face.png",
            (747, 590, 9, 266), [(747, 590), (756, 590), (756, 850), (747, 856)])
place_donor("range-metal-side.webp", "app/assets/kitchen/overlays/range-freestanding-right-side.png",
            (733, 531, 35, 355), [(743, 531), (778, 543), (778, 874), (743, 886)], degreen=True)

m07_path = ROOT / "app/assets/kitchen/overlays/module-07-left-return.png"
m07 = Image.open(m07_path).convert("RGBA")
clip = Image.new("L", SIZE, 0)
ImageDraw.Draw(clip).polygon([(1223, 62), (1238, 50), (1238, 206), (1226, 209)], fill=255)
m07.putalpha(Image.composite(m07.getchannel("A"), Image.new("L", SIZE, 0), clip))
m07.save(m07_path, optimize=True)
print("Built M02 and cooker metal sides, and trimmed the M07 lower-left corner. M05 remains byte-for-byte unchanged.")
