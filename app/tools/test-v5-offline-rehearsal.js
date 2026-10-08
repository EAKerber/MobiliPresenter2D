"use strict";

const assert = require("node:assert/strict");
const gate = require("./v5-publication-preflight.js");
const migration = require("../core/v5-publication-migration.js");
const nativeSave = require("../core/v5-normal-save.js");
const publishedReader = require("../core/published-configuration.js");
const buyerProjection = require("../core/published-buyer-projection.js");
const configuration = require("../core/configuration.js");
const administrationV5 = require("../core/administration-v5.js");
const flow = require("../core/flow-model.js");
const legacyStageRepair = require("../core/legacy-stage-repair.js");
const pricingContract = require("../core/pricing-contract.js");
const catalog = require("../data/catalog-data.js");
const priceBook = require("../data/mock-price-book.js");
const scene = require("../data/scene-data.js");
const settings = require("../data/configurator-settings.js");
const hierarchyDefaults = require("../data/hierarchy-defaults.js");
const defaultPresentationPolicy = require("../data/presentation-policy-defaults.js");

const runtime = {
  configuration, v5Core: administrationV5, flow, catalog, priceBook, scene,
  hierarchyDefaults, legacyStageRepair
};
const buyerRuntime = {
  configuration, administrationV5, flow, catalog, priceBook, scene,
  hierarchyDefaults, pricingContract, defaultPresentationPolicy
};

function fixtureStore(initial) {
  let value = structuredClone(initial);
  let etag = '"mock-0"';
  let writes = 0;
  let raceOnNextWrite = false;
  return {
    get writes() { return writes; },
    get stored() { return structuredClone(value); },
    raceNext() { raceOnNextWrite = true; },
    async getWithMetadata(key, options) {
      assert.equal(key, "published");
      assert.deepEqual(options, { type: "text", consistency: "strong" });
      return { data: JSON.stringify(value), etag, metadata: {} };
    },
    async setJSON(key, next, options) {
      assert.equal(key, "published");
      assert.deepEqual(Object.keys(options), ["onlyIfMatch"]);
      if (raceOnNextWrite) {
        etag = '"external-race"';
        raceOnNextWrite = false;
      }
      if (options.onlyIfMatch !== etag) return { modified: false };
      value = structuredClone(next);
      writes++;
      etag = '"mock-' + writes + '"';
      return { modified: true, etag };
    }
  };
}

function itemsOf(prepared) {
  return prepared.flow.stages.map((stage) => ({
    id: stage.id,
    kind: stage.kind,
    enabled: stage.enabled,
    groups: stage.groups.map((group) => ({
      id: group.id,
      sections: group.sections.map((section) => ({
        id: section.id,
        itemIds: [...section.itemIds]
      }))
    }))
  }));
}

async function main() {
  const source = configuration.normalizeConfiguratorSettings(
    configuration.createDefaultAdministration(settings, catalog, priceBook, scene),
    catalog, priceBook, scene
  );
  const before = buyerProjection.prepare(source, buyerRuntime);
  const preflight = gate.createPreflight(source, runtime);
  assert.equal(preflight.ok, true, JSON.stringify(preflight));
  assert.equal(preflight.source.digest, gate.digestJson(source));

  const store = fixtureStore(source);
  const migrated = await migration.publishV5Migration({
    store,
    payload: structuredClone(preflight.candidatePayload),
    sourceDigest: preflight.source.digest,
    runtime
  });
  assert.equal(migrated.ok, true, JSON.stringify(migrated));
  assert.equal(store.writes, 1, "exactly one v3-to-v5 migration write");
  assert.equal(migrated.revision, source.revision + 1);
  assert.equal(migrated.publishedDigest, preflight.expectedReadback.digest);
  assert.equal(migrated.publicationSignatureDigest, preflight.expectedReadback.publicationSignatureDigest);

  const raw = await publishedReader.readRawPublished(store);
  const inspected = publishedReader.inspectPublishedRaw(raw, {
    configuration, administrationV5, catalog, priceBook, scene
  });
  assert.equal(inspected.kind, "valid");
  assert.equal(inspected.schema, administrationV5.SCHEMA);
  assert.equal(inspected.etag, migrated.etag);
  assert.equal(gate.digestJson(raw.value), migrated.publishedDigest);
  const after = buyerProjection.prepare(inspected.value, buyerRuntime);
  assert.equal(after.flow.source.schemaVersion, administrationV5.SCHEMA);
  assert.deepEqual(itemsOf(after), itemsOf(before), "migration cannot alter buyer stage/item hierarchy");
  assert(after.flow.stages.every((stage) => stage.groups.every((group) => group.sections.every((section) => typeof section.component === "string"))),
    "v5 explicitly owns component metadata even where legacy v3 flow leaves component undefined");
  assert.deepEqual(after.pricingRules, before.pricingRules, "migration cannot alter typed buyer pricing rules");
  assert.deepEqual(after.presentationPolicy, preflight.candidatePayload.presentationPolicy);

  const editable = administrationV5.normalize(structuredClone(inspected.value));
  editable.objects["module-01"].title = "Módulo editado após migração";
  const rate = Object.keys(editable.pricing.roles.frontFinishAdjustment)[0];
  assert.ok(rate);
  editable.pricing.roles.frontFinishAdjustment[rate] = { type: "amount", cents: 2150 };
  const finishes = editable.stages.find((stage) => stage.kind === "finishes");
  assert.ok(finishes);
  finishes.groups.reverse();
  assert.deepEqual(administrationV5.validate(editable, configuration, catalog, priceBook, scene), []);

  const saved = await nativeSave.savePublishedV5({ store, payload: editable, runtime });
  assert.equal(saved.ok, true, JSON.stringify(saved));
  assert.equal(store.writes, 2);
  assert.equal(saved.value.revision, source.revision + 2);
  const savedRaw = await publishedReader.readRawPublished(store);
  assert.equal(gate.digestJson(savedRaw.value), gate.digestJson(saved.value));

  const buyerAfterEdit = buyerProjection.prepare(saved.value, buyerRuntime);
  assert.equal(buyerAfterEdit.source.objects["module-01"].title, "Módulo editado após migração");
  assert.deepEqual(buyerAfterEdit.pricingRules.roles.frontFinishAdjustment[rate], { type: "amount", cents: 2150 });
  assert.equal(buyerAfterEdit.flow.stages.find((stage) => stage.kind === "finishes").groups[0].id, finishes.groups[0].id,
    "buyer sees the native v5 hierarchy change instead of a flattened legacy projection");

  const rejectedReplay = await migration.publishV5Migration({
    store,
    payload: preflight.candidatePayload,
    sourceDigest: preflight.source.digest,
    runtime
  });
  assert.equal(rejectedReplay.code, "source_not_v3", "migration must not run twice");
  const rejectedStale = await nativeSave.savePublishedV5({ store, payload: editable, runtime });
  assert.equal(rejectedStale.code, "revision_conflict");
  assert.equal(store.writes, 2, "stale requests make no additional writes");

  store.raceNext();
  const competingPayload = structuredClone(saved.value);
  competingPayload.objects["module-01"].title = "Concorrente";
  const conflict = await nativeSave.savePublishedV5({ store, payload: competingPayload, runtime });
  assert.equal(conflict.code, "source_etag_conflict", "compare-and-swap must reject intervening storage updates");
  assert.equal(store.writes, 2);

  const invalid = structuredClone(saved.value);
  invalid.presentationPolicy = null;
  assert.throws(() => buyerProjection.prepare(invalid, buyerRuntime),
    "buyer must not fall back to defaults for malformed stored v5");

  const endpoint = require("node:fs").readFileSync(require("node:path").resolve(__dirname, "../../netlify/functions/configuration.mjs"), "utf8");
  assert.doesNotMatch(endpoint, /V5_MIGRATION_ENABLED/);
  assert.match(endpoint, /v5_migration_retired/);
  console.log("CP-SD-06A2A3a offline v3 -> v5 -> buyer -> admin -> buyer: PASS");
}
main().catch((err) => { console.error(err); process.exitCode = 1; });
