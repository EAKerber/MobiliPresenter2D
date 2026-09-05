#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageChops
import json

ROOT = Path(__file__).resolve().parent.parent
K = ROOT / "assets" / "kitchen"
OUT = ROOT / "reports" / "r5a-pixelperfect-gate.json"

def changed_pixels(a: Image.Image, b: Image.Image) -> int:
    diff = ImageChops.difference(a.convert("RGBA"), b.convert("RGBA"))
    bbox = diff.getbbox()
    return 0 if bbox is None else sum(1 for pixel in diff.getdata() if any(pixel))

def bridge_gate(source_rel: str, variant_rel: str, bridge_rel: str) -> dict[str, object]:
    source = Image.open(K / source_rel).convert("RGBA")
    variant = Image.open(K / variant_rel).convert("RGBA")
    bridge = Image.open(K / bridge_rel).convert("RGBA")
    reconstructed = Image.alpha_composite(variant, bridge)
    sp, vp = source.load(), variant.load()
    rgb_mutation = alpha_increase = 0
    for y in range(source.height):
        for x in range(source.width):
            s, v = sp[x, y], vp[x, y]
            if s[:3] != v[:3]: rgb_mutation += 1
            if v[3] > s[3]: alpha_increase += 1
    bbox = bridge.getchannel("A").getbbox()
    return {
        "reconstructsSourceExactly": reconstructed.tobytes() == source.tobytes(),
        "variantRgbMutationPixels": rgb_mutation,
        "variantAlphaIncreasePixels": alpha_increase,
        "bridgeAlphaBounds": list(bbox) if bbox else None,
    }

def mask_gate() -> dict[str, object]:
    module = Image.open(K / "layers/02_inferior_fogao.png").convert("RGBA").getchannel("A")
    mask = Image.open(K / "masks/02.png").convert("L")
    mp, kp = module.load(), mask.load()
    outside = protected = nonzero = 0
    for y in range(mask.height):
        for x in range(mask.width):
            if kp[x, y]:
                nonzero += 1
                if not mp[x, y]: outside += 1
                if 516 <= x < 739 and 609 <= y < 840: protected += 1
    return {
        "maskNonTransparentPixels": nonzero,
        "maskOutsideModuleAlphaPixels": outside,
        "protectedApplianceMaskPixels": protected,
        "maskBounds": list(mask.getbbox()) if mask.getbbox() else None,
    }

def golden_gate() -> dict[str, object]:
    order = [
        "layers/01_modulo_lavanderia.png","layers/02_inferior_fogao.png",
        "variants/stone-02-cozinha-exposed-right.png","bridges/stone-02-joint-bridge.png",
        "layers/03_inferior_pia.png","variants/stone-03-pia-exposed-left.png","bridges/stone-03-joint-bridge.png",
        "layers/04_lateral_geladeira.png","layers/05_aereo_fogao.png","layers/06_aereo_pia.png",
        "layers/07_aereo_geladeira.png","layers/08_iluminacao.png"
    ]
    composed = Image.open(K / "base.png").convert("RGBA")
    for rel in order: composed = Image.alpha_composite(composed, Image.open(K / rel).convert("RGBA"))
    golden = Image.open(K / "composicao-completa.png").convert("RGBA")
    return {"pixelDifferenceCount": changed_pixels(composed, golden)}

def main() -> int:
    gates = {
        "stone02Bridge": bridge_gate("layers/stone-02-cozinha.png", "variants/stone-02-cozinha-exposed-right.png", "bridges/stone-02-joint-bridge.png"),
        "stone03Bridge": bridge_gate("layers/stone-03-pia.png", "variants/stone-03-pia-exposed-left.png", "bridges/stone-03-joint-bridge.png"),
        "module02FinishMask": mask_gate(),
        "golden": golden_gate(),
    }
    passed = (
        gates["stone02Bridge"]["reconstructsSourceExactly"] and gates["stone03Bridge"]["reconstructsSourceExactly"]
        and gates["stone02Bridge"]["variantRgbMutationPixels"] == 0 and gates["stone03Bridge"]["variantRgbMutationPixels"] == 0
        and gates["stone02Bridge"]["variantAlphaIncreasePixels"] == 0 and gates["stone03Bridge"]["variantAlphaIncreasePixels"] == 0
        and gates["module02FinishMask"]["maskOutsideModuleAlphaPixels"] == 0
        and gates["module02FinishMask"]["protectedApplianceMaskPixels"] == 0
        and gates["module02FinishMask"]["maskNonTransparentPixels"] > 0
        and gates["golden"]["pixelDifferenceCount"] == 0
    )
    payload = {"schemaVersion": "R5APixelPerfectGate 0.2", "status": "PASS" if passed else "FAIL", "gates": gates}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True))
    return 0 if passed else 1

if __name__ == "__main__": raise SystemExit(main())
