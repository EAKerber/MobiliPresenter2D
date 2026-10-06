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
const editor = require(path.join(projectRoot, "core/hierarchy-editor.js"));

const v3 = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
const base = hierarchy.upgradeToHierarchy(v3, configuration, flow, catalog, priceBook, scene);
const originalSignature = hierarchy.hierarchySignature(base);

const movedGroup = editor.moveGroup(base, "finishes", "stone", -1);
assert.deepEqual(movedGroup.stages.find(stage => stage.id === "finishes").groups.map(group => group.id), ["stone", "cabinet-finishes"]);
assert.equal(hierarchy.hierarchySignature(base), originalSignature, "pure editor operations do not mutate the source model");

const movedSection = editor.moveSection(base, "finishes", "cabinet-finishes", "handles", -1);
assert.deepEqual(
  movedSection.stages.find(stage => stage.id === "finishes").groups[0].sections.map(section => section.id),
  ["handles", "fronts"]
);

const reorderedItem = editor.reorderItem(base, "tempered-glass", -1);
assert.deepEqual(
  reorderedItem.stages.find(stage => stage.id === "services").groups[0].sections
    .find(section => section.id === "additional-services").itemIds,
  ["tempered-glass", "move-stone"]
);

const movedItem = editor.moveItem(base, "move-stone", {
  stageId: "services",
  groupId: "services",
  sectionId: "lighting",
  index: 1
});
assert.deepEqual(
  movedItem.stages.find(stage => stage.id === "services").groups[0].sections
    .find(section => section.id === "lighting").itemIds,
  ["lighting-08", "move-stone"]
);
assert.equal(
  movedItem.stages.find(stage => stage.id === "services").groups[0].sections
    .some(section => section.id === "additional-services" && section.itemIds.includes("move-stone")),
  false
);

const split = editor.splitItemToSection(base, "tempered-glass", {
  sectionId: "glass-service",
  label: "Vidro",
  presentation: "cards"
});
assert.deepEqual(
  split.stages.find(stage => stage.id === "services").groups[0].sections.map(section => section.id),
  ["lighting", "additional-services", "glass-service"]
);
assert.deepEqual(
  split.stages.find(stage => stage.id === "services").groups[0].sections
    .find(section => section.id === "glass-service").itemIds,
  ["tempered-glass"]
);

const splitGroup = editor.splitSectionToGroup(base, "finishes", "cabinet-finishes", "handles", {
  groupId: "handles-group",
  label: "Puxadores",
  columnSpan: 1
});
assert.deepEqual(splitGroup.stages.find(stage => stage.id === "finishes").groups.map(group => group.id), ["cabinet-finishes", "handles-group", "stone"]);
assert.deepEqual(splitGroup.stages.find(stage => stage.id === "finishes").groups[1].sections.map(section => section.id), ["handles"]);

const mergedSection = editor.mergeSectionIntoPrevious(split, "services", "services", "glass-service");
assert.deepEqual(
  mergedSection.stages.find(stage => stage.id === "services").groups[0].sections.map(section => section.id),
  ["lighting", "additional-services"]
);
assert.deepEqual(
  mergedSection.stages.find(stage => stage.id === "services").groups[0].sections[1].itemIds,
  ["move-stone", "tempered-glass"]
);

const mergedGroup = editor.mergeGroupIntoPrevious(splitGroup, "finishes", "handles-group");
assert.deepEqual(mergedGroup.stages.find(stage => stage.id === "finishes").groups.map(group => group.id), ["cabinet-finishes", "stone"]);
assert.deepEqual(mergedGroup.stages.find(stage => stage.id === "finishes").groups[0].sections.map(section => section.id), ["fronts", "handles"]);

const movedSectionAcrossGroups = editor.moveSectionToGroup(base, "finishes", "cabinet-finishes", "handles", "stone");
assert.deepEqual(movedSectionAcrossGroups.stages.find(stage => stage.id === "finishes").groups[0].sections.map(section => section.id), ["fronts"]);
assert.deepEqual(movedSectionAcrossGroups.stages.find(stage => stage.id === "finishes").groups[1].sections.map(section => section.id), ["stone-packages", "stone-skirting", "handles"]);

const mergedNext = editor.mergeSectionIntoNext(split, "services", "services", "lighting");
assert.deepEqual(
  mergedNext.stages.find(stage => stage.id === "services").groups[0].sections.map(section => section.id),
  ["additional-services", "glass-service"]
);
assert.deepEqual(
  mergedNext.stages.find(stage => stage.id === "services").groups[0].sections[0].itemIds,
  ["lighting-08", "move-stone"]
);

const groupMergedNext = editor.mergeGroupIntoNext(splitGroup, "finishes", "cabinet-finishes");
assert.deepEqual(groupMergedNext.stages.find(stage => stage.id === "finishes").groups.map(group => group.id), ["handles-group", "stone"]);
assert.deepEqual(groupMergedNext.stages.find(stage => stage.id === "finishes").groups[0].sections.map(section => section.id), ["fronts", "handles"]);

const emptyCustom = editor.removeItem(base, "move-stone");
emptyCustom.stages.splice(3, 0, { id: "installation", kind: "custom", label: "Instalação", enabled: false, groups: [] });
const placedInEmpty = editor.placeItemInEmptyStage(emptyCustom, "move-stone", "installation", {
  groupId: "installation-main",
  groupLabel: "Instalação",
  sectionId: "services",
  sectionLabel: "Serviços",
  presentation: "list",
  columnSpan: 2
});
assert.deepEqual(placedInEmpty.stages.find(stage => stage.id === "installation").groups, [{
  id: "installation-main",
  label: "Instalação",
  columnSpan: 2,
  sections: [{ id: "services", label: "Serviços", presentation: "list", itemIds: ["move-stone"] }]
}]);

const removed = editor.removeItem(base, "tempered-glass");
assert.deepEqual(
  removed.stages.find(stage => stage.id === "services").groups[0].sections
    .find(section => section.id === "additional-services").itemIds,
  ["move-stone"]
);

const destinations = editor.sectionDestinations(base);
assert.ok(destinations.some(destination =>
  destination.stageId === "finishes"
  && destination.groupId === "cabinet-finishes"
  && destination.sectionId === "handles"
));

const existing = new Set(["nova-secao", "nova-secao-2"]);
assert.equal(editor.uniqueId(existing, "Nova seção", "secao"), "nova-secao-3");

assert.equal(editor.moveGroup(base, "finishes", "cabinet-finishes", -1), base, "invalid boundary move returns original model");
assert.equal(editor.moveSection(base, "finishes", "cabinet-finishes", "fronts", -1), base, "invalid section boundary move returns original model");
assert.equal(editor.splitItemToSection(base, "fronts-all", { sectionId: "x", label: "X" }), base, "single-item section cannot be split");
const stoneSplit = editor.splitSectionToGroup(base, "finishes", "stone", "stone-packages", { groupId: "x", label: "X" });
assert.deepEqual(stoneSplit.stages.find(stage => stage.id === "finishes").groups.map(group => group.id), ["cabinet-finishes", "stone", "x"], "section split creates a peer group when the source remains nonempty");
assert.deepEqual(stoneSplit.stages.find(stage => stage.id === "finishes").groups.find(group => group.id === "stone").sections.map(section => section.id), ["stone-skirting"]);
assert.deepEqual(stoneSplit.stages.find(stage => stage.id === "finishes").groups.find(group => group.id === "x").sections.map(section => section.id), ["stone-packages"]);

console.log("hierarchy editor: PASS");
