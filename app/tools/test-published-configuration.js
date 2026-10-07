"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const reader = require("../core/published-configuration.js");
const configuration = require("../core/configuration.js");
const administrationV5 = require("../core/administration-v5.js");
const flow = require("../core/flow-model.js");
const defaults = require("../data/configurator-settings.js");
const hierarchyDefaults = require("../data/hierarchy-defaults.js");
const scene = require("../data/scene-data.js");
const catalog = require("../data/catalog-data.js");
const priceBook = require("../data/mock-price-book.js");

const dependencies = { configuration, administrationV5, catalog, priceBook, scene };
const v3 = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
const v5 = administrationV5.upgrade(v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
const etag = '"original-etag"';
const store = (data, expectedEtag = etag) => ({
  async getWithMetadata(key, options) {
    assert.equal(key, "published");
    assert.deepEqual(options, { type: "text", consistency: "strong" });
    return data === null ? null : { data, etag: expectedEtag, metadata: {} };
  }
});

async function run() {
  assert.equal(scene.schemaVersion, "Scene2D 1.0");
  assert.deepEqual(administrationV5.validate(v5, configuration, catalog, priceBook, scene), []);
  const rawV3 = await reader.readRawPublished(store(JSON.stringify(v3)));
  assert.equal(rawV3.kind, "stored");
  assert.equal(rawV3.etag, etag);
  const inspectedV3 = reader.inspectPublishedRaw(rawV3, dependencies);
  assert.equal(inspectedV3.kind, "valid");
  assert.equal(inspectedV3.schema, configuration.SCHEMA);
  assert.deepEqual(inspectedV3.value, configuration.normalizeConfiguratorSettings(v3, catalog, priceBook, scene));
  assert.equal(inspectedV3.rawValue, rawV3.value);

  const rawV5 = await reader.readRawPublished(store(JSON.stringify(v5)));
  const inspectedV5 = reader.inspectPublishedRaw(rawV5, dependencies);
  assert.equal(inspectedV5.kind, "valid", "a stored v5 must be recognized by its own validator");
  assert.equal(inspectedV5.schema, administrationV5.SCHEMA);
  assert.deepEqual(inspectedV5.value, administrationV5.normalize(v5));
  assert.equal(inspectedV5.rawValue, rawV5.value);

  assert.deepEqual(await reader.readRawPublished(store(null)), { kind: "missing" });
  assert.equal((await reader.readRawPublished(store("{broken"))).code, "invalid_stored_json");
  assert.equal((await reader.readRawPublished(store(JSON.stringify(v3), ""))).code, "invalid_blob_metadata");
  assert.equal(reader.inspectPublishedRaw(
    await reader.readRawPublished(store(JSON.stringify({ ...v3, schemaVersion: "ConfiguratorAdministration2D 6.0" }))),
    dependencies
  ).code, "unsupported_stored_schema");

  const invalidV5 = reader.inspectPublishedRaw(
    await reader.readRawPublished(store(JSON.stringify({ ...v5, presentationPolicy: null }))),
    dependencies
  );
  assert.equal(invalidV5.code, "invalid_v5", "invalid stored v5 must fail closed");
  const invalidV3 = reader.inspectPublishedRaw(
    await reader.readRawPublished(store(JSON.stringify({ ...v3, stages: [] }))),
    dependencies
  );
  assert.equal(invalidV3.code, "invalid_v3");

  const endpoint = fs.readFileSync(path.join(__dirname, "../../netlify/functions/configuration.mjs"), "utf8");
  assert.match(endpoint, /currentRead\.schema === administrationV5\.SCHEMA/, "legacy writes must not downgrade stored v5");
  assert.match(endpoint, /inspectPublishedRaw/, "the endpoint must dispatch on the stored schema");
  assert.match(fs.readFileSync(path.join(__dirname, "../core/published-configuration.js"), "utf8"), /getWithMetadata/, "raw reads must be backed by an ETag read");
  console.log("published configuration v3/v5 read: PASS");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
