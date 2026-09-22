(function registerFingerprintCore(global) {
  "use strict";

  function canonicalState(scene, state) {
    return {
      sceneSchemaVersion: scene.schemaVersion,
      stateSchemaVersion: state.schemaVersion,
      sceneId: scene.id,
      manifestVersion: scene.manifestVersion,
      visibleEntityIds: global.CasaModulesVisibility.getVisibleEntities(scene, state).map((entity) => entity.id),
      globalSelections: state.globalSelections,
      gridVisible: state.gridVisible
    };
  }

  function fnv1a32(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    if (value && typeof value === "object") return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stableStringify(value[key])).join(",") + "}";
    return JSON.stringify(value);
  }

  function computeFingerprint(scene, state) {
    return "scene2d-" + fnv1a32(stableStringify(canonicalState(scene, state)));
  }

  global.CasaModulesFingerprint = Object.freeze({ canonicalState, computeFingerprint, stableStringify });
})(window);
