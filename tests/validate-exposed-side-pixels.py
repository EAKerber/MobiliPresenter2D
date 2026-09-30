#!/usr/bin/env python3
"""Pixel gates for the canonical side-layer before/after browser captures."""
from pathlib import Path
import sys

from PIL import Image, ImageChops


root = Path(__file__).resolve().parents[1]
captures = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "review-assets" / "exposed-sides-v10"


def difference(left: str, right: str) -> tuple[Image.Image, tuple[int, int, int, int] | None]:
    a = Image.open(captures / left).convert("RGB")
    b = Image.open(captures / right).convert("RGB")
    assert a.size == b.size, (left, right, a.size, b.size)
    delta = ImageChops.difference(a, b)
    return delta, delta.getbbox()


# For the exposed M02 state (01+02+05), toggling the side must only alter its
# narrow, physically projected strip. Any change elsewhere means a dirty plate
# or a mask that bleeds onto a neighboring object.
m02_delta, m02_box = difference("m02-side-base.png", "m02-side-enabled.png")
assert m02_box is not None, "M02 exposed side produced no visible pixels"
x0, y0, x1, y1 = m02_box
assert 571 <= x0 < x1 <= 591 and 455 <= y0 < y1 <= 661, ("M02 side escaped its projected panel", m02_box)
assert (x1 - x0) >= 8 and (y1 - y0) >= 180, ("M02 side is too small to represent its side face", m02_box)

# With M03 present the same side remains fully occluded, even if forced visible
# in raw state. This catches any bright seam leaking over the sink module.
_, full_box = difference("full-side-base.png", "full-side-forced.png")
assert full_box is None, ("M02 side leaks over M03 in the complete scene", full_box)

# The pane remains continuous over the baked-in sink region. Its tint must still
# affect pixels there; a zero delta would mean the glass has been cut out.
glass_delta, _ = difference("complete.png", "glassComplete.png")
glass_coverage = glass_delta.getchannel("R")
for channel in glass_delta.getbands()[1:]:
    from PIL import ImageChops
    glass_coverage = ImageChops.lighter(glass_coverage, glass_delta.getchannel(channel))
glass_coverage = glass_coverage.point(lambda value: 255 if value > 4 else 0)
glass_box = glass_coverage.getbbox()
assert glass_box is not None and 379 <= glass_box[0] < glass_box[2] <= 403 and glass_box[1] == 0, glass_box
sink_delta = glass_delta.crop((380, 430, 403, 650))
assert sink_delta.getbbox() is not None, "Glass has an unexpected hole across the sink area"

# The freestanding range and M07 use the same one-layer A/B rule; their pixels
# may change only on the added face and must stop above the range foot / M07 base.
range_delta, range_box = difference("range-side-base.png", "range-side-enabled.png")
assert range_box is not None and 569 <= range_box[0] < range_box[2] <= 590 and 415 <= range_box[1] < range_box[3] <= 666, range_box
m07_delta, m07_box = difference("m07-side-base.png", "m07-side-enabled.png")
assert m07_box is not None and 935 <= m07_box[0] < m07_box[2] <= 957 and 33 <= m07_box[1] < m07_box[3] <= 160, m07_box

print({"passed": True, "m02ExposedDiff": m02_box, "m02OccludedDiff": full_box, "rangeExposedDiff": range_box, "m07ExposedDiff": m07_box, "glassDiff": glass_box})
