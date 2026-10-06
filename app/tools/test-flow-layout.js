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
const layout = require(path.join(projectRoot, "core/flow-layout.js"));

const administration = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
const flow = flowCore.normalizeFlow(administration, configuration.itemRegistry(catalog), hierarchyDefaults);

const finishes = layout.stageLayout(flow, "finishes");
assert.deepEqual(finishes.groups.map((group) => ({ id: group.id, span: group.span })), [
  { id: "cabinet-finishes", span: 1 },
  { id: "stone", span: 1 }
]);
assert.deepEqual(layout.semanticSectionIds(finishes), ["fronts", "handles", "stone-packages", "stone-skirting"]);
assert.deepEqual(layout.semanticItemIds(finishes), ["fronts-all", "handles-all", "stone-all", "stone-skirting"]);
assert.deepEqual(
  finishes.groups.flatMap((group) => group.sections.map((section) => [section.id, section.component])),
  [
    ["fronts", "choice-swatches"],
    ["handles", "choice-grid"],
    ["stone-packages", "choice-cards"],
    ["stone-skirting", "toggle-list"]
  ]
);

const services = layout.stageLayout(flow, "services");
assert.deepEqual(services.groups.map((group) => ({ id: group.id, span: group.span })), [
  { id: "services", span: 2 }
]);
assert.deepEqual(layout.semanticSectionIds(services), ["lighting", "additional-services"]);
assert.deepEqual(services.groups[0].sections.map((section) => section.component), ["toggle-list", "toggle-list"]);

const modules = layout.stageLayout(flow, "modules");
assert.deepEqual(modules.groups.map((group) => ({ id: group.id, span: group.span })), [
  { id: "modules-main", span: 2 }
]);
assert.equal(modules.groups[0].sections[0].component, "selection-list");
assert.equal(layout.stageLayout(flow, "summary").groups[0].sections[0].component, "action-list");

const moduleViews = layout.moduleViewLayout(flow);
assert.equal(moduleViews.error, null);
assert.deepEqual(moduleViews.semanticSectionIds, ["modules"]);
assert.deepEqual(moduleViews.panes, [
  { id: "detail", role: "context", sourceSectionId: "modules" },
  { id: "list", role: "items", sourceSectionId: "modules", component: "selection-list" }
]);
assert.equal(new Set(moduleViews.itemIds).size, moduleViews.itemIds.length, "module semantic ownership remains unique");
assert.equal(moduleViews.panes.every((pane) => pane.sourceSectionId === "modules"), true, "two views project one semantic section instead of duplicating ownership");

assert.deepEqual(
  layout.validateBindings(finishes, {
    groupIds: ["cabinet-finishes", "stone"],
    sectionIds: ["fronts", "handles", "stone-packages", "stone-skirting"],
    sectionComponents: {
      fronts: "choice-swatches",
      handles: "choice-grid",
      "stone-packages": "choice-cards",
      "stone-skirting": "toggle-list"
    }
  }),
  [],
  "complete renderer bindings satisfy the layout plan"
);
assert.ok(
  layout.validateBindings(finishes, {
    groupIds: ["cabinet-finishes"],
    sectionIds: ["fronts", "handles"]
  }).some((error) => error.code === "missing-group-binding" && error.groupId === "stone"),
  "missing group renderer bindings are detectable"
);
assert.ok(
  layout.validateBindings(finishes, {
    groupIds: ["cabinet-finishes", "stone"],
    sectionIds: ["fronts", "handles", "stone-packages"]
  }).some((error) => error.code === "missing-section-binding" && error.sectionId === "stone-skirting"),
  "missing section renderer bindings are detectable"
);


assert.ok(
  layout.validateBindings(finishes, {
    groupIds: ["cabinet-finishes", "stone"],
    sectionIds: ["fronts", "handles", "stone-packages", "stone-skirting"],
    sectionComponents: {
      fronts: "choice-swatches",
      handles: "choice-cards",
      "stone-packages": "choice-cards",
      "stone-skirting": "toggle-list"
    }
  }).some((error) => error.code === "component-binding-mismatch" && error.sectionId === "handles"),
  "renderer component mismatches fail closed"
);
assert.ok(
  layout.validateBindings(finishes, {
    groupIds: ["cabinet-finishes", "stone"],
    sectionIds: ["fronts", "handles", "stone-packages", "stone-skirting"],
    sectionComponents: {
      fronts: "choice-swatches",
      handles: "choice-grid",
      "stone-packages": "choice-cards"
    }
  }).some((error) => error.code === "missing-component-binding" && error.sectionId === "stone-skirting"),
  "missing executable component bindings are detectable"
);

console.log("flow layout: PASS");
