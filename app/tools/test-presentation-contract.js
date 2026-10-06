const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const presentation = require(path.join(projectRoot, "core/presentation-contract.js"));

assert.equal(presentation.SCHEMA, "ConfiguratorPresentation2D 1.0");
assert.deepEqual(presentation.COMPONENTS, [
  "choice-swatches",
  "choice-grid",
  "choice-cards",
  "selection-list",
  "toggle-list",
  "action-list"
]);

assert.equal(presentation.resolveSectionComponent({ presentation: "swatches", behavior: "selection" }), "choice-swatches");
assert.equal(presentation.resolveSectionComponent({ presentation: "grid", behavior: "selection" }), "choice-grid");
assert.equal(presentation.resolveSectionComponent({ presentation: "cards", behavior: "selection" }), "choice-cards");
assert.equal(presentation.resolveSectionComponent({ presentation: "list", behavior: "selection" }), "selection-list");
assert.equal(presentation.resolveSectionComponent({ presentation: "list", behavior: "toggle" }), "toggle-list");
assert.equal(presentation.resolveSectionComponent({ presentation: "auto", behavior: "action" }), "action-list");
assert.equal(presentation.resolveSectionComponent({ component: "choice-grid", presentation: "raw-css", behavior: "selection" }), "choice-grid");

assert.throws(
  () => presentation.resolveSectionComponent({ presentation: "raw-css", behavior: "selection" }),
  /unsupported legacy presentation/
);
assert.throws(
  () => presentation.resolveSectionComponent({ presentation: "list", behavior: "mystery" }),
  /unsupported presentation behavior/
);
assert.throws(
  () => presentation.resolveSectionComponent({ component: "puxadores-ui", behavior: "selection" }),
  /unsupported presentation component/
);

const sandbox = { window: {} };
vm.createContext(sandbox);
["data/scene-data.js", "data/catalog-data.js", "data/mock-price-book.js"].forEach((relativePath) => {
  vm.runInContext(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"), sandbox, { filename: relativePath });
});
const catalog = sandbox.window.CASA_EM_MODULOS_CATALOG;
const priceBook = sandbox.window.CASA_EM_MODULOS_PRICE_BOOK;
const scene = sandbox.window.CASA_EM_MODULOS_SCENE;
const defaults = require(path.join(projectRoot, "data/configurator-settings.js"));
const hierarchyDefaults = require(path.join(projectRoot, "data/hierarchy-defaults.js"));
const configuration = require(path.join(projectRoot, "core/configuration.js"));
const flowCore = require(path.join(projectRoot, "core/flow-model.js"));
const flowLayout = require(path.join(projectRoot, "core/flow-layout.js"));

const administration = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
const flow = flowCore.normalizeFlow(administration, configuration.itemRegistry(catalog), hierarchyDefaults);
const components = Object.fromEntries(
  flowLayout.stageLayouts(flow).flatMap((stage) =>
    stage.groups.flatMap((group) => group.sections.map((section) => [
      stage.id + "/" + section.id,
      section.component
    ]))
  )
);
assert.deepEqual(components, {
  "modules/modules": "selection-list",
  "finishes/fronts": "choice-swatches",
  "finishes/handles": "choice-grid",
  "finishes/stone-packages": "choice-cards",
  "finishes/stone-skirting": "toggle-list",
  "services/lighting": "toggle-list",
  "services/additional-services": "toggle-list",
  "summary/summary": "action-list"
});

const custom = structuredClone(administration);
const services = custom.stages.find((stage) => stage.id === "services");
services.items = services.items.filter((id) => id !== "move-stone");
custom.stages.splice(3, 0, {
  id: "installation",
  kind: "custom",
  label: "Instalação",
  enabled: true,
  items: ["move-stone"]
});
const customFlow = flowCore.normalizeFlow(custom, configuration.itemRegistry(catalog), hierarchyDefaults);
assert.equal(
  flowLayout.stageLayout(customFlow, "installation").groups[0].sections[0].component,
  "toggle-list",
  "custom toggle sections resolve through the same executable presentation contract"
);

console.log("presentation contract: PASS");
