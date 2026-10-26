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
  "core/scene-geometry.js",
  "core/scene-component.js",
  "viewer/data.js",
  "viewer/public-data.js",
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
test("viewer has an intentional empty state when every module starts hidden", () => {
  const viewerEntities = Object.fromEntries(catalog.modules.map((item) => [item.entityId, false]));
  const configuratorEntities = Object.fromEntries(catalog.modules.map((item) => [item.entityId, true]));
  const adapter = factory.createRepositoryAdapter({
    ...dependencies, publicState: { viewerEntities, entities: configuratorEntities }
  });
  assert.deepEqual(Array.from(adapter.getState().visibleModuleIds), []);
  assert.equal(adapter.getSelectedModule(), null);
  assert.equal(adapter.select("module-01"), false);
});
test("viewer uses published nominal measurements while retaining catalog drawing structure", () => {
  const adapter = factory.createRepositoryAdapter({
    ...dependencies,
    publicModules: [{ id: "module-01", title: "Aéreo", nominalDimensionsMm: { width: 800, height: 710, depth: 360 }, dimensionLabel: "800 × 710 × 360 mm" }],
    publicState: { viewerEntities: { "module-01": true } }
  });
  const module = adapter.getSelectedModule();
  assert.equal(module.dimensions.width, 800);
  assert.equal(module.dimensions.height, 710);
  assert.equal(module.dimensions.depth, 360);
  assert.equal(module.dimensionLabel, "800 × 710 × 360 mm");
  assert.equal(module.frontLayout, catalog.modules[0].frontLayout);
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
  const limited = factory.createRepositoryAdapter({
    ...dependencies,
    publicState: { finishId: "cocoa", availableFinishes: ["base-light", "cocoa"].map((id) => {
      const source = catalog.options.finishes.find((finish) => finish.id === id);
      return { id, label: source.publicLabel, color: source.color,
        textureAsset: source.textureAsset, textureSize: source.textureSize };
    }) }
  });
  assert.equal(limited.setGlobalFinish("steel"), false, "unpublished finish must not be selectable");
  assert.equal(limited.setGlobalFinish("base-light"), true);
  assert.equal(limited.getState().finishId, "base-light");
  stop();
  assert.throws(() => factory.createRepositoryAdapter({
    ...dependencies, publicState: { finishId: "unknown" }
  }), /Unknown public finish/);
});

test("standalone adapter honors approved projection instead of silently using catalog text", () => {
  const publicModules = [{ id: "module-07", title: "Publicado via API",
    benefits: ["Destaque específico"], components: [], requirements: [] }];
  const a = factory.create({
    publicModules,
    publicState: { finishId: "base-light", availableFinishes: [{
      id: "base-light", label: "Branco", color: "#faf9f6", textureAsset: "", textureSize: "cover"
    }], entities: { "module-07": true } }
  });
  assert.deepEqual(a.modules.map((item) => item.id), ["module-07"]);
  assert.equal(a.getSelectedModule().title, "Publicado via API");
  assert.deepEqual(Array.from(a.getSelectedModule().benefits), ["Destaque específico"]);
  assert.equal(a.setGlobalFinish("cocoa"), false);
});
test("public loader requests only allowlisted endpoint; rejects invalid responses with no fallback", async () => {
  const { CASA_PUBLIC_VIEWER_DATA: loader } = fixture;
  const calls = [];
  fixture.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, async json() {
      return { schemaVersion: "PublicModulePresentation2D 0.1",
        modules: [{ id: "module-03", title: "Nome publicado" }],
        publicState: { entities: { "module-03": true },
          finishId: "base-light", availableFinishes: [{
            id: "base-light", label: "Branco", color: "#faf9f6", textureAsset: "", textureSize: "cover"
          }] }
      };
    } };
  };
  const result = await loader.load();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/public-modules");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.credentials, "same-origin");
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(result.publicModules[0].title, "Nome publicado");
  fixture.fetch = async () => ({ ok: false, status: 503 });
  await assert.rejects(() => loader.load(), /public_modules_unavailable/);
  fixture.fetch = async () => ({ ok: true, async json() { return {
    schemaVersion: "ConfiguratorAdministration2D 5.0", pricing: { secret: true }
  }; } });
  await assert.rejects(() => loader.load(), /invalid_public_module_projection/);
});

test("viewer renders authored global finish unavailable in static catalog", () => {
  const a = factory.createRepositoryAdapter({ ...dependencies, publicState: {
    finishId: "new-front-color", availableFinishes: [{
      id: "new-front-color", label: "Branco novo", color: "#ffffff", textureAsset: "", textureSize: "cover"
    }]
  } });
  assert.equal(a.getState().finishId, "new-front-color");
  assert.equal(a.getFinishes()[0].label, "Branco novo");
  assert.equal(a.setGlobalFinish("steel"), false);
  assert.throws(() => factory.createRepositoryAdapter({ ...dependencies, publicState: {
    finishId: "new-front-color", availableFinishes: [{
      id: "new-front-color", label: "Bad", color: "#ffffff", textureAsset: "https://malicious.example/track.png", textureSize: "cover"
    }]
  } }), /Invalid published finish/);
});


class SceneFallbackTestElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.className = "";
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.style = { setProperty() {} };
    this.attributes = new Map();
    this.listeners = new Map();
    this.hidden = false;
    this.complete = false;
    this.naturalWidth = 0;
    this.src = "";
  }
  get classList() {
    const node = this;
    return {
      contains(name) { return node.className.split(/\\s+/).includes(name); },
      add(name) { if (!this.contains(name)) node.className = `${node.className} ${name}`.trim(); },
      remove(name) { node.className = node.className.split(/\\s+/).filter((item) => item && item !== name).join(" "); },
      toggle(name, force) {
        const enabled = force === undefined ? !this.contains(name) : Boolean(force);
        if (enabled) this.add(name); else this.remove(name);
        return enabled;
      }
    };
  }
  append(...nodes) {
    for (const node of nodes) { node.parentElement = this; this.children.push(node); }
  }
  replaceChildren(...nodes) {
    this.children.forEach((node) => { node.parentElement = null; });
    this.children = [];
    this.append(...nodes);
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "class") this.className = String(value);
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, listener, capture = false) {
    const items = this.listeners.get(type) || [];
    items.push({ listener, capture });
    this.listeners.set(type, items);
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((item) => item.listener !== listener));
  }
  contains(target) {
    return target === this || this.children.some((child) => child.contains(target));
  }
  closest(selector) {
    let current = this;
    while (current) {
      if (selector === ".layer-group" && current.classList.contains("layer-group")) return current;
      current = current.parentElement;
    }
    return null;
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = (node) => {
      for (const child of node.children) {
        if ((selector === "img" && child.tagName === "IMG")
          || (selector === ".layer-group" && child.classList.contains("layer-group"))
          || (selector === ".scene-image-fallback" && child.classList.contains("scene-image-fallback"))) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

test("scene asset errors cover the stage only for the base or a visible layer", () => {
  const previousDocument = fixture.document;
  fixture.document = { createElement: (tag) => new SceneFallbackTestElement(tag), addEventListener() {} };
  const sceneComponent = {
    createSelectionFrame() { return new SceneFallbackTestElement("div"); },
    renderLayers(currentScene, base, layers) {
      base.src = currentScene.baseAsset;
      for (const id of ["module-01", "tempered-glass"]) {
        const entity = currentScene.entities.find((item) => item.id === id);
        const group = new SceneFallbackTestElement("div");
        group.className = "layer-group";
        group.dataset.entityId = entity.id;
        const image = new SceneFallbackTestElement("img");
        image.src = entity.asset;
        group.append(image);
        layers.append(group);
      }
    },
    renderHotspots(currentScene, products, target) { target.className = "scene-hotspots"; },
    updateHotspots() {},
    renderSelectionFrame() {},
    bindKeyboard() {},
    applyFinishAppearance() {}
  };
  try {
    const adapter = factory.createRepositoryAdapter({ ...dependencies, sceneComponent });
    const stage = new SceneFallbackTestElement("div");
    adapter.mount(stage);
    const base = stage.children[0];
    const layers = stage.children[1];
    const hotspots = stage.children[2];
    const frame = stage.children[3];
    const fallback = stage.children[4];
    const moduleGroup = layers.children.find((group) => group.dataset.entityId === "module-01");
    const hiddenGroup = layers.children.find((group) => group.dataset.entityId === "tempered-glass");
    hiddenGroup.classList.add("is-hidden");
    const errorListener = stage.listeners.get("error")?.[0];
    assert(errorListener, "error capture must be attached to the scene stage");
    assert.equal(errorListener.capture, true, "image error does not bubble, so capture is required");
    assert.equal(fallback.hidden, true);

    errorListener.listener({ target: hiddenGroup.children[0] });
    assert.equal(fallback.hidden, true, "an invisible layer must not invalidate the current scene");

    errorListener.listener({ target: moduleGroup.children[0] });
    assert.equal(fallback.hidden, false);
    assert.equal(fallback.getAttribute("role"), "alert");
    assert.match(fallback.children.map((item) => item.textContent).join(" "), /Imagem indisponível/);
    assert.match(fallback.children.map((item) => item.textContent).join(" "), /composição completa da cozinha/);
    assert.deepEqual([base, layers, hotspots, frame].map((node) => node.hidden), [true, true, true, true]);
    assert.match(stage.getAttribute("aria-label"), /Cena da cozinha indisponível/);
  } finally {
    fixture.document = previousDocument;
  }
});
