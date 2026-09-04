#!/usr/bin/env python3
"""Recompõe a referência a partir da base e das camadas aprovadas."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_ROOT / "assets/kitchen/composicao-completa.png",
    )
    args = parser.parse_args()

    base = Image.open(PROJECT_ROOT / "assets/kitchen/base.png").convert("RGBA")
    composed = base.copy()
    for layer_path in sorted((PROJECT_ROOT / "assets/kitchen/layers").glob("*.png")):
        with Image.open(layer_path) as layer:
            composed = Image.alpha_composite(composed, layer.convert("RGBA"))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    composed.save(args.output)
    print(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
