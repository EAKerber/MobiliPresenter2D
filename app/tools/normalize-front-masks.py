#!/usr/bin/env python3
"""Clip each front-finish mask to the non-zero alpha support of its host layer.

Only mask pixels whose host alpha is exactly zero are cleared. Existing mask
coverage and antialiasing inside the host silhouette are preserved byte-for-byte.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parent.parent
MASK_DIR = ROOT / "assets" / "kitchen" / "masks"
LAYER_DIR = ROOT / "assets" / "kitchen" / "layers"

PAIRS = {
    "01": "01_modulo_lavanderia.png",
    "02": "02_inferior_fogao.png",
    "03": "03_inferior_pia.png",
    "04": "04_lateral_geladeira.png",
    "05": "05_aereo_fogao.png",
    "06": "06_aereo_pia.png",
    "07": "07_aereo_geladeira.png",
}


def normalize(mask_path: Path, layer_path: Path) -> dict[str, object]:
    mask = Image.open(mask_path).convert("RGBA")
    host = Image.open(layer_path).convert("RGBA")
    if mask.size != host.size:
        raise RuntimeError(f"canvas mismatch: {mask_path.name} vs {layer_path.name}")

    before_alpha = mask.getchannel("A")
    host_alpha = host.getchannel("A")
    before = before_alpha.load()
    host_px = host_alpha.load()
    pixels = mask.load()
    cleared = 0
    bounds = None

    xs: list[int] = []
    ys: list[int] = []
    bbox = before_alpha.getbbox()
    if bbox:
        for y in range(bbox[1], bbox[3]):
            for x in range(bbox[0], bbox[2]):
                if before[x, y] and host_px[x, y] == 0:
                    red, green, blue, _ = pixels[x, y]
                    pixels[x, y] = (red, green, blue, 0)
                    cleared += 1
                    xs.append(x)
                    ys.append(y)

    if xs:
        bounds = [min(xs), min(ys), max(xs) + 1, max(ys) + 1]
        mask.save(mask_path)

    return {
        "mask": str(mask_path.relative_to(ROOT)),
        "host": str(layer_path.relative_to(ROOT)),
        "clearedPixels": cleared,
        "clearedBounds": bounds,
    }


def main() -> int:
    records = [
        normalize(MASK_DIR / f"{key}.png", LAYER_DIR / layer)
        for key, layer in PAIRS.items()
    ]
    print(json.dumps({"status": "PASS", "records": records}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
