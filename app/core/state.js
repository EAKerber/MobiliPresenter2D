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
      schemaVersion: "ViewerState2D 2.0",
      visibilityByEntity,
      moduleSelections,
      globalSelections: {
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
    return state.moduleSelections?.[entityId] || { finishId: BASE_FINISH_ID, handleId: "none" };
  }

  function setModuleSelection(state, entityId, patch) {
    if (!state.moduleSelections || !Object.prototype.hasOwnProperty.call(state.moduleSelections, entityId)) return false;
    state.moduleSelections[entityId] = { ...state.moduleSelections[entityId], ...patch };
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
