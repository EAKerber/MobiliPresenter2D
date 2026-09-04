#!/usr/bin/env python3
"""Separa as montagens de pedra dos módulos 02 e 03 sem alterar pixels.

As fontes combinadas são preservadas em ``tools/sources``. Cada execução
reconstrói tanto o módulo sem pedra quanto a camada hospedada correspondente.
O recorte usa limites inteiros no canvas canônico e transfere os pixels RGBA
integralmente: não há interpolação, feather novo ou regeneração.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
LAYERS = ROOT / "assets" / "kitchen" / "layers"
SOURCES = ROOT / "tools" / "sources"
CANVAS = (1536, 1024)

SPECS = (
    {
        "module": LAYERS / "02_inferior_fogao.png",
        "source": SOURCES / "02_inferior_fogao-combined-v2.png",
        "stone": LAYERS / "stone-02-cozinha.png",
        "bands": ((0, 590), (856, 1024)),
    },
    {
        "module": LAYERS / "03_inferior_pia.png",
        "source": SOURCES / "03_inferior_pia-combined-v1.png",
        "stone": LAYERS / "stone-03-pia.png",
        "bands": ((0, 590), (856, 1024)),
    },
)


def split(spec: dict[str, object]) -> None:
    module_path = spec["module"]
    source_path = spec["source"]
    stone_path = spec["stone"]
    bands = spec["bands"]
    assert isinstance(module_path, Path)
    assert isinstance(source_path, Path)
    assert isinstance(stone_path, Path)
    assert isinstance(bands, tuple)

    source_path.parent.mkdir(parents=True, exist_ok=True)
    if not source_path.exists():
        shutil.copyfile(module_path, source_path)

    with Image.open(source_path) as opened:
        combined = opened.convert("RGBA")
    if combined.size != CANVAS:
        raise ValueError(f"Canvas inválido em {source_path}: {combined.size}")

    stone = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    module = combined.copy()
    transparent = Image.new("RGBA", CANVAS, (0, 0, 0, 0))

    for top, bottom in bands:
        box = (0, top, CANVAS[0], bottom)
        stone.paste(combined.crop(box), box)
        module.paste(transparent.crop(box), box)

    module.save(module_path, optimize=False)
    stone.save(stone_path, optimize=False)


def main() -> int:
    for spec in SPECS:
        split(spec)
    print("Camadas de pedra 02 e 03 reconstruídas deterministicamente.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
