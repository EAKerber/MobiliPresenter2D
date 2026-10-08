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
    assert.notEqual(module.summary, "", "public page must not present an empty summary");
  }
});

test("viewer composition is separate from published administration schema", () => {
  assert.deepEqual(Array.from(viewer.layout), ["overview", "scene", "views", "details"]);
  assert.equal(viewer.defaultModuleId, "module-07");
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
