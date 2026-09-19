(function registerFinishCore(global) {
  "use strict";

  function parseHexColor(color) {
    const match = /^#([0-9a-f]{6})$/i.exec(color || "");
    if (!match) return null;
    const value = Number.parseInt(match[1], 16);
    return {
      red: (value >> 16) & 255,
      green: (value >> 8) & 255,
      blue: value & 255
    };
  }

  function adaptiveOverlayOpacity(color) {
    const rgb = parseHexColor(color);
    if (!rgb) return 0.72;
    const luminance = (0.2126 * rgb.red + 0.7152 * rgb.green + 0.0722 * rgb.blue) / 255;
    if (luminance >= 0.82) return 0.84;
    if (luminance <= 0.2) return 0.78;
    return 0.72;
  }

  function resolveOverlayOpacity(preset, color) {
    const configured = Number(preset?.overlayOpacity);
    if (Number.isFinite(configured) && configured >= 0 && configured <= 1) return configured;
    return adaptiveOverlayOpacity(color);
  }

  function smoothstep(edge0, edge1, value) {
    const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function resolveStructureStrength(preset, color) {
    const configured = Number(preset?.textureLuminance);
    const parsed = parseHexColor(color);
    const colorLuminance = parsed
      ? (0.2126 * parsed.red + 0.7152 * parsed.green + 0.0722 * parsed.blue) / 255
      : 0.5;
    const luminance = Number.isFinite(configured) && configured >= 0 && configured <= 1
      ? configured
      : colorLuminance;
    const bright = smoothstep(0.78, 0.94, luminance);
    const dark = 1 - smoothstep(0.12, 0.25, luminance);
    return {
      luminance,
      shadowOpacity: Math.min(0.42, Math.max(0.08, 0.16 + 0.24 * bright - 0.06 * dark)),
      highlightOpacity: Math.min(0.10, Math.max(0, 0.10 * dark))
    };
  }

  function resolveMaskAsset(entity, resolvedVisibility) {
    const variants = entity?.finishMaskVariants || [];
    for (const variant of variants) {
      const requiredIds = variant.requiresVisibleIds || [];
      if (requiredIds.length && requiredIds.every((id) => resolvedVisibility?.[id]?.visible)) {
        return variant.maskAsset;
      }
    }
    return entity?.maskAsset || null;
  }

  global.CasaModulesFinishes = Object.freeze({
    adaptiveOverlayOpacity,
    parseHexColor,
    resolveMaskAsset,
    resolveOverlayOpacity,
    resolveStructureStrength
  });
})(window);
