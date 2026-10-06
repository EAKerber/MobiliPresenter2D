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
const configuration = require(path.join(projectRoot, "core/configuration.js"));
const flow = require(path.join(projectRoot, "core/flow-model.js"));
const hierarchy = require(path.join(projectRoot, "core/hierarchy-administration.js"));

const v3 = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
const v4 = hierarchy.upgradeToHierarchy(v3, configuration, flow, catalog, priceBook, scene);

assert.equal(
  hierarchy.normalizePublishedAdministration(v3, configuration, catalog, priceBook, scene).schemaVersion,
  configuration.SCHEMA,
  "dual-schema publication normalizer preserves valid v3"
);
assert.equal(
  hierarchy.normalizePublishedAdministration(v4, configuration, catalog, priceBook, scene).schemaVersion,
  hierarchy.SCHEMA,
  "dual-schema publication normalizer accepts validated v4"
);
assert.equal(
  hierarchy.migrationSemanticSignature(v3),
  hierarchy.migrationSemanticSignature(v4),
  "deterministic v3 -> v4 upgrade preserves migration semantics"
);

const hierarchyOnlyChange = structuredClone(v4);
hierarchyOnlyChange.stages.find((stage) => stage.id === "finishes").groups.reverse();
assert.equal(
  hierarchy.migrationSemanticSignature(v3),
  hierarchy.migrationSemanticSignature(hierarchyOnlyChange),
  "group structure itself is excluded from migration semantic identity"
);

const semanticPriceChange = structuredClone(v4);
semanticPriceChange.pricing.entries["module-01"] += 1;
assert.notEqual(
  hierarchy.migrationSemanticSignature(v3),
  hierarchy.migrationSemanticSignature(semanticPriceChange),
  "pricing changes are detected by migration semantic identity"
);

const semanticMembershipChange = structuredClone(v4);
const serviceSection = semanticMembershipChange.stages.find((stage) => stage.id === "services").groups[0].sections.find((section) => section.id === "additional-services");
serviceSection.itemIds = serviceSection.itemIds.filter((id) => id !== "move-stone");
assert.notEqual(
  hierarchy.migrationSemanticSignature(v3),
  hierarchy.migrationSemanticSignature(semanticMembershipChange),
  "stage item membership changes are detected by migration semantic identity"
);

assert.equal(v4.schemaVersion, "ConfiguratorAdministration2D 4.0");
assert.equal(v4.stages.some((stage) => Object.hasOwn(stage, "items")), false, "v4 has no parallel flat stage.items authority");
assert.deepEqual(v4.stages.map((stage) => stage.id), ["modules", "finishes", "services", "summary"]);

const finishes = v4.stages.find((stage) => stage.id === "finishes");
assert.deepEqual(finishes.groups.map((group) => group.id), ["cabinet-finishes", "stone"]);
assert.deepEqual(finishes.groups[0].sections.map((section) => section.id), ["fronts", "handles"]);
assert.deepEqual(finishes.groups[1].sections.map((section) => section.id), ["stone-packages", "stone-skirting"]);
assert.equal(finishes.groups[0].columnSpan, 1);
assert.equal(finishes.groups[0].sections[0].presentation, "swatches");
assert.equal(finishes.groups[0].sections[1].presentation, "grid");

const services = v4.stages.find((stage) => stage.id === "services");
assert.deepEqual(services.groups[0].sections.map((section) => ({
  id: section.id,
  itemIds: section.itemIds,
  presentation: section.presentation
})), [
  { id: "lighting", itemIds: ["lighting-08"], presentation: "list" },
  { id: "additional-services", itemIds: ["move-stone", "tempered-glass"], presentation: "list" }
]);

assert.deepEqual(hierarchy.validateHierarchyAdministration(v4, configuration, catalog, priceBook, scene), []);
assert.equal(
  hierarchy.hierarchySignature(
    hierarchy.upgradeToHierarchy(v3, configuration, flow, catalog, priceBook, scene)
  ),
  hierarchy.hierarchySignature(v4),
  "v3 migration is deterministic"
);

const projected = hierarchy.projectHierarchyToLegacy(v4, configuration, flow, catalog, priceBook, scene);
assert.equal(projected.ok, true);
assert.equal(projected.value.schemaVersion, configuration.SCHEMA);
assert.deepEqual(projected.value.stages, v3.stages, "legacy-equivalent hierarchy projects to the same stage model");

const unrelated = structuredClone(v4);
unrelated.objects["module-01"].title = "Título de teste";
unrelated.pricing.entries["module-01"] += 100;
const unrelatedProjection = hierarchy.projectHierarchyToLegacy(unrelated, configuration, flow, catalog, priceBook, scene);
assert.equal(unrelatedProjection.ok, true, "unrelated administration edits remain projectable to v3");
assert.equal(unrelatedProjection.value.objects["module-01"].title, "Título de teste");
assert.equal(unrelatedProjection.value.pricing.entries["module-01"], v3.pricing.entries["module-01"] + 100);

const reorderedGroups = structuredClone(v4);
reorderedGroups.stages.find((stage) => stage.id === "finishes").groups.reverse();
assert.equal(
  hierarchy.projectHierarchyToLegacy(reorderedGroups, configuration, flow, catalog, priceBook, scene).code,
  "hierarchy_requires_publication",
  "group reorder cannot be silently flattened to v3"
);

const movedSection = structuredClone(v4);
const movedFinishes = movedSection.stages.find((stage) => stage.id === "finishes");
const handles = movedFinishes.groups[0].sections.pop();
movedFinishes.groups[1].sections.unshift(handles);
assert.equal(
  hierarchy.projectHierarchyToLegacy(movedSection, configuration, flow, catalog, priceBook, scene).code,
  "hierarchy_requires_publication",
  "section movement cannot be silently flattened to v3"
);

const changedPresentation = structuredClone(v4);
changedPresentation.stages.find((stage) => stage.id === "finishes").groups[0].sections[1].presentation = "list";
assert.equal(
  hierarchy.projectHierarchyToLegacy(changedPresentation, configuration, flow, catalog, priceBook, scene).code,
  "hierarchy_requires_publication",
  "presentation changes require hierarchy publication"
);

const reorderedServices = structuredClone(v4);
reorderedServices.stages.find((stage) => stage.id === "services").groups[0].sections
  .find((section) => section.id === "additional-services").itemIds.reverse();
const serviceProjection = hierarchy.projectHierarchyToLegacy(reorderedServices, configuration, flow, catalog, priceBook, scene);
assert.equal(serviceProjection.ok, true, "item order that v3 can represent projects losslessly");
const serviceStage = serviceProjection.value.stages.find((stage) => stage.id === "services");
assert.deepEqual(serviceStage.items, ["lighting-08", "tempered-glass", "move-stone"]);
const serviceRoundTrip = hierarchy.upgradeToHierarchy(serviceProjection.value, configuration, flow, catalog, priceBook, scene);
assert.deepEqual(
  serviceRoundTrip.stages.find((stage) => stage.id === "services").groups[0].sections
    .find((section) => section.id === "additional-services").itemIds,
  ["tempered-glass", "move-stone"]
);

const duplicateOwner = structuredClone(v4);
duplicateOwner.stages.find((stage) => stage.id === "services").groups[0].sections[0].itemIds.push("move-stone");
assert.ok(
  hierarchy.validateHierarchyAdministration(duplicateOwner, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("item assigned more than once: move-stone")),
  "one item cannot be owned by multiple sections"
);

const mixedBehavior = structuredClone(v4);
mixedBehavior.stages.find((stage) => stage.id === "services").groups[0].sections[0].itemIds.push("fronts-all");
assert.ok(
  hierarchy.validateHierarchyAdministration(mixedBehavior, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("mixed interaction behavior")),
  "a section cannot mix incompatible interaction semantics"
);

const invalidPresentation = structuredClone(v4);
invalidPresentation.stages.find((stage) => stage.id === "finishes").groups[0].sections[0].presentation = "raw-css";
assert.ok(
  hierarchy.validateHierarchyAdministration(invalidPresentation, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("invalid section presentation")),
  "presentation uses a closed vocabulary"
);

const embeddedData = JSON.stringify(v4.stages);
assert.equal(embeddedData.includes('"price"'), false);
assert.equal(embeddedData.includes('"description"'), false);
assert.equal(embeddedData.includes('"textureAsset"'), false);

const runtimeFlow = flow.normalizeFlow(v4, configuration.itemRegistry(catalog));
assert.deepEqual(
  runtimeFlow.stages.find((stage) => stage.id === "finishes").groups.map((group) => group.id),
  ["cabinet-finishes", "stone"],
  "runtime flow consumes v4 group order directly"
);
assert.deepEqual(
  runtimeFlow.stages.find((stage) => stage.id === "services").groups[0].sections.map((section) => ({
    id: section.id,
    presentation: section.presentation,
    itemIds: section.itemIds
  })),
  [
    { id: "lighting", presentation: "list", itemIds: ["lighting-08"] },
    { id: "additional-services", presentation: "list", itemIds: ["move-stone", "tempered-glass"] }
  ],
  "runtime flow consumes v4 section hierarchy without re-deriving DOM semantics"
);

const endpointSource = fs.readFileSync(path.resolve(projectRoot, "../netlify/functions/configuration.mjs"), "utf8");
assert.equal(endpointSource.includes('payload?.schemaVersion === "ConfiguratorAdministration2D 4.0"'), true, "server recognizes hierarchy payloads explicitly");
assert.equal(endpointSource.includes('error: "hierarchy_publication_required"'), true, "server fails closed before hierarchy publication is authorized");

console.log("hierarchy administration: PASS");
