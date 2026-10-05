(function registerRuntimeContracts(global) {
  "use strict";

  const SKIRTING_ID = "stone-skirting";
  const STONE_GROUP_ID = "stone-all";
  const HANDLE_GROUP_ID = "handles-all";
  const FRONT_GROUP_ID = "fronts-all";
  const STACK_STYLE_ID = "runtime-scene-stack-contracts";

  function clone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function itemIsAssigned(stages, itemId) {
    return stages.some((stage) => Array.isArray(stage?.items) && stage.items.includes(itemId));
  }

  function stageContaining(stages, itemId) {
    return stages.find((stage) => Array.isArray(stage?.items) && stage.items.includes(itemId));
  }

  function appendOnce(stage, itemId) {
    if (!stage || !Array.isArray(stage.items) || stage.items.includes(itemId)) return;
    stage.items.push(itemId);
  }

  // Canonical static defaults always expose the handle selector beside fronts and
  // the skirting toggle beside the stone package selector.
  function repairDefaultStageSettings(input) {
    if (!input || !Array.isArray(input.stages)) return input;
    const value = clone(input);
    const finishes = stageContaining(value.stages, STONE_GROUP_ID)
      || stageContaining(value.stages, FRONT_GROUP_ID);
    if (!finishes) return value;
    if (!itemIsAssigned(value.stages, HANDLE_GROUP_ID)) appendOnce(finishes, HANDLE_GROUP_ID);
    if (!itemIsAssigned(value.stages, SKIRTING_ID)) appendOnce(finishes, SKIRTING_ID);
    return value;
  }

  // Published configurations created before the skirting control became a
  // first-class stage item may contain an active service with no visible
  // control. Repair only that contradictory state. If an administrator removed
  // both the control and the service from initialState, preserve that intent.
  function repairSkirtingStageContract(input) {
    if (!input || !Array.isArray(input.stages)) return input;
    const services = new Set(input.initialState?.services || []);
    if (!services.has(SKIRTING_ID) || itemIsAssigned(input.stages, SKIRTING_ID)) return input;
    const stoneStage = stageContaining(input.stages, STONE_GROUP_ID);
    if (!stoneStage) return input;
    const value = clone(input);
    appendOnce(stageContaining(value.stages, STONE_GROUP_ID), SKIRTING_ID);
    return value;
  }

  function installSceneStackContracts() {
    if (!global.document || document.getElementById(STACK_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STACK_STYLE_ID;
    style.textContent = `
      #alignmentGrid { z-index: 840; }
      #sceneHotspots { z-index: 860; }
      #selectionFrame { z-index: 900; }
    `;
    document.head.append(style);
  }

  const configuration = global.CasaModulesConfiguration;
  if (configuration) {
    global.CasaModulesConfiguration = Object.freeze({
      ...configuration,
      createDefaultAdministration(settings, ...args) {
        return configuration.createDefaultAdministration(repairDefaultStageSettings(settings), ...args);
      },
      normalizeConfiguratorSettings(input, ...args) {
        return configuration.normalizeConfiguratorSettings(repairSkirtingStageContract(input), ...args);
      }
    });
  }

  installSceneStackContracts();

  global.CASA_RUNTIME_CONTRACTS = Object.freeze({
    repairDefaultStageSettings,
    repairSkirtingStageContract,
    installSceneStackContracts
  });
})(typeof window === "undefined" ? globalThis : window);
