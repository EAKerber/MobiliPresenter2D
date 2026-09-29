#!/usr/bin/env python3
"""Build corrected exposed faces in the canonical 1536x1024 scene."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SIZE = (1536, 1024)
DONORS = ROOT / "review-assets" / "exposed-sides-v2"


def donor_face(name: str, crop: tuple[int, int, int, int], box: tuple[int, int, int, int], polygon: list[tuple[int, int]], target: str) -> None:
    x, y, width, height = box
    donor = Image.open(DONORS / name).convert("RGBA").crop(crop)
    donor = donor.resize((width, height), Image.Resampling.LANCZOS)
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    layer.alpha_composite(donor, (x, y))
    mask = Image.new("L", SIZE, 0)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    layer.putalpha(Image.composite(layer.getchannel("A"), Image.new("L", SIZE, 0), mask))
    layer.save(ROOT / target, optimize=True)


# Sample only the clean cabinet-face area from the photoreal donor; preserve its
# subtle lighting and map it to the narrow right-hand plane in the site camera.
donor_face(
    "module-02-right-face.webp", (113, 12, 193, 500),
    (747, 594, 9, 260), [(747, 594), (756, 600), (756, 848), (747, 854)],
    "app/assets/kitchen/overlays/module-02-right-exposed-face.png",
)

# The cooker metal return sits behind its approved front layer (z 305).
donor_face(
    "range-metal-side.webp", (29, 10, 130, 500),
    (743, 543, 19, 329), [(743, 543), (762, 551), (762, 854), (743, 872)],
    "app/assets/kitchen/overlays/range-freestanding-right-side.png",
)

# Preserve the previously accepted M05 side. M07's only change is the exposed
# lower-left corner, clipped to the perspective edge already present in-scene.
m07_path = ROOT / "app/assets/kitchen/overlays/module-07-left-return.png"
m07 = Image.open(m07_path).convert("RGBA")
clip = Image.new("L", SIZE, 0)
ImageDraw.Draw(clip).polygon([(1223, 54), (1238, 48), (1238, 205), (1223, 213)], fill=255)
m07.putalpha(Image.composite(m07.getchannel("A"), Image.new("L", SIZE, 0), clip))
m07.save(m07_path, optimize=True)
print("Built M02 and cooker returns from photo donors; preserved M05 and trimmed M07's lower corner.")
