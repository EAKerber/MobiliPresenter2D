(function registerPublicViewerData(global) {
  "use strict";
  // Optional until CP-PUBLIC-02b endpoint and page gates are green.
  // When enabled, an absent or invalid publication MUST NOT fall back
  // silently to the static catalog from the standalone staging shell.
  async function load() {
    const response = await global.fetch("/api/public-modules", {
      method: "GET", cache: "no-store", credentials: "same-origin"
    });
    if (!response.ok) throw new Error("public_modules_unavailable");
    const payload = await response.json();
    if (!["PublicModulePresentation2D 0.1", "PublicModulePresentation2D 0.2"].includes(payload?.schemaVersion)
      || !Array.isArray(payload.modules) || !payload.modules.length
      || !payload.publicState || typeof payload.publicState !== "object"
      || !Array.isArray(payload.publicState.availableFinishes)
      || typeof payload.publicState.finishId !== "string") {
      throw new TypeError("invalid_public_module_projection");
    }
    const ids = payload.modules.map((item) => item?.id);
    if (new Set(ids).size !== ids.length || ids.some((id) => typeof id !== "string")) {
      throw new TypeError("invalid_public_module_membership");
    }
    if (!payload.publicState.availableFinishes.some((finish) => finish?.id === payload.publicState.finishId)) {
      throw new TypeError("invalid_public_finish");
    }
    const visibility = payload.publicState.viewerEntities || payload.publicState.entities;
    if (!visibility || typeof visibility !== "object" || Array.isArray(visibility)
      || ids.some((id) => typeof visibility[id] !== "boolean")) {
      throw new TypeError("invalid_public_module_visibility");
    }
    for (const module of payload.modules) {
      if (Object.hasOwn(module, "basePriceCents") && (
        payload.schemaVersion !== "PublicModulePresentation2D 0.2"
        || !Number.isSafeInteger(module.basePriceCents)
        || module.basePriceCents <= 0 || module.basePriceCents > 100000000
      )) throw new TypeError("invalid_public_base_price");
      const dimensions = module?.nominalDimensionsMm;
      if (dimensions != null && ["width", "height", "depth"].some((axis) => !Number.isFinite(dimensions[axis]) || dimensions[axis] < 1 || dimensions[axis] > 5000)) {
        throw new TypeError("invalid_public_module_dimensions");
      }
    }
    return { publicModules: payload.modules, publicState: payload.publicState };
  }
  global.CASA_PUBLIC_VIEWER_DATA = Object.freeze({ load });
})(window);
