"use strict";

const assert = require("node:assert/strict");
const prepare = require("../core/published-buyer-projection.js").prepare;
const configuration = require("../core/configuration.js");
const administrationV5 = require("../core/administration-v5.js");
const flow = require("../core/flow-model.js");
const pricingContract = require("../core/pricing-contract.js");
const settings = require("../data/configurator-settings.js");
const catalog = require("../data/catalog-data.js");
const scene = require("../data/scene-data.js");
const priceBook = require("../data/mock-price-book.js");
const hierarchyDefaults = require("../data/hierarchy-defaults.js");
const defaultPresentationPolicy = require("../data/presentation-policy-defaults.js");

const runtime = { configuration, administrationV5, flow, catalog, scene, priceBook,
  hierarchyDefaults, pricingContract, defaultPresentationPolicy };

const v3 = configuration.normalizeConfiguratorSettings(
  configuration.createDefaultAdministration(settings, catalog, priceBook, scene),
  catalog, priceBook, scene
);
const v5 = administrationV5.upgrade(
  v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults
);
assert.deepEqual(administrationV5.validate(v5, configuration, catalog, priceBook, scene), []);

const old = prepare(v3, runtime);
const current = prepare(v5, runtime);
assert.equal(old.source.schemaVersion, configuration.SCHEMA);
assert.equal(current.source.schemaVersion, administrationV5.SCHEMA);
assert.equal(current.flow.source.schemaVersion, administrationV5.SCHEMA);
assert.equal(old.flow.source.schemaVersion, configuration.SCHEMA);
assert.deepEqual(old.displaySettings, configuration.normalizeConfiguratorSettings(v3, catalog, priceBook, scene));
assert.deepEqual(current.flow.stages.map((stage) => stage.id), old.flow.stages.map((stage) => stage.id));
assert.deepEqual(current.flow.stages.map((stage) => stage.groups.flatMap((group) =>
  group.sections.flatMap((section) => section.itemIds))),
old.flow.stages.map((stage) => stage.groups.flatMap((group) =>
  group.sections.flatMap((section) => section.itemIds))));

for (const stage of current.source.stages) {
  assert.equal(Object.hasOwn(stage, "items"), false, "current hierarchy source remains strictly hierarchical");
  const view = current.displaySettings.stages.find((candidate) => candidate.id === stage.id);
  const declared = current.flow.stages.find((candidate) => candidate.id === stage.id);
  assert.deepEqual(view.items, declared.groups.flatMap((group) => group.sections.flatMap((section) => section.itemIds)),
    "flat display list must derive exclusively from normalized hierarchy flow");
  assert.equal(Object.hasOwn(view, "groups"), false, "display stage must not carry mixed-source hierarchy");
}
assert.deepEqual(current.pricingRules, pricingContract.normalize(v5.pricing));
assert.deepEqual(current.presentationPolicy, v5.presentationPolicy);
assert.deepEqual(old.pricingRules, pricingContract.upgradeLegacy(v3.pricing));
assert.deepEqual(old.presentationPolicy, defaultPresentationPolicy);

// A valid typed amount adjustment is not projectable through v3 but must
// still reach the buyer without coercion to basis points.
const amountCandidate = structuredClone(v5);
const amountId = Object.keys(amountCandidate.pricing.roles.frontFinishAdjustment)[0];
assert(amountId);
amountCandidate.pricing.roles.frontFinishAdjustment[amountId] = { type: "amount", cents: 1234 };
assert.deepEqual(administrationV5.validate(amountCandidate, configuration, catalog, priceBook, scene), []);
const amountPrepared = prepare(amountCandidate, runtime);
assert.deepEqual(amountPrepared.pricingRules.roles.frontFinishAdjustment[amountId],
  { type: "amount", cents: 1234 });

// Incompatible schemas/policies/components must be rejected instead of
// regenerated from static v3 defaults.
assert.throws(() => prepare({ schemaVersion: "ConfiguratorAdministration2D 4.0", stages: [] }, runtime),
  /unsupported published buyer configuration schema/);
assert.throws(() => prepare({ ...v5, presentationPolicy: null }, runtime));
const badComponent = structuredClone(v5);
badComponent.stages[0].groups[0].sections[0].component = "unknown-renderer";
assert.throws(() => prepare(badComponent, runtime));

const brokenHierarchy = structuredClone(v5);
brokenHierarchy.stages[0].groups[0].sections[0].itemIds = [];
assert.throws(() => prepare(brokenHierarchy, runtime));

console.log("published buyer v3/v5 projection contract: PASS");
