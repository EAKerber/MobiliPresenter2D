(function registerStateCore(global) {
  "use strict";

  const BASE_FINISH_ID = "base-light";
  const BASE_HANDLE_ID = "none";

  function createInitialState(scene) {
    const visibleDefaults = new Set(scene.defaultConfiguration.visible);
    const visibilityByEntity = {};
    scene.entities.forEach((entity) => {
      visibilityByEntity[entity.id] = visibleDefaults.has(entity.id);
    });

    return {
      schemaVersion: "ViewerState2D 2.2",
      visibilityByEntity,
      globalSelections: {
        finishId: BASE_FINISH_ID,
        handleId: BASE_HANDLE_ID,
        stonePackageId: "stone-existing",
        serviceIds: []
      },
      selectedEntityId: null,
      gridVisible: scene.defaultConfiguration.gridVisible
    };
  }

  function globalFinishId(state) {
    return state.globalSelections?.finishId || BASE_FINISH_ID;
  }

  function globalHandleId(state) {
    return state.globalSelections?.handleId || BASE_HANDLE_ID;
  }

  // Compatibility reader: choices are global; no per-module choice is stored.
  function moduleSelection(state) {
    return { finishId: globalFinishId(state), handleId: globalHandleId(state) };
  }

  function setGlobalSelection(state, patch) {
    state.globalSelections = { ...state.globalSelections, ...patch };
    return true;
  }

  function setGlobalService(state, serviceId, isSelected) {
    const services = new Set(state.globalSelections?.serviceIds || []);
    if (isSelected) services.add(serviceId);
    else services.delete(serviceId);
    setGlobalSelection(state, { serviceIds: [...services].sort() });
  }

  function setEntityVisibility(state, entityId, isVisible) {
    if (!Object.prototype.hasOwnProperty.call(state.visibilityByEntity, entityId)) return false;
    state.visibilityByEntity[entityId] = Boolean(isVisible);
    return true;
  }

  function setAllControllableVisibility(scene, state, isVisible) {
    scene.entities.filter((entity) => entity.controllable).forEach((entity) => setEntityVisibility(state, entity.id, isVisible));
  }

  global.CasaModulesCore = Object.freeze({
    BASE_FINISH_ID,
    BASE_HANDLE_ID,
    createInitialState,
    globalFinishId,
    globalHandleId,
    moduleSelection,
    setAllControllableVisibility,
    setEntityVisibility,
    setGlobalSelection,
    setGlobalService
  });
})(window);
