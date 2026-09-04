(function registerStateCore(global) {
  "use strict";

  function createInitialState(scene) {
    const visibleDefaults = new Set(scene.defaultConfiguration.visible);
    const visibilityByEntity = {};

    scene.entities.forEach((entity) => {
      visibilityByEntity[entity.id] = visibleDefaults.has(entity.id);
    });

    return {
      schemaVersion: "ViewerState2D 1.0",
      visibilityByEntity,
      frontFinishId: scene.defaultConfiguration.frontFinishId,
      customColor: null,
      customTextureKey: null,
      stoneFinishId: scene.defaultConfiguration.stoneFinishId,
      handlePresetId: scene.defaultConfiguration.handlePresetId,
      lightingPresetId: scene.defaultConfiguration.lightingPresetId,
      decorVisibility: {},
      selectedEntityId: null,
      gridVisible: scene.defaultConfiguration.gridVisible
    };
  }

  function setEntityVisibility(state, entityId, isVisible) {
    if (!Object.prototype.hasOwnProperty.call(state.visibilityByEntity, entityId)) return false;
    state.visibilityByEntity[entityId] = Boolean(isVisible);
    return true;
  }

  function setAllControllableVisibility(scene, state, isVisible) {
    scene.entities
      .filter((entity) => entity.controllable)
      .forEach((entity) => setEntityVisibility(state, entity.id, isVisible));
  }

  global.CasaModulesCore = Object.freeze({
    createInitialState,
    setAllControllableVisibility,
    setEntityVisibility
  });
})(window);
