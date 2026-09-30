#!/usr/bin/env python3
"""Pixel gates for exposed appliance geometry and the glass/object boundary."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app/assets/kitchen"

glass = Image.open(ASSETS / "overlays/tempered-glass.png").convert("RGBA").getchannel("A")
m05 = Image.open(ASSETS / "layers/05_aereo_fogao.png").convert("RGBA").getchannel("A")
m02 = Image.open(ASSETS / "layers/02_inferior_fogao.png").convert("RGBA").getchannel("A")
stone02 = Image.open(ASSETS / "variants/stone-02-cozinha-exposed-right.png").convert("RGBA").getchannel("A")

# Module 05's source alpha already follows the cabinet and hood silhouettes.
# Keep the actual metal face and fixing opaque; only the near-transparent matte
# outside the cabinet stays open so the glass can show through.
assert glass.getpixel((500, 200)) > 0
assert m05.getpixel((500, 200)) <= 1, ("wall beside the cabinet must not hide the glass", m05.getpixel((500, 200)))
assert m05.getpixel((520, 200)) > 200, "module 05 cabinet edge must remain in front of the pane"
for point in ((500, 280), (515, 280), (500, 315), (510, 315)):
    assert m05.getpixel(point) > 200, ("real hood metal/support must stay in front of the pane", point, m05.getpixel(point))
assert glass.getpixel((500, 340)) > 0 and m05.getpixel((500, 340)) == 0

# The glass asset remains continuous behind the true foreground stone and body.
# This verifies source coverage separately from the visible occlusion order.
assert glass.getpixel((500, 560)) > 0 and stone02.getpixel((500, 560)) > 200
assert glass.getpixel((500, 600)) > 0
assert m02.getpixel((497, 600)) == 0
assert m02.getpixel((500, 600)) > 200

print({"passed": True, "glassBounds": glass.getbbox(), "module05Silhouette": [(500, 280), (500, 315)], "stone02Occlusion": (500, 560), "module02LeftEdge": (497, 600)})
