#!/usr/bin/env python3
"""Build corrected exposed faces in the canonical 1536x1024 scene."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
SIZE = (1536, 1024)
DONORS = ROOT / "review-assets" / "exposed-sides-v2"


def donor_face(name: str, crop: tuple[int, int, int, int], box: tuple[int, int, int, int], polygon: list[tuple[int, int]], target: str, brightness: float = 1.0) -> None:
    x, y, width, height = box
    donor = Image.open(DONORS / name).convert("RGBA").crop(crop)
    donor = donor.resize((width, height), Image.Resampling.LANCZOS)
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


# Sample only the clean cabinet-face area from the photoreal donor; preserve its
# subtle lighting and map it to the narrow right-hand plane in the site camera.
donor_face(
    "module-02-right-face.webp", (125, 12, 193, 500),
    # Overlap the side with the cabinet front; scene z-order hides that overlap
    # and leaves a clean, attached 9 px return beyond the front edge.
    (746, 590, 20, 266), [(746, 594), (766, 600), (766, 850), (746, 856)],
    "app/assets/kitchen/overlays/module-02-right-exposed-face.png",
)
# The isolated donor has a bright front chamfer. It is a one-pixel seam in this
# camera; shade it slightly so it reads as the cabinet joint, not a white strip.
m02_side_path = ROOT / "app/assets/kitchen/overlays/module-02-right-exposed-face.png"
m02_side = Image.open(m02_side_path).convert("RGBA")
for y in range(594, 856):
    for x in (746, 747):
        red, green, blue, alpha = m02_side.getpixel((x, y))
        m02_side.putpixel((x, y), (round(red * 0.86), round(green * 0.86), round(blue * 0.86), alpha))
m02_side.save(m02_side_path, optimize=True)

# The narrow exposed side follows the selected cabinet finish. Keep a small
# perimeter outside the texture mask so the source shading remains as its edge.
side_mask = Image.new("RGBA", SIZE, (255, 255, 255, 0))
ImageDraw.Draw(side_mask).polygon([(746, 594), (766, 600), (766, 850), (746, 856)], fill=(255, 255, 255, 255))
side_mask.save(ROOT / "app/assets/kitchen/masks/module-02-right-exposed-face.png", optimize=True)

# The narrow exposed side follows the selected cabinet finish. Keep a small
# perimeter outside the texture mask so the source shading remains as its edge.
side_mask = Image.new("RGBA", SIZE, (255, 255, 255, 0))
ImageDraw.Draw(side_mask).polygon([(748, 596), (755, 600), (755, 850), (748, 854)], fill=(255, 255, 255, 255))
side_mask.save(ROOT / "app/assets/kitchen/masks/module-02-right-exposed-face.png", optimize=True)

# The cooker metal return sits behind its approved front layer (z 305).
donor_face(
    "range-metal-side.webp", (29, 10, 130, 500),
    (743, 543, 19, 319), [(743, 543), (762, 551), (762, 852), (743, 862)],
    "app/assets/kitchen/overlays/range-freestanding-right-side.png",
    brightness=1.18,
)

# Preserve the previously accepted M05 side. M07's only change is the exposed
# lower-left corner, clipped to the perspective edge already present in-scene.
m07_path = ROOT / "app/assets/kitchen/overlays/module-07-left-return.png"
m07 = Image.open(m07_path).convert("RGBA")
clip = Image.new("L", SIZE, 0)
ImageDraw.Draw(clip).polygon([(1223, 54), (1238, 48), (1238, 205), (1223, 205)], fill=255)
m07.putalpha(Image.composite(m07.getchannel("A"), Image.new("L", SIZE, 0), clip))
m07.save(m07_path, optimize=True)
print("Built M02 and cooker returns from photo donors; preserved M05 and trimmed M07's lower corner.")
