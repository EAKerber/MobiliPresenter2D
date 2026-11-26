(function registerPublicViewerData(global) {
  "use strict";
  // Optional until CP-PUBLIC-02b endpoint and page gates are green.
  // When enabled, an absent or invalid publication MUST NOT fall back
  // silently to the static catalog from the standalone staging shell.
  const MODULE_KEYS = new Set([
    "id", "referenceLabel", "title", "description", "category", "dimensionLabel",
    "nominalDimensionsMm", "benefits", "components", "requirements", "basePriceCents"
  ]);
  const FINISH_KEYS = new Set(["id", "label", "color", "textureAsset", "textureSize"]);
  const DIMENSION_KEYS = new Set(["width", "height", "depth"]);
  const ownKeysAre = (value, allowed, required = []) => value && typeof value === "object"
    && !Array.isArray(value)
    && Object.keys(value).every((key) => allowed.has(key))
    && required.every((key) => Object.hasOwn(value, key));
  const validId = (value) => typeof value === "string" && value.trim().length > 0;
  const validText = (value) => typeof value === "string" && value.trim().length > 0;

  async function load() {
    const response = await global.fetch("/api/public-modules", {
      method: "GET", cache: "no-store", credentials: "same-origin",
      headers: { "X-Public-Modules-Version": "0.2" }
    });
    if (!response.ok) throw new Error("public_modules_unavailable");
    const payload = await response.json();
    if (!["PublicModulePresentation2D 0.1", "PublicModulePresentation2D 0.2"].includes(payload?.schemaVersion)
      || !Array.isArray(payload.modules) || !payload.modules.length
      || !ownKeysAre(payload, new Set(["schemaVersion", "modules", "publicState"]), ["schemaVersion", "modules", "publicState"])
      || !ownKeysAre(payload.publicState, new Set(["viewerEntities", "entities", "finishId", "availableFinishes"]), ["finishId", "availableFinishes"])
      || !Array.isArray(payload.publicState.availableFinishes)
      || !validId(payload.publicState.finishId)) {
      throw new TypeError("invalid_public_module_projection");
    }
    if (Object.hasOwn(payload.publicState, "viewerEntities") && Object.hasOwn(payload.publicState, "entities")) {
      throw new TypeError("invalid_public_module_visibility");
    }
    const ids = payload.modules.map((item) => item?.id);
    if (new Set(ids).size !== ids.length || ids.some((id) => !validId(id))) {
      throw new TypeError("invalid_public_module_membership");
    }
    const finishIds = payload.publicState.availableFinishes.map((finish) => finish?.id);
    if (!finishIds.length || finishIds.some((id) => !validId(id))
      || new Set(finishIds).size !== finishIds.length
      || !finishIds.includes(payload.publicState.finishId)) {
      throw new TypeError("invalid_public_finish");
    }
    const visibility = payload.publicState.viewerEntities || payload.publicState.entities;
    if (!visibility || typeof visibility !== "object" || Array.isArray(visibility)
      || Object.keys(visibility).length !== ids.length
      || Object.keys(visibility).some((id) => !ids.includes(id))
      || ids.some((id) => typeof visibility[id] !== "boolean")) {
      throw new TypeError("invalid_public_module_visibility");
    }
    for (const finish of payload.publicState.availableFinishes) {
      if (!ownKeysAre(finish, FINISH_KEYS, ["id", "label", "color", "textureAsset", "textureSize"])
        || !validText(finish.label)
        || !(finish.color === null || (typeof finish.color === "string" && /^#[0-9a-f]{6}$/i.test(finish.color)))
        || typeof finish.textureAsset !== "string"
        || (finish.textureAsset && (!/^assets\/[A-Za-z0-9_./-]+\.(png|webp|jpe?g)$/i.test(finish.textureAsset)
          || finish.textureAsset.includes("..")))
        || typeof finish.textureSize !== "string") {
        throw new TypeError("invalid_public_finish");
      }
    }
    for (const module of payload.modules) {
      if (!ownKeysAre(module, MODULE_KEYS, ["id", "title", "dimensionLabel", "nominalDimensionsMm"])
        || ["referenceLabel", "title", "description", "category", "dimensionLabel"]
          .some((key) => Object.hasOwn(module, key) && !validText(module[key]))
        || ["benefits", "components", "requirements"]
          .some((key) => Object.hasOwn(module, key)
            && (!Array.isArray(module[key]) || module[key].some((value) => !validText(value))))) {
        throw new TypeError("invalid_public_module_projection");
      }
      if (Object.hasOwn(module, "basePriceCents") && (
        payload.schemaVersion !== "PublicModulePresentation2D 0.2"
        || !Number.isSafeInteger(module.basePriceCents)
        || module.basePriceCents <= 0 || module.basePriceCents > 100000000
      )) throw new TypeError("invalid_public_base_price");
      const dimensions = module.nominalDimensionsMm;
      if (!ownKeysAre(dimensions, DIMENSION_KEYS, ["width", "height", "depth"])
        || Object.keys(dimensions).length !== 3
        || ["width", "height", "depth"].some((axis) => !Number.isFinite(dimensions[axis]) || dimensions[axis] < 1 || dimensions[axis] > 5000)) {
        throw new TypeError("invalid_public_module_dimensions");
      }
    }
    return { publicModules: payload.modules, publicState: payload.publicState };
  }
  global.CASA_PUBLIC_VIEWER_DATA = Object.freeze({ load });
})(window);

