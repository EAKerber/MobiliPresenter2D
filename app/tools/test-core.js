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
  vm.runInContext(
    fs.readFileSync(path.join(projectRoot, relativePath), "utf8"),
    sandbox,
    { filename: relativePath }
  );
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
assert.equal(priceBook.globalEntries["stone-new-light"], 169900);
assert.equal(priceBook.globalEntries["stone-new-dark"], 219900);
assert.equal(priceBook.globalEntries["stone-skirting"], 18500);
assert.equal(priceBook.globalEntries["move-stone"], 39900);
assert.equal(priceBook.globalEntries["tempered-glass"], 39000);

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

const state = core.createInitialState(scene);
const initialFingerprint = fingerprints.computeFingerprint(scene, state);
const fullEstimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), priceBook);
assert.equal(fullEstimate.status, "estimate");
assert.equal(fullEstimate.totalCents, 776600);
assert.deepEqual(
  {
    modules: fullEstimate.breakdown.modulesCents,
    local: fullEstimate.breakdown.localCents,
    lighting: fullEstimate.breakdown.lightingCents,
    finishes: fullEstimate.breakdown.finishesCents,
    handles: fullEstimate.breakdown.handlesCents,
    global: fullEstimate.global.totalCents
  },
  { modules: 660000, local: 56600, lighting: 60000, finishes: 0, handles: 0, global: 0 }
);

core.setModuleSelection(state, "module-03", { handleId: "ponto" });
let estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), priceBook);
assert.equal(estimate.breakdown.handlesCents, 14985);
assert.equal(estimate.totalCents, 791585);
const handleAllocation = pricing.distributeCents(14985, 6);
assert.equal(handleAllocation.reduce((total, cents) => total + cents, 0), 14985);
assert.equal(handleAllocation.length, 6);

core.setModuleSelection(state, "module-02", { handleId: "ponto" });
assert.equal(pricing.itemEstimate(catalog.modules[1], catalog, state, priceBook).handleCents, 0);
core.setModuleSelection(state, "module-04", { finishId: "tone-15-a" });
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), priceBook);
assert.equal(estimate.breakdown.finishesCents, 9000);

state.globalSelections.stonePackageId = "stone-new-light";
core.setGlobalService(state, "stone-skirting", true);
core.setGlobalService(state, "move-stone", true);
core.setGlobalService(state, "tempered-glass", true);
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), priceBook);
assert.equal(estimate.global.totalCents, 267300);

core.setEntityVisibility(state, "module-02", false);
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), priceBook);
assert.equal(estimate.breakdown.localCents, 0);
assert.equal(estimate.breakdown.modulesCents, 550000);

core.setEntityVisibility(state, "module-04", false);
const noModule04 = resolved(state);
assert.equal(noModule04["module-06"].visible, true);
assert.equal(noModule04["module-07"].visible, true);
assert.equal(noModule04["lighting-08"].reason, "requirement-hidden");

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

process.stdout.write(JSON.stringify({
  passed: true,
  initialFingerprint,
  entities: scene.entities.length,
  controllableEntities: scene.entities.filter((entity) => entity.controllable).length
}) + "\n");
