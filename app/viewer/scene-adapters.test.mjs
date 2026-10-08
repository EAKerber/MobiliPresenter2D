import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = vm.createContext({ console, structuredClone });
fixture.window = fixture;
for (const pathname of [
  "data/scene-data.js",
  "data/catalog-data.js",
  "core/state.js",
  "core/visibility.js",
  "core/validation.js",
  "core/finishes.js",
  "core/scene-component.js",
  "viewer/data.js",
  "viewer/scene-adapters.js"
]) {
  vm.runInContext(readFileSync(path.join(appRoot, pathname), "utf8"), fixture, { filename: pathname });
}

const { CASA_EM_MODULOS_SCENE: scene, CASA_EM_MODULOS_CATALOG: catalog } = fixture;
const { CASA_PUBLIC_SCENE_ADAPTERS: factory, CASA_PUBLIC_VIEWER: viewer } = fixture;
const dependencies = {
  scene, catalog,
  core: fixture.CasaModulesCore,
  visibility: fixture.CasaModulesVisibility,
  validation: fixture.CasaModulesValidation
};
const byProductId = new Map(catalog.modules.map((module) => [module.entityId, module]));
const sceneIds = new Set(scene.entities.map((entity) => entity.id));

test("viewer donor remains an independent page without starting configurator UI", () => {
  const html = readFileSync(path.join(appRoot, "viewer/index.html"), "utf8");
  assert.doesNotMatch(html, /(?:src=["'][^"']*app\.js|\/api\/configuration)/);
  assert.match(html, /core\/scene-component\.js/);
  assert.match(html, /scene-adapters\.js/);
  assert.match(html, /data\/catalog-data\.js/);
});

test("public adapter reconciles all real modules by entity id, not index", () => {
  const adapter = factory.createRepositoryAdapter(dependencies);
  assert.equal(adapter.contractVersion, "PublicSceneAdapter 0.5");
  assert.equal(adapter.modules.length, catalog.modules.length);
  assert.equal(adapter.modules.length, 7, "current kitchen baseline is seven physical modules");
  assert.equal(new Set(adapter.modules.map((x) => x.id)).size, adapter.modules.length);
  for (const module of adapter.modules) {
    const product = byProductId.get(module.id);
    assert(product, "viewer may not invent product entity ids");
    assert(sceneIds.has(module.id), "each public module must exist in the current scene");
    assert.equal(module.title, product.title);
    assert.equal(module.bounds.width, scene.entities.find((x) => x.id === module.id).alphaBounds.width);
    assert.equal(module.dimensionLabel, product.dimensions.display);
    assert.deepEqual([...module.components], [...product.components]);
    assert.deepEqual([...module.requirements], [...product.requirements]);
    assert.equal(module.description, "", "an empty authored description stays empty");
    assert.equal("summary" in module, false);
    assert.equal("carcass" in module, false);
  }
});

test("viewer composition is separate from published administration schema", () => {
  assert.deepEqual(Array.from(viewer.layout), ["overview", "scene", "views", "details"]);
  assert.equal(Object.hasOwn(viewer, "defaultModuleId"), false);
  assert(viewer.detailLayout.every((item) => item.placeholder && item.source));
  assert(!("objects" in viewer), "viewer/page composition must not copy v5 objects");
  assert(!("pricing" in viewer), "viewer must not expose independent pricing buckets");
});

test("selected module and callbacks remain stable through navigation", () => {
  const events = [];
  const adapter = factory.create({
    ...dependencies,
    initialSelectedId: "module-07",
    onSelectionChange(e) { events.push(e); }
  });
  assert.equal(adapter.getSelectedModule().id, "module-07");
  assert.equal(adapter.select("module-03"), true);
  assert.equal(adapter.getSelectedModule().id, "module-03");
  assert.equal(events.at(-1).moduleId, "module-03");
  assert.equal(events.at(-1).entity.id, "module-03");
  assert.equal(adapter.select("module-unknown"), false);
  assert.equal(events.length, 1, "invalid selection must never emit");
});

test("invalid deep link falls back to available catalog entity", () => {
  const a = factory.create({ ...dependencies, initialSelectedId: "module-invalid" });
  assert.equal(a.getSelectedModule().id, a.modules[0].id);
});

test("valid configured modules preserve current technical drawing evidence", () => {
  const a = factory.createRepositoryAdapter(dependencies);
  for (const m of a.modules) {
    const original = byProductId.get(m.id);
    assert.equal(m.drawingSpec?.kind ?? null, original.drawingSpec?.kind ?? null);
    assert.deepEqual(m.frontLayout, original.frontLayout || null);
    assert.deepEqual(m.internalLayout,
      original.internalLayout || original.technicalLayout?.internalFront?.segments || null);
  }
});

test("asset paths resolve relative assets without rewriting HTTP(S) URLs", () => {
  const a = factory.createRepositoryAdapter({ ...dependencies, assetPrefix: "/project/" });
  assert.equal(a.getAssetUrl("assets/kitchen/base.png"), "/project/assets/kitchen/base.png");
  assert.equal(a.getAssetUrl("https://example.com/image.png"), "https://example.com/image.png");
  assert.equal(a.getAssetUrl("/assets/icon.svg"), "/assets/icon.svg");
});

test("standalone constructor and explicit injected repository share one adapter", () => {
  assert.equal(factory.createStandaloneAdapter("module-05").getSelectedModule().id, "module-05");
  const other = factory.create({ ...dependencies, initialSelectedId: "module-05" });
  assert.equal(other.getSelectedModule().id, "module-05");
  assert.equal(other.modules.length, catalog.modules.length);
});

test("viewer initial selection follows visible module data instead of an arbitrary default", () => {
  const adapter = factory.createRepositoryAdapter(dependencies);
  assert.equal(adapter.getSelectedModule().id, catalog.modules[0].entityId);
  assert.equal(adapter.getState().selectedEntityId, adapter.getSelectedModule().id);
  const hidden = factory.createRepositoryAdapter({
    ...dependencies, publicState: { entities: { "module-01": false, "module-02": false } }
  });
  assert.equal(hidden.getSelectedModule().id, "module-03");
  assert.deepEqual(Array.from(hidden.getState().visibleModuleIds).slice(0, 2), ["module-03", "module-04"]);
  assert.equal(hidden.select("module-01"), false, "an invisible module cannot become selected");
  const override = factory.createRepositoryAdapter({
    ...dependencies, initialSelectedId: "module-07",
    publicState: { entities: { "module-07": false } }
  });
  assert.equal(override.getSelectedModule().id, "module-01", "invalid deep link cannot select hidden entity");
});
test("approved public module projection owns order and authored highlights, without summary or carcass inference", () => {
  const entries = ["module-07", "module-02"].map((id) => ({
    id, title: "Título público " + id, description: "",
    benefits: ["Caixaria interna clara", "Outro destaque"],
    components: ["MDF"], requirements: []
  }));
  const a = factory.createRepositoryAdapter({ ...dependencies, publicModules: entries });
  assert.deepEqual(a.modules.map((module) => module.id), ["module-07", "module-02"]);
  assert.equal(a.getSelectedModule().id, "module-07");
  assert.equal(a.modules[0].title, entries[0].title);
  assert.deepEqual(Array.from(a.modules[0].benefits), entries[0].benefits);
  assert.equal(a.modules[0].description, "");
  assert(!("summary" in a.modules[0]));
  assert(!("carcass" in a.modules[0]));
  assert.throws(() => factory.createRepositoryAdapter({
    ...dependencies, publicModules: [...entries, entries[0]]
  }), /Duplicate published module/);
});
test("finish changes use the same canonical adapter state and notify subscribers", () => {
  const a = factory.createRepositoryAdapter({
    ...dependencies,
    publicState: { finishId: "cocoa", entities: { "module-01": true } }
  });
  assert.equal(a.getState().finishId, "cocoa");
  const stateEvents = [];
  const stop = a.subscribeState((value) => stateEvents.push(value));
  assert.equal(a.setGlobalFinish("steel"), true);
  assert.equal(a.getState().finishId, "steel");
  assert.equal(stateEvents.at(-1).finishId, "steel");
  assert.equal(a.select("module-03"), true);
  assert.equal(a.getState().selectedEntityId, "module-03");
  assert.equal(stateEvents.at(-1).selectedEntityId, "module-03");
  assert.equal(a.setGlobalFinish("no-such-finish"), false);
  assert.equal(a.getState().finishId, "steel");
  stop();
  assert.throws(() => factory.createRepositoryAdapter({
    ...dependencies, publicState: { finishId: "unknown" }
  }), /Unknown public finish/);
});
