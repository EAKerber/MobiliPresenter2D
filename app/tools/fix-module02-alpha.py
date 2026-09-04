#!/usr/bin/env python3
"""Aplica a máscara aprovada ao módulo 02 com expansão estritamente limitada."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


PROJECT_ROOT = Path(__file__).resolve().parent.parent
LAYER_PATH = PROJECT_ROOT / "assets/kitchen/layers/02_inferior_fogao.png"
APPROVED_ALPHA_PATH = PROJECT_ROOT / "tools/masks/module02-alpha-approved-v2.png"
BACKSPLASH_POLYGON = ((520, 521), (763, 521), (754, 555), (486, 555))


def main() -> int:
    layer = Image.open(LAYER_PATH).convert("RGBA")
    current_alpha = layer.getchannel("A")
    approved_alpha = Image.open(APPROVED_ALPHA_PATH).convert("L")

    if layer.size != approved_alpha.size:
        raise ValueError(f"Canvas incompatível: layer={layer.size}, mask={approved_alpha.size}")

    removed_alpha = ImageChops.subtract(current_alpha, approved_alpha)
    restored_alpha = ImageChops.subtract(approved_alpha, current_alpha)

    allowed_restore = Image.new("L", layer.size, 0)
    ImageDraw.Draw(allowed_restore).polygon(BACKSPLASH_POLYGON, fill=255)
    disallowed_restore = ImageChops.subtract(restored_alpha, allowed_restore)
    if disallowed_restore.getbbox() is not None:
        raise ValueError("A máscara tentaria restaurar pixels fora do espelho de pedra.")

    removed_bounds = removed_alpha.getbbox()
    restored_bounds = restored_alpha.getbbox()
    layer.putalpha(approved_alpha)
    layer.save(LAYER_PATH)

    print(
        {
            "removedBounds": list(removed_bounds) if removed_bounds else None,
            "restoredStoneBounds": list(restored_bounds) if restored_bounds else None,
            "finalAlphaBounds": list(approved_alpha.getbbox()) if approved_alpha.getbbox() else None,
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
