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
const presentationPolicy = require(path.join(projectRoot, "data/presentation-policy-defaults.js"));
const configuration = require(path.join(projectRoot, "core/configuration.js"));
const flow = require(path.join(projectRoot, "core/flow-model.js"));
const hierarchyV4 = require(path.join(projectRoot, "core/hierarchy-administration.js"));
const v5Core = require(path.join(projectRoot, "core/administration-v5.js"));

const v3 = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
const v4 = hierarchyV4.upgradeToHierarchy(v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
const v5 = v5Core.upgrade(v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);

assert.equal(v5Core.SCHEMA, "ConfiguratorAdministration2D 5.0");
assert.equal(v5Core.PREVIOUS_SCHEMA, "ConfiguratorAdministration2D 4.0");
assert.equal(v5.schemaVersion, v5Core.SCHEMA);
assert.deepEqual(v5.presentationPolicy, presentationPolicy, "v5 carries the validated presentation policy");

const sections = v5.stages.flatMap((stage) => stage.groups.flatMap((group) => group.sections));
assert.equal(sections.every((section) => typeof section.component === "string"), true, "every v5 section has an explicit component");
assert.equal(sections.some((section) => Object.hasOwn(section, "presentation")), false, "v5 has no parallel legacy section presentation field");

const finishes = v5.stages.find((stage) => stage.id === "finishes");
assert.deepEqual(
  finishes.groups.flatMap((group) => group.sections.map((section) => [section.id, section.component])),
  [
    ["fronts", "choice-swatches"],
    ["handles", "choice-grid"],
    ["stone-packages", "choice-cards"],
    ["stone-skirting", "toggle-list"]
  ],
  "legacy presentation values become explicit executable components"
);
assert.equal(v5.stages.find((stage) => stage.id === "modules").groups[0].sections[0].component, "selection-list");
assert.equal(v5.stages.find((stage) => stage.id === "summary").groups[0].sections[0].component, "action-list");

assert.deepEqual(v5Core.validate(v5, configuration, catalog, priceBook, scene), []);
assert.equal(
  v5Core.publicationSignature(v5Core.upgrade(v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults)),
  v5Core.publicationSignature(v5),
  "v3 -> v5 migration is deterministic"
);
assert.equal(
  JSON.stringify(v5Core.normalize(v5Core.normalize(v5))),
  JSON.stringify(v5Core.normalize(v5)),
  "v5 normalization is idempotent"
);

const v5FromV4 = v5Core.upgrade(v4, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
assert.equal(v5FromV4.schemaVersion, v5Core.SCHEMA);
assert.deepEqual(
  v5FromV4.stages.map((stage) => stage.id),
  v5.stages.map((stage) => stage.id),
  "historical v4 imports preserve stage identity/order"
);
assert.deepEqual(
  v5FromV4.stages.find((stage) => stage.id === "finishes").groups.map((group) => group.id),
  finishes.groups.map((group) => group.id),
  "historical v4 imports preserve group structure"
);
assert.equal(
  v5Core.publicationSignature(v5FromV4),
  v5Core.publicationSignature(v5),
  "default v3 and historical v4 converge to the same v5 publication contract"
);

assert.equal(v5.materials.find((material) => material.id === "stone-existing").color, null, "v5 preserves explicit null authored stone color");
assert.equal(v5.materials.find((material) => material.id === "stone-light-sink").color, null, "v5 preserves second null authored stone color");

const invalidComponent = structuredClone(v5);
invalidComponent.stages.find((stage) => stage.id === "finishes").groups[0].sections[0].component = "raw-css";
assert.ok(
  v5Core.validate(invalidComponent, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("invalid section component")),
  "unknown v5 component fails closed"
);

const missingComponent = structuredClone(v5);
delete missingComponent.stages.find((stage) => stage.id === "finishes").groups[0].sections[0].component;
assert.ok(
  v5Core.validate(missingComponent, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("invalid section component")),
  "missing v5 component fails closed"
);

const legacyField = structuredClone(v5);
legacyField.stages.find((stage) => stage.id === "finishes").groups[0].sections[0].presentation = "swatches";
assert.ok(
  v5Core.validate(legacyField, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("legacy section presentation is not allowed")),
  "v5 rejects parallel legacy presentation authority"
);

const componentMismatch = structuredClone(v5);
componentMismatch.stages.find((stage) => stage.id === "services").groups[0].sections[0].component = "selection-list";
assert.ok(
  v5Core.validate(componentMismatch, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("component behavior mismatch")),
  "component behavior must match semantic section behavior"
);

const missingPolicy = structuredClone(v5);
delete missingPolicy.presentationPolicy;
assert.ok(
  v5Core.validate(missingPolicy, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("presentation policy is required")),
  "presentation policy is required"
);

const invalidPolicy = structuredClone(v5);
invalidPolicy.presentationPolicy.scene.pip.availableProfiles.push("tablet");
assert.ok(
  v5Core.validate(invalidPolicy, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("unsupported layout profile")),
  "invalid presentation policy fails closed"
);

const duplicateOwner = structuredClone(v5);
duplicateOwner.stages.find((stage) => stage.id === "services").groups[0].sections[0].itemIds.push("move-stone");
assert.ok(
  v5Core.validate(duplicateOwner, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("item assigned more than once: move-stone")),
  "duplicate semantic ownership still fails"
);

const mixedBehavior = structuredClone(v5);
mixedBehavior.stages.find((stage) => stage.id === "services").groups[0].sections[0].itemIds.push("fronts-all");
assert.ok(
  v5Core.validate(mixedBehavior, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("mixed interaction behavior")),
  "mixed semantic behavior still fails"
);

const projected = v5Core.projectToLegacy(v5, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
assert.equal(projected.ok, true, "untouched v5 candidate remains losslessly projectable to published v3");
assert.deepEqual(projected.value.stages, v3.stages, "v3 -> v5 -> v3 preserves current stage payload");

const unrelated = structuredClone(v5);
unrelated.objects["module-01"].title = "Título v5";
unrelated.pricing.entries["module-01"] += 100;
const unrelatedProjection = v5Core.projectToLegacy(unrelated, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
assert.equal(unrelatedProjection.ok, true, "non-hierarchy edit remains safely projectable");
assert.equal(unrelatedProjection.value.objects["module-01"].title, "Título v5");
assert.equal(unrelatedProjection.value.pricing.entries["module-01"], v3.pricing.entries["module-01"] + 100);

const reorderedGroups = structuredClone(v5);
reorderedGroups.stages.find((stage) => stage.id === "finishes").groups.reverse();
assert.equal(
  v5Core.projectToLegacy(reorderedGroups, configuration, flow, catalog, priceBook, scene, hierarchyDefaults).code,
  "hierarchy_requires_publication",
  "group reorder cannot flatten to v3"
);

const changedComponent = structuredClone(v5);
changedComponent.stages.find((stage) => stage.id === "finishes").groups[0].sections[1].component = "selection-list";
assert.equal(
  v5Core.projectToLegacy(changedComponent, configuration, flow, catalog, priceBook, scene, hierarchyDefaults).code,
  "hierarchy_requires_publication",
  "component change cannot flatten to v3"
);

const changedPolicy = structuredClone(v5);
changedPolicy.presentationPolicy.scene.pip.activationByProfile.stacked = "auto-after-anchor";
assert.equal(
  v5Core.projectToLegacy(changedPolicy, configuration, flow, catalog, priceBook, scene, hierarchyDefaults).code,
  "hierarchy_requires_publication",
  "presentation policy change cannot flatten to v3"
);

const explicitNull = structuredClone(v5);
explicitNull.materials.find((material) => material.id === "stone-cloud").color = null;
const nullProjection = v5Core.projectToLegacy(explicitNull, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
assert.equal(nullProjection.ok, true, "explicit material null remains losslessly representable in v3");
assert.equal(nullProjection.value.materials.find((material) => material.id === "stone-cloud").color, null);

const runtimeFlow = flow.normalizeFlow(v5, configuration.itemRegistry(catalog), hierarchyDefaults);
assert.equal(
  runtimeFlow.stages.find((stage) => stage.id === "finishes").groups[0].sections[1].component,
  "choice-grid",
  "normalized flow preserves the v5 executable component"
);

const endpointSource = fs.readFileSync(path.resolve(projectRoot, "../netlify/functions/configuration.mjs"), "utf8");
assert.equal(endpointSource.includes('"ConfiguratorAdministration2D 4.0", "ConfiguratorAdministration2D 5.0"'), true, "server explicitly recognizes both blocked hierarchy schemas");
assert.equal(endpointSource.includes('error: "hierarchy_publication_required"'), true, "server keeps hierarchy publication fail-closed");
assert.equal(endpointSource.includes('operation === "persist-handles-all"'), true, "isolated v3 Puxadores repair remains available");

console.log("administration v5: PASS");
