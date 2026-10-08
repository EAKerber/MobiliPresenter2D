"use strict";

// Post-v5 discovery fixture. NEVER contacts production, Netlify or any
// external service. This probes actual admin Add Material data shape.
const assert = require("node:assert/strict");
const configuration = require("../core/configuration.js");
const v5Core = require("../core/administration-v5.js");
const projection = require("../core/published-buyer-projection.js");
const { savePublishedV5 } = require("../core/v5-normal-save.js");
const flow = require("../core/flow-model.js");
const pricingContract = require("../core/pricing-contract.js");
const hierarchyDefaults = require("../data/hierarchy-defaults.js");
const defaultPresentationPolicy = require("../data/presentation-policy-defaults.js");
const defaults = require("../data/configurator-settings.js");
const catalog = require("../data/catalog-data.js");
const scene = require("../data/scene-data.js");
const priceBook = require("../data/mock-price-book.js");

const runtime = { configuration, v5Core, catalog, priceBook, scene };
const buyerRuntime = {
  configuration, administrationV5: v5Core, flow, catalog, priceBook, scene,
  hierarchyDefaults, pricingContract, defaultPresentationPolicy
};
const v3 = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
const baseline = v5Core.upgrade(v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
const NEW_ID = "fixture-new-finish-20261008";

function fakeStore(initial) {
  let value = structuredClone(initial);
  let etag = '"original"';
  let writes = 0;
  return {
    get writes() { return writes; },
    get value() { return structuredClone(value); },
    async getWithMetadata(key, opts) {
      assert.equal(key, "published");
      assert.deepEqual(opts, { type: "text", consistency: "strong" });
      return { data: JSON.stringify(value), etag, metadata: {} };
    },
    async setJSON(key, next, options) {
      assert.equal(key, "published");
      assert.deepEqual(options, { onlyIfMatch: '"original"' });
      writes += 1;
      value = structuredClone(next);
      etag = '"saved"';
      return { modified: true, etag };
    }
  };
}

async function main() {
  assert.deepEqual(v5Core.validate(baseline, configuration, catalog, priceBook, scene), []);

  const candidate = structuredClone(baseline);
  assert(!candidate.materials.some((entry) => entry.id === NEW_ID));

  // Mirror admin.js addMaterialButton: new color, fronts membership,
  // newly disabled finish, and zero typed percentage rule.
  const material = {
    id: NEW_ID, label: "Cor de ensaio isolado", kind: "color", color: "#a1b2c3",
    textureAsset: "", textureSize: "cover", groupIds: ["fronts-all"], locked: false
  };
  candidate.materials.push(material);
  candidate.materialGroups.find((entry) => entry.id === "fronts-all").materialIds.push(NEW_ID);
  candidate.finishes.push({
    id: NEW_ID, enabled: false, scope: "global",
    moduleIds: catalog.modules.map((entry) => entry.entityId)
  });
  candidate.pricing.roles.frontFinishAdjustment[NEW_ID] = {
    type: "percentage", bps: 0, basis: "eligible-module-base"
  };

  const validation = v5Core.validate(candidate, configuration, catalog, priceBook, scene);
  assert.deepEqual(validation, [], "new color must be a valid v5 authoring record: " + JSON.stringify(validation));
  const normalized = v5Core.normalize(candidate);
  const color = normalized.materials.find((entry) => entry.id === NEW_ID);
  assert.deepEqual(color, material);
  assert.equal(normalized.finishes.find((entry) => entry.id === NEW_ID).enabled, false);
  assert(normalized.materialGroups.find((entry) => entry.id === "fronts-all").materialIds.includes(NEW_ID));

  // The generic buyer projection must preserve all authored data without a
  // new catalog ID or synthesizing a semantic section.
  const buyer = projection.prepare(normalized, buyerRuntime);
  assert.equal(buyer.source.materials.find((entry) => entry.id === NEW_ID).color, "#a1b2c3");
  assert.deepEqual(buyer.pricingRules.roles.frontFinishAdjustment[NEW_ID],
    { type: "percentage", bps: 0, basis: "eligible-module-base" });
  assert.deepEqual(buyer.flow.stages.map((entry) => entry.id),
    projection.prepare(baseline, buyerRuntime).flow.stages.map((entry) => entry.id));

  // Save and strong exact readback with the same code used by the server.
  const store = fakeStore(baseline);
  const saved = await savePublishedV5({ store, payload: normalized, runtime });
  assert.equal(saved.ok, true, JSON.stringify(saved));
  assert.equal(saved.code, "saved_v5_verified");
  assert.equal(saved.value.revision, baseline.revision + 1);
  assert.equal(store.writes, 1);
  assert.deepEqual(saved.value, store.value);
  const reread = projection.prepare(saved.value, buyerRuntime);
  assert.equal(reread.source.materials.find((entry) => entry.id === NEW_ID).color, "#a1b2c3");
  assert.deepEqual(reread.pricingRules.roles.frontFinishAdjustment[NEW_ID],
    { type: "percentage", bps: 0, basis: "eligible-module-base" });
  const replay = await savePublishedV5({ store, payload: normalized, runtime });
  assert.equal(replay.code, "revision_conflict");
  assert.equal(store.writes, 1);

  // A new *physical module*, unlike an authored material, cannot be added
  // as a stage item without a registered catalog entity / scene contract.
  const unknownModule = structuredClone(baseline);
  unknownModule.stages.find((entry) => entry.id === "modules")
    .groups[0].sections[0].itemIds.push("module-unregistered-999");
  assert(v5Core.validate(unknownModule, configuration, catalog, priceBook, scene).length > 0,
    "an unregistered physical module must not silently become a valid selectable module");

  console.log("post-v5 new material validation -> buyer -> CAS/readback, and unknown module negative gate: PASS");
}
main().catch((err) => { console.error(err); process.exitCode = 1; });
