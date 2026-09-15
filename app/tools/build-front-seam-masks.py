#!/usr/bin/env python3
"""Build runtime front-finish masks from explicit external seam sources.

The 04↔06 seam is intentionally stored outside either host mask. The browser,
however, must rasterize the host and seam as one mask when both modules are
present so downsampling preserves the approved seamless antialiasing.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageChops
import json

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "assets/kitchen/masks/04.png"
SEAM = ROOT / "assets/kitchen/masks/04-06-seam-bridge.png"
OUTPUT = ROOT / "assets/kitchen/masks/04-with-06-seam.png"
EXPECTED_SEAM_PIXELS = 23
EXPECTED_SEAM_BOUNDS = [1209, 50, 1213, 60]


def nonzero_count(alpha: Image.Image) -> int:
    return sum(1 for value in alpha.get_flattened_data() if value)


def main() -> int:
    base = Image.open(BASE).convert("RGBA")
    seam = Image.open(SEAM).convert("RGBA")
    if base.size != seam.size:
        raise RuntimeError(f"canvas mismatch: {BASE.name} vs {SEAM.name}")

    seam_alpha = seam.getchannel("A")
    seam_pixels = nonzero_count(seam_alpha)
    seam_bounds = list(seam_alpha.getbbox()) if seam_alpha.getbbox() else None
    if seam_pixels != EXPECTED_SEAM_PIXELS or seam_bounds != EXPECTED_SEAM_BOUNDS:
        raise RuntimeError(
            f"unexpected 04↔06 seam support: pixels={seam_pixels}, bounds={seam_bounds}"
        )

    composite = base.copy()
    composite.putalpha(ImageChops.lighter(base.getchannel("A"), seam_alpha))
    composite.save(OUTPUT)

    print(json.dumps({
        "status": "PASS",
        "sourceBridge": str(SEAM.relative_to(ROOT)),
        "output": str(OUTPUT.relative_to(ROOT)),
        "seamPixels": seam_pixels,
        "seamBounds": seam_bounds,
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
