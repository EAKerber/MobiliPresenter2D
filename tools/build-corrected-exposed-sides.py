#!/usr/bin/env python3
"""Build corrected exposed faces in the canonical 1536x1024 scene."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SIZE = (1536, 1024)
DONORS = ROOT / "review-assets" / "exposed-sides-v2"
M02_MASK_REFERENCE = ROOT / "review-assets" / "exposed-sides-v4" / "module-02-solid-mask-reference.png"


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


def m02_reference_mask() -> Image.Image:
    """Read the magenta side guide and preserve its antialiased boundary."""
    reference = Image.open(M02_MASK_REFERENCE).convert("RGB").resize(SIZE, Image.Resampling.LANCZOS)
    alpha = Image.new("L", SIZE, 0)
    source = reference.load()
    output = alpha.load()
    for y in range(SIZE[1]):
        for x in range(SIZE[0]):
            red, green, blue = source[x, y]
            # Magenta is the guide color. A small chroma floor prevents the
            # beige cabinet and tile from entering the mask; retaining the
            # remaining chroma gives us the editor's antialiased edge pixels.
            chroma = min(red, blue) - green
            output[x, y] = max(0, min(255, round((chroma - 72) * 255 / 180)))
    bounds = alpha.getbbox()
    if bounds is None or not (738 <= bounds[0] <= 741 and 552 <= bounds[1] <= 556 and 755 <= bounds[2] <= 759 and 850 <= bounds[3] <= 856):
        raise ValueError(f"Unexpected M02 guide bounds: {bounds}")
    return alpha


# Map a clean cabinet-side donor to the editor's exact magenta guide. The same
# pixel alpha drives the finish layer, so finish tint and side shading share one
# boundary instead of drifting across separate hand-drawn polygons.
m02_mask = m02_reference_mask()
m02_bounds = m02_mask.getbbox()
assert m02_bounds is not None
x0, y0, x1, y1 = m02_bounds
donor = Image.open(DONORS / "module-02-right-face.webp").convert("RGBA").crop((125, 12, 193, 500))
donor_pixels = np.asarray(donor).copy()
donor_alpha = donor_pixels[:, :, 3]
known = donor_alpha > 0
if not known.any():
    raise ValueError("M02 donor crop has no opaque source pixels")
# Propagate nearest opaque RGB values into transparent donor pixels. The donor
# alpha describes its original cutout, not the target geometry, so preserving
# it would punch holes into the side. RGB-only propagation keeps the sampled
# material intact while the magenta guide remains the sole final alpha.
filled = donor_pixels[:, :, :3]
while not known.all():
    next_rgb = filled.copy()
    next_known = known.copy()
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
        shifted_known = np.zeros_like(known)
        shifted_rgb = np.zeros_like(filled)
        src_y = slice(max(0, -dy), min(known.shape[0], known.shape[0] - dy))
        src_x = slice(max(0, -dx), min(known.shape[1], known.shape[1] - dx))
        dst_y = slice(max(0, dy), min(known.shape[0], known.shape[0] + dy))
        dst_x = slice(max(0, dx), min(known.shape[1], known.shape[1] + dx))
        shifted_known[dst_y, dst_x] = known[src_y, src_x]
        shifted_rgb[dst_y, dst_x] = filled[src_y, src_x]
        take = ~known & shifted_known
        next_rgb[take] = shifted_rgb[take]
        next_known[take] = True
    if np.array_equal(next_known, known):
        raise ValueError("Could not fill transparent pixels in M02 donor")
    filled, known = next_rgb, next_known
donor = Image.fromarray(filled, "RGB")
donor = ImageEnhance.Brightness(donor).enhance(0.86).convert("RGBA")
donor.putalpha(Image.new("L", donor.size, 255))
donor = donor.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS)
m02_layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
m02_layer.alpha_composite(donor, (x0, y0))
m02_layer.putalpha(m02_mask)
m02_layer.save(ROOT / "app/assets/kitchen/overlays/module-02-right-exposed-face.png", optimize=True)
m02_material_mask = Image.new("RGBA", SIZE, (255, 255, 255, 0))
m02_material_mask.putalpha(m02_mask)
m02_material_mask.save(ROOT / "app/assets/kitchen/masks/module-02-right-exposed-face.png", optimize=True)

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
print(f"Built M02 from the solid-color guide at {m02_bounds}; built the cooker return and trimmed M07's lower corner.")
