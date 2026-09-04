(function registerFingerprintCore(global) {
  "use strict";

  function canonicalState(scene, state) {
    return {
      sceneSchemaVersion: scene.schemaVersion,
      stateSchemaVersion: state.schemaVersion,
      sceneId: scene.id,
      manifestVersion: scene.manifestVersion,
      visibleEntityIds: global.CasaModulesVisibility
        .getVisibleEntities(scene, state)
        .map((entity) => entity.id),
      frontFinishId: state.frontFinishId,
      customColor: state.customColor,
      customTextureKey: state.customTextureKey,
      stoneFinishId: state.stoneFinishId,
      handlePresetId: state.handlePresetId,
      lightingPresetId: state.lightingPresetId,
      decorVisibility: state.decorVisibility,
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
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }
    if (value && typeof value === "object") {
      return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function computeFingerprint(scene, state) {
    const serialized = stableStringify(canonicalState(scene, state));
    return `scene2d-${fnv1a32(serialized)}`;
  }

  global.CasaModulesFingerprint = Object.freeze({ canonicalState, computeFingerprint, stableStringify });
})(window);
