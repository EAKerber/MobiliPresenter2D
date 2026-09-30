#!/usr/bin/env python3
"""Pixel gates for exposed appliance geometry and the glass/object boundary."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app/assets/kitchen"

glass = Image.open(ASSETS / "overlays/tempered-glass.png").convert("RGBA").getchannel("A")
m05 = Image.open(ASSETS / "layers/05_aereo_fogao.png").convert("RGBA").getchannel("A")
m02 = Image.open(ASSETS / "layers/02_inferior_fogao.png").convert("RGBA").getchannel("A")

# The pane remains present through the matte gaps. The cabinet body and hood
# stay opaque to preserve their front edges in front of the glass.
for point in ((500, 200), (500, 280)):
    assert glass.getpixel(point) > 0, ("glass must continue behind the negative space", point)
    assert m05.getpixel(point) == 0, ("module 05 matte still covers the glass opening", point, m05.getpixel(point))
assert m05.getpixel((520, 200)) > 200, "module 05 cabinet edge must remain in front of the pane"
assert m05.getpixel((515, 280)) > 200, "hood's sloped face must remain in front of the pane"
assert m05.getpixel((500, 308)) > 200, "hood fixing must remain in front of the pane"
assert m05.getpixel((500, 315)) == 0, "the wall matte below the hood fixing still hides the glass"
assert m05.getpixel((510, 315)) > 200, "the hood underside must stay in front of the pane"

# The module 02 body starts at its real projected left edge; the adjacent strip
# remains exposed, while stone is kept in its own foreground layer.
assert glass.getpixel((500, 600)) > 0
assert m02.getpixel((497, 600)) == 0
assert m02.getpixel((500, 600)) > 200

print({"passed": True, "glassBounds": glass.getbbox(), "module05Openings": [(500, 200), (500, 280)], "module02LeftEdge": (497, 600)})
