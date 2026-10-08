"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { savePublishedV5 } = require("../core/v5-normal-save.js");
const configuration = require("../core/configuration.js");
const v5Core = require("../core/administration-v5.js");
const flow = require("../core/flow-model.js");
const defaults = require("../data/configurator-settings.js");
const hierarchyDefaults = require("../data/hierarchy-defaults.js");
const catalog = require("../data/catalog-data.js");
const priceBook = require("../data/mock-price-book.js");
const scene = require("../data/scene-data.js");
const { digestJson } = require("./v5-publication-preflight.js");

const runtime = { configuration, v5Core, catalog, priceBook, scene };
const v3 = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
const v5 = v5Core.upgrade(v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
assert.deepEqual(v5Core.validate(v5, configuration, catalog, priceBook, scene), []);

function mockStore(initial = v5, mode = "") {
  let document = initial === null ? null : structuredClone(initial);
  let etag = '"original-v5"';
  let writes = 0;
  return {
    get writes() { return writes; },
    get document() { return document; },
    async getWithMetadata(key, options) {
      assert.equal(key, "published");
      assert.deepEqual(options, { type: "text", consistency: "strong" });
      if (document === null) return null;
      return { etag, data: typeof document === "string" ? document : JSON.stringify(document), metadata: {} };
    },
    async setJSON(key, value, options) {
      assert.equal(key, "published");
      assert.deepEqual(options, { onlyIfMatch: '"original-v5"' });
      writes++;
      if (mode === "conflict") return { modified: false };
      if (mode === "missing-write-etag") return { modified: true };
      if (mode !== "phantom") {
        document = structuredClone(value);
        etag = '"written-v5"';
      }
      if (mode === "changed-readback") {
        document.revision += 1;
      }
      if (mode === "invalid-readback") {
        document.presentationPolicy = null;
      }
      return { modified: true, etag: '"written-v5"' };
    }
  };
}

async function fails(label, store, payload, code, writes = 0) {
  const result = await savePublishedV5({ store, payload, runtime });
  assert.equal(result.ok, false, label + ": " + JSON.stringify(result));
  assert.equal(result.code, code, label);
  assert.equal(store.writes, writes, label + ": write count");
}

async function main() {
  const payload = structuredClone(v5);
  payload.objects["module-01"].title = "Título publicado v5";
  payload.pricing.roles.frontFinishAdjustment[Object.keys(payload.pricing.roles.frontFinishAdjustment)[0]] =
    { type: "amount", cents: 1234 };
  assert.deepEqual(v5Core.validate(payload, configuration, catalog, priceBook, scene), []);

  const store = mockStore();
  const saved = await savePublishedV5({ store, payload, runtime });
  assert.equal(saved.ok, true);
  assert.equal(saved.code, "saved_v5_verified");
  assert.equal(store.writes, 1);
  assert.equal(saved.value.schemaVersion, v5Core.SCHEMA);
  assert.equal(saved.value.revision, v5.revision + 1);
  assert.equal(saved.value.objects["module-01"].title, "Título publicado v5");
  assert.equal(saved.value.pricing.roles.frontFinishAdjustment[Object.keys(payload.pricing.roles.frontFinishAdjustment)[0]].type, "amount");
  assert.equal(digestJson(saved.value), digestJson(store.document), "verified readback returned");

  await fails("stale revision after first save", store, payload, "revision_conflict", 1);
  await fails("v5 is never created through normal PUT on v3", mockStore(v3), payload, "hierarchy_publication_required");
  await fails("missing source", mockStore(null), payload, "published_blob_missing");
  await fails("malformed source", mockStore("{not-json"), payload, "invalid_stored_json");
  await fails("invalid stored v5", mockStore({ ...v5, presentationPolicy: null }), payload, "invalid_v5");
  await fails("v3 downgrade attempt", mockStore(), v3, "schema_downgrade_forbidden");
  await fails("bad schema attempt", mockStore(), { ...payload, schemaVersion: "ConfiguratorAdministration2D 4.0" }, "schema_downgrade_forbidden");
  await fails("incorrect revision", mockStore(), { ...payload, revision: 999 }, "revision_conflict");
  await fails("bad typed rule", mockStore(), {
    ...payload, pricing: { ...payload.pricing, schemaVersion: "CommercialPricingRules 0.0" }
  }, "invalid_v5_configuration");
  await fails("missing required policy", mockStore(), { ...payload, presentationPolicy: null }, "invalid_v5_configuration");
  await fails("lost etag", mockStore(v5, "conflict"), payload, "source_etag_conflict", 1);
  await fails("missing etag from write", mockStore(v5, "missing-write-etag"), payload, "write_etag_missing", 1);
  await fails("phantom successful write", mockStore(v5, "phantom"), payload, "readback_etag_mismatch", 1);
  await fails("tampered readback", mockStore(v5, "changed-readback"), payload, "readback_digest_mismatch", 1);
  await fails("invalid readback", mockStore(v5, "invalid-readback"), payload, "readback_digest_mismatch", 1);

  const endpoint = fs.readFileSync(path.join(__dirname, "../../netlify/functions/configuration.mjs"), "utf8");
  assert.match(endpoint, /const V5_MIGRATION_ENABLED = false;/, "one-time migration is still hard OFF");
  assert(endpoint.indexOf("const user = await getUser()") < endpoint.indexOf("v5NormalSave.savePublishedV5"),
    "identity check precedes normal v5 save");
  assert(endpoint.indexOf('roles.includes("admin")') < endpoint.indexOf("v5NormalSave.savePublishedV5"),
    "admin role check precedes normal v5 save");
  assert(endpoint.indexOf("64 * 1024") < endpoint.indexOf("v5NormalSave.savePublishedV5"),
    "payload size guard precedes normal v5 save");
  assert.match(endpoint, /currentRead.schema === administrationV5.SCHEMA/,
    "v5 normal PUT is gated by existing stored v5");
  console.log("normal published v5 save with CAS/readback: PASS");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
