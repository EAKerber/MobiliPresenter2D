#!/usr/bin/env python3
"""Incorpora as máscaras PNG em JavaScript para uso seguro sob file://."""

from __future__ import annotations

import base64
import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = PROJECT_ROOT / "data" / "mask-data.js"
MASK_PATHS = (
    "assets/kitchen/masks/01.png",
    "assets/kitchen/masks/02.png",
    "assets/kitchen/masks/03.png",
    "assets/kitchen/masks/04.png",
    "assets/kitchen/masks/05.png",
    "assets/kitchen/masks/06.png",
    "assets/kitchen/masks/07.png",
)


def main() -> int:
    encoded = {
        relative_path: "data:image/png;base64,"
        + base64.b64encode((PROJECT_ROOT / relative_path).read_bytes()).decode("ascii")
        for relative_path in MASK_PATHS
    }
    payload = json.dumps(encoded, ensure_ascii=True, sort_keys=True, separators=(",", ":"))
    source = (
        "(function registerInlineMaskData(global) {\n"
        '  "use strict";\n'
        f"  global.CASA_EM_MODULOS_MASK_DATA = Object.freeze({payload});\n"
        "})(window);\n"
    )
    OUTPUT_PATH.write_text(source, encoding="utf-8")
    print({"output": str(OUTPUT_PATH.relative_to(PROJECT_ROOT)), "maskCount": len(encoded)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
