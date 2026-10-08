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
    if (payload?.schemaVersion !== "PublicModulePresentation2D 0.1"
      || !Array.isArray(payload.modules) || !payload.modules.length
      || !payload.publicState || typeof payload.publicState !== "object"
      || !Array.isArray(payload.publicState.availableFinishIds)
      || typeof payload.publicState.finishId !== "string") {
      throw new TypeError("invalid_public_module_projection");
    }
    const ids = payload.modules.map((item) => item?.id);
    if (new Set(ids).size !== ids.length || ids.some((id) => typeof id !== "string")) {
      throw new TypeError("invalid_public_module_membership");
    }
    if (!payload.publicState.availableFinishIds.includes(payload.publicState.finishId)) {
      throw new TypeError("invalid_public_finish");
    }
    return { publicModules: payload.modules, publicState: payload.publicState };
  }
  global.CASA_PUBLIC_VIEWER_DATA = Object.freeze({ load });
})(window);
