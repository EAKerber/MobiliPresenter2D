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
const pricingContract = require(path.join(projectRoot, "core/pricing-contract.js"));
const v5Core = require(path.join(projectRoot, "core/administration-v5.js"));
const publicationPreflight = require(path.join(projectRoot, "tools/v5-publication-preflight.js"));

const v3 = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
const v4 = hierarchyV4.upgradeToHierarchy(v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
const v5 = v5Core.upgrade(v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);

assert.equal(v5Core.SCHEMA, "ConfiguratorAdministration2D 5.0");
assert.equal(v5Core.PREVIOUS_SCHEMA, "ConfiguratorAdministration2D 4.0");
assert.equal(v5.schemaVersion, v5Core.SCHEMA);
assert.deepEqual(v5.presentationPolicy, presentationPolicy, "v5 carries the validated presentation policy");
assert.equal(v5.pricing.schemaVersion, pricingContract.SCHEMA, "v5 owns the typed pricing contract");
assert.deepEqual(v5.pricing, pricingContract.upgradeLegacy(v3.pricing), "v3 pricing migrates exactly into typed v5 pricing");
["entries", "handleEntries", "frontFinishRatesBps", "localEntries", "globalEntries", "handleFrontTotal"].forEach((legacyKey) => {
  assert.equal(Object.hasOwn(v5.pricing, legacyKey), false, `v5 pricing has no legacy bucket authority: ${legacyKey}`);
});

const sections = v5.stages.flatMap((stage) => stage.groups.flatMap((group) => group.sections));
assert.equal(sections.every((section) => ["selection", "toggle", "action"].includes(section.behavior)), true, "every v5 section has explicit interaction behavior");
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
assert.equal(v5.stages.find((stage) => stage.id === "modules").groups[0].sections[0].behavior, "selection", "Modules keeps its primary inspect/selection section behavior");
assert.equal(
  v5Core.defaultSectionBehavior(v5.stages.find((stage) => stage.id === "modules"), "module-01", configuration, catalog, hierarchyDefaults),
  "selection",
  "stage-aware default behavior differs from the module item's secondary toggle capability"
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
assert.deepEqual(v5FromV4.pricing, v5.pricing, "historical v4 pricing converges to the same typed v5 contract");
assert.equal(
  v5Core.publicationSignature(v5FromV4),
  v5Core.publicationSignature(v5),
  "default v3 and historical v4 converge to the same v5 publication contract"
);

assert.equal(v5.materials.find((material) => material.id === "stone-existing").color, null, "v5 preserves explicit null authored stone color");
assert.equal(v5.materials.find((material) => material.id === "stone-light-sink").color, null, "v5 preserves second null authored stone color");

const missingBehavior = structuredClone(v5);
delete missingBehavior.stages.find((stage) => stage.id === "finishes").groups[0].sections[0].behavior;
assert.ok(
  v5Core.validate(missingBehavior, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("invalid section behavior")),
  "missing v5 behavior fails closed"
);

const invalidBehavior = structuredClone(v5);
invalidBehavior.stages.find((stage) => stage.id === "finishes").groups[0].sections[0].behavior = "hover";
assert.ok(
  v5Core.validate(invalidBehavior, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("invalid section behavior")),
  "unknown v5 behavior fails closed"
);

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
unrelated.pricing.roles.itemBase["module-01"].cents += 100;
const unrelatedProjection = v5Core.projectToLegacy(unrelated, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
assert.equal(unrelatedProjection.ok, true, "non-hierarchy edit remains safely projectable");
assert.equal(unrelatedProjection.value.objects["module-01"].title, "Título v5");
assert.equal(unrelatedProjection.value.pricing.entries["module-01"], v3.pricing.entries["module-01"] + 100);

const typedFinishAmount = structuredClone(v5);
typedFinishAmount.pricing.roles.frontFinishAdjustment.cocoa = { type: "amount", cents: 15000 };
assert.deepEqual(
  v5Core.validate(typedFinishAmount, configuration, catalog, priceBook, scene),
  [],
  "v5 accepts a valid typed finish amount even though legacy v3 cannot represent it"
);
const typedFinishAmountProjection = v5Core.projectToLegacy(
  typedFinishAmount,
  configuration,
  flow,
  catalog,
  priceBook,
  scene,
  hierarchyDefaults
);
assert.equal(typedFinishAmountProjection.ok, false);
assert.equal(typedFinishAmountProjection.code, "pricing_requires_publication", "typed finish amount blocks legacy publication without coercion");

const invalidTypedPricing = structuredClone(v5);
invalidTypedPricing.pricing.roles.itemBase["module-01"] = { type: "percentage", bps: 1000, basis: "eligible-module-base" };
assert.equal(
  v5Core.validate(invalidTypedPricing, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("unsupported pricing rule type")),
  true,
  "invalid typed pricing fails current v5 validation"
);

const bogusPricingId = structuredClone(v5);
bogusPricingId.pricing.roles.itemBase["not-a-catalog-item"] = { type: "amount", cents: 100 };
assert.equal(
  v5Core.validate(bogusPricingId, configuration, catalog, priceBook, scene)
    .some((error) => error.includes("pricing identifiers must match: entries")),
  true,
  "typed v5 pricing keeps legacy catalog identifier validation"
);

const pricingSignatureProbe = structuredClone(v5);
pricingSignatureProbe.pricing.roles.globalAdjustment["move-stone"].cents += 1;
assert.notEqual(
  v5Core.publicationSignature(pricingSignatureProbe),
  v5Core.publicationSignature(v5),
  "typed pricing participates in the v5 publication signature"
);

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

const preflight = publicationPreflight.createPreflight(v3);
assert.equal(preflight.ok, true, "canonical repaired v3 source is ready for offline v5 publication preflight");
assert.equal(preflight.code, "ready");
assert.equal(preflight.source.schemaVersion, configuration.SCHEMA);
assert.equal(preflight.source.revision, v3.revision);
assert.equal(preflight.source.digest, publicationPreflight.digestJson(v3), "source digest covers the exact canonical v3 object");
assert.deepEqual(preflight.source.handlesOwners, ["finishes"], "preflight records the one safe Puxadores owner");
assert.deepEqual(preflight.source.stoneOwners, ["finishes"], "preflight records the stone group owner");
assert.deepEqual(preflight.source.skirtingOwners, ["finishes"], "preflight records the skirting control owner");
assert.equal(preflight.source.skirtingSelected, true, "preflight records skirting initial selection state");

assert.deepEqual(preflight.candidatePayload, v5, "preflight derives the same deterministic v5 candidate as the canonical upgrade");
assert.equal(preflight.candidate.schemaVersion, v5Core.SCHEMA);
assert.equal(preflight.candidate.digest, publicationPreflight.digestJson(v5));
assert.equal(preflight.expectedReadback.revision, v3.revision + 1, "server readback must advance exactly one revision");

const expectedReadback = v5Core.normalize({ ...structuredClone(preflight.candidatePayload), revision: v3.revision + 1 });
assert.deepEqual(
  publicationPreflight.verifyReadback(preflight, expectedReadback),
  {
    ok: true,
    code: "verified",
    digest: preflight.expectedReadback.digest,
    signatureDigest: preflight.expectedReadback.publicationSignatureDigest
  },
  "exact v5 readback verifies against revision, digest and publication signature"
);

const tamperedReadback = structuredClone(expectedReadback);
tamperedReadback.pricing.roles.itemBase["module-01"].cents += 1;
assert.equal(
  publicationPreflight.verifyReadback(preflight, tamperedReadback).code,
  "readback_digest_mismatch",
  "valid-but-different readback is rejected"
);

const staleReadback = structuredClone(expectedReadback);
staleReadback.revision = v3.revision;
assert.equal(
  publicationPreflight.verifyReadback(preflight, staleReadback).code,
  "unexpected_revision",
  "readback must advance from the exact source revision"
);

const skirtingContradiction = structuredClone(v3);
skirtingContradiction.stages.find((stage) => (stage.kind || stage.id) === "finishes").items =
  skirtingContradiction.stages.find((stage) => (stage.kind || stage.id) === "finishes").items.filter((id) => id !== "stone-skirting");
const skirtingBlocked = publicationPreflight.createPreflight(skirtingContradiction);
assert.equal(skirtingBlocked.ok, false);
assert.equal(
  skirtingBlocked.code,
  "skirting_repair_required",
  "selected stone-skirting without a stage owner blocks v5 publication before Puxadores checks"
);

const intentionalSkirtingOmission = structuredClone(skirtingContradiction);
intentionalSkirtingOmission.initialState.services =
  intentionalSkirtingOmission.initialState.services.filter((id) => id !== "stone-skirting");
assert.equal(
  publicationPreflight.createPreflight(intentionalSkirtingOmission).ok,
  true,
  "removing both skirting selection and control remains a valid explicit administration choice"
);

const sourceWithoutHandles = structuredClone(v3);
sourceWithoutHandles.stages.find((stage) => (stage.kind || stage.id) === "finishes").items =
  sourceWithoutHandles.stages.find((stage) => (stage.kind || stage.id) === "finishes").items.filter((id) => id !== "handles-all");
const v5WithoutHandles = v5Core.upgrade(
  sourceWithoutHandles,
  configuration,
  flow,
  catalog,
  priceBook,
  scene,
  hierarchyDefaults
);
assert.equal(
  v5WithoutHandles.stages
    .find((stage) => stage.id === "finishes")
    .groups.flatMap((group) => group.sections)
    .some((section) => section.itemIds.includes("handles-all")),
  false,
  "v3 -> v5 migration does not invent a missing handles-all assignment"
);
const missingHandlesPreflight = publicationPreflight.createPreflight(sourceWithoutHandles);
assert.equal(missingHandlesPreflight.ok, false);
assert.equal(
  missingHandlesPreflight.code,
  "handles_repair_required",
  "production v5 publication stops until the isolated v3 Puxadores repair is complete"
);
assert.deepEqual(
  missingHandlesPreflight.handlesRepair.beforeItems,
  ["fronts-all", "stone-all", "stone-skirting"],
  "preflight records the exact live Acabamentos ownership before repair"
);
assert.deepEqual(
  missingHandlesPreflight.handlesRepair.afterItems,
  ["fronts-all", "handles-all", "stone-all", "stone-skirting"],
  "preflight shows the already-approved isolated v3 repair without applying it"
);

const wrongOwnerSource = structuredClone(sourceWithoutHandles);
wrongOwnerSource.stages.find((stage) => (stage.kind || stage.id) === "services").items.push("handles-all");
assert.equal(
  publicationPreflight.createPreflight(wrongOwnerSource).code,
  "invalid_source",
  "the v3 schema itself rejects Puxadores in an invalid stage before any repair planner can move it"
);

const nonCanonicalSource = structuredClone(v3);
delete nonCanonicalSource.stages[0].kind;
assert.equal(
  publicationPreflight.createPreflight(nonCanonicalSource).code,
  "source_not_canonical",
  "fresh source must already be canonical instead of changing silently during migration"
);

const unexpectedSchemaSource = structuredClone(v3);
unexpectedSchemaSource.schemaVersion = "ConfiguratorAdministration2D 2.0";
assert.equal(
  publicationPreflight.createPreflight(unexpectedSchemaSource).code,
  "unexpected_source_schema",
  "initial v5 publication accepts only the exact current production v3 schema"
);

console.log("administration v5: PASS");
