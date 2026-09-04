#!/usr/bin/env python3
"""Constrói a máscara limpa do módulo 02 a partir do recorte aprovado v1.

A versão v1 eliminou o grande retângulo de parede, mas conservou uma borda
irregular do espelho de pedra entre as panelas. A v2 mantém os contornos já
aprovados, remove um pequeno fragmento de parede e recompõe o espelho como um
trapézio contínuo, coerente com a perspectiva da bancada.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE_PATH = PROJECT_ROOT / "tools/masks/module02-alpha-approved.png"
OUTPUT_PATH = PROJECT_ROOT / "tools/masks/module02-alpha-approved-v2.png"
LAYER_PATH = PROJECT_ROOT / "assets/kitchen/layers/02_inferior_fogao.png"

BACKSPLASH_TOP_Y = 521
BACKSPLASH_BOTTOM_Y = 555
BACKSPLASH_POLYGON = ((520, 521), (763, 521), (754, 555), (486, 555))
WALL_FRAGMENT_REGION = (530, 500, 560, 521)
WALL_FRAGMENT_DARK_THRESHOLD = 130
LEFT_EDGE_DASH_BOX = (484, 553, 491, 556)


def main() -> int:
    source = Image.open(SOURCE_PATH).convert("L")
    layer_rgb = Image.open(LAYER_PATH).convert("RGB")
    result = Image.new("L", source.size, 0)

    # Silhueta fotográfica original das panelas acima do espelho.
    result.paste(source.crop((0, 0, source.width, BACKSPLASH_TOP_Y)), (0, 0))

    # Elimina o fragmento bege ligado à alça esquerda. Mantém os pixels escuros
    # da panela e um halo de 1 px para preservar sua antialiasing fotográfica.
    x0, y0, x1, y1 = WALL_FRAGMENT_REGION
    source_pixels = source.load()
    result_pixels = result.load()
    rgb_pixels = layer_rgb.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if source_pixels[x, y] == 0:
                continue
            keep = False
            for ny in range(max(y0, y - 1), min(y1, y + 2)):
                for nx in range(max(x0, x - 1), min(x1, x + 2)):
                    red, green, blue = rgb_pixels[nx, ny]
                    if (red + green + blue) / 3 <= WALL_FRAGMENT_DARK_THRESHOLD:
                        keep = True
                        break
                if keep:
                    break
            if not keep:
                result_pixels[x, y] = 0

    # Espelho de pedra contínuo, seguindo as duas arestas de perspectiva.
    backsplash = Image.new("L", source.size, 0)
    ImageDraw.Draw(backsplash).polygon(BACKSPLASH_POLYGON, fill=255)
    result = ImageChops.lighter(result, backsplash)

    # Da borda inferior do espelho para baixo, o recorte v1 já é a autoridade.
    lower = Image.new("L", source.size, 0)
    lower.paste(
        source.crop((0, BACKSPLASH_BOTTOM_Y + 1, source.width, source.height)),
        (0, BACKSPLASH_BOTTOM_Y + 1),
    )
    result = ImageChops.lighter(result, lower)

    # Remove um traço escuro isolado na extremidade esquerda da junção.
    ImageDraw.Draw(result).rectangle(LEFT_EDGE_DASH_BOX, fill=0)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    result.save(OUTPUT_PATH)
    print(
        {
            "output": str(OUTPUT_PATH.relative_to(PROJECT_ROOT)),
            "alphaBounds": list(result.getbbox()) if result.getbbox() else None,
            "backsplashPolygon": [list(point) for point in BACKSPLASH_POLYGON],
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
