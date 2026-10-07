import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const context = vm.createContext({ console });
context.window = context;
[
  "app/data/scene-data.js",
  "app/data/catalog-data.js",
  "app/core/state.js",
  "app/core/visibility.js",
  "app/core/validation.js",
  "app/core/finishes.js",
  "app/core/scene-component.js",
  "app/viewer/data.js",
  "app/viewer/scene-adapters.js"
].forEach((path) => vm.runInContext(readFileSync(path, "utf8"), context, { filename: path }));

const dependencies = {
  scene: context.CASA_EM_MODULOS_SCENE,
  catalog: context.CASA_EM_MODULOS_CATALOG,
  core: context.CasaModulesCore,
  visibility: context.CasaModulesVisibility,
  validation: context.CasaModulesValidation
};

test("repository adapter maps the current scene and catalog into the public contract", () => {
  const adapter = context.CASA_PUBLIC_SCENE_ADAPTERS.createRepositoryAdapter({
    ...dependencies,
    initialSelectedId: context.CASA_PUBLIC_VIEWER.defaultModuleId
  });

  assert.equal(adapter.contractVersion, "PublicSceneAdapter 0.5");
  assert.equal(adapter.modules.length, 7);
  assert.equal(adapter.getSelectedModule().id, "module-07");
  assert.equal(adapter.getAssetUrl("assets/kitchen/layers/07_aereo_geladeira.png"), "../assets/kitchen/layers/07_aereo_geladeira.png");
  assert.equal(adapter.getSelectedModule().summary, "Módulo aéreo com duas portas de abrir e uma prateleira fixa.");
  assert.equal(adapter.getSelectedModule().carcass, "Caixaria branca");
  assert.equal(adapter.getSceneEntity("module-07").alphaBounds.width, 274);
  assert.equal(adapter.getSceneCanvas().width, dependencies.scene.canvas.width);
  assert.equal(adapter.getSceneCanvas().height, dependencies.scene.canvas.height);
  assert.equal(adapter.modules.find((module) => module.id === "module-02").requirements.length, 1);
  assert.equal(adapter.modules.find((module) => module.id === "module-03").internalLayout.length, 3);
  assert.equal(adapter.modules.find((module) => module.id === "module-05").requirements.length, 0);

  let selectedId = null;
  let selection = null;
  adapter.subscribe((event) => { selectedId = event.moduleId; selection = event; });
  assert.equal(adapter.select("module-02"), true);
  assert.equal(selectedId, "module-02");
  assert.equal(selection.module.id, "module-02");
  assert.equal(selection.entity.id, "module-02");
  assert.equal(adapter.select("module-missing"), false);
});

test("standalone page delegates to the same canonical adapter", () => {
  const adapter = context.CASA_PUBLIC_SCENE_ADAPTERS.createStandaloneAdapter("module-05");
  assert.equal(adapter.contractVersion, "PublicSceneAdapter 0.5");
  assert.equal(adapter.getSelectedModule().id, "module-05");
  assert.equal(adapter.modules.length, dependencies.catalog.modules.length);
});

test("factory accepts explicit dependencies and publishes the adapter contract version", () => {
  const api = context.CASA_PUBLIC_SCENE_ADAPTERS;
  assert.equal(api.contractVersion, "PublicSceneAdapter 0.5");
  const adapter = api.create({ ...dependencies, initialSelectedId: "module-03" });
  assert.equal(adapter.getSelectedModule().id, "module-03");
});

test("selection callback receives normalized module and entity", () => {
  let selected = null;
  const adapter = context.CASA_PUBLIC_SCENE_ADAPTERS.create({
    ...dependencies,
    initialSelectedId: "module-01",
    onSelectionChange(event) { selected = event; }
  });
  assert.equal(adapter.select("module-04"), true);
  assert.equal(selected.moduleId, "module-04");
  assert.equal(selected.module.id, "module-04");
  assert.equal(selected.entity.id, "module-04");
});

test("integrated asset paths can be supplied by the host", () => {
  const adapter = context.CASA_PUBLIC_SCENE_ADAPTERS.createRepositoryAdapter({
    ...dependencies,
    assetPrefix: "/public-assets/"
  });
  assert.equal(adapter.getAssetUrl("assets/example.png"), "/public-assets/assets/example.png");
  assert.equal(adapter.getAssetUrl("https://cdn.example/image.png"), "https://cdn.example/image.png");
});
