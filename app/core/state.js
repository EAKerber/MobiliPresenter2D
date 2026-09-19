(function registerStateCore(global) {
  "use strict";

  const BASE_FINISH_ID = "base-light";

  function createInitialState(scene) {
    const visibleDefaults = new Set(scene.defaultConfiguration.visible);
    const visibilityByEntity = {};
    const moduleSelections = {};

    scene.entities.forEach((entity) => {
      visibilityByEntity[entity.id] = visibleDefaults.has(entity.id);
      if (entity.kind === "module" && entity.controllable) {
        moduleSelections[entity.id] = { finishId: BASE_FINISH_ID, handleId: "none" };
      }
    });

    return {
      schemaVersion: "ViewerState2D 2.1",
      visibilityByEntity,
      moduleSelections,
      globalSelections: {
        finishId: BASE_FINISH_ID,
        handleId: "none",
        stonePackageId: "stone-existing",
        serviceIds: []
      },
      stoneFinishId: "stone-existing",
      stoneColor: null,
      selectedEntityId: null,
      gridVisible: scene.defaultConfiguration.gridVisible
    };
  }

  function moduleSelection(state, entityId) {
    const local = state.moduleSelections?.[entityId] || {};
    const selected = state.globalSelections || {};
    return {
      finishId: selected.finishId || local.finishId || BASE_FINISH_ID,
      handleId: selected.handleId || local.handleId || "none"
    };
  }

  function setModuleSelection(state, entityId, patch) {
    if (!state.moduleSelections || !Object.prototype.hasOwnProperty.call(state.moduleSelections, entityId)) return false;
    const globalPatch = {};
    if (Object.prototype.hasOwnProperty.call(patch, "finishId")) globalPatch.finishId = patch.finishId;
    if (Object.prototype.hasOwnProperty.call(patch, "handleId")) globalPatch.handleId = patch.handleId;
    state.globalSelections = { ...state.globalSelections, ...globalPatch };
    Object.keys(state.moduleSelections).forEach((id) => {
      state.moduleSelections[id] = { ...state.moduleSelections[id], ...globalPatch };
    });
    return true;
  }

  function setGlobalService(state, serviceId, isSelected) {
    const services = new Set(state.globalSelections?.serviceIds || []);
    if (isSelected) services.add(serviceId);
    else services.delete(serviceId);
    state.globalSelections = { ...state.globalSelections, serviceIds: [...services].sort() };
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
    createInitialState,
    moduleSelection,
    setAllControllableVisibility,
    setEntityVisibility,
    setGlobalService,
    setModuleSelection
  });
})(window);
