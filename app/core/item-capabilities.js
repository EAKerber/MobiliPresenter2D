(function registerItemCapabilities(global) {
  "use strict";

  const STAGE_KINDS = Object.freeze(["modules", "finishes", "services", "summary", "custom"]);
  const CORE_STAGE_KINDS = Object.freeze(["modules", "summary"]);

  const BEHAVIOR_BY_KIND = Object.freeze({
    "finish-group": "selection",
    handle: "selection",
    stone: "selection",
    finish: "selection",
    module: "toggle",
    object: "toggle",
    service: "toggle",
    summary: "action"
  });

  const DEFAULT_STAGE_KINDS_BY_KIND = Object.freeze({
    module: Object.freeze(["modules", "custom"]),
    object: Object.freeze(["services", "custom"]),
    service: Object.freeze(["services", "custom"]),
    "finish-group": Object.freeze(["finishes"]),
    summary: Object.freeze(["summary"]),
    handle: Object.freeze([]),
    stone: Object.freeze([]),
    finish: Object.freeze([])
  });

  const ITEM_CAPABILITIES = Object.freeze({
    "fronts-all": Object.freeze({ optionSource: "finishes", optionsOpenByDefault: false }),
    "handles-all": Object.freeze({ optionSource: "handles", optionsOpenByDefault: true }),
    "stone-all": Object.freeze({ optionSource: "stonePackages", optionsOpenByDefault: false })
  });

  function behaviorForKind(kind) {
    return BEHAVIOR_BY_KIND[kind] || null;
  }

  function allowedStageKindsForItem(itemId, kind, catalog) {
    const service = catalog?.services?.find((item) => item.id === itemId);
    const explicit = Array.isArray(service?.stageKinds) && service.stageKinds.length
      ? service.stageKinds
      : null;
    return [...new Set(explicit || DEFAULT_STAGE_KINDS_BY_KIND[kind] || [])];
  }

  function stageAllowsItem(stageKind, itemId, kind, catalog) {
    return allowedStageKindsForItem(itemId, kind, catalog).includes(stageKind);
  }

  function itemCapabilities(itemId, kind, catalog) {
    const specific = ITEM_CAPABILITIES[itemId] || {};
    return Object.freeze({
      itemId,
      kind,
      behavior: behaviorForKind(kind),
      allowedStageKinds: Object.freeze(allowedStageKindsForItem(itemId, kind, catalog)),
      optionSource: specific.optionSource || null,
      optionsOpenByDefault: Boolean(specific.optionsOpenByDefault)
    });
  }

  const api = Object.freeze({
    STAGE_KINDS,
    CORE_STAGE_KINDS,
    BEHAVIOR_BY_KIND,
    DEFAULT_STAGE_KINDS_BY_KIND,
    behaviorForKind,
    allowedStageKindsForItem,
    stageAllowsItem,
    itemCapabilities
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesItemCapabilities = api;
})(typeof globalThis === "undefined" ? this : globalThis);
