const assert = require("node:assert/strict");

const catalog = require("../data/catalog-data.js");
const defaults = require("../data/configurator-settings.js");
const priceBook = require("../data/mock-price-book.js");
const scene = require("../data/scene-data.js");
const configuration = require("../core/configuration.js");
const flowCore = require("../core/flow-model.js");

const administration = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
const registry = configuration.itemRegistry(catalog);
const flow = flowCore.normalizeFlow(administration, registry);

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
assert.equal(JSON.stringify(flowCore.normalizeFlow(administration, registry)), JSON.stringify(flow), "normalization is deterministic");

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
  () => flowCore.normalizeFlow(unknown, registry),
  (error) => error.name === "FlowModelValidationError"
    && error.validationErrors.some((entry) => entry.code === "unknown-source-item"),
  "unknown v3 items fail closed"
);

const unsupported = structuredClone(administration);
unsupported.stages.find((entry) => entry.id === "modules").items =
  unsupported.stages.find((entry) => entry.id === "modules").items.filter((id) => id !== "module-01");
unsupported.stages.find((entry) => entry.id === "services").items.push("module-01");
assert.throws(
  () => flowCore.normalizeFlow(unsupported, registry),
  (error) => error.name === "FlowModelValidationError"
    && error.validationErrors.some((entry) => entry.code === "unsupported-stage-item"),
  "known but semantically unsupported v3 placement fails closed instead of guessing"
);

const duplicateStage = structuredClone(administration);
duplicateStage.stages.push(structuredClone(duplicateStage.stages[0]));
assert.throws(
  () => flowCore.normalizeFlow(duplicateStage, registry),
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
const customFlow = flowCore.normalizeFlow(custom, registry);
assert.deepEqual(
  customFlow.stages.find((entry) => entry.id === "installation").groups[0].sections[0],
  { id: "items", order: 0, behavior: "toggle", keyboard: true, itemIds: ["move-stone"] },
  "custom v3 stages normalize deterministically without product-data duplication"
);

console.log("flow model: PASS");
