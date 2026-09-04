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

  global.CasaModulesFinishes = Object.freeze({
    adaptiveOverlayOpacity,
    parseHexColor,
    resolveOverlayOpacity
  });
})(window);
