#!/usr/bin/env python3
"""Materialize accepted R5A pixel-perfect edits from canonical R4 assets.

This is an editing pass, not image synthesis:
- remove the confirmed stone-02 contamination by alpha reduction;
- derive exposed 02/03 stone variants by alpha reduction only;
- derive exact joint bridges that restore the removed pixels when both hosts are visible;
- rebuild module-02 finish mask from its own alpha minus the appliance-protected ROI;
- recompose the current golden in canonical z-order.

No RGB value is invented or mutated in stone variants/bridges.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parent.parent
KITCHEN = ROOT / "assets" / "kitchen"
LAYERS = KITCHEN / "layers"
MASKS = KITCHEN / "masks"
VARIANTS = KITCHEN / "variants"
BRIDGES = KITCHEN / "bridges"
VARIANTS.mkdir(parents=True, exist_ok=True)
BRIDGES.mkdir(parents=True, exist_ok=True)

STONE02 = LAYERS / "stone-02-cozinha.png"
STONE03 = LAYERS / "stone-03-pia.png"
MODULE02 = LAYERS / "02_inferior_fogao.png"
STONE02_EXPOSED = VARIANTS / "stone-02-cozinha-exposed-right.png"
STONE03_EXPOSED = VARIANTS / "stone-03-pia-exposed-left.png"
STONE02_BRIDGE = BRIDGES / "stone-02-joint-bridge.png"
STONE03_BRIDGE = BRIDGES / "stone-03-joint-bridge.png"
MASK02 = MASKS / "02.png"
GOLDEN = KITCHEN / "composicao-completa.png"
REPORT = ROOT / "reports" / "r5a-pixelperfect-materialization.json"

STONE02_LEFT_CLEAN_POINTS = ((523, 520), (523, 551), (489, 559))
STONE02_RIGHT_EDGE_POINTS = ((746, 519), (746, 557), (744, 574), (746, 579), (744, 586), (744, 589))
STONE03_LEFT_EDGE_POINTS = ((751, 518), (751, 551), (740, 574), (739, 580), (740, 586), (740, 589))
MODULE02_APPLIANCE_PROTECTED = (516, 609, 739, 840)

COMPOSITION = (
    "layers/01_modulo_lavanderia.png",
    "layers/02_inferior_fogao.png",
    "variants/stone-02-cozinha-exposed-right.png",
    "bridges/stone-02-joint-bridge.png",
    "layers/03_inferior_pia.png",
    "variants/stone-03-pia-exposed-left.png",
    "bridges/stone-03-joint-bridge.png",
    "layers/04_lateral_geladeira.png",
    "layers/05_aereo_fogao.png",
    "layers/06_aereo_pia.png",
    "layers/07_aereo_geladeira.png",
    "layers/08_iluminacao.png",
)


def lerp_boundary(points: tuple[tuple[int, int], ...], y: int) -> float:
    pts = sorted(points, key=lambda p: p[1])
    if y <= pts[0][1]: return float(pts[0][0])
    if y >= pts[-1][1]: return float(pts[-1][0])
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if y0 <= y <= y1:
            if y1 == y0: return float(x1)
            t = (y - y0) / (y1 - y0)
            return x0 + (x1 - x0) * t
    raise AssertionError("unreachable")


def clean_stone02_left() -> int:
    image = Image.open(STONE02).convert("RGBA")
    px = image.load()
    changed = 0
    for y in range(520, 560):
        boundary = round(lerp_boundary(STONE02_LEFT_CLEAN_POINTS, y))
        for x in range(484, boundary):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = (r, g, b, 0)
                changed += 1
    image.save(STONE02)
    return changed


def clip_and_bridge(source: Path, variant_path: Path, bridge_path: Path, *, side: str, points, roi) -> int:
    original = Image.open(source).convert("RGBA")
    variant = original.copy()
    bridge = Image.new("RGBA", original.size, (0, 0, 0, 0))
    op, vp, bp = original.load(), variant.load(), bridge.load()
    x0, y0, x1, y1 = roi
    removed = 0
    for y in range(y0, y1):
        boundary = lerp_boundary(points, y)
        if side == "right": xs = range(max(int(boundary) + 1, x0), x1)
        elif side == "left": xs = range(x0, min(int(boundary), x1))
        else: raise ValueError(side)
        for x in xs:
            pixel = op[x, y]
            if pixel[3]:
                bp[x, y] = pixel
                vp[x, y] = (pixel[0], pixel[1], pixel[2], 0)
                removed += 1
    variant.save(variant_path)
    bridge.save(bridge_path)
    reconstructed = Image.alpha_composite(variant, bridge)
    if reconstructed.tobytes() != original.tobytes():
        raise RuntimeError(f"joint bridge does not reconstruct source exactly: {source}")
    return removed


def build_module02_finish_mask() -> dict[str, object]:
    module = Image.open(MODULE02).convert("RGBA")
    mask = module.getchannel("A").copy()
    mp = mask.load()
    x0, y0, x1, y1 = MODULE02_APPLIANCE_PROTECTED
    cleared = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            if mp[x, y]:
                mp[x, y] = 0
                cleared += 1
    mask.save(MASK02)
    bbox = mask.getbbox()
    return {
        "protectedPixelsCleared": cleared,
        "maskBounds": list(bbox) if bbox else None,
        "maskNonTransparentPixels": sum(1 for value in mask.getdata() if value),
    }


def compose_golden() -> None:
    composed = Image.open(KITCHEN / "base.png").convert("RGBA")
    for relative in COMPOSITION:
        layer = Image.open(KITCHEN / relative).convert("RGBA")
        if layer.size != composed.size: raise RuntimeError(f"canvas mismatch: {relative}")
        composed = Image.alpha_composite(composed, layer)
    composed.save(GOLDEN)


def main() -> int:
    result = {
        "schemaVersion": "R5APixelPerfectMaterialization 0.1",
        "stone02ColumnWedgeAlphaRemoved": clean_stone02_left(),
        "stone02ExposedRightAlphaRemoved": clip_and_bridge(STONE02, STONE02_EXPOSED, STONE02_BRIDGE, side="right", points=STONE02_RIGHT_EDGE_POINTS, roi=(738, 518, 765, 590)),
        "stone03ExposedLeftAlphaRemoved": clip_and_bridge(STONE03, STONE03_EXPOSED, STONE03_BRIDGE, side="left", points=STONE03_LEFT_EDGE_POINTS, roi=(736, 516, 756, 590)),
        "module02FinishMask": build_module02_finish_mask(),
    }
    compose_golden()
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0

if __name__ == "__main__": raise SystemExit(main())
