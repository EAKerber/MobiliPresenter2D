const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
[
  "data/scene-data.js",
  "data/catalog-data.js",
  "data/mock-price-book.js"
].forEach((relativePath) => {
  vm.runInContext(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"), sandbox, { filename: relativePath });
});

const catalog = sandbox.window.CASA_EM_MODULOS_CATALOG;
const priceBook = sandbox.window.CASA_EM_MODULOS_PRICE_BOOK;
const scene = sandbox.window.CASA_EM_MODULOS_SCENE;
const defaults = require(path.join(projectRoot, "data/configurator-settings.js"));
const hierarchyDefaults = require(path.join(projectRoot, "data/hierarchy-defaults.js"));
const configuration = require(path.join(projectRoot, "core/configuration.js"));
const flowCore = require(path.join(projectRoot, "core/flow-model.js"));

const administration = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
const registry = configuration.itemRegistry(catalog);
const flow = flowCore.normalizeFlow(administration, registry, hierarchyDefaults);

assert.equal(flow.schemaVersion, "NormalizedConfiguratorFlow 1.0");
assert.deepEqual(flow.stages.map((stage) => stage.id), ["modules", "finishes", "services", "summary"]);
assert.deepEqual(flow.stages.map((stage) => stage.order), [0, 1, 2, 3]);

const stage = (id) => flow.stages.find((entry) => entry.id === id);
const sections = (id) => stage(id).groups.flatMap((group) => group.sections);

assert.deepEqual(stage("modules").groups.map((group) => group.id), ["modules-main"]);
assert.deepEqual(sections("modules").map((entry) => ({
  id: entry.id,
  behavior: entry.behavior,
  keyboard: entry.keyboard,
  itemIds: entry.itemIds
})), [{
  id: "modules",
  behavior: "selection",
  keyboard: false,
  itemIds: defaults.stages.find((entry) => entry.id === "modules").items
}]);

assert.deepEqual(stage("finishes").groups.map((group) => group.id), ["cabinet-finishes", "stone"]);
assert.deepEqual(sections("finishes").map((entry) => ({
  id: entry.id,
  behavior: entry.behavior,
  keyboard: entry.keyboard,
  itemIds: entry.itemIds
})), [
  { id: "fronts", behavior: "selection", keyboard: true, itemIds: ["fronts-all"] },
  { id: "handles", behavior: "selection", keyboard: true, itemIds: ["handles-all"] },
  { id: "stone-packages", behavior: "selection", keyboard: true, itemIds: ["stone-all"] },
  { id: "stone-skirting", behavior: "toggle", keyboard: true, itemIds: ["stone-skirting"] }
]);

assert.deepEqual(stage("services").groups.map((group) => group.id), ["services"]);
assert.deepEqual(sections("services").map((entry) => ({
  id: entry.id,
  behavior: entry.behavior,
  keyboard: entry.keyboard,
  itemIds: entry.itemIds
})), [
  { id: "lighting", behavior: "toggle", keyboard: true, itemIds: ["lighting-08"] },
  { id: "additional-services", behavior: "toggle", keyboard: true, itemIds: ["move-stone", "tempered-glass"] }
]);

assert.deepEqual(sections("summary").map((entry) => ({
  id: entry.id,
  behavior: entry.behavior,
  keyboard: entry.keyboard,
  itemIds: entry.itemIds
})), [
  { id: "summary", behavior: "action", keyboard: false, itemIds: ["summary"] }
]);

assert.equal(Object.isFrozen(flow), true, "normalized flow is immutable");
assert.equal(Object.isFrozen(stage("finishes").groups[0].sections[0].itemIds), true, "nested normalized flow data is immutable");
assert.equal(JSON.stringify(flowCore.normalizeFlow(administration, registry, hierarchyDefaults)), JSON.stringify(flow), "normalization is deterministic");

assert.equal(flowCore.itemAvailable(flow, "handles-all"), true, "enabled semantic items are available");
assert.equal(flowCore.stageOwns(flow, "finishes", "handles-all"), true, "stage ownership is structural");
assert.equal(flowCore.stageOwns(flow, "services", "handles-all"), false, "stage ownership respects the owning stage");
assert.equal(flowCore.itemAvailable(flow, "not-a-real-item"), false, "unknown items are unavailable");

const allowedKeys = new Set([
  "schemaVersion", "source", "revision", "stages",
  "id", "kind", "label", "enabled", "order", "groups",
  "presentation", "layout", "span", "sections",
  "behavior", "keyboard", "itemIds"
]);
function assertOnlyFlowKeys(value) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertOnlyFlowKeys);
    return;
  }
  Object.keys(value).forEach((key) => assert.equal(allowedKeys.has(key), true, `flow must not duplicate product/business field: ${key}`));
  Object.values(value).forEach(assertOnlyFlowKeys);
}
assertOnlyFlowKeys(flow);
assert.equal(JSON.stringify(flow).includes('"pricing"'), false);
assert.equal(JSON.stringify(flow).includes('"objects"'), false);
assert.equal(JSON.stringify(flow).includes('"materials"'), false);

const unknown = structuredClone(administration);
unknown.stages.find((entry) => entry.id === "services").items.push("unknown-service");
assert.throws(
  () => flowCore.normalizeFlow(unknown, registry, hierarchyDefaults),
  (error) => error.name === "FlowModelValidationError"
    && error.validationErrors.some((entry) => entry.code === "unknown-source-item"),
  "unknown v3 items fail closed"
);

const unsupported = structuredClone(administration);
unsupported.stages.find((entry) => entry.id === "modules").items =
  unsupported.stages.find((entry) => entry.id === "modules").items.filter((id) => id !== "module-01");
unsupported.stages.find((entry) => entry.id === "services").items.push("module-01");
assert.throws(
  () => flowCore.normalizeFlow(unsupported, registry, hierarchyDefaults),
  (error) => error.name === "FlowModelValidationError"
    && error.validationErrors.some((entry) => entry.code === "unsupported-stage-item"),
  "known but semantically unsupported v3 placement fails closed instead of guessing"
);

const duplicateStage = structuredClone(administration);
duplicateStage.stages.push(structuredClone(duplicateStage.stages[0]));
assert.throws(
  () => flowCore.normalizeFlow(duplicateStage, registry, hierarchyDefaults),
  (error) => error.name === "FlowModelValidationError"
    && error.validationErrors.some((entry) => entry.code === "duplicate-source-stage"),
  "duplicate source stages are rejected"
);

const duplicateSection = structuredClone(flow);
duplicateSection.stages.find((entry) => entry.id === "finishes").groups[0].sections.push({
  id: "fronts",
  order: 1,
  behavior: "selection",
  keyboard: true,
  itemIds: ["handles-all"]
});
assert.equal(
  flowCore.validateFlow(duplicateSection, registry).some((entry) => entry.code === "duplicate-section"),
  true,
  "duplicate normalized sections are rejected"
);

const missingReference = structuredClone(flow);
missingReference.stages.find((entry) => entry.id === "finishes").groups[0].sections[0].itemIds = ["not-a-real-item"];
assert.equal(
  flowCore.validateFlow(missingReference, registry).some((entry) => entry.code === "unknown-item"),
  true,
  "normalized item references must resolve"
);

const missingCoverage = structuredClone(flow);
missingCoverage.stages.find((entry) => entry.id === "finishes").groups[0].sections =
  missingCoverage.stages.find((entry) => entry.id === "finishes").groups[0].sections.filter((entry) => entry.id !== "handles");
assert.equal(
  flowCore.validateSourceCoverage(missingCoverage, administration).some((entry) => entry.code === "missing-source-item"),
  true,
  "source items cannot disappear from the normalized hierarchy"
);

const custom = structuredClone(administration);
const serviceStage = custom.stages.find((entry) => entry.id === "services");
serviceStage.items = serviceStage.items.filter((id) => id !== "move-stone");
custom.stages.splice(3, 0, {
  id: "installation",
  kind: "custom",
  label: "Instalação",
  enabled: true,
  items: ["move-stone"]
});
const customFlow = flowCore.normalizeFlow(custom, registry, hierarchyDefaults);

assert.equal(flowCore.itemAvailable(customFlow, "move-stone"), true, "moving an item between enabled stages preserves availability");
assert.equal(flowCore.stageOwns(customFlow, "services", "move-stone"), false, "moved item no longer belongs to its former stage");
assert.equal(flowCore.stageOwns(customFlow, "installation", "move-stone"), true, "moved item belongs to its new custom stage");

const disabledCustom = structuredClone(custom);
disabledCustom.stages.find((entry) => entry.id === "installation").enabled = false;
const disabledCustomFlow = flowCore.normalizeFlow(disabledCustom, registry, hierarchyDefaults);
assert.equal(flowCore.stageOwns(disabledCustomFlow, "installation", "move-stone"), true, "disabled stages retain structural ownership");
assert.equal(flowCore.itemAvailable(disabledCustomFlow, "move-stone"), false, "disabled stage ownership does not imply runtime availability");
assert.deepEqual(
  customFlow.stages.find((entry) => entry.id === "installation").groups[0].sections[0],
  {
    id: "items",
    label: "Opções",
    order: 0,
    behavior: "toggle",
    keyboard: true,
    presentation: "list",
    itemIds: ["move-stone"]
  },
  "custom v3 stages normalize deterministically from hierarchy defaults"
);

const alternateDefaults = structuredClone(hierarchyDefaults);
alternateDefaults.stages.finishes.groups[0].sections.reverse();
const alternateFlow = flowCore.normalizeFlow(administration, registry, alternateDefaults);
assert.deepEqual(
  alternateFlow.stages.find((entry) => entry.id === "finishes").groups[0].sections.map((entry) => entry.id),
  ["handles", "fronts"],
  "legacy section order is controlled by hierarchy defaults"
);

console.log("flow model: PASS");
