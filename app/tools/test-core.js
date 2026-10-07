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
const pricingContract = require(path.join(projectRoot, "core/pricing-contract.js"));
const settingsCore = require(path.join(projectRoot, "core/configuration.js"));
const settingsDefaults = require(path.join(projectRoot, "data/configurator-settings.js"));
const defaultSettings = settingsCore.createDefaultAdministration(settingsDefaults, catalog, priceBook, scene);
const technical = JSON.parse(fs.readFileSync(path.join(projectRoot, "data/technical-data.json"), "utf8"));

function resolved(state) {
  return visibility.resolveVisibility(scene, state);
}

assert.equal(scene.entities.length, 17);
const glassState = core.createInitialState(scene);
assert.equal(resolved(glassState)["tempered-glass"].visible, true);
core.setAllControllableVisibility(scene, glassState, false);
assert.equal(resolved(glassState)["tempered-glass"].visible, true, "glass has no module dependency");
core.setGlobalService(glassState, "tempered-glass", false);
assert.equal(resolved(glassState)["tempered-glass"].visible, false);
core.setGlobalService(glassState, "tempered-glass", true);
assert.equal(resolved(glassState)["tempered-glass"].visible, true);
assert.equal(scene.entities.find(e => e.id === "tempered-glass").controllable, false);
assert.equal(scene.entities.some(e => /(?:right-return|left-return|right-side|exposed-face|floor-side-bridge)$/.test(e.id)), false, "experimental furniture side overlays stay out of the canonical scene");
const appSource = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");
const indexSource = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const staticHtmlIds = new Set([...indexSource.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
const orphanedStaticDomIds = [...new Set(
  [...appSource.matchAll(/document\.getElementById\("([^"]+)"\)/g)].map((match) => match[1])
)].filter((id) => !staticHtmlIds.has(id)).sort();
assert.deepEqual(orphanedStaticDomIds, [], "literal app.js getElementById references must exist in index.html");
const namedFunctionCounts = new Map();
for (const match of appSource.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
  namedFunctionCounts.set(match[1], (namedFunctionCounts.get(match[1]) || 0) + 1);
}
const duplicateNamedFunctions = [...namedFunctionCounts.entries()]
  .filter(([, count]) => count > 1)
  .map(([name]) => name)
  .sort();
assert.deepEqual(duplicateNamedFunctions, [], "app.js must not contain shadowed duplicate named function declarations");
const unreferencedNamedFunctions = [...namedFunctionCounts.keys()]
  .filter((name) => name !== "startConfigurator")
  .filter((name) => [...appSource.matchAll(new RegExp("\\b" + name + "\\b", "g"))].length === 1)
  .sort();
assert.deepEqual(unreferencedNamedFunctions, [], "app.js named helpers must have at least one reference");
const styleSource = fs.readFileSync(path.join(projectRoot, "styles.css"), "utf8");
const keyboardSource = fs.readFileSync(path.join(projectRoot, "core/keyboard-shortcuts.js"), "utf8");
const cssSelectorText = [...styleSource.matchAll(/([^{}]+)\{/g)].map((match) => match[1]).join("\n");
const cssClassNames = [...new Set([...cssSelectorText.matchAll(/\.([A-Za-z_-][A-Za-z0-9_-]*)/g)].map((match) => match[1]))];
const dynamicCssClasses = new Set(["structure-layer--shadow", "structure-layer--highlight"]);
const cssReachabilityCorpus = indexSource + "\n" + appSource + "\n" + keyboardSource;
const unreachableCssClasses = cssClassNames.filter((name) => !dynamicCssClasses.has(name) && !cssReachabilityCorpus.includes(name)).sort();
assert.deepEqual(unreachableCssClasses, [], "public styles.css classes must be reachable from public markup/runtime or explicitly dynamic");
const cssIdNames = [...new Set([...cssSelectorText.matchAll(/#([A-Za-z_-][A-Za-z0-9_-]*)/g)].map((match) => match[1]))];
const unreachableCssIds = cssIdNames.filter((id) => !staticHtmlIds.has(id)).sort();
assert.deepEqual(unreachableCssIds, [], "public styles.css id selectors must exist in index.html");
assert.match(appSource, /group\.style\.zIndex = String\(entity\.zIndex\)/);
assert.doesNotMatch(styleSource, /data-entity-id="tempered-glass"\]\s*\{\s*z-index/);
const stoveDisabledState = core.createInitialState(scene);
core.setEntityVisibility(stoveDisabledState, "module-02", false);
assert.equal(resolved(stoveDisabledState)["range-freestanding"].visible, true);
core.setEntityVisibility(stoveDisabledState, "module-02", true);
assert.equal(resolved(stoveDisabledState)["range-freestanding"].visible, false);
assert.deepEqual(Array.from(validation.validateScene(scene)), []);
assert.equal(catalog.modules.length, 7);
const skirtingService = catalog.services.find((item) => item.id === "stone-skirting");
assert.equal(skirtingService?.title, "Rodapé de pedra");
assert.equal(skirtingService?.defaultSelected, true);
assert.deepEqual(Array.from(skirtingService?.stageKinds || []), ["finishes", "services", "custom"]);
assert.equal(settingsCore.itemRegistry(catalog).get("stone-skirting"), "service");
assert.equal(defaultSettings.objects["stone-skirting"]?.title, "Rodapé de pedra");
assert.equal(defaultSettings.initialState.services.includes("stone-skirting"), true);
assert.equal(priceBook.schemaVersion, "CommercialEstimatePriceBook 2.0");
assert.equal(priceBook.mode, "estimate");
assert.equal(priceBook.compositionBaseReferenceCents, undefined);
["entries", "handleEntries", "frontFinishRatesBps", "localEntries", "globalEntries", "handleFrontTotal"].forEach((legacyKey) => {
  assert.equal(Object.hasOwn(priceBook, legacyKey), false, `PriceBook 2.0 has no legacy top-level bucket: ${legacyKey}`);
});

const typedPricingFixture = pricingContract.normalize(priceBook.pricing);
const projectedDefaultPricing = pricingContract.projectToLegacy(typedPricingFixture);
assert.equal(projectedDefaultPricing.ok, true);
const legacyPricingFixture = projectedDefaultPricing.value;
const historicalPriceBook11Fixture = {
  entries: {
    "module-01": 90000,
    "module-02": 110000,
    "module-03": 150000,
    "module-04": 60000,
    "module-05": 80000,
    "module-06": 110000,
    "module-07": 60000,
    "lighting-08": 60000
  },
  handleEntries: {
    none: 0,
    "tango-chrome": 17985,
    ponto: 14985,
    "alca-colors": 32850
  },
  frontFinishRatesBps: {
    "base-light": 0,
    cocoa: 1500,
    mist: 1500,
    steel: 1500,
    fiber: 2500,
    shadow: 2500
  },
  localEntries: {
    "module-02:mandatory-cooktop-stone": 56600
  },
  globalEntries: {
    "stone-existing": 0,
    "stone-light-sink": 169900,
    "stone-cloud": 219900,
    "stone-grove": 219900,
    "stone-night": 219900,
    "stone-skirting": 18500,
    "move-stone": 39900,
    "tempered-glass": 39000
  },
  handleFrontTotal: 14
};
assert.deepEqual(legacyPricingFixture, historicalPriceBook11Fixture, "PriceBook 2.0 projects exactly to the historical 1.1 pricing values");
assert.deepEqual(defaultSettings.pricing, historicalPriceBook11Fixture, "v3 default administration receives the exact historical pricing payload");
const pricingMetadata = { label: priceBook.label, disclaimer: priceBook.disclaimer };
assert.equal(typedPricingFixture.schemaVersion, "CommercialPricingRules 1.0");
assert.deepEqual(pricingContract.validate(typedPricingFixture), []);
assert.deepEqual(
  Object.keys(typedPricingFixture.roles),
  ["itemBase", "handleChoiceTotal", "frontFinishAdjustment", "localAdjustment", "globalAdjustment"],
  "typed pricing roles are explicit and ordered"
);
assert.deepEqual(typedPricingFixture.roles.itemBase["module-01"], { type: "amount", cents: 90000 });
assert.deepEqual(typedPricingFixture.roles.handleChoiceTotal.none, { type: "amount", cents: 0 });
assert.deepEqual(
  typedPricingFixture.roles.frontFinishAdjustment["base-light"],
  { type: "percentage", bps: 0, basis: "eligible-module-base" },
  "zero-valued percentage survives migration"
);
assert.deepEqual(
  typedPricingFixture.roles.frontFinishAdjustment.cocoa,
  { type: "percentage", bps: 1500, basis: "eligible-module-base" }
);
assert.deepEqual(typedPricingFixture.roles.globalAdjustment["stone-existing"], { type: "amount", cents: 0 });
assert.equal(typedPricingFixture.allocation.handleFrontTotal, 14);
const legacyPricingProjection = pricingContract.projectToLegacy(typedPricingFixture);
assert.equal(legacyPricingProjection.ok, true);
assert.deepEqual(legacyPricingProjection.value, legacyPricingFixture, "legacy pricing round-trips exactly through typed rules");

const amountFinishPricing = structuredClone(typedPricingFixture);
amountFinishPricing.roles.frontFinishAdjustment.cocoa = { type: "amount", cents: 15000 };
assert.deepEqual(pricingContract.validate(amountFinishPricing), [], "front finish may intentionally use an amount rule");
const amountFinishProjection = pricingContract.projectToLegacy(amountFinishPricing);
assert.equal(amountFinishProjection.ok, false);
assert.equal(amountFinishProjection.code, "pricing_requires_publication", "legacy projection fails closed for a typed finish amount");

const invalidPricingAmountFields = structuredClone(typedPricingFixture);
invalidPricingAmountFields.roles.itemBase["module-01"] = { type: "amount", cents: 90000, basis: "eligible-module-base" };
assert.equal(pricingContract.validate(invalidPricingAmountFields).some((error) => error.includes("unexpected amount fields")), true);

const invalidPricingPercentageFields = structuredClone(typedPricingFixture);
invalidPricingPercentageFields.roles.frontFinishAdjustment.cocoa = { type: "percentage", bps: 1500, basis: "eligible-module-base", cents: 15000 };
assert.equal(pricingContract.validate(invalidPricingPercentageFields).some((error) => error.includes("unexpected percentage fields")), true);

const invalidPricingBasis = structuredClone(typedPricingFixture);
invalidPricingBasis.roles.frontFinishAdjustment.cocoa = { type: "percentage", bps: 1500, basis: "composition-subtotal" };
assert.equal(pricingContract.validate(invalidPricingBasis).some((error) => error.includes("unsupported percentage basis")), true);

const invalidPricingRoleType = structuredClone(typedPricingFixture);
invalidPricingRoleType.roles.itemBase["module-01"] = { type: "percentage", bps: 1000, basis: "eligible-module-base" };
assert.equal(pricingContract.validate(invalidPricingRoleType).some((error) => error.includes("unsupported pricing rule type")), true);

const invalidPricingAmountRange = structuredClone(typedPricingFixture);
invalidPricingAmountRange.roles.globalAdjustment["move-stone"] = { type: "amount", cents: pricingContract.AMOUNT_MAX_CENTS + 1 };
assert.equal(pricingContract.validate(invalidPricingAmountRange).some((error) => error.includes("invalid amount cents")), true);

const invalidPricingBpsRange = structuredClone(typedPricingFixture);
invalidPricingBpsRange.roles.frontFinishAdjustment.cocoa = { type: "percentage", bps: pricingContract.PERCENTAGE_MAX_BPS + 1, basis: "eligible-module-base" };
assert.equal(pricingContract.validate(invalidPricingBpsRange).some((error) => error.includes("invalid percentage bps")), true);

const validPricingRangeEdges = structuredClone(typedPricingFixture);
validPricingRangeEdges.roles.itemBase["module-01"] = { type: "amount", cents: pricingContract.AMOUNT_MAX_CENTS };
validPricingRangeEdges.roles.frontFinishAdjustment.cocoa = { type: "percentage", bps: pricingContract.PERCENTAGE_MAX_BPS, basis: "eligible-module-base" };
assert.deepEqual(pricingContract.validate(validPricingRangeEdges), [], "legacy amount/BPS maxima remain inclusive");

const invalidPricingMissingBasis = structuredClone(typedPricingFixture);
invalidPricingMissingBasis.roles.frontFinishAdjustment.cocoa = { type: "percentage", bps: 1500 };
assert.equal(pricingContract.validate(invalidPricingMissingBasis).some((error) => error.includes("unsupported percentage basis")), true);

const invalidPricingAmountBps = structuredClone(typedPricingFixture);
invalidPricingAmountBps.roles.itemBase["module-01"] = { type: "amount", cents: 90000, bps: 1000 };
assert.equal(pricingContract.validate(invalidPricingAmountBps).some((error) => error.includes("unexpected amount fields")), true);

const invalidPricingUnknownRole = structuredClone(typedPricingFixture);
invalidPricingUnknownRole.roles.discount = {};
assert.equal(pricingContract.validate(invalidPricingUnknownRole).some((error) => error.includes("unknown pricing role")), true);


assert.deepEqual(settingsCore.validateConfiguratorSettings(defaultSettings, catalog, priceBook, scene), []);
const reorderedSettings = structuredClone(defaultSettings);
reorderedSettings.stages.reverse();
reorderedSettings.stages.find((stage) => stage.id === "finishes").items = ["fronts-all", "handles-all"];
assert.deepEqual(settingsCore.validateConfiguratorSettings(reorderedSettings, catalog, priceBook, scene), [], "stage order and item selection are configurable");
const invalidSettings = structuredClone(defaultSettings);
invalidSettings.stages.find((stage) => stage.id === "summary").enabled = false;
assert.equal(settingsCore.validateConfiguratorSettings(invalidSettings, catalog, priceBook, scene).includes("summary stage must remain enabled"), true);
const unknownItemSettings = structuredClone(defaultSettings);
unknownItemSettings.stages.find((stage) => stage.id === "services").items.push("module-99");
assert.equal(settingsCore.validateConfiguratorSettings(unknownItemSettings, catalog, priceBook, scene).some((error) => error.includes("unknown stage item")), true);
const orphanedSkirtingSettings = structuredClone(defaultSettings);
orphanedSkirtingSettings.stages.find((stage) => stage.id === "finishes").items = ["fronts-all", "stone-skirting"];
assert.equal(settingsCore.validateConfiguratorSettings(orphanedSkirtingSettings, catalog, priceBook, scene).includes("stone skirting requires the stone item"), true);
const customStageSettings = structuredClone(defaultSettings);
customStageSettings.stages.splice(2, 0, { id: "stage-extras", kind: "custom", label: "Extras", enabled: true, items: ["move-stone"] });
customStageSettings.stages.find((stage) => stage.id === "services").items = ["tempered-glass", "lighting-08"];
assert.deepEqual(settingsCore.validateConfiguratorSettings(customStageSettings, catalog, priceBook, scene), [], "custom stages can host configurable scene choices");
const removableStageSettings = structuredClone(defaultSettings);
removableStageSettings.stages = removableStageSettings.stages.filter((stage) => stage.id !== "services");
assert.deepEqual(settingsCore.validateConfiguratorSettings(removableStageSettings, catalog, priceBook, scene), [], "optional stages can be removed while core flow remains");
const normalizedDefaults = settingsCore.normalizeConfiguratorSettings(defaultSettings, catalog, priceBook, scene);
assert.equal(normalizedDefaults.schemaVersion, "ConfiguratorAdministration2D 3.0");

const stoneExistingMaterial = defaultSettings.materials.find((item) => item.id === "stone-existing");
const stoneSinkMaterial = defaultSettings.materials.find((item) => item.id === "stone-light-sink");
assert.equal(stoneExistingMaterial.color, null, "default stone-existing preserves source absence instead of copying swatch color");
assert.equal(stoneSinkMaterial.color, null, "default stone-light-sink preserves source absence instead of copying swatch color");
assert.notEqual(catalog.options.stonePackages.find((item) => item.id === "stone-existing").swatchColor, null, "stone-existing still has display-only swatch metadata");

const nullTextureSettings = structuredClone(defaultSettings);
nullTextureSettings.materials.find((item) => item.id === "stone-cloud").color = null;
assert.deepEqual(settingsCore.validateConfiguratorSettings(nullTextureSettings, catalog, priceBook, scene), [], "texture material may explicitly omit authored tint");
const normalizedNullTexture = settingsCore.normalizeConfiguratorSettings(nullTextureSettings, catalog, priceBook, scene);
assert.equal(normalizedNullTexture.materials.find((item) => item.id === "stone-cloud").color, null, "explicit null survives normalization");
assert.equal(
  settingsCore.normalizeConfiguratorSettings(normalizedNullTexture, catalog, priceBook, scene).materials.find((item) => item.id === "stone-cloud").color,
  null,
  "explicit null survives repeated normalization"
);

const missingMaterialColor = structuredClone(defaultSettings);
delete missingMaterialColor.materials.find((item) => item.id === "stone-cloud").color;
assert.equal(
  settingsCore.validateConfiguratorSettings(missingMaterialColor, catalog, priceBook, scene).some((error) => error.includes("invalid material color: stone-cloud")),
  true,
  "material color field absence fails closed"
);

const invalidMaterialColor = structuredClone(defaultSettings);
invalidMaterialColor.materials.find((item) => item.id === "stone-cloud").color = "transparent";
assert.equal(
  settingsCore.validateConfiguratorSettings(invalidMaterialColor, catalog, priceBook, scene).some((error) => error.includes("invalid material color: stone-cloud")),
  true,
  "invalid authored color string fails closed"
);

const nullSolidColor = structuredClone(defaultSettings);
nullSolidColor.materials.find((item) => item.id === "base-light").color = null;
assert.equal(
  settingsCore.validateConfiguratorSettings(nullSolidColor, catalog, priceBook, scene).some((error) => error.includes("invalid material color: base-light")),
  true,
  "solid-color materials still require an authored hex color"
);

const preservedAuthoredStoneColor = structuredClone(defaultSettings);
preservedAuthoredStoneColor.materials.find((item) => item.id === "stone-existing").color = "#a1b2c3";
assert.equal(
  settingsCore.normalizeConfiguratorSettings(preservedAuthoredStoneColor, catalog, priceBook, scene).materials.find((item) => item.id === "stone-existing").color,
  "#a1b2c3",
  "existing authored current-schema colors are never rewritten to null"
);
const preCatalogSkirtingSettings = structuredClone(defaultSettings);
delete preCatalogSkirtingSettings.objects["stone-skirting"];
delete preCatalogSkirtingSettings.objectAssets["stone-skirting"];
preCatalogSkirtingSettings.objects["move-stone"].title = "Mover pedra personalizado";
const hydratedCurrentSettings = settingsCore.normalizeConfiguratorSettings(preCatalogSkirtingSettings, catalog, priceBook, scene);
assert.equal(hydratedCurrentSettings.objects["stone-skirting"]?.title, "Rodapé de pedra", "current-schema publications hydrate newly catalogued objects");
assert.equal(Object.hasOwn(hydratedCurrentSettings.objectAssets, "stone-skirting"), true, "current-schema publications hydrate new object asset slots");
assert.equal(hydratedCurrentSettings.objects["move-stone"].title, "Mover pedra personalizado", "catalog hydration never overwrites published content");
assert.equal(normalizedDefaults.materialGroups.find((group) => group.id === "stone-all").linkedItemIds.includes("stone-skirting"), true);
const newMaterialSettings = structuredClone(defaultSettings);
newMaterialSettings.materials.push({ id: "stone-rose", label: "Rosa mineral", kind: "texture", color: "#c59f92", textureAsset: "assets/materials/stone-light.webp", textureSize: "cover", groupIds: ["stone-all"], locked: false });
newMaterialSettings.materialGroups.find((group) => group.id === "stone-all").materialIds.push("stone-rose");
newMaterialSettings.pricing.globalEntries["stone-rose"] = 0;
assert.deepEqual(settingsCore.validateConfiguratorSettings(newMaterialSettings, catalog, priceBook, scene), [], "new shared stone finishes are accepted");
const newHandleSettings = structuredClone(defaultSettings);
newHandleSettings.materials.push({ id: "handle-brass", label: "Latão escovado", kind: "color", color: "#9b754c", textureAsset: "", textureSize: "cover", groupIds: [], locked: false });
newHandleSettings.handleProducts[0].materialIds.push("handle-brass");
assert.deepEqual(settingsCore.validateConfiguratorSettings(newHandleSettings, catalog, priceBook, scene), [], "shared materials can be assigned to a specific handle model");
const invalidHandleMaterial = structuredClone(defaultSettings);
invalidHandleMaterial.materials[0].groupIds.push("handles-all");
assert.equal(settingsCore.validateConfiguratorSettings(invalidHandleMaterial, catalog, priceBook, scene).some((error) => error.includes("invalid material groups")), true, "a handle model cannot be registered as an MDF color");
const invalidHandleColor = structuredClone(newHandleSettings);
invalidHandleColor.handleProducts[0].materialIds = ["not-a-material"];
assert.equal(settingsCore.validateConfiguratorSettings(invalidHandleColor, catalog, priceBook, scene).some((error) => error.includes("invalid handle materials")), true, "handle material assignments only accept library entries");
assert.equal(defaultSettings.handleProducts.some((item) => item.priceEntryId === "none"), false, "absence options cannot receive color materials");
const invalidAbsenceHandle = structuredClone(defaultSettings);
invalidAbsenceHandle.handleProducts[0].priceEntryId = "none";
assert.equal(settingsCore.validateConfiguratorSettings(invalidAbsenceHandle, catalog, priceBook, scene).some((error) => error.includes("invalid handle product data")), true, "a generalized absence option cannot be registered as a colored handle");
const legacyHandleSettings = structuredClone(defaultSettings);
legacyHandleSettings.schemaVersion = "ConfiguratorAdministration2D 2.0";
legacyHandleSettings.materials = legacyHandleSettings.materials.filter((item) => item.id !== "handle-chrome");
legacyHandleSettings.handleProducts = legacyHandleSettings.handleProducts.map((item) => ({ id: item.id, label: item.label, description: item.description, priceEntryId: item.priceEntryId, colors: item.priceEntryId === "tango-chrome" ? [{ id: "chrome", label: "Cromado", color: "#b7b0a7" }] : [] }));
legacyHandleSettings.materials.push({ id: "handle-brass", label: "Latão escovado", kind: "color", color: "#9b754c", textureAsset: "", textureSize: "cover", groupIds: ["handles-all"], locked: false });
legacyHandleSettings.materialGroups.find((group) => group.id === "handles-all").materialIds = ["tango-iris", "ponto", "alca-colors"];
legacyHandleSettings.pricing.handleEntries["handle-brass"] = 15000;
const migratedHandles = settingsCore.normalizeConfiguratorSettings(legacyHandleSettings, catalog, priceBook, scene);
assert.equal(migratedHandles.materials.some((item) => item.id === "handle-brass"), false, "old handle colors are removed from the material library");
assert.equal(migratedHandles.materials.some((item) => item.id === "handle-tango-iris-chrome"), true, "old handle colors migrate into shared library materials");
assert.equal(migratedHandles.handleProducts[0].materialIds.includes("handle-tango-iris-chrome"), true, "migrated handle materials stay scoped to their model");
assert.deepEqual(migratedHandles.materialGroups.find((group) => group.id === "handles-all").materialIds, ["tango-iris", "ponto", "alca-colors"], "old handle availability migrates to product IDs");
const invalidExternalAsset = structuredClone(newMaterialSettings);
invalidExternalAsset.materials.find((material) => material.id === "stone-rose").textureAsset = "https://example.test/texture.png";
assert.equal(settingsCore.validateConfiguratorSettings(invalidExternalAsset, catalog, priceBook, scene).some((error) => error.includes("invalid material texture")), true);
const eventSettings = structuredClone(defaultSettings);
eventSettings.events[0] = { ...eventSettings.events[0], triggerId: "lighting-08", when: "enabled", valueMm: 425 };
assert.deepEqual(settingsCore.validateConfiguratorSettings(eventSettings, catalog, priceBook, scene), [], "event rules support activation-based depth changes");
const dimensionEventSettings = structuredClone(defaultSettings);
dimensionEventSettings.events = [{ id: "module-width-change", triggerId: "module-04", when: "enabled", action: "set-dimension", targetId: "module-03", dimension: "width", valueMm: 1100 }];
assert.deepEqual(settingsCore.validateConfiguratorSettings(dimensionEventSettings, catalog, priceBook, scene), [], "events may adjust supported dimensions on any catalog module");
dimensionEventSettings.events[0].dimension = "opacity";
assert.equal(settingsCore.validateConfiguratorSettings(dimensionEventSettings, catalog, priceBook, scene).some((error) => error.includes("invalid event")), true, "events reject unsupported module properties");
const itemStateEventSettings = structuredClone(defaultSettings);
itemStateEventSettings.events = [{ id: "disable-fridge-side", triggerId: "move-stone", when: "enabled", action: "set-enabled", targetId: "module-04", enabled: false }];
assert.deepEqual(settingsCore.validateConfiguratorSettings(itemStateEventSettings, catalog, priceBook, scene), [], "events may set module or service visibility from another item's state");
itemStateEventSettings.events[0].targetId = "not-a-catalog-item";
assert.equal(settingsCore.validateConfiguratorSettings(itemStateEventSettings, catalog, priceBook, scene).some((error) => error.includes("invalid event")), true, "events reject targets outside the catalog");
itemStateEventSettings.events = [
  { id: "disable-fridge-side", triggerId: "move-stone", when: "enabled", action: "set-enabled", targetId: "module-04", enabled: false },
  { id: "enable-fridge-side", triggerId: "tempered-glass", when: "disabled", action: "set-enabled", targetId: "module-04", enabled: true }
];
assert.equal(settingsCore.validateConfiguratorSettings(itemStateEventSettings, catalog, priceBook, scene).some((error) => error.includes("conflicting event target")), true, "events reject ambiguous state overrides");
const eventSourceState = core.createInitialState(scene);
const eventResult = settingsCore.resolveEventState(scene, eventSourceState, [{ triggerId: "move-stone", when: "enabled", action: "set-enabled", targetId: "module-04", enabled: false }], defaultSettings.dependencies);
assert.equal(eventResult.visibilityByEntity["module-04"], false, "active events override the module state at runtime");
assert.equal(eventSourceState.visibilityByEntity["module-04"], true, "event overrides leave the user's saved module selection untouched");
const serviceEventResult = settingsCore.resolveEventState(scene, eventSourceState, [{ triggerId: "module-04", when: "enabled", action: "set-enabled", targetId: "move-stone", enabled: false }], defaultSettings.dependencies);
assert.equal(serviceEventResult.globalSelections.serviceIds.includes("move-stone"), false, "active events can enable or disable services at runtime");
const dependencyEventResult = settingsCore.resolveEventState(scene, eventSourceState, [{ triggerId: "move-stone", when: "enabled", action: "set-enabled", targetId: "lighting-08", enabled: true }], defaultSettings.dependencies);
assert.equal(dependencyEventResult.visibilityByEntity["module-04"], true, "event activation selects required modules");
assert.equal(dependencyEventResult.visibilityByEntity["module-06"], true, "event activation selects all required modules");
const dependencyCycleSettings = structuredClone(defaultSettings);
dependencyCycleSettings.dependencies.push({ id: "side-requires-lighting", dependentId: "module-04", requires: ["lighting-08"] });
assert.equal(settingsCore.validateConfiguratorSettings(dependencyCycleSettings, catalog, priceBook, scene).includes("dependency cycle is not allowed"), true);
const legacySettings = structuredClone(defaultSettings);
legacySettings.schemaVersion = "ConfiguratorAdministration2D 1.0";
delete legacySettings.materials; delete legacySettings.materialGroups; delete legacySettings.initialState; delete legacySettings.dependencies; delete legacySettings.events; delete legacySettings.objectAssets;
const migratedLegacy = settingsCore.normalizeConfiguratorSettings(legacySettings, catalog, priceBook, scene);
assert.equal(migratedLegacy.schemaVersion, "ConfiguratorAdministration2D 3.0");
const scopedFinishSettings = structuredClone(defaultSettings);
scopedFinishSettings.finishes.find((finish) => finish.id === "cocoa").scope = "local";
scopedFinishSettings.finishes.find((finish) => finish.id === "cocoa").moduleIds = ["module-05"];
assert.deepEqual(settingsCore.validateConfiguratorSettings(scopedFinishSettings, catalog, priceBook, scene), [], "local finish scope is restricted to selected modules");
const invalidPricingSettings = structuredClone(defaultSettings);
invalidPricingSettings.pricing.entries["unreviewed-module"] = 100;
assert.equal(settingsCore.validateConfiguratorSettings(invalidPricingSettings, catalog, priceBook, scene).includes("pricing identifiers must match: entries"), true);

const officialModulePrices = [90000, 110000, 150000, 60000, 80000, 110000, 60000];
catalog.modules.forEach((module, index) => {
  assert.equal(priceBook.pricing.roles.itemBase[module.entityId].cents, officialModulePrices[index], module.entityId);
  assert.equal(module.dimensions.displayPolicy, "nominal", module.entityId);
  assert.equal(module.dimensions.evidence.some((entry) => entry.source === "promob-dxf" && entry.status === "confirmed"), true, module.entityId);
});
assert.equal(priceBook.pricing.roles.itemBase["lighting-08"].cents, 60000);
assert.equal(priceBook.pricing.roles.localAdjustment["module-02:mandatory-cooktop-stone"].cents, 56600);
assert.equal(priceBook.pricing.roles.globalAdjustment["stone-light-sink"].cents, 169900);
assert.equal(priceBook.pricing.roles.globalAdjustment["stone-cloud"].cents, 219900);
assert.equal(priceBook.pricing.roles.globalAdjustment["stone-grove"].cents, 219900);
assert.equal(priceBook.pricing.roles.globalAdjustment["stone-night"].cents, 219900);
assert.equal(priceBook.pricing.roles.globalAdjustment["stone-skirting"].cents, 18500);
assert.equal(priceBook.pricing.roles.globalAdjustment["move-stone"].cents, 39900);
assert.equal(priceBook.pricing.roles.globalAdjustment["tempered-glass"].cents, 39000);

const chargeableFronts = catalog.modules
  .filter((module) => module.commercial.handleEligible)
  .reduce((total, module) => total + module.commercial.handleFrontCount, 0);
assert.equal(chargeableFronts, 14);
assert.equal(priceBook.pricing.allocation.handleFrontTotal, chargeableFronts);

const nonRepresentablePriceBook = structuredClone(priceBook);
nonRepresentablePriceBook.pricing.roles.frontFinishAdjustment.cocoa = { type: "amount", cents: 15000 };
assert.throws(
  () => settingsCore.createDefaultAdministration(settingsDefaults, catalog, nonRepresentablePriceBook, scene),
  /price book pricing is not v3-compatible/,
  "current v3 configuration seam fails closed for a typed price source it cannot represent"
);
assert.equal(
  settingsCore.validateConfiguratorSettings(defaultSettings, catalog, nonRepresentablePriceBook, scene)
    .some((error) => error.includes("price book pricing is not v3-compatible")),
  true,
  "v3 validation reports the non-representable typed price source instead of coercing it"
);

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
const structureMaskPaths = ["01", "02", "03", "04", "05", "06", "07"].flatMap((key) => [
  `assets/kitchen/masks/structure-${key}-shadow.png`,
  `assets/kitchen/masks/structure-${key}-highlight.png`
]);
structureMaskPaths.forEach((asset) => {
  assert.equal(fs.statSync(path.join(projectRoot, asset)).size > 0, true, asset);
  assert.equal(typeof masks[asset], "string", asset + " inline source");
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
const baseStructure = finishes.resolveStructureStrength(catalog.options.finishes[0], catalog.options.finishes[0].color);
assert.equal(baseStructure.luminance, 0.9242);
assert.equal(Math.abs(baseStructure.shadowOpacity - 0.3934410990625) < 0.000001, true, "base finish seam shadow");
assert.equal(baseStructure.highlightOpacity, 0);

const defaultState = core.createInitialState(scene);
assert.equal(defaultState.moduleSelections, undefined);
assert.equal(Object.hasOwn(defaultState, "stoneColor"), false);
assert.equal(Object.hasOwn(defaultState, "stoneFinishId"), false);
assert.equal(core.globalFinishId(defaultState), "base-light");
assert.equal(core.globalHandleId(defaultState), "none");
assert.deepEqual(Array.from(defaultState.globalSelections.serviceIds), ["move-stone", "stone-skirting", "tempered-glass"]);
assert.equal(resolved(defaultState)["lighting-08"].visible, true);
assert.deepEqual(Array.from(scene.entities.find((entity) => entity.id === "lighting-08").requiresVisibleIds), []);
assert.deepEqual(defaultSettings.dependencies.find((rule) => rule.dependentId === "lighting-08").requires, ["module-04", "module-06"]);
const module04Entity = scene.entities.find((entity) => entity.id === "module-04");
assert.equal(module04Entity.markerPlacement?.side, "right", "M04 has a semantic marker override beside the narrow panel");
assert.equal(module04Entity.finishMaskVariants[0].requiresVisibleIds, undefined, "M04/M06 is not a configuration dependency");
assert.deepEqual(Array.from(module04Entity.finishMaskVariants[0].visibleWithIds), ["module-06"], "M04 mask changes only at the visual overlap");
const initialFingerprint = fingerprints.computeFingerprint(scene, defaultState);
let estimate = pricing.calculatePublicEstimate(scene, defaultState, catalog, resolved(defaultState), typedPricingFixture, pricingMetadata);
assert.equal(estimate.status, "estimate");
assert.equal(estimate.totalCents, 874000);
assert.deepEqual(
  {
    modules: estimate.breakdown.modulesCents,
    local: estimate.breakdown.localCents,
    finishes: estimate.breakdown.finishesCents,
    handles: estimate.breakdown.handlesCents,
    global: estimate.global.totalCents
  },
  { modules: 660000, local: 56600, finishes: 0, handles: 0, global: 157400 }
);
assert.equal(
  estimate.moduleEstimates.find((entry) => entry.item.entityId === "module-06").estimate.totalCents,
  110000,
  "module price excludes global stone and service choices"
);

// The remaining price assertions isolate the default opt-in package so their
// totals remain a gate for each commercial rule rather than UI defaults.
const state = core.createInitialState(scene);
core.setGlobalSelection(state, { serviceIds: [] });
core.setEntityVisibility(state, "lighting-08", false);
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), typedPricingFixture, pricingMetadata);
assert.equal(estimate.totalCents, 716600);

core.setGlobalSelection(state, { finishId: "cocoa" });
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), typedPricingFixture, pricingMetadata);
assert.equal(estimate.breakdown.finishesCents, 99000);
assert.equal(estimate.totalCents, 815600);
const localFinishState = structuredClone(state);
core.setLocalFinish(localFinishState, "module-05", "fiber");
const localFinishEstimate = pricing.calculatePublicEstimate(scene, localFinishState, catalog, resolved(localFinishState), typedPricingFixture, pricingMetadata);
assert.equal(localFinishEstimate.moduleEstimates.find((entry) => entry.item.entityId === "module-05").estimate.finishId, "fiber");
assert.equal(localFinishEstimate.moduleEstimates.find((entry) => entry.item.entityId === "module-05").estimate.finishCents, 20000);
assert.equal(localFinishEstimate.moduleEstimates.find((entry) => entry.item.entityId === "module-03").estimate.finishId, "cocoa", "global finish remains active on modules without a local override");

core.setGlobalSelection(state, { handleId: "tango-chrome" });
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), typedPricingFixture, pricingMetadata);
assert.equal(estimate.breakdown.handlesCents, 17985);
assert.equal(estimate.moduleEstimates.reduce((sum, entry) => sum + entry.estimate.handleCents, 0), 17985);
assert.equal(estimate.moduleEstimates.find((entry) => entry.item.entityId === "module-02").estimate.handleCents, 0);
assert.equal(estimate.totalCents, 833585);
assert.deepEqual(
  Object.fromEntries(estimate.moduleEstimates.map(({ item, estimate: itemEstimate }) => [item.entityId, itemEstimate.handleCents])),
  {
    "module-01": 2570,
    "module-02": 0,
    "module-03": 7710,
    "module-04": 0,
    "module-05": 2569,
    "module-06": 2568,
    "module-07": 2568
  },
  "typed runtime preserves exact handle remainder allocation"
);

core.setEntityVisibility(state, "module-01", false);
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), typedPricingFixture, pricingMetadata);
assert.equal(estimate.breakdown.handlesCents, 15415);
assert.equal(estimate.totalCents, 727515);

const withoutModule03 = core.createInitialState(scene);
core.setGlobalSelection(withoutModule03, { handleId: "tango-chrome" });
core.setEntityVisibility(withoutModule03, "module-03", false);
estimate = pricing.calculatePublicEstimate(scene, withoutModule03, catalog, resolved(withoutModule03), typedPricingFixture, pricingMetadata);
assert.equal(estimate.breakdown.handlesCents, 10275);

const withoutModule06 = core.createInitialState(scene);
core.setGlobalSelection(withoutModule06, { handleId: "tango-chrome" });
core.setEntityVisibility(withoutModule06, "module-06", false);
estimate = pricing.calculatePublicEstimate(scene, withoutModule06, catalog, resolved(withoutModule06), typedPricingFixture, pricingMetadata);
assert.equal(estimate.breakdown.handlesCents, 15417);

core.setEntityVisibility(state, "module-01", true);
core.setGlobalSelection(state, { finishId: "shadow", handleId: "none", stonePackageId: "stone-light-sink" });
core.setGlobalService(state, "stone-skirting", true);
core.setGlobalService(state, "move-stone", true);
core.setGlobalService(state, "tempered-glass", true);
core.setEntityVisibility(state, "lighting-08", true);
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), typedPricingFixture, pricingMetadata);
assert.equal(estimate.breakdown.finishesCents, 165000);
assert.equal(estimate.global.totalCents, 327300);
assert.equal(estimate.totalCents, 1208900);

core.setEntityVisibility(state, "module-02", false);
estimate = pricing.calculatePublicEstimate(scene, state, catalog, resolved(state), typedPricingFixture, pricingMetadata);
assert.equal(estimate.breakdown.localCents, 0);
assert.equal(estimate.breakdown.modulesCents, 550000);
assert.equal(estimate.totalCents, 1014800);

core.setEntityVisibility(state, "module-04", false);
const noModule04 = resolved(state);
assert.equal(noModule04["module-06"].visible, true);
assert.equal(noModule04["module-07"].visible, true);
assert.equal(noModule04["lighting-08"].visible, true, "scene geometry stays independent of admin-configured item dependencies");
assert.deepEqual(defaultSettings.dependencies.find((rule) => rule.dependentId === "lighting-08").requires, ["module-04", "module-06"]);

const withoutModule06Requirement = core.createInitialState(scene);
core.setEntityVisibility(withoutModule06Requirement, "module-06", false);
const noModule06 = resolved(withoutModule06Requirement);
assert.equal(noModule06["module-04"].visible, true);
assert.equal(noModule06["module-07"].visible, true);
assert.equal(noModule06["lighting-08"].visible, true, "administration applies the editable requirement at runtime");

const zeroModuleState = core.createInitialState(scene);
core.setGlobalSelection(zeroModuleState, { stonePackageId: "stone-light-sink", serviceIds: [] });
core.setGlobalService(zeroModuleState, "move-stone", true);
core.setAllControllableVisibility(scene, zeroModuleState, false);
estimate = pricing.calculatePublicEstimate(scene, zeroModuleState, catalog, resolved(zeroModuleState), typedPricingFixture, pricingMetadata);
assert.equal(estimate.breakdown.globalCents, 209800);
assert.equal(estimate.totalCents, 209800);

const oneModuleState = core.createInitialState(scene);
core.setGlobalSelection(oneModuleState, { stonePackageId: "stone-light-sink", serviceIds: [] });
core.setGlobalService(oneModuleState, "move-stone", true);
core.setAllControllableVisibility(scene, oneModuleState, false);
core.setEntityVisibility(oneModuleState, "module-03", true);
estimate = pricing.calculatePublicEstimate(scene, oneModuleState, catalog, resolved(oneModuleState), typedPricingFixture, pricingMetadata);
assert.equal(estimate.totalCents, 359800);

const syntheticScene = {
  entities: [
    { id: "synthetic-a", kind: "module" },
    { id: "synthetic-b", kind: "module" }
  ]
};
const syntheticCatalog = {
  modules: [
    { entityId: "synthetic-a", commercial: { finishEligible: true, handleEligible: false, handleFrontCount: 0, mandatoryLocalChargeIds: [] } },
    { entityId: "synthetic-b", commercial: { finishEligible: true, handleEligible: false, handleFrontCount: 0, mandatoryLocalChargeIds: [] } }
  ]
};
const syntheticState = {
  localSelections: { finishByEntityId: {} },
  globalSelections: { finishId: "cocoa", handleId: "none", stonePackageId: "stone-existing", serviceIds: [] }
};
const syntheticVisibility = {
  "synthetic-a": { visible: true },
  "synthetic-b": { visible: true }
};
const syntheticPercentageRules = {
  schemaVersion: pricingContract.SCHEMA,
  roles: {
    itemBase: {
      "synthetic-a": { type: "amount", cents: 10 },
      "synthetic-b": { type: "amount", cents: 10 }
    },
    handleChoiceTotal: { none: { type: "amount", cents: 0 } },
    frontFinishAdjustment: { cocoa: { type: "percentage", bps: 1500, basis: "eligible-module-base" } },
    localAdjustment: {},
    globalAdjustment: { "stone-existing": { type: "amount", cents: 0 } }
  },
  allocation: { handleFrontTotal: 1 }
};
assert.deepEqual(pricingContract.validate(syntheticPercentageRules), []);
const syntheticPercentageEstimate = pricing.calculatePublicEstimate(
  syntheticScene,
  syntheticState,
  syntheticCatalog,
  syntheticVisibility,
  syntheticPercentageRules
);
assert.equal(syntheticPercentageEstimate.breakdown.finishesCents, 4, "percentage rounding occurs per eligible module before summation");
assert.equal(syntheticPercentageEstimate.totalCents, 24, "per-module rounding differs from subtotal percentage rounding");

const syntheticAmountRules = structuredClone(syntheticPercentageRules);
syntheticAmountRules.roles.frontFinishAdjustment.cocoa = { type: "amount", cents: 7 };
assert.deepEqual(pricingContract.validate(syntheticAmountRules), []);
const syntheticAmountEstimate = pricing.calculatePublicEstimate(
  syntheticScene,
  syntheticState,
  syntheticCatalog,
  syntheticVisibility,
  syntheticAmountRules
);
assert.equal(syntheticAmountEstimate.breakdown.finishesCents, 14, "finish amount applies once per eligible visible module");
assert.equal(syntheticAmountEstimate.totalCents, 34);

const fingerprintBeforeUi = fingerprints.computeFingerprint(scene, state);
state.selectedEntityId = "module-03";
assert.equal(fingerprints.computeFingerprint(scene, state), fingerprintBeforeUi);
assert.equal(initialFingerprint.startsWith("scene2d-"), true);

let visibilityState = resolved(core.createInitialState(scene));
assert.equal(finishes.resolveMaskAsset(module04Entity, visibilityState), "assets/kitchen/masks/04-with-06-seam.png");
const visibilityProbe = core.createInitialState(scene);
core.setEntityVisibility(visibilityProbe, "module-06", false);
visibilityState = resolved(visibilityProbe);
assert.equal(finishes.resolveMaskAsset(module04Entity, visibilityState), "assets/kitchen/masks/04.png");

const indexHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(projectRoot, "styles.css"), "utf8");
const adminHtml = fs.readFileSync(path.join(projectRoot, "admin.html"), "utf8");
const adminJs = fs.readFileSync(path.join(projectRoot, "admin/admin.js"), "utf8");
const adminCss = fs.readFileSync(path.join(projectRoot, "admin/admin.css"), "utf8");
const pricingSource = fs.readFileSync(path.join(projectRoot, "core/pricing.js"), "utf8");
const configurationSource = fs.readFileSync(path.join(projectRoot, "core/configuration.js"), "utf8");
const priceBookSource = fs.readFileSync(path.join(projectRoot, "data/mock-price-book.js"), "utf8");
assert.equal(indexHtml.includes("data/mock-price-book.js?v=runtime-v38"), true, "buyer cache revision declares PriceBook 2.0");
assert.equal(indexHtml.includes("core/pricing-contract.js?v=runtime-v38"), true, "buyer loads the typed pricing contract");
assert.equal(indexHtml.indexOf("core/pricing-contract.js?v=runtime-v38") < indexHtml.indexOf("core/configuration.js?v=admin-config-v8"), true, "pricing contract loads before the v3 compatibility core");
assert.equal(indexHtml.indexOf("core/pricing-contract.js?v=runtime-v38") < indexHtml.indexOf("core/pricing.js?v=runtime-v38"), true, "pricing contract loads before calculator");
assert.equal(indexHtml.includes("core/pricing.js?v=runtime-v38"), true, "typed pricing calculator cache revision is explicit");
assert.equal(indexHtml.includes("app.js?v=runtime-v38"), true, "PriceBook 2.0 buyer cache revision is explicit");
["frontFinishRatesBps", "handleEntries", "localEntries", "globalEntries"].forEach((legacyBucket) => {
  assert.equal(pricingSource.includes(legacyBucket), false, `calculator no longer reads legacy pricing bucket: ${legacyBucket}`);
});
assert.equal(appJs.includes("pricingContract.normalize(priceBook.pricing)"), true, "initial buyer pricing authority comes directly from PriceBook 2.0 typed rules");
assert.equal(appJs.includes("pricingContract.upgradeLegacy(normalized.pricing)"), true, "published legacy pricing is migrated at the compatibility seam");
["priceBook.handleEntries", "priceBook.frontFinishRatesBps", "priceBook.localEntries", "priceBook.globalEntries", "priceBook.entries", "priceBook.handleFrontTotal"].forEach((legacyRead) => {
  assert.equal(appJs.includes(legacyRead), false, `buyer no longer reads legacy PriceBook field: ${legacyRead}`);
  assert.equal(adminJs.includes(legacyRead), false, `admin no longer reads legacy PriceBook field: ${legacyRead}`);
});
assert.equal(appJs.includes("pricing.itemEstimate(product, catalog, state, pricingRules)"), true, "module-detail fallback consumes typed pricing rules");
assert.equal(appJs.includes("priceBook = { ...priceBook, ...normalized.pricing }"), false, "buyer no longer rebuilds a mutable legacy-shaped PriceBook");
assert.equal(adminJs.includes("pricingContract.normalize(priceBook.pricing)"), true, "admin initializes catalog pricing directly from PriceBook 2.0");
assert.equal(priceBookSource.includes('schemaVersion: "CommercialEstimatePriceBook 2.0"'), true, "public price source declares PriceBook 2.0");
assert.equal(configurationSource.includes("pricingContract.projectToLegacy(priceBook.pricing)"), true, "v3 configuration core owns the explicit typed-to-legacy PriceBook projection seam");

assert.equal((adminHtml.match(/data-password-reveal=/g) || []).length, 2, "admin exposes exactly two password reveal controls");
assert.equal(adminHtml.includes('data-password-reveal="passwordInput"'), true, "login password reveal targets the current-password field");
assert.equal(adminHtml.includes('data-password-reveal="newPasswordInput"'), true, "recovery password reveal targets the new-password field");
assert.equal((adminHtml.match(/class="password-reveal" type="button"/g) || []).length, 2, "password reveal controls are non-submit buttons");
assert.equal(adminHtml.includes('autocomplete="current-password"'), true, "login password autocomplete remains intact");
assert.equal(adminHtml.includes('autocomplete="new-password" minlength="8"'), true, "new-password autocomplete and minimum length remain intact");
assert.equal(adminJs.includes("function syncPasswordReveal(button)"), true, "admin uses one local password reveal helper");
assert.equal(adminJs.includes('input.type = input.type === "password" ? "text" : "password";'), true, "password reveal toggles presentation only");
assert.equal(adminJs.includes('byId("passwordInput").value'), true, "login continues reading the same password value");
assert.equal(adminJs.includes('byId("newPasswordInput").value'), true, "password update continues reading the same new-password value");
assert.equal(adminCss.includes(".password-field"), true, "admin reveal control has local field layout");
assert.equal(adminHtml.includes("admin/admin.css?v=admin-pricing-v2"), true, "admin pricing authoring CSS cache revision is explicit");
assert.equal(adminHtml.includes("admin/admin.bundle.js?v=admin-pricing-v3"), true, "admin PriceBook 2.0 bundle cache revision is explicit");
assert.equal(adminHtml.includes("core/pricing-contract.js?v=pricing-contract-v1"), true, "admin explicitly loads the typed pricing contract");
assert.equal(adminHtml.includes("data/mock-price-book.js?v=admin-data-v4"), true, "admin loads the PriceBook 2.0 cache revision");
assert.equal(adminHtml.includes("core/configuration.js?v=admin-config-v8"), true, "admin loads the v3 compatibility core revision");
assert.equal(
  adminHtml.indexOf("core/pricing-contract.js?v=pricing-contract-v1") < adminHtml.indexOf("core/configuration.js?v=admin-config-v8"),
  true,
  "admin pricing contract loads before the v3 compatibility core"
);

assert.equal(adminHtml.includes("core/administration-v5.js?v=cp-sd-05a3a-v1"), true, "admin v5 cache revision declares typed pricing ownership");
assert.equal(
  adminHtml.indexOf("core/pricing-contract.js?v=pricing-contract-v1") < adminHtml.indexOf("core/administration-v5.js?v=cp-sd-05a3a-v1"),
  true,
  "typed pricing contract loads before administration v5"
);
assert.equal(adminJs.includes("const pricingRoles = ["), true, "admin pricing groups are keyed by typed roles");
assert.equal(adminJs.includes("priceSections"), false, "admin no longer owns pricing type through legacy bucket sections");
assert.equal(adminJs.includes("model.pricing.roles[role]"), true, "admin pricing renderer consumes typed role maps");
assert.equal(adminJs.includes('rule.type === "percentage"'), true, "admin unit/value rendering comes from each typed rule");
assert.equal(adminJs.includes("data-price-section"), false, "admin inputs no longer address legacy pricing buckets");
assert.equal(adminJs.includes("model.pricing.frontFinishRatesBps"), false, "admin has no legacy finish bucket authority");
assert.equal(adminJs.includes("model.pricing.handleEntries"), false, "admin has no legacy handle bucket authority");
assert.equal(adminJs.includes("model.pricing.globalEntries"), false, "admin has no legacy global bucket authority");
assert.equal(adminJs.includes("pricingContract.ROLE_CAPABILITIES[role]"), true, "pricing type choices derive from contract role capabilities");
assert.equal(adminJs.includes("select.dataset.priceRuleType"), true, "dual-type pricing rows expose an explicit type selector");
assert.equal(adminJs.includes('{ type: "amount", cents: 0 }'), true, "percentage to amount switching resets the numeric value instead of converting units");
assert.equal(adminJs.includes('{ type: "percentage", bps: 0, basis }'), true, "amount to percentage switching resets BPS and restores the contract basis");
assert.equal(adminJs.includes("O valor foi zerado para evitar conversão implícita"), true, "admin explains zero-on-type-switch behavior");
assert.equal(adminJs.includes('projection.code === "pricing_requires_publication"'), true, "non-representable typed pricing is blocked before legacy publication");
assert.equal(adminCss.includes(".pricing-field--typed"), true, "dual-type pricing rows have a dedicated compact layout");
assert.equal(adminCss.includes(".pricing-basis"), true, "percentage basis copy has an explicit admin style hook");
assert.equal(indexHtml.includes("Acabamentos por módulo"), false);
assert.equal(indexHtml.includes("finishTargetSelect"), false);
assert.equal(indexHtml.includes('data-compact-label="Acab."'), false, "stage compact labels are no longer pre-authored in static navigation");
assert.equal(indexHtml.includes('data-compact-label="Serv."'), false, "stage compact labels are no longer pre-authored in static navigation");
assert.equal(indexHtml.includes('data-step="modules"'), false, "static stage buttons are absent");
assert.equal(appJs.includes('finishes: "Acab."'), true, "runtime stage projection preserves the compact Acabamentos label");
assert.equal(appJs.includes('services: "Serv."'), true, "runtime stage projection preserves the compact Serviços label");
assert.equal(indexHtml.includes('data-flow-item-id="fronts-all"'), true, "Fronts item adapter exposes stable flow ownership");
assert.equal(indexHtml.includes('data-keyboard-section="fronts"'), false, "Fronts semantic section is no longer pre-authored in static HTML");
assert.equal(indexHtml.includes('id="frontsSectionHeading"'), false, "Fronts heading identity is no longer static");
assert.equal(indexHtml.includes(">Cor das frentes</h3>"), false, "Fronts section heading copy comes from normalized data");
assert.equal(indexHtml.includes('data-flow-slot-item="fronts-all"'), true, "Fronts neutral slot declares item affinity without owning the section");
assert.equal(indexHtml.includes('data-flow-item-id="handles-all"'), true, "Handles item adapter exposes stable flow ownership");
assert.equal(indexHtml.includes('data-keyboard-section="handles"'), false, "Handles semantic section is no longer pre-authored in static HTML");
assert.equal(indexHtml.includes('id="handlesSectionHeading"'), false, "Handles heading identity is no longer static");
assert.equal(indexHtml.includes(">Puxadores</h3>"), false, "Handles section heading copy comes from normalized data");
assert.equal(indexHtml.includes('data-flow-slot-item="handles-all"'), true, "Handles neutral slot declares item affinity without owning the section");
assert.equal(indexHtml.includes('data-flow-item-id="stone-all"'), true, "Stone Packages item adapter exposes stable flow ownership");
assert.equal(indexHtml.includes('data-keyboard-section="stone-packages"'), false, "Stone Packages semantic section is no longer pre-authored in static HTML");
assert.equal(indexHtml.includes('id="stonePackagesSectionHeading"'), false, "Stone Packages heading identity is no longer static");
assert.equal(indexHtml.includes(">Pacote de pedra</h3>"), false, "Stone Packages section heading copy comes from normalized data");
assert.equal(indexHtml.includes('data-flow-slot-item="stone-all"'), true, "Stone Packages neutral slot declares stone-all affinity without owning the section");
assert.equal(indexHtml.includes('data-flow-item-id="stone-skirting"'), true, "Stone Skirting item adapter exposes stable flow ownership");
assert.equal(indexHtml.includes('data-keyboard-section="stone-skirting"'), false, "Stone Skirting semantic section is no longer pre-authored in static HTML");
assert.equal(indexHtml.includes('id="stoneSkirtingSectionHeading"'), false, "Stone Skirting heading identity is no longer static");
assert.equal(indexHtml.includes(">Rodapé de pedra</h3>"), false, "Stone Skirting section heading copy comes from normalized data");
assert.equal(indexHtml.includes('data-flow-slot-item="stone-skirting"'), true, "Stone Skirting neutral slot declares item affinity without owning the section");
assert.equal(/id="summaryPanel"[^>]*data-render-component="action-list"/.test(indexHtml), false, "Summary stage root no longer owns the action-list binding");
assert.equal(indexHtml.includes('data-flow-group-grid="summary"'), false, "Summary group grid no longer pre-authors the historical stage id");
assert.equal(indexHtml.includes('data-flow-group-grid="finishes"'), false, "Finishes group grid no longer pre-authors the historical stage id");
assert.equal(indexHtml.includes('data-flow-group-grid="services"'), false, "Services group grid no longer pre-authors the historical stage id");
assert.equal((indexHtml.match(/\bdata-flow-group-grid(?=[\s>])/g) || []).length, 3, "generic non-Modules core roots retain exactly one neutral group-grid host each");
assert.equal(appJs.includes('querySelectorAll(":scope > [data-flow-group-grid]")'), true, "generic stage mounting resolves a neutral group-grid host inside the visual root");
assert.equal(appJs.includes("grid.dataset.flowGroupGrid = stageId"), true, "normalized stage id claims the neutral group-grid host at runtime");
assert.equal(appJs.includes("ambiguous-group-grid"), true, "multiple neutral group-grid hosts fail closed");
assert.equal(/mountStageGroups\("(?:finishes|services|summary)"/.test(appJs), false, "generic core-stage dispatcher does not hardcode historical Finishes/Services/Summary ids");
assert.equal(indexHtml.includes('data-flow-slot-item="summary"'), true, "Summary neutral slot declares summary item affinity");
assert.equal(indexHtml.includes('data-flow-section-heading-class="sr-only"'), true, "Summary semantic heading remains accessible without duplicate visible copy");
assert.equal((indexHtml.match(/id="summaryContent"/g) || []).length, 1, "Summary domain content host remains unique");
assert.equal(appJs.includes("validateSingleSectionStageBinding"), false, "Summary special-case single-section binding helper is retired");
assert.equal(appJs.includes("flowSectionHeadingClass"), true, "section shell builder supports a generic optional heading class hook");
assert.equal(indexHtml.includes('data-flow-item-id="lighting-08"'), true, "specialized Lighting item adapter exposes stable flow ownership");
assert.equal(indexHtml.includes('data-keyboard-section="lighting"'), false, "Lighting semantic section is no longer pre-authored in static HTML");
assert.equal(indexHtml.includes('id="lightingSectionHeading"'), false, "Lighting heading identity is no longer static");
assert.equal(indexHtml.includes(">Iluminação</h3>"), false, "Lighting section heading copy comes from normalized data");
assert.equal(indexHtml.includes('data-flow-slot-item="lighting-08"'), true, "Lighting neutral slot declares item affinity without owning the section");
assert.equal(indexHtml.includes("data/hierarchy-defaults.js?v=hierarchy-defaults-v2"), true, "legacy hierarchy semantics load from explicit configuration data");
assert.equal(appJs.includes("publishNormalizedFlow"), true, "app publishes one normalized flow contract to navigation");
assert.equal(appJs.includes("applyBuyerFlowLayout"), true, "buyer composition is mounted from normalized flow layout");
assert.equal((indexHtml.match(/core\/layout-profiles\.js/g) || []).length, 1, "layout profile resolver loads exactly once");
assert.equal(
  indexHtml.indexOf("core/layout-profiles.js?v=cp-sd-01c1-v1") < indexHtml.indexOf("styles.css?v=runtime-v37"),
  true,
  "canonical layout profile resolves before public topology CSS to avoid first-paint profile drift"
);
assert.equal(indexHtml.includes("window.CasaModulesLayoutProfiles.profileForWidth(window.innerWidth)"), true, "initial root profile marker consumes the canonical resolver");
assert.equal(styles.includes("@media (max-width: 1050px)"), false, "application topology no longer owns the stacked breakpoint in CSS");
assert.equal(styles.includes("@media (min-width: 1051px)"), false, "application topology no longer owns the side-rail breakpoint in CSS");
assert.equal(styles.includes("@media (min-width: 701px) and (max-width: 1050px)"), false, "stacked topology no longer duplicates canonical profile thresholds");
assert.equal(styles.includes('html[data-layout-profile="side-rail"]'), true, "side-rail topology consumes the canonical profile marker");
assert.equal(styles.includes('html[data-layout-profile="stacked"]'), true, "stacked topology consumes the canonical profile marker");
assert.equal(styles.includes('html[data-layout-profile="compact"]'), true, "compact topology consumes the canonical profile marker");
assert.equal(styles.includes("@container modules-stage (max-width: 520px)"), true, "Modules local content-fit query remains container-owned");
assert.equal(styles.includes("@container cabinet-finishes (max-width: 430px)"), true, "Cabinet Finishes local content-fit query remains container-owned");
assert.equal(styles.includes("@container flow-stage (max-width: 300px)"), true, "flow-stage local content-fit query remains container-owned");
assert.equal(styles.includes("@container flow-steps (max-width: 500px)"), true, "navigation compact-label fit remains container-owned");
assert.equal(indexHtml.includes('data-stage-view-layout="modules"'), true, "modules expose a view-level two-pane renderer contract");
assert.equal((indexHtml.match(/data-stage-view-id="modules-list"/g) || []).length, 1, "Modules list has exactly one policy view adapter");
assert.equal((indexHtml.match(/data-stage-view-id="modules-detail"/g) || []).length, 1, "Modules detail has exactly one policy view adapter");
assert.equal(indexHtml.includes('data-stage-pane="list"'), true, "legacy Modules list pane hook remains during projection migration");
assert.equal(indexHtml.includes('data-stage-pane="detail"'), true, "legacy Modules detail pane hook remains during projection migration");
assert.equal(appJs.includes("applyModuleViewMarkers"), true, "Modules policy view records are projected onto stable pane adapters");
assert.equal(appJs.includes("syncModuleViewVisibility"), true, "Modules compact replace has one runtime pane-visibility synchronizer");
assert.equal(appJs.includes("rememberModuleViewScrollPositions"), true, "stacked Modules pane scroll positions are remembered before profile topology changes");
assert.equal(appJs.includes("restoreModuleViewScrollPositions"), true, "remembered stacked Modules pane scroll positions are restored when stacked topology returns");
assert.equal(appJs.includes('companionView.projection === "replace"'), true, "Modules pane visibility consumes the policy projection marker");
assert.equal(appJs.includes("primary.hidden = primaryWillHide"), true, "primary pane visibility is synchronized without DOM reparenting");
assert.equal(appJs.includes("companion.hidden = companionWillHide"), true, "companion pane visibility is synchronized without DOM reparenting");
assert.equal(appJs.includes("container.append(pane)"), false, "policy view binding does not reorder physical Modules panes or reset pane scroll");
assert.equal(indexHtml.includes('data-flow-group-shell="cabinet-finishes"'), false, "Cabinet Finishes group identity is no longer pre-authored in static HTML");
assert.equal(indexHtml.includes('data-flow-group-slot="cabinet-finishes"'), true, "Cabinet Finishes keeps only a hidden neutral group renderer slot");
assert.equal(indexHtml.includes('data-flow-group-label'), true, "Cabinet Finishes visible group label has a normalized-flow population hook");
assert.equal(indexHtml.includes(">Acabamentos do conjunto</h2>"), false, "Cabinet Finishes group heading copy comes from normalized flow");
assert.equal(indexHtml.includes('data-flow-group-shell="stone"'), false, "Stone group identity is no longer pre-authored in static HTML");
assert.equal(indexHtml.includes('data-flow-group-slot="stone"'), true, "Stone keeps only a hidden neutral group renderer slot");
assert.equal(/id="stonePanel"[^>]*data-configurable-item="stone-all"/.test(indexHtml), false, "Stone group no longer duplicates stone-all availability ownership");
assert.equal(indexHtml.includes(">Pedra do conjunto</h2>"), false, "Stone group heading copy comes from normalized flow");
assert.equal(appJs.includes("flowGroupSlot"), true, "group shell builder supports generic neutral group-slot affinity");
assert.equal(appJs.includes("ambiguous-group-slot"), true, "ambiguous neutral group-slot bindings fail closed");
assert.equal(appJs.includes("delete shell.dataset.flowGroupShell"), true, "stale claimed group slots return to neutral state when normalized groups disappear");
assert.equal(appJs.includes('candidate.closest("[hidden]")'), true, "stage-entry heading selection ignores hidden group adapters");
assert.equal(appJs.includes("stageItems("), false, "Services checklist no longer derives membership from whole-stage items");
assert.equal(appJs.includes("boundFlowSectionFor"), true, "generic checklist adapters can resolve their owning normalized section");
assert.equal(appJs.includes("section.itemIds.map((id) => serviceById.get(id))"), true, "Services checklist membership and order come from normalized section itemIds");
assert.equal(appJs.includes('stageItems("services")'), false, "Services renderer contains no legacy stage-level membership lookup");
assert.equal(indexHtml.includes('data-flow-group-shell="services"'), false, "Services group identity is no longer pre-authored in static HTML");
assert.equal(indexHtml.includes('data-flow-group-class="flow-group-shell flow-group-shell--embedded"'), true, "Services keeps only a generic visual group-shell class contract");
assert.equal(indexHtml.includes('data-keyboard-section="additional-services"'), false, "additional-services semantic section is no longer pre-authored in static HTML");
assert.equal(indexHtml.includes('id="additionalServicesHeading"'), false, "additional-services heading identity is no longer static");
assert.equal(indexHtml.includes(">Serviços adicionais</h3>"), false, "additional-services heading copy comes from normalized data");
assert.equal(indexHtml.includes('data-flow-section-slot'), true, "Services exposes one neutral section renderer slot");
const runtimeScriptRevisions = [
  /data\/scene-data\.js\?v=([^\"]+)/,
  /data\/catalog-data\.js\?v=([^\"]+)/,
  /data\/mock-price-book\.js\?v=([^\"]+)/,
  /data\/mask-data\.js\?v=([^\"]+)/,
  /core\/state\.js\?v=([^\"]+)/,
  /core\/visibility\.js\?v=([^\"]+)/,
  /core\/validation\.js\?v=([^\"]+)/,
  /core\/fingerprint\.js\?v=([^\"]+)/,
  /core\/finishes\.js\?v=([^\"]+)/,
  /core\/pricing\.js\?v=([^\"]+)/,
  /core\/flow-model\.js\?v=([^\"]+)/,
  /core\/flow-layout\.js\?v=([^\"]+)/,
  /data\/stone-data\.js\?v=([^\"]+)/,
  /core\/stone\.js\?v=([^\"]+)/,
  /app\.js\?v=([^\"]+)/
].map((pattern) => indexHtml.match(pattern)?.[1]);
assert.equal(runtimeScriptRevisions.every(Boolean), true, "scene runtime scripts require an explicit shared revision");
assert.equal(new Set(runtimeScriptRevisions).size, 1, "mask data, material data, renderer and app must update together");
assert.equal(indexHtml.includes(`styles.css?v=${runtimeScriptRevisions[0]}`), true, "styles and runtime scripts share the same cache revision");
assert.equal(appJs.includes("setModuleSelection"), false);
assert.equal(appJs.includes("refreshMobileSceneDock"), true);
assert.equal(appJs.includes("mobileSceneTransparency"), true);
assert.equal(appJs.includes("mobileSceneRepin"), true);
assert.equal(appJs.includes("scenePipMode"), true, "scene PiP runtime consumes the presentation policy by layout profile");
assert.equal(appJs.includes("pip?.availableProfiles?.includes(profile)"), true, "PiP availability comes from policy rather than a compact-only viewport check");
assert.equal(appJs.includes('mode.activation === "manual"'), true, "stacked manual activation has one explicit runtime path");
assert.equal(appJs.includes('mode.activation !== "auto-after-anchor"'), true, "anchor auto-activation is limited to policy profiles that request it");
assert.equal(appJs.includes("function isMobileViewport()"), false, "PiP availability no longer reconstructs compact authority through a mobile helper");
assert.equal(styles.includes('html:is([data-layout-profile="stacked"], [data-layout-profile="compact"]) body.is-mobile-scene-pinned .viewer-card'), true, "fixed PiP presentation consumes canonical layout profiles");
assert.equal(styles.includes('@media (max-width: 700px) {\n  body.is-mobile-scene-pinned .viewer-anchor'), false, "PiP presentation is not owned by the compact numeric breakpoint");
assert.equal(indexHtml.includes('@media (max-width: 700px) {\n        body.is-mobile-scene-pinned.is-mobile-scene-transparent'), false, "inline PiP transparency follows layout profiles rather than a numeric breakpoint");
assert.equal(appJs.includes('inspect.className = "module-card__inspect"'), true, "module card visible body is the native inspection button");
assert.equal(appJs.includes("toggleLabel.append(input);"), true, "module checkbox label owns only the inclusion control");
assert.equal(appJs.includes("inspect.append(number, copy, inspectAffordance);"), true, "module number and copy belong to the inspection body");
assert.equal(appJs.includes('detail.textContent = "Ver"'), false, "legacy standalone Ver affordance is retired");
assert.equal(styles.includes(".module-card.is-blocked .module-card__toggle"), true, "blocked inclusion attenuates only the checkbox hit area");
assert.equal(styles.includes(".module-card__inspect"), true, "inspection body has a dedicated native button presentation");
assert.equal(appJs.includes("function bottomDockPolicy()"), true, "bottom dock runtime consumes the presentation policy");
assert.equal(appJs.includes('["estimate", configurationValue]'), true, "bottom dock estimate slot reuses the stable estimate adapter");
assert.equal(appJs.includes('["primary-action", nextStepButton]'), true, "bottom dock primary-action slot reuses the stable CTA adapter");
assert.equal(appJs.includes('flowActions.dataset.bottomDockEnabled'), true, "bottom dock exposes one executable shell marker");
assert.equal(appJs.includes('"--bottom-dock-clearance"'), true, "runtime exposes live dock clearance instead of a fixed dock height");
assert.equal(styles.includes('.flow-actions[data-bottom-dock-enabled="true"]'), true, "persistent dock presentation is bound to the executable policy marker");
assert.equal(styles.includes('scroll-padding-bottom: calc(var(--bottom-dock-clearance, 0px) + 12px);'), true, "scroll owners consume live bottom dock clearance");
assert.equal(styles.includes('html[data-layout-profile="compact"] .flow-actions { position: static;'), false, "compact no longer disables the persistent dock projection");
assert.equal(appJs.includes("bottomDockViewportRect()?.top"), true, "PiP vertical geometry consumes the live dock boundary");
assert.equal(appJs.includes("getBoundingClientRect().bottom || 0"), true);
assert.equal(appJs.includes("const pipBottom = Math.max(navBottom, mobilePipPosition?.top || 0) + pipHeight;"), true);
assert.equal(/state = core\.createInitialState\(scene\);\s*setAllVisibility\(true\);/.test(appJs), false, "restoring must preserve optional defaults");
assert.equal(appJs.includes("const requirementHidden = requirementsForEntity(\"lighting-08\")"), true);
assert.equal(appJs.includes("lightingToggle.disabled = blocked"), true);
assert.equal(appJs.includes("function moduleEntityIds()"), true, "detail navigation must include modules outside the composition");
assert.equal(appJs.includes("function createModuleSelectionControl"), true, "detail keeps a selection control for hidden modules");
assert.equal(appJs.includes("scene-hotspot--aerial"), true, "aerial module labels have a safe placement variant");
assert.equal(appJs.includes("resolveMarkerPlacement"), true, "marker position derives from a default with data overrides");
assert.equal(appJs.includes("module-detail__carousel-arrow"), true, "detail carousel has circular arrow controls");
assert.equal(appJs.includes("detailNavigationAttentionByEntity"), true, "navigating to an excluded module calls attention to selection");
assert.equal(appJs.includes("Cota do módulo em pedra e serviços do conjunto"), false, "global totals do not appear in individual module cards");
assert.equal(appJs.includes("two-doors-and-microwave"), true, "M06 has a dedicated orientative front pattern");
assert.equal(appJs.includes("depthDimensionStart"), true, "isometric depth dimension has endpoint ticks");
assert.equal(appJs.includes("module-detail__focus-finish"), true, "focus uses the live masked finish layer");
assert.equal(appJs.includes("structure-layer--${kind}"), true, "scene creates semantic seam layers");
assert.equal(styles.includes("--mobile-pip-height"), false);
assert.equal(
  styles.includes('html:is([data-layout-profile="stacked"], [data-layout-profile="compact"]) body.is-mobile-scene-pinned .scene-hotspots {'),
  true,
  "PiP scene hotspots are enabled only inside policy-authorized layout profiles"
);
assert.equal(styles.includes("top: env(safe-area-inset-top); margin-top: 0;"), true);
assert.equal(styles.includes("width: 44px; height: 44px;"), true);
assert.equal(styles.includes(".panel h2 { scroll-margin-top: 72px; }"), false);
assert.equal(styles.includes('html[data-layout-profile="compact"] .panel,'), true, "compact panel scroll clearance is profile-owned");
assert.equal(styles.includes(".flow-nav__scene-pin { display: none; }"), true);
assert.equal(styles.includes("grid-column: 1 / -1;"), true);
assert.equal(styles.includes("container-name: flow-steps;"), true);
assert.equal(styles.includes("@container flow-steps (max-width: 500px)"), true);
assert.equal(styles.includes(".structure-layer--shadow"), true);
assert.equal(styles.includes("background-position: 0 0"), true, "texture origin follows the preview reference");
assert.equal(styles.includes(".module-detail__selection-toggle.is-selected"), true, "selected detail control is visibly distinct");
assert.equal(styles.includes(".scene-hotspot[data-marker-side=\"bottom\"] .scene-hotspot__tag"), true, "aerial labels render below their modules");
assert.equal(styles.includes(".scene-hotspot[data-marker-side=\"right\"] .scene-hotspot__tag"), true, "narrow panels can place their marker at the side");
assert.equal(styles.includes(".module-detail__carousel-navigation"), true, "carousel dots and arrows share one navigation row");
assert.equal(styles.includes(".layer-status__indicator"), true, "only the decorative scene-status dot is styled as a dot");
assert.equal(styles.includes("module-detail-selection-trace"), true, "excluded modules receive the gold selection trace");
assert.equal(styles.includes(".module-detail.is-unavailable > :not(.module-detail__header)"), true, "excluded detail content is softened without dimming the selection control");
assert.equal(styles.includes(".module-detail__focus { position: relative; justify-self: center; width: auto; max-width: 100%; height: min(100%, 174px); aspect-ratio: var(--focus-ratio); overflow: hidden; }"), true, "isolated focus has no decorative container");
assert.equal(styles.includes("Módulo fora da composição"), true, "hidden module views receive an unavailable state");
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
