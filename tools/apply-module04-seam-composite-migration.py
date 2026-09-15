#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one occurrence, got {count}")
    return text.replace(old, new, 1)


def remove_exact(text: str, value: str, expected: int, label: str) -> str:
    count = text.count(value)
    if count != expected:
        raise RuntimeError(f"{label}: expected {expected} occurrences, got {count}")
    return text.replace(value, "")


def migrate_scene() -> None:
    rel = "app/data/scene-data.js"
    text = read(rel)
    text = remove_exact(
        text,
        '        "module-04-06-finish-bridge",\n',
        1,
        "default visible bridge",
    )
    text = remove_exact(
        text,
        '          "module-04-06-finish-bridge",\n',
        1,
        "finish target bridge",
    )
    bridge_block = '''      {\n        id: "module-04-06-finish-bridge",\n        alias: "04J",\n        label: "Emenda de acabamento 04–06",\n        kind: "finish-bridge",\n        zIndex: 401,\n        asset: "assets/kitchen/bridges/front-04-06-finish-bridge.png",\n        maskAsset: "assets/kitchen/masks/04-06-seam-bridge.png",\n        alphaBounds: null,\n        defaultVisible: true,\n        controllable: false,\n        hostIds: ["module-04", "module-06"],\n        finishGroups: ["fronts-all"],\n        tags: ["finish", "joint", "sink-zone", "refrigerator-zone"]\n      },\n'''
    text = remove_exact(text, bridge_block, 1, "bridge entity")
    old = '''        asset: "assets/kitchen/layers/04_lateral_geladeira.png",\n        maskAsset: "assets/kitchen/masks/04.png",\n        alphaBounds: { x: 1205, y: 44, width: 38, height: 870 },'''
    new = '''        asset: "assets/kitchen/layers/04_lateral_geladeira.png",\n        maskAsset: "assets/kitchen/masks/04.png",\n        finishMaskVariants: [\n          {\n            requiresVisibleIds: ["module-06"],\n            maskAsset: "assets/kitchen/masks/04-with-06-seam.png",\n            sourceBridgeMaskAsset: "assets/kitchen/masks/04-06-seam-bridge.png"\n          }\n        ],\n        alphaBounds: { x: 1205, y: 44, width: 38, height: 870 },'''
    text = replace_once(text, old, new, "module04 conditional finish mask")
    write(rel, text)


def migrate_finishes() -> None:
    rel = "app/core/finishes.js"
    text = read(rel)
    old = '''  function resolveOverlayOpacity(preset, color) {\n    const configured = Number(preset?.overlayOpacity);\n    if (Number.isFinite(configured) && configured >= 0 && configured <= 1) return configured;\n    return adaptiveOverlayOpacity(color);\n  }\n\n  global.CasaModulesFinishes = Object.freeze({\n    adaptiveOverlayOpacity,\n    parseHexColor,\n    resolveOverlayOpacity\n  });'''
    new = '''  function resolveOverlayOpacity(preset, color) {\n    const configured = Number(preset?.overlayOpacity);\n    if (Number.isFinite(configured) && configured >= 0 && configured <= 1) return configured;\n    return adaptiveOverlayOpacity(color);\n  }\n\n  function resolveMaskAsset(entity, resolvedVisibility) {\n    const variants = entity?.finishMaskVariants || [];\n    for (const variant of variants) {\n      const requiredIds = variant.requiresVisibleIds || [];\n      if (requiredIds.length && requiredIds.every((id) => resolvedVisibility?.[id]?.visible)) {\n        return variant.maskAsset;\n      }\n    }\n    return entity?.maskAsset || null;\n  }\n\n  global.CasaModulesFinishes = Object.freeze({\n    adaptiveOverlayOpacity,\n    parseHexColor,\n    resolveMaskAsset,\n    resolveOverlayOpacity\n  });'''
    write(rel, replace_once(text, old, new, "finish mask resolver"))


def migrate_app() -> None:
    rel = "app/app.js"
    text = read(rel)
    text = replace_once(
        text,
        '  const finishLayers = [...document.querySelectorAll(".finish-layer")];\n  const swatches = [...document.querySelectorAll("[data-color]")];',
        '  const finishLayers = [...document.querySelectorAll(".finish-layer")];\n  const entitiesById = new Map(scene.entities.map((entity) => [entity.id, entity]));\n  const swatches = [...document.querySelectorAll("[data-color]")];',
        "app entity index",
    )
    old = '''  function syncLayerVisibility() {\n    renderStone(state);\n    const resolved = visibility.resolveVisibility(scene, state);\n    layerGroups.forEach((layer) => {'''
    new = '''  function syncFinishMasks(resolved) {\n    finishLayers.forEach((layer) => {\n      const group = layer.closest(".layer-group");\n      const entity = entitiesById.get(group?.dataset.entityId);\n      const maskAsset = finishes.resolveMaskAsset(entity, resolved);\n      if (!maskAsset || layer.dataset.maskAsset === maskAsset) return;\n      const maskSource = inlineMasks[maskAsset];\n      if (!maskSource) throw new Error(`Máscara incorporada ausente: ${maskAsset}`);\n      layer.style.setProperty("--mask-image", `url("${maskSource}")`);\n      layer.dataset.maskAsset = maskAsset;\n    });\n  }\n\n  function syncLayerVisibility() {\n    renderStone(state);\n    const resolved = visibility.resolveVisibility(scene, state);\n    syncFinishMasks(resolved);\n    layerGroups.forEach((layer) => {'''
    write(rel, replace_once(text, old, new, "app finish mask synchronization"))


def migrate_validation() -> None:
    rel = "app/core/validation.js"
    text = read(rel)
    old = '''      (entity.occludedByIds || []).forEach((occluderId) => {\n        if (!scene.entities.some((candidate) => candidate.id === occluderId)) {\n          errors.push({ code: "occluder-missing", entityId: entity.id, occluderId });\n        }\n      });'''
    new = '''      (entity.occludedByIds || []).forEach((occluderId) => {\n        if (!scene.entities.some((candidate) => candidate.id === occluderId)) {\n          errors.push({ code: "occluder-missing", entityId: entity.id, occluderId });\n        }\n      });\n      (entity.finishMaskVariants || []).forEach((variant, variantIndex) => {\n        if (typeof variant.maskAsset !== "string" || !variant.maskAsset) {\n          errors.push({ code: "finish-mask-variant-missing-asset", entityId: entity.id, variantIndex });\n        }\n        const requiredIds = variant.requiresVisibleIds || [];\n        if (!Array.isArray(requiredIds) || !requiredIds.length) {\n          errors.push({ code: "finish-mask-variant-missing-dependency", entityId: entity.id, variantIndex });\n          return;\n        }\n        requiredIds.forEach((requiredId) => {\n          if (!scene.entities.some((candidate) => candidate.id === requiredId)) {\n            errors.push({ code: "finish-mask-variant-dependency-missing", entityId: entity.id, variantIndex, requiredId });\n          }\n        });\n      });'''
    write(rel, replace_once(text, old, new, "finish mask variant validation"))


def migrate_test_core() -> None:
    rel = "app/tools/test-core.js"
    text = read(rel)
    text = replace_once(
        text,
        'const fingerprints=sandbox.window.CasaModulesFingerprint;\n',
        'const fingerprints=sandbox.window.CasaModulesFingerprint;\nconst finishes=sandbox.window.CasaModulesFinishes;\n',
        "finish core test binding",
    )
    text = replace_once(text, "assert.equal(scene.entities.length,18);", "assert.equal(scene.entities.length,17);", "entity count")
    old = '''  if(entity.maskAsset){\n    assert.equal(fs.existsSync(path.join(projectRoot,entity.maskAsset)),true);\n    assert.equal(typeof masks[entity.maskAsset],"string");\n  }'''
    new = '''  if(entity.maskAsset){\n    assert.equal(fs.existsSync(path.join(projectRoot,entity.maskAsset)),true);\n    assert.equal(typeof masks[entity.maskAsset],"string");\n  }\n  for (const variant of entity.finishMaskVariants || []) {\n    assert.equal(fs.existsSync(path.join(projectRoot,variant.maskAsset)),true,variant.maskAsset);\n    assert.equal(typeof masks[variant.maskAsset],"string");\n    if (variant.sourceBridgeMaskAsset) {\n      assert.equal(fs.existsSync(path.join(projectRoot,variant.sourceBridgeMaskAsset)),true,variant.sourceBridgeMaskAsset);\n      assert.equal(typeof masks[variant.sourceBridgeMaskAsset],"string");\n    }\n  }'''
    text = replace_once(text, old, new, "variant asset test")
    text = replace_once(text, "assert.equal(visibility.getVisibleEntities(scene,initial).length,16);", "assert.equal(visibility.getVisibleEntities(scene,initial).length,15);", "initial visible count")
    seam_block = '''assert.equal(visibility.resolveVisibility(scene,initial)["module-04-06-finish-bridge"].reason,"visible");\ncore.setEntityVisibility(initial,"module-06",false);\nlet seamVisibility=visibility.resolveVisibility(scene,initial);\nassert.equal(seamVisibility["module-04-06-finish-bridge"].reason,"host-hidden");\ncore.setEntityVisibility(initial,"module-06",true);\ncore.setEntityVisibility(initial,"module-04",false);\nseamVisibility=visibility.resolveVisibility(scene,initial);\nassert.equal(seamVisibility["module-04-06-finish-bridge"].reason,"host-hidden");\ncore.setEntityVisibility(initial,"module-04",true);\nassert.equal(visibility.resolveVisibility(scene,initial)["module-04-06-finish-bridge"].reason,"visible");\n'''
    text = remove_exact(text, seam_block, 1, "old separate seam visibility test")
    marker = 'assert.equal(visibility.resolveVisibility(scene,initial)["module-02-right-exposed-face"].reason,"occluded");\n'
    variant_test = '''const module04=scene.entities.find((entity)=>entity.id==="module-04");\nlet finishVisibility=visibility.resolveVisibility(scene,initial);\nassert.equal(finishes.resolveMaskAsset(module04,finishVisibility),"assets/kitchen/masks/04-with-06-seam.png");\ncore.setEntityVisibility(initial,"module-06",false);\nfinishVisibility=visibility.resolveVisibility(scene,initial);\nassert.equal(finishes.resolveMaskAsset(module04,finishVisibility),"assets/kitchen/masks/04.png");\ncore.setEntityVisibility(initial,"module-06",true);\nassert.equal(finishes.resolveMaskAsset(module04,visibility.resolveVisibility(scene,initial)),"assets/kitchen/masks/04-with-06-seam.png");\n'''
    text = replace_once(text, marker, marker + variant_test, "conditional seam mask tests")
    text = replace_once(text, 'assert.equal(r["module-02-right-exposed-face"].reason,"visible");\nassert.equal(visibility.getVisibleEntities(scene,initial).length,12);', 'assert.equal(r["module-02-right-exposed-face"].reason,"visible");\nassert.equal(visibility.getVisibleEntities(scene,initial).length,11);', "module03 hidden count")
    text = replace_once(text, 'assert.equal(r["module-02-right-exposed-face"].reason,"host-hidden");\nassert.equal(visibility.getVisibleEntities(scene,initial).length,13);', 'assert.equal(r["module-02-right-exposed-face"].reason,"host-hidden");\nassert.equal(visibility.getVisibleEntities(scene,initial).length,12);', "module02 hidden count")
    text = replace_once(text, "entities:18,controllableEntities:8", "entities:17,controllableEntities:8", "test output entity count")
    write(rel, text)


def migrate_build_inline_masks() -> None:
    rel = "app/tools/build-inline-masks.py"
    text = read(rel)
    text = replace_once(
        text,
        '    "assets/kitchen/masks/04-06-seam-bridge.png",\n',
        '    "assets/kitchen/masks/04-06-seam-bridge.png",\n    "assets/kitchen/masks/04-with-06-seam.png",\n',
        "inline composite mask",
    )
    write(rel, text)


def migrate_update_technical_data() -> None:
    rel = "app/tools/update-technical-data.py"
    text = read(rel)
    text = replace_once(
        text,
        '        "assets/kitchen/bridges/front-04-06-finish-bridge.png",\n        "assets/kitchen/masks/04-06-seam-bridge.png",\n',
        '        "assets/kitchen/masks/04-06-seam-bridge.png",\n        "assets/kitchen/masks/04-with-06-seam.png",\n',
        "technical seam tracking",
    )
    text = replace_once(
        text,
        '    files = data.setdefault("files", {})\n',
        '    files = data.setdefault("files", {})\n    files.pop("assets/kitchen/bridges/front-04-06-finish-bridge.png", None)\n',
        "technical stale bridge cleanup",
    )
    write(rel, text)


def migrate_validate_assets() -> None:
    rel = "app/tools/validate-assets.py"
    text = read(rel)
    text = replace_once(
        text,
        '    "mask": "assets/kitchen/masks/04-06-seam-bridge.png",\n    "hosts": (',
        '    "mask": "assets/kitchen/masks/04-06-seam-bridge.png",\n    "base": "assets/kitchen/masks/04.png",\n    "composite": "assets/kitchen/masks/04-with-06-seam.png",\n    "hosts": (',
        "seam composite contract",
    )
    old = '''    for host_rel in FRONT_SEAM_BRIDGE["hosts"]:\n        with Image.open(ROOT / host_rel) as host_image:\n            host = binary_support(host_image.convert("RGBA").getchannel("A"))\n        overlap = ImageChops.multiply(mask, host)\n        overlap_pixels = sum(1 for value in overlap.get_flattened_data() if value)\n        if overlap_pixels:\n            errors.append({\n                "path": FRONT_SEAM_BRIDGE["mask"],\n                "host": host_rel,\n                "error": "finish-bridge-overlaps-host-alpha",\n                "pixels": overlap_pixels,\n                "bounds": list(overlap.getbbox()),\n            })\n    return errors'''
    new = '''    for host_rel in FRONT_SEAM_BRIDGE["hosts"]:\n        with Image.open(ROOT / host_rel) as host_image:\n            host = binary_support(host_image.convert("RGBA").getchannel("A"))\n        overlap = ImageChops.multiply(mask, host)\n        overlap_pixels = sum(1 for value in overlap.get_flattened_data() if value)\n        if overlap_pixels:\n            errors.append({\n                "path": FRONT_SEAM_BRIDGE["mask"],\n                "host": host_rel,\n                "error": "finish-bridge-overlaps-host-alpha",\n                "pixels": overlap_pixels,\n                "bounds": list(overlap.getbbox()),\n            })\n    with Image.open(ROOT / FRONT_SEAM_BRIDGE["base"]) as base_image, Image.open(ROOT / FRONT_SEAM_BRIDGE["composite"]) as composite_image:\n        base_alpha = base_image.convert("RGBA").getchannel("A")\n        composite_alpha = composite_image.convert("RGBA").getchannel("A")\n    with Image.open(mask_path) as seam_image:\n        seam_alpha = seam_image.convert("RGBA").getchannel("A")\n    expected_alpha = ImageChops.lighter(base_alpha, seam_alpha)\n    composite_diff = ImageChops.difference(expected_alpha, composite_alpha)\n    if composite_diff.getbbox():\n        errors.append({\n            "path": FRONT_SEAM_BRIDGE["composite"],\n            "error": "finish-bridge-composite-mismatch",\n            "bounds": list(composite_diff.getbbox()),\n        })\n    return errors'''
    write(rel, replace_once(text, old, new, "composite mask validation"))


def migrate_package() -> None:
    rel = "app/package.json"
    text = read(rel)
    text = replace_once(
        text,
        '    "build:normalize-front-masks": "python3 tools/normalize-front-masks.py",\n    "build:inline-masks": "python3 tools/build-inline-masks.py",',
        '    "build:normalize-front-masks": "python3 tools/normalize-front-masks.py",\n    "build:front-seam-masks": "python3 tools/build-front-seam-masks.py",\n    "build:inline-masks": "python3 tools/build-inline-masks.py",',
        "package seam build script",
    )
    text = replace_once(
        text,
        '"build:normalize-front-masks && npm run build:inline-masks',
        '"build:normalize-front-masks && npm run build:front-seam-masks && npm run build:inline-masks',
        "package build order",
    )
    write(rel, text)


def main() -> int:
    migrate_scene()
    migrate_finishes()
    migrate_app()
    migrate_validation()
    migrate_test_core()
    migrate_build_inline_masks()
    migrate_update_technical_data()
    migrate_validate_assets()
    migrate_package()
    obsolete = APP / "assets/kitchen/bridges/front-04-06-finish-bridge.png"
    if obsolete.exists():
        obsolete.unlink()
    print("prepared conditional seam composite migration")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
