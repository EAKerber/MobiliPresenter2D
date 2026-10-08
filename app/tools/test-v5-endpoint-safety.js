"use strict";

// Simulate the real Netlify endpoint in Node with injected stores and Identity.
// No live Netlify SDK, credentials, production URL or network calls are used.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const configuration = require("../core/configuration.js");
const administrationV5 = require("../core/administration-v5.js");
const publishedReader = require("../core/published-configuration.js");
const v5Migration = require("../core/v5-publication-migration.js");
const v5Inspection = require("../core/v5-publication-inspection.js");
const v5NormalSave = require("../core/v5-normal-save.js");
const flow = require("../core/flow-model.js");
const hierarchyDefaults = require("../data/hierarchy-defaults.js");
const legacyStageRepair = require("../core/legacy-stage-repair.js");
const defaults = require("../data/configurator-settings.js");
const catalog = require("../data/catalog-data.js");
const priceBook = require("../data/mock-price-book.js");
const scene = require("../data/scene-data.js");

const v3 = configuration.normalizeConfiguratorSettings(
  configuration.createDefaultAdministration(defaults, catalog, priceBook, scene),
  catalog, priceBook, scene
);
const v5 = administrationV5.upgrade(v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);

function makeStore(initial) {
  let value = initial == null ? null : structuredClone(initial);
  let etag = '"fixture-0"';
  let readCount = 0;
  let writeCount = 0;
  return {
    get reads() { return readCount; },
    get writes() { return writeCount; },
    get value() { return structuredClone(value); },
    async getWithMetadata(key, options) {
      readCount++;
      assert.equal(key, "published");
      assert.deepEqual(options, { type: "text", consistency: "strong" });
      if (value === null) return null;
      return { data: JSON.stringify(value), etag, metadata: {} };
    },
    async setJSON(key, next, options) {
      assert.equal(key, "published");
      if (options?.onlyIfMatch && options.onlyIfMatch !== etag) return { modified: false };
      value = structuredClone(next);
      etag = '"fixture-' + (++writeCount) + '"';
      return { modified: true, etag };
    }
  };
}

async function main() {
  const endpointPath = path.resolve(__dirname, "../../netlify/functions/configuration.mjs");
  const source = fs.readFileSync(endpointPath, "utf8");
  assert.match(source, /const V5_MIGRATION_ENABLED = false;/);
  const withoutImports = source.replace(/^import\s+.*?\s+from\s+["'][^"']+["'];\s*$/gm, "");
  assert.equal(withoutImports.includes("from \"@netlify/blobs\""), false,
    "endpoint imports are replaced by injected mocks");
  const harnessPrefix = `const {
    getStore, getDeployStore, getUser, configCore, administrationV5,
    publishedReader, v5Migration, v5Inspection, v5NormalSave,
    flow, hierarchyDefaults, legacyStageRepair, defaults, catalog, priceBook, scene
  } = globalThis.__v5ReadinessHarness;\n`;

  let viewer = null;
  const siteStore = makeStore(v3);
  const previewStore = makeStore(v3);
  let siteOpens = 0;
  let previewOpens = 0;
  globalThis.__v5ReadinessHarness = {
    getStore(options) {
      siteOpens++;
      assert.deepEqual(options, { name: "configurator-settings", consistency: "strong" });
      return siteStore;
    },
    getDeployStore(options) {
      previewOpens++;
      assert.deepEqual(options, { name: "configurator-settings", consistency: "strong" });
      return previewStore;
    },
    async getUser() { return viewer; },
    configCore: configuration, administrationV5, publishedReader, v5Migration,
    v5Inspection, v5NormalSave, flow, hierarchyDefaults, legacyStageRepair,
    defaults, catalog, priceBook, scene
  };

  try {
    const moduleSource = harnessPrefix + withoutImports;
    const endpoint = await import("data:text/javascript;base64," + Buffer.from(moduleSource).toString("base64"));
    const previewContext = { deploy: { context: "deploy-preview" } };
    const productionContext = { deploy: { context: "production" } };
    const invoke = async (method, url, body, context = previewContext, headers = {}) => {
      const request = new Request("https://unit-test.invalid" + url, {
        method, headers: body === undefined ? headers : { "Content-Type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const response = await endpoint.default(request, context);
      assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
      return { status: response.status, body: await response.json() };
    };

    const publicV3 = await invoke("GET", "/api/configuration");
    assert.equal(publicV3.status, 200);
    assert.equal(publicV3.body.schemaVersion, configuration.SCHEMA);
    assert.equal(Object.hasOwn(publicV3.body, "etag"), false, "public GET must never include raw ETag");
    assert.equal(siteOpens, 0, "preview must not open site-wide production store");
    assert.equal(previewOpens, 1);

    // Retired admin-only raw preflight must never fall back to public GET,
    // never open a Blob store and never expose raw ETags/candidate data.
    const beforeRetiredReads = previewStore.reads;
    const beforeRetiredOpens = previewOpens;
    const deniedAnon = await invoke("GET", "/api/configuration?inspection=v5-preflight");
    assert.equal(deniedAnon.status, 410);
    assert.deepEqual(deniedAnon.body, { error: "v5_preflight_retired" });
    assert.equal(previewStore.reads, beforeRetiredReads);
    assert.equal(previewOpens, beforeRetiredOpens);

    viewer = { roles: ["buyer"], app_metadata: { roles: [] } };
    const retiredBuyer = await invoke("GET", "/api/configuration?inspection=v5-preflight");
    assert.equal(retiredBuyer.status, 410);
    assert.equal(previewOpens, beforeRetiredOpens);
    const deniedWrite = await invoke("PUT", "/api/configuration", v3);
    assert.equal(deniedWrite.status, 403);
    assert.equal(previewStore.writes, 0);

    viewer = { roles: ["admin"], app_metadata: { roles: ["admin"] } };
    const opensBeforeAdmin = previewOpens;
    const retiredAdmin = await invoke("GET", "/api/configuration?inspection=v5-preflight");
    assert.equal(retiredAdmin.status, 410);
    assert.deepEqual(retiredAdmin.body, { error: "v5_preflight_retired" });
    assert.equal(previewOpens, opensBeforeAdmin);
    assert.equal(previewStore.reads, beforeRetiredReads);
    const unsupported = await invoke("GET", "/api/configuration?inspection=unknown");
    assert.equal(unsupported.status, 422);
    assert.deepEqual(unsupported.body, { error: "unsupported_inspection" });
    assert.equal(previewOpens, opensBeforeAdmin);
    assert.equal(previewStore.writes, 0);

    const disabled = await invoke("PUT", "/api/configuration", v5,
      previewContext, { "X-Configuration-Operation": "publish-v5-migration" });
    assert.equal(disabled.status, 403, "the one-time migration remains disabled at runtime");
    assert.equal(disabled.body.error, "v5_migration_disabled");
    assert.equal(previewStore.writes, 0);

    const prematureV5 = await invoke("PUT", "/api/configuration", v5);
    assert.notEqual(prematureV5.status, 200, "ordinary PUT cannot create v5 while stored v3");
    assert.equal(previewStore.writes, 0);

    const currentAdmin = await invoke("GET", "/api/configuration", undefined, productionContext);
    assert.equal(currentAdmin.status, 200);
    assert.equal(currentAdmin.body.schemaVersion, configuration.SCHEMA);
    assert.equal(siteOpens, 1, "only explicit production mock context opens site store");
    assert.equal(siteStore.writes, 0);

    // Test native v5 editing only with an already-v5 preview store. The real
    // migration stays OFF and no production site-wide store is changed.
    const nativeV5Store = makeStore(v5);
    globalThis.__v5ReadinessHarness.getDeployStore = () => nativeV5Store;
    // The module captures the injected function reference at import time,
    // so validate v5 endpoint with a new module instance.
    const v5Harness = { ...globalThis.__v5ReadinessHarness, getDeployStore: () => nativeV5Store };
    globalThis.__v5ReadinessHarness = v5Harness;
    const v5Endpoint = await import("data:text/javascript;base64," + Buffer.from(moduleSource + "\n// native-v5-fixture").toString("base64"));
    const sendV5 = async (method, body) => {
      const response = await v5Endpoint.default(
        new Request("https://unit-test.invalid/api/configuration", {
          method, headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body)
        }), previewContext
      );
      return { status: response.status, body: await response.json() };
    };

    viewer = { roles: ["admin"] };
    const changed = structuredClone(v5);
    changed.objects["module-01"].title = "Alteração v5 confirmada";
    const saved = await sendV5("PUT", changed);
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.revision, v5.revision + 1);
    assert.equal(nativeV5Store.writes, 1);
    const checked = await sendV5("GET");
    assert.deepEqual(checked.body, saved.body, "public v5 GET must expose confirmed new document");
    assert.equal(Object.hasOwn(checked.body, "etag"), false);
    const downgrade = await sendV5("PUT", v3);
    assert.equal(downgrade.status, 409);
    assert.equal(nativeV5Store.writes, 1, "v3 downgrade cannot overwrite stored v5");
    console.log("v5 endpoint preview/admin/storage isolation: PASS");
  } finally {
    delete globalThis.__v5ReadinessHarness;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
