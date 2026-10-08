"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const migration = require("../core/v5-publication-migration.js");
const gate = require("./v5-publication-preflight.js");
const configuration = require("../core/configuration.js");
const v5Core = require("../core/administration-v5.js");
const flow = require("../core/flow-model.js");
const legacyStageRepair = require("../core/legacy-stage-repair.js");
const hierarchyDefaults = require("../data/hierarchy-defaults.js");
const defaults = require("../data/configurator-settings.js");
const catalog = require("../data/catalog-data.js");
const priceBook = require("../data/mock-price-book.js");
const scene = require("../data/scene-data.js");

const runtime = { configuration, v5Core, flow, legacyStageRepair, hierarchyDefaults, catalog, priceBook, scene };
const source = configuration.normalizeConfiguratorSettings(
  configuration.createDefaultAdministration(defaults, catalog, priceBook, scene),
  catalog, priceBook, scene
);
const preflight = gate.createPreflight(source, runtime);
assert.equal(preflight.ok, true, JSON.stringify(preflight));
const request = {
  payload: preflight.candidatePayload,
  sourceDigest: preflight.source.digest,
  runtime
};

function fakeStore(initial = source, settings = {}) {
  let data = initial === null ? null : JSON.parse(JSON.stringify(initial));
  let etag = '"source-v3"';
  let writes = 0;
  return {
    get writes() { return writes; },
    get data() { return data; },
    async getWithMetadata(key, options) {
      assert.equal(key, "published");
      assert.deepEqual(options, { type: "text", consistency: "strong" });
      return data === null ? null : { data: JSON.stringify(data), etag, metadata: {} };
    },
    async setJSON(key, candidate, options) {
      writes += 1;
      assert.equal(key, "published");
      assert.deepEqual(options, { onlyIfMatch: '"source-v3"' });
      if (settings.conflict) return { modified: false };
      if (settings.phantomAck) return { modified: true, etag: "" };
      if (!settings.ackWithoutWrite) {
        data = JSON.parse(JSON.stringify(candidate));
        etag = '"published-v5"';
      }
      if (settings.changeReadback) data = { ...data, revision: data.revision + 1 };
      return { modified: true, etag: '"published-v5"' };
    }
  };
}
async function runCase(name, store, requestOverride, code, expectedWrites = 0) {
  const result = await migration.publishV5Migration({
    store,
    ...request,
    ...requestOverride
  });
  assert.equal(result.ok, false, name + ": " + JSON.stringify(result));
  assert.equal(result.code, code, name);
  assert.equal(store.writes, expectedWrites, name + " must have expected write count");
}

async function main() {
  let store = fakeStore();
  const success = await migration.publishV5Migration({ store, ...request });
  assert.equal(success.ok, true, JSON.stringify(success));
  assert.equal(success.code, "published_v5_verified");
  assert.equal(success.schemaVersion, v5Core.SCHEMA);
  assert.equal(success.revision, source.revision + 1, "migration increments exactly once");
  assert.equal(success.publishedDigest, preflight.expectedReadback.digest);
  assert.equal(success.publicationSignatureDigest, preflight.expectedReadback.publicationSignatureDigest);
  assert.equal(store.writes, 1, "exactly one conditional write");
  assert.equal(gate.digestJson(store.data), preflight.expectedReadback.digest);

  await runCase("no source blob", fakeStore(null), {}, "published_blob_missing");
  await runCase("source already v5", fakeStore(preflight.candidatePayload), {}, "source_not_v3");
  await runCase("wrong revision", fakeStore(), {
    payload: { ...request.payload, revision: source.revision + 1 }
  }, "source_revision_conflict");
  await runCase("wrong digest format", fakeStore(), {
    sourceDigest: "invalid"
  }, "invalid_source_digest");
  await runCase("wrong digest", fakeStore(), {
    sourceDigest: "0".repeat(64)
  }, "source_digest_conflict");
  await runCase("tampered candidate", fakeStore(), {
    payload: { ...structuredClone(request.payload), objects: { ...request.payload.objects, "module-01": {
      ...request.payload.objects["module-01"], title: "unexpected title"
    } } }
  }, "candidate_mismatch");
  await runCase("lost CAS race", fakeStore(source, { conflict: true }), {}, "source_etag_conflict", 1);
  await runCase("provider phantom ACK", fakeStore(source, { phantomAck: true }), {}, "write_etag_missing", 1);
  await runCase("no write with claimed success", fakeStore(source, { ackWithoutWrite: true }), {}, "readback_etag_mismatch", 1);
  await runCase("tampered readback", fakeStore(source, { changeReadback: true }), {}, "readback_digest_mismatch", 1);

  const missingSkirting = structuredClone(source);
  missingSkirting.stages.forEach((stage) => {
    stage.items = stage.items.filter((item) => item !== "stone-skirting");
  });
  store = fakeStore(missingSkirting);
  const skirting = await migration.publishV5Migration({
    store, ...request,
    payload: { ...request.payload, revision: missingSkirting.revision },
    sourceDigest: gate.digestJson(missingSkirting)
  });
  assert.equal(skirting.ok, false);
  assert.equal(store.writes, 0, "skirting must never be repaired as part of migration");

  const missingHandles = structuredClone(source);
  missingHandles.stages.forEach((stage) => {
    stage.items = stage.items.filter((item) => item !== "handles-all");
  });
  store = fakeStore(missingHandles);
  const handles = await migration.publishV5Migration({
    store, ...request,
    payload: { ...request.payload, revision: missingHandles.revision },
    sourceDigest: gate.digestJson(missingHandles)
  });
  assert.equal(handles.ok, false);
  assert.equal(store.writes, 0, "Puxadores must never be repaired as part of migration");

  const endpoint = fs.readFileSync(path.resolve(__dirname, "../../netlify/functions/configuration.mjs"), "utf8");
  assert.doesNotMatch(endpoint, /V5_MIGRATION_ENABLED/, "no live activation toggle must remain");
  assert.doesNotMatch(endpoint, /import v5Migration from/, "historical migration service must not be bundled in the live endpoint");
  assert.match(endpoint, /if \(operation === "publish-v5-migration"\)/);
  assert.match(endpoint, /return respond\(\{ error: "v5_migration_retired" \}, 410\)/);
  const guardSource = fs.readFileSync(path.resolve(__dirname,
    "../../netlify/lib/configuration-access.cjs"), "utf8");
  const auth = endpoint.indexOf("accessGuard.authorize(request");
  const denial = endpoint.indexOf("if (!access.ok)");
  const storeAccessOrder = endpoint.indexOf("const store = getConfigurationStore(context)");
  const oldOperation = endpoint.indexOf('operation === "publish-v5-migration"');
  assert.match(guardSource, /function hasAdminRole\(user\)/);
  assert.match(guardSource, /if \(hasAdminRole\(user\)\)/);
  assert(auth !== -1 && auth < denial && denial < storeAccessOrder && storeAccessOrder < oldOperation,
    "server-side authorization must precede any Blob access or retired operation check");
  console.log("v5 publication migration mock-store gates: PASS");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
