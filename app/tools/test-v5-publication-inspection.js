"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { inspectV5Preflight } = require("../core/v5-publication-inspection.js");
const gate = require("./v5-publication-preflight.js");
const configuration = require("../core/configuration.js");
const v5Core = require("../core/administration-v5.js");
const flow = require("../core/flow-model.js");
const legacyStageRepair = require("../core/legacy-stage-repair.js");
const settings = require("../data/configurator-settings.js");
const hierarchyDefaults = require("../data/hierarchy-defaults.js");
const catalog = require("../data/catalog-data.js");
const priceBook = require("../data/mock-price-book.js");
const scene = require("../data/scene-data.js");
const runtime = { configuration, v5Core, flow, legacyStageRepair, hierarchyDefaults, catalog, priceBook, scene };
const source = configuration.normalizeConfiguratorSettings(
  configuration.createDefaultAdministration(settings, catalog, priceBook, scene),
  catalog, priceBook, scene
);
const preflight = gate.createPreflight(source, runtime);
assert.equal(preflight.ok, true, JSON.stringify(preflight));

function store(value = source) {
  let reads = 0;
  return {
    get reads() { return reads; },
    async getWithMetadata(key, options) {
      reads++;
      assert.equal(key, "published");
      assert.deepEqual(options, { type: "text", consistency: "strong" });
      return value === null ? null : {
        data: typeof value === "string" ? value : JSON.stringify(value),
        etag: '"source-etag"',
        metadata: {}
      };
    },
    async setJSON() { throw new Error("read-only inspection tried to write"); },
    async delete() { throw new Error("read-only inspection tried to delete"); }
  };
}

async function main() {
  let s = store();
  const ready = await inspectV5Preflight({ store: s, runtime });
  assert.equal(ready.ok, true);
  assert.equal(ready.status, 200);
  assert.equal(ready.code, "v5_preflight_ready");
  assert.equal(ready.source.etag, '"source-etag"');
  assert.equal(ready.source.revision, source.revision);
  assert.equal(ready.source.rawCanonicalDigest, gate.digestJson(source));
  assert.equal(ready.preflight.source.digest, preflight.source.digest);
  assert.equal(ready.preflight.expectedReadback.digest, preflight.expectedReadback.digest);
  assert.deepEqual(ready.candidatePayload, preflight.candidatePayload);
  assert.equal(s.reads, 1, "preflight evidence must come from one strong raw read");
  assert.equal(Object.hasOwn(ready, "rawValue"), false, "unmodified v3 raw JSON is never exposed by inspection");

  s = store(null);
  const missing = await inspectV5Preflight({ store: s, runtime });
  assert.equal(missing.code, "published_blob_missing");
  assert.equal(missing.status, 409);

  s = store("{not-json");
  const malformed = await inspectV5Preflight({ store: s, runtime });
  assert.equal(malformed.code, "invalid_stored_json");

  s = store(preflight.candidatePayload);
  const alreadyV5 = await inspectV5Preflight({ store: s, runtime });
  assert.equal(alreadyV5.code, "source_not_v3");
  assert.equal(alreadyV5.status, 409);
  assert.equal(Object.hasOwn(alreadyV5, "candidatePayload"), false);

  const missingHandles = structuredClone(source);
  missingHandles.stages.forEach((stage) => { stage.items = stage.items.filter((item) => item !== "handles-all"); });
  s = store(missingHandles);
  const blocked = await inspectV5Preflight({ store: s, runtime });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "v5_preflight_blocked");
  assert.equal(blocked.preflight.code, "handles_repair_required");
  assert.equal(Object.hasOwn(blocked, "candidatePayload"), false);
  assert.equal(blocked.source.etag, '"source-etag"');
  assert.equal(blocked.source.rawCanonicalDigest, gate.digestJson(missingHandles));

  const endpoint = fs.readFileSync(path.resolve(__dirname, "../../netlify/functions/configuration.mjs"), "utf8");
  assert.match(endpoint, /inspection !== "v5-preflight"/);
  const start = endpoint.indexOf('if (request.method === "GET")');
  const inspectCall = endpoint.indexOf("v5Inspection.inspectV5Preflight");
  const auth = endpoint.indexOf("const inspectionUser = await getUser()");
  const role = endpoint.indexOf('inspectionRoles.includes("admin")');
  const normalGet = endpoint.indexOf("const published = await readPublished(store)");
  assert(start !== -1 && start < auth && auth < role && role < inspectCall && inspectCall < normalGet,
    "raw inspection must require authenticated admin before any preflight read and be separate from public GET");
  assert.match(endpoint, /const V5_MIGRATION_ENABLED = false;/);
  console.log("admin-only read-only v5 preflight inspection: PASS");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
