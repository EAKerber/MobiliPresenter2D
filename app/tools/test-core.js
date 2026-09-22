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
  "data/mock-price-book.js",
  "data/mask-data.js",
  "core/state.js",
  "core/visibility.js",
  "core/validation.js",
  "core/fingerprint.js",
  "core/finishes.js",
  "core/pricing.js"
].forEach((relativePath) => {
  vm.runInContext(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"), sandbox, { filename: relativePath });
});

const scene = sandbox.window.CASA_EM_MODULOS_SCENE;
const catalog = sandbox.window.CASA_EM_MODULOS_CATALOG;
const priceBook = sandbox.window.CASA_EM_MODULOS_PRICE_BOOK;
const masks = sandbox.window.CASA_EM_MODULOS_MASK_DATA;
const core = sandbox.window.CasaModulesCore;
const visibility = sandbox.window.CasaModulesVisibility;
const validation = sandbox.window.CasaModulesValidation;
const fingerprints = sandbox.window.CasaModulesFingerprint;
const finishes = sandbox.window.CasaModulesFinishes;
const pricing = sandbox.window.CasaModulesPricing;
const technical = JSON.parse(fs.readFileSync(path.join(projectRoot, "data/technical-data.json"), "utf8"));

function resolved(state) {
  return visibility.resolveVisibility(scene, state);
}

assert.equal(scene.entities.length, 17);
assert.deepEqual(Array.from(validation.validateScene(scene)), []);
assert.equal(catalog.modules.length, 7);
assert.equal(priceBook.mode, "estimate");
assert.equal(priceBook.compositionBaseReferenceCents, undefined);

const officialModulePrices = [90000, 110000, 150000, 60000, 80000, 110000, 60000];
catalog.modules.forEach((module, index) => {
  assert.equal(priceBook.entries[module.entityId], officialModulePrices[index], module.entityId);
  assert.equal(module.dimensions.displayPolicy, "nominal", module.entityId);
  assert.equal(module.dimensions.evidence.some((entry) => entry.source === "promob-dxf" && entry.status === "confirmed"), true, module.entityId);
});
assert.equal(priceBook.entries["lighting-08"], 60000);
assert.equal(priceBook.localEntries["module-02:mandatory-cooktop-stone"], 56600);
assert.equal(priceBook.globalEntries["stone-light-sink"], 169900);
assert.equal(priceBook.globalEntries["stone-cloud"], 219900);
assert.equal(priceBook.globalEntries["stone-grove"], 219900);
assert.equal(priceBook.globalEntries["stone-night"], 219900);
assert.equal(priceBook.globalEntries["stone-skirting"], 18500);
assert.equal(priceBook.globalEntries["move-stone"], 39900);
assert.equal(priceBook.globalEntries["tempered-glass"], 39000);

const chargeableFronts = catalog.modules
  .filter((module) => module.commercial.handleEligible)
  .reduce((total, module) => total + module.commercial.handleFrontCount, 0);
assert.equal(chargeableFronts, 14);
assert.equal(priceBook.handleFrontTotal, chargeableFronts);

const module03 = catalog.modules.find((module) => module.entityId === "module-03");
const module04 = catalog.modules.find((module) => module.entityId === "module-04");
assert.equal(module03.frontLayout.status, "confirmed");
assert.deepEqual(Array.from(module03.frontLayout.segments.map((segment) => segment.spanMm)), [390, 400, 400]);
assert.equal(module04.drawingSpec.kind, "panel");
assert.equal(module04.drawingSpec.thicknessMm, 18);

scene.entities.forEach((entity) => {
  assert.equal(fs.existsSync(path.join(projectRoot, entity.asset)), true, entity.asset);
  if (entity.maskAsset) assert.equal(typeof masks[entity.maskAsset], "string", entity.maskAsset);
  const bounds = technical.files[entity.asset]?.alphaBounds ?? null;
  const expected = bounds ? { x: bounds[0], y: bounds[1], width: bounds[2] - bounds[0], height: bounds[3] - bounds[1] } : null;
  assert.equal(JSON.stringify(entity.alphaBounds), JSON.stringify(expected), entity.id);
});
const skirtingMasks = {
  "skirting-02.svg": "M496 856H744V899H496Z",
  "skirting-03.svg": "M745 856H1205V899H745Z"
};
Object.entries(skirtingMasks).forEach(([name, expectedPath]) => {
  const contents = fs.readFileSync(path.join(projectRoot, "assets/kitchen/masks", name), "utf8");
  assert.match(contents, /viewBox="0 0 1536 1024"/, name + " viewBox");
  assert.equal(contents.includes(expectedPath), true, name + " geometry");
});

const publishedMaterials = [
  ["base-light", "Base clara", "assets/materials/mdf-base.webp"],
  ["cocoa", "Avelã", "assets/materials/mdf-warm.webp"],
  ["mist", "Névoa", "assets/materials/mdf-soft.webp"],
  ["steel", "Aço", "assets/materials/mdf-metal.webp"],
  ["fiber", "Bosque", "assets/materials/mdf-wood.webp"],
  ["shadow", "Carvão", "assets/materials/mdf-dark.webp"]
];
publishedMaterials.forEach(([id, label, asset]) => {
  const finish = catalog.options.finishes.find((entry) => entry.id === id);
  assert.equal(finish?.publicLabel, label, id + " public label");
  assert.equal(finish?.textureAsset, asset, id + " material source");
  assert.equal(fs.statSync(path.join(projectRoot, asset)).size > 0, true, asset);
});

const stoneMaterials = [
  ["stone-cloud", "Clara mineral", "assets/materials/stone-light.webp"],
  ["stone-grove", "Verde profundo", "assets/materials/stone-green.webp"],
  ["stone-night", "Preta mineral", "assets/materials/stone-dark.webp"]
];
stoneMaterials.forEach(([id, label, asset]) => {
  const stone = catalog.options.stonePackages.find((entry) => entry.id === id);
  assert.equal(stone?.label, label, id + " public label");
  assert.equal(stone?.textureAsset, asset, id + " material source");
  assert.equal(fs.statSync(path.join(projectRoot, asset)).size > 0, true, asset);
});
const standardSink = catalog.options.stonePackages.find((entry) => entry.id === "stone-light-sink");
assert.equal(standardSink?.label, "Padrão + cuba nova");
assert.equal(standardSink?.color, null, "standard sink keeps the scene's current stone");

const state = core.createInitialState(scene);
assert.equal(state.moduleSelections, undefined);
assert.equal(Object.hasOwn(state, "stoneColor"), false);
assert.equal(Object.hasOwn(state, "stoneFinishId"), false);
assert.equal(core.globalFinishId(state), "base-light");
assert.equal(core.globalHandleId(state), "none");
assert.equal(resolved(state)["lighting-08"].visible, false);
const initialFingerprint = fingerprints.computeFingerprint(scene, state);
let estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), priceBook);
assert.equal(estimate.status, "estimate");
assert.equal(estimate.totalCents, 716600);
assert.deepEqual(
  {
    modules: estimate.breakdown.modulesCents,
    local: estimate.breakdown.localCents,
    finishes: estimate.breakdown.finishesCents,
    handles: estimate.breakdown.handlesCents,
    global: estimate.global.totalCents
  },
  { modules: 660000, local: 56600, finishes: 0, handles: 0, global: 0 }
);

core.setGlobalSelection(state, { finishId: "cocoa" });
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), priceBook);
assert.equal(estimate.breakdown.finishesCents, 99000);
assert.equal(estimate.totalCents, 815600);

core.setGlobalSelection(state, { handleId: "tango-chrome" });
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), priceBook);
assert.equal(estimate.breakdown.handlesCents, 17985);
assert.equal(estimate.moduleEstimates.reduce((sum, entry) => sum + entry.estimate.handleCents, 0), 17985);
assert.equal(estimate.moduleEstimates.find((entry) => entry.item.entityId === "module-02").estimate.handleCents, 0);
assert.equal(estimate.totalCents, 833585);

core.setEntityVisibility(state, "module-01", false);
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), priceBook);
assert.equal(estimate.breakdown.handlesCents, 15415);
assert.equal(estimate.totalCents, 727515);

const withoutModule03 = core.createInitialState(scene);
core.setGlobalSelection(withoutModule03, { handleId: "tango-chrome" });
core.setEntityVisibility(withoutModule03, "module-03", false);
estimate = pricing.calculatePublicEstimate(scene, withoutModule03, catalog, resolved(withoutModule03), priceBook);
assert.equal(estimate.breakdown.handlesCents, 10275);

const withoutModule06 = core.createInitialState(scene);
core.setGlobalSelection(withoutModule06, { handleId: "tango-chrome" });
core.setEntityVisibility(withoutModule06, "module-06", false);
estimate = pricing.calculatePublicEstimate(scene, withoutModule06, catalog, resolved(withoutModule06), priceBook);
assert.equal(estimate.breakdown.handlesCents, 15417);

core.setEntityVisibility(state, "module-01", true);
core.setGlobalSelection(state, { finishId: "shadow", handleId: "none", stonePackageId: "stone-light-sink" });
core.setGlobalService(state, "stone-skirting", true);
core.setGlobalService(state, "move-stone", true);
core.setGlobalService(state, "tempered-glass", true);
core.setEntityVisibility(state, "lighting-08", true);
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), priceBook);
assert.equal(estimate.breakdown.finishesCents, 165000);
assert.equal(estimate.global.totalCents, 327300);
assert.equal(estimate.moduleEstimates.reduce((sum, entry) => sum + entry.estimate.globalShareCents, 0), 327300);
assert.equal(estimate.totalCents, 1208900);

core.setEntityVisibility(state, "module-02", false);
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), priceBook);
assert.equal(estimate.breakdown.localCents, 0);
assert.equal(estimate.breakdown.modulesCents, 550000);
assert.equal(estimate.totalCents, 1014800);

core.setEntityVisibility(state, "module-04", false);
const noModule04 = resolved(state);
assert.equal(noModule04["module-06"].visible, true);
assert.equal(noModule04["module-07"].visible, true);
assert.equal(noModule04["lighting-08"].reason, "requirement-hidden");

const zeroModuleState = core.createInitialState(scene);
core.setGlobalSelection(zeroModuleState, { stonePackageId: "stone-light-sink" });
core.setGlobalService(zeroModuleState, "move-stone", true);
core.setAllControllableVisibility(scene, zeroModuleState, false);
estimate = pricing.calculatePublicEstimate(scene, zeroModuleState, catalog, resolved(zeroModuleState), priceBook);
assert.equal(estimate.breakdown.globalCents, 209800);
assert.equal(estimate.breakdown.allocatedGlobalCents, 0);
assert.equal(estimate.breakdown.unallocatedGlobalCents, 209800);
assert.equal(estimate.totalCents, 209800);

const oneModuleState = core.createInitialState(scene);
core.setGlobalSelection(oneModuleState, { stonePackageId: "stone-light-sink" });
core.setGlobalService(oneModuleState, "move-stone", true);
core.setAllControllableVisibility(scene, oneModuleState, false);
core.setEntityVisibility(oneModuleState, "module-03", true);
estimate = pricing.calculatePublicEstimate(scene, oneModuleState, catalog, resolved(oneModuleState), priceBook);
assert.equal(estimate.moduleEstimates.reduce((sum, entry) => sum + entry.estimate.globalShareCents, 0), 209800);
assert.equal(estimate.breakdown.unallocatedGlobalCents, 0);
assert.equal(estimate.totalCents, 359800);

const fingerprintBeforeUi = fingerprints.computeFingerprint(scene, state);
state.selectedEntityId = "module-03";
assert.equal(fingerprints.computeFingerprint(scene, state), fingerprintBeforeUi);
assert.equal(initialFingerprint.startsWith("scene2d-"), true);

const module04Entity = scene.entities.find((entity) => entity.id === "module-04");
let visibilityState = resolved(core.createInitialState(scene));
assert.equal(finishes.resolveMaskAsset(module04Entity, visibilityState), "assets/kitchen/masks/04-with-06-seam.png");
const visibilityProbe = core.createInitialState(scene);
core.setEntityVisibility(visibilityProbe, "module-06", false);
visibilityState = resolved(visibilityProbe);
assert.equal(finishes.resolveMaskAsset(module04Entity, visibilityState), "assets/kitchen/masks/04.png");

const indexHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(projectRoot, "styles.css"), "utf8");
assert.equal(indexHtml.includes("Acabamentos por módulo"), false);
assert.equal(indexHtml.includes("finishTargetSelect"), false);
assert.equal(indexHtml.includes('data-compact-label="Acab."'), true);
assert.equal(indexHtml.includes('data-compact-label="Serv."'), true);
const materialScriptRevisions = [
  /data\/stone-data\.js\?v=([^\"]+)/,
  /core\/stone\.js\?v=([^\"]+)/,
  /app\.js\?v=([^\"]+)/
].map((pattern) => indexHtml.match(pattern)?.[1]);
assert.equal(materialScriptRevisions.every(Boolean), true, "material scripts require an explicit shared revision");
assert.equal(new Set(materialScriptRevisions).size, 1, "material data, renderer and app must update together");
assert.equal(appJs.includes("setModuleSelection"), false);
assert.equal(appJs.includes("refreshMobileSceneDock"), true);
assert.equal(appJs.includes("mobileSceneTransparency"), true);
assert.equal(appJs.includes("mobileSceneRepin"), true);
assert.equal(appJs.includes("getBoundingClientRect().bottom || 0"), true);
assert.equal(appJs.includes("const pipBottom = Math.max(navBottom, mobilePipPosition?.top || 0) + pipHeight;"), true);
assert.equal(/state = core\.createInitialState\(scene\);\s*setAllVisibility\(true\);/.test(appJs), false, "restoring must preserve optional defaults");
assert.equal(appJs.includes("const requirementHidden = (entitiesById.get(\"lighting-08\")?.requiresVisibleIds || [])"), true);
assert.equal(appJs.includes("lightingToggle.disabled = blocked"), true);
assert.equal(styles.includes("--mobile-pip-height"), false);
assert.equal(styles.includes("body.is-mobile-scene-pinned .scene-hotspots { pointer-events: auto; }"), true);
assert.equal(styles.includes("top: env(safe-area-inset-top); margin-top: 0;"), true);
assert.equal(styles.includes("width: 44px; height: 44px;"), true);
assert.equal(styles.includes(".panel h2 { scroll-margin-top: 72px; }"), false);
assert.equal(styles.includes(".panel { scroll-margin-top: var(--mobile-content-clearance, 72px); }"), true);
assert.equal(styles.includes(".flow-nav__scene-pin { display: none; }"), true);
assert.equal(styles.includes("grid-column: 1 / -1;"), true);
assert.equal(styles.includes("container-name: flow-steps;"), true);
assert.equal(styles.includes("@container flow-steps (max-width: 500px)"), true);
const publicNames = [
  ...catalog.options.finishes.map((entry) => entry.publicLabel),
  ...catalog.options.stonePackages.map((entry) => entry.label)
].join(" ");
["Gianduia", "Aurora", "Titânio", "Eucalipto", "Grafite", "Siena", "Ubatuba", "Gabriel"].forEach((term) => {
  assert.equal(publicNames.includes(term), false, term);
});

process.stdout.write(JSON.stringify({
  passed: true,
  initialFingerprint,
  entities: scene.entities.length,
  controllableEntities: scene.entities.filter((entity) => entity.controllable).length
}) + "\n");
