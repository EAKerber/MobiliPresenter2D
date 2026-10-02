#!/usr/bin/env python3
"""Pixel gates for the approved lateral-glass extent and foreground occlusion."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app/assets/kitchen"

glass = Image.open(ASSETS / "overlays/tempered-glass.png").convert("RGBA").getchannel("A")
m05 = Image.open(ASSETS / "layers/05_aereo_fogao.png").convert("RGBA").getchannel("A")
m02 = Image.open(ASSETS / "layers/02_inferior_fogao.png").convert("RGBA").getchannel("A")
stone02 = Image.open(ASSETS / "variants/stone-02-cozinha-exposed-right.png").convert("RGBA").getchannel("A")
stone03 = Image.open(ASSETS / "variants/stone-03-pia-exposed-left.png").convert("RGBA").getchannel("A")

# The accepted glass is the narrow lateral pane, starting below the cabinets
# and ending at the counter/floor boundary. It must not become a wall-sized pane.
assert glass.getbbox() == (495, 266, 523, 900), glass.getbbox()
assert glass.getpixel((500, 200)) == 0

# The hood's true metal silhouette stays in front of the glass. Where that
# foreground alpha ends, the pane remains present and can show through.
assert glass.getpixel((500, 280)) > 0 and m05.getpixel((500, 280)) == 255
assert glass.getpixel((500, 340)) > 0 and m05.getpixel((500, 340)) == 0

# The cleaned stone variants no longer contain wall/tile pixels in the pane
# strip. This leaves the glass visible in that gap; the module itself still
# covers the pane where its real silhouette occupies the same coordinates.
assert glass.getpixel((500, 560)) > 0
assert stone02.getpixel((500, 560)) == 0 and stone03.getpixel((500, 560)) == 0
assert glass.getpixel((500, 600)) > 0
assert m02.getpixel((497, 600)) == 0
assert m02.getpixel((500, 600)) == 255

print({"passed": True, "glassBounds": glass.getbbox(), "hoodForeground": (500, 280), "wallGapTransparency": (500, 560), "module02Foreground": (500, 600)})
