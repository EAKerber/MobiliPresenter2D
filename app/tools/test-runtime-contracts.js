const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const baseConfiguration = Object.freeze({
  createDefaultAdministration(settings) { return structuredClone(settings); },
  normalizeConfiguratorSettings(settings) { return structuredClone(settings); },
  validateConfiguratorSettings() { return []; },
  resolveEventState() { return null; }
});
const sandbox = {
  structuredClone,
  console,
  CasaModulesConfiguration: baseConfiguration
};
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(projectRoot, "core/runtime-contracts.js"), "utf8"),
  sandbox,
  { filename: "core/runtime-contracts.js" }
);

const contracts = sandbox.CASA_RUNTIME_CONTRACTS;
assert(contracts, "runtime contracts must register");
assert.equal(contracts.repairDefaultStageSettings, undefined, "canonical defaults no longer require a runtime repair");
assert.equal(
  sandbox.CasaModulesConfiguration.createDefaultAdministration,
  baseConfiguration.createDefaultAdministration,
  "runtime shim must not wrap canonical default administration"
);

const staticDefaults = require("../data/configurator-settings.js");
const finishesStage = staticDefaults.stages.find((stage) => stage.id === "finishes");
assert(finishesStage, "canonical defaults must include finishes stage");
assert.equal(finishesStage.items.includes("handles-all"), true, "canonical defaults expose handles directly");
assert.equal(finishesStage.items.includes("stone-skirting"), true, "canonical defaults expose skirting directly");

const publishedLegacy = {
  schemaVersion: "ConfiguratorAdministration2D 3.0",
  stages: [
    { id: "finishes", kind: "finishes", enabled: true, items: ["fronts-all", "stone-all"] },
    { id: "services", kind: "services", enabled: true, items: ["move-stone", "tempered-glass"] }
  ],
  initialState: { services: ["move-stone", "stone-skirting", "tempered-glass"] }
};
const repairedPublished = contracts.repairSkirtingStageContract(publishedLegacy);
assert.equal(repairedPublished.stages[0].items.includes("stone-skirting"), true, "active orphaned skirting is restored beside stone-all");
assert.equal(publishedLegacy.stages[0].items.includes("stone-skirting"), false, "published input stays immutable");

const intentionalRemoval = {
  ...publishedLegacy,
  stages: publishedLegacy.stages.map((stage) => ({ ...stage, items: [...stage.items] })),
  initialState: { services: ["move-stone", "tempered-glass"] }
};
const preservedRemoval = contracts.repairSkirtingStageContract(intentionalRemoval);
assert.equal(preservedRemoval.stages[0].items.includes("stone-skirting"), false, "removing both control and initial service remains an explicit admin choice");

const alreadyAssigned = {
  ...publishedLegacy,
  stages: [
    { id: "finishes", kind: "finishes", enabled: true, items: ["fronts-all", "stone-all"] },
    { id: "custom", kind: "custom", enabled: true, items: ["stone-skirting"] }
  ]
};
const preservedAssignment = contracts.repairSkirtingStageContract(alreadyAssigned);
assert.equal(preservedAssignment.stages[0].items.includes("stone-skirting"), false, "existing admin placement is not moved");
assert.equal(preservedAssignment.stages[1].items.filter((id) => id === "stone-skirting").length, 1, "skirting is never duplicated");

const wrappedPublished = sandbox.CasaModulesConfiguration.normalizeConfiguratorSettings(publishedLegacy);
assert.equal(wrappedPublished.stages[0].items.includes("stone-skirting"), true, "the public normalization path self-heals the legacy published shape");

const runtimeContractsSource = fs.readFileSync(path.join(projectRoot, "core/runtime-contracts.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const stylesCss = fs.readFileSync(path.join(projectRoot, "styles.css"), "utf8");
assert.equal(runtimeContractsSource.includes("repairDefaultStageSettings"), false, "migration shim must not carry obsolete default repair");
assert.equal(runtimeContractsSource.includes("installSceneStackContracts"), false, "migration shim must not own presentation stacking");
assert.equal(runtimeContractsSource.includes("installKeyboardShortcuts"), false, "migration shim must not own script loading");
assert.equal(runtimeContractsSource.includes("createElement(\"style\")"), false, "migration shim must not inject CSS");
assert.equal(runtimeContractsSource.includes("createElement(\"script\")"), false, "migration shim must not inject scripts");
assert.equal((indexHtml.match(/core\/keyboard-shortcuts\.js/g) || []).length, 1, "keyboard script is loaded explicitly exactly once");
assert.equal((indexHtml.match(/core\/layout-profiles\.js/g) || []).length, 1, "layout profile resolver is loaded explicitly exactly once");
assert.equal((indexHtml.match(/data-step="/g) || []).length, 0, "static buyer stage buttons are absent; runtime normalized flow owns navigation");
const layoutProfilesIndex = indexHtml.indexOf("core/layout-profiles.js?v=cp-sd-01c1-v1");
const stylesIndex = indexHtml.indexOf("styles.css?v=runtime-v33");
const hierarchyDefaultsIndex = indexHtml.indexOf("data/hierarchy-defaults.js?v=hierarchy-defaults-v2");
const flowModelIndex = indexHtml.indexOf("core/flow-model.js?v=runtime-v33");
const presentationIndex = indexHtml.indexOf("core/presentation-contract.js?v=cp-sd-01c1-v1");
const presentationPolicyIndex = indexHtml.indexOf("data/presentation-policy-defaults.js?v=cp-sd-01c1-v1");
const flowLayoutIndex = indexHtml.indexOf("core/flow-layout.js?v=runtime-v33");
const runtimeContractIndex = indexHtml.indexOf("core/runtime-contracts.js?v=runtime-contracts-v2");
const keyboardIndex = indexHtml.indexOf("core/keyboard-shortcuts.js?v=keyboard-v4");
const appIndex = indexHtml.indexOf("app.js?v=runtime-v33");
assert.equal(
  layoutProfilesIndex >= 0
    && stylesIndex > layoutProfilesIndex
    && hierarchyDefaultsIndex > stylesIndex
    && flowModelIndex > hierarchyDefaultsIndex
    && presentationIndex > flowModelIndex
    && presentationPolicyIndex > presentationIndex
    && flowLayoutIndex > presentationPolicyIndex
    && runtimeContractIndex > flowLayoutIndex
    && keyboardIndex > runtimeContractIndex
    && appIndex > keyboardIndex,
  true,
  "layout profile bootstraps before CSS; hierarchy, flow, presentation, runtime migration, keyboard behavior and app then load in explicit order"
);
assert.match(stylesCss, /#alignmentGrid\s*\{\s*z-index:\s*840;\s*\}/, "alignment grid stack contract lives in CSS");
assert.match(stylesCss, /#sceneHotspots\s*\{\s*z-index:\s*860;\s*\}/, "hotspot stack contract lives in CSS");
assert.match(stylesCss, /#selectionFrame\s*\{\s*z-index:\s*900;\s*\}/, "selection stack contract lives in CSS");

console.log("runtime contracts: PASS");
