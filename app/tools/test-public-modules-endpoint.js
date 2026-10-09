"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const configuration = require("../core/configuration.js");
const administrationV5 = require("../core/administration-v5.js");
const publishedReader = require("../core/published-configuration.js");
const publicModules = require("../core/public-module-projection.js");
const flow = require("../core/flow-model.js");
const hierarchyDefaults = require("../data/hierarchy-defaults.js");
const defaults = require("../data/configurator-settings.js");
const catalog = require("../data/catalog-data.js");
const priceBook = require("../data/mock-price-book.js");
const scene = require("../data/scene-data.js");

const v3 = configuration.normalizeConfiguratorSettings(
  configuration.createDefaultAdministration(defaults, catalog, priceBook, scene),
  catalog, priceBook, scene
);
const v5 = administrationV5.upgrade(v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
v5.objects["module-01"].title = "Título realmente publicado";
v5.objects["module-01"].description = "";
v5.objects["module-01"].benefits = ["Destaque A", "Caixaria interna clara"];
assert.deepEqual(administrationV5.validate(v5, configuration, catalog, priceBook, scene), []);

function store(initial) {
  let data = initial;
  let reads = 0;
  let writes = 0;
  return {
    get reads() { return reads; },
    get writes() { return writes; },
    setMock(value) { data = value; },
    async getWithMetadata(key, options) {
      reads++;
      assert.equal(key, "published");
      assert.deepEqual(options, { type: "text", consistency: "strong" });
      if (data === null) return null;
      return { data: typeof data === "string" ? data : JSON.stringify(data), etag: '"private-etag"', metadata: {} };
    },
    async setJSON() { writes++; throw new Error("Public API attempted a write"); },
    async delete() { writes++; throw new Error("Public API attempted a delete"); }
  };
}
async function main() {
  const source = fs.readFileSync(path.resolve(__dirname, "../../netlify/functions/public-modules.mjs"), "utf8");
  const withoutImports = source.replace(/^import\s+.*?\s+from\s+["'][^"']+["'];\s*$/gm, "");
  assert.doesNotMatch(withoutImports, /^import\s/m);
  const dependencies = `const { getStore, getDeployStore, configCore, administrationV5,
publishedReader, publicModules, catalog, priceBook, scene } = globalThis.__publicModuleHarness;
`;
  const prod = store(v5), preview = store(null);
  let prodOpens = 0, previewOpens = 0, failRead = false;
  globalThis.__publicModuleHarness = {
    getStore(options) { assert.deepEqual(options, { name: "configurator-settings", consistency: "strong" }); prodOpens++; return prod; },
    getDeployStore(options) {
      assert.deepEqual(options, { name: "configurator-settings", consistency: "strong" });
      previewOpens++;
      if (failRead) throw new Error("private store failure");
      return preview;
    },
    configCore: configuration, administrationV5, publishedReader, publicModules, catalog, priceBook, scene
  };
  try {
    const endpoint = await import("data:text/javascript;base64," + Buffer.from(dependencies + withoutImports).toString("base64"));
    const previewCtx = { deploy: { context: "deploy-preview" } };
    const prodCtx = { deploy: { context: "production" } };
    async function invoke(method, suffix = "", context = previewCtx) {
      const response = await endpoint.default(new Request("https://fixture.invalid/api/public-modules" + suffix, { method }), context);
      assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
      assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.equal(response.headers.get("access-control-allow-origin"), null);
      return { status: response.status, body: await response.json() };
    }

    assert.deepEqual(await invoke("PUT"), { status: 405, body: { error: "method_not_allowed" } });
    assert.deepEqual(await invoke("GET", "?inspection=v5-preflight"), {
      status: 400, body: { error: "unsupported_query" }
    });
    assert.equal(prodOpens, 0); assert.equal(previewOpens, 0);

    // A preview must NEVER read the production published Blob.
    assert.deepEqual(await invoke("GET"), { status: 503, body: { error: "public_modules_unavailable" } });
    assert.equal(prodOpens, 0);
    assert.equal(preview.reads, 1);

    const productionResponse = await invoke("GET", "", prodCtx);
    assert.equal(productionResponse.status, 200);
    assert.equal(productionResponse.body.schemaVersion, publicModules.SCHEMA);
    assert.equal(productionResponse.body.modules.length, 7);
    assert.equal(productionResponse.body.modules[0].title, "Título realmente publicado");
    assert.equal(productionResponse.body.modules[0].description, undefined);
    assert.deepEqual(productionResponse.body.modules[0].benefits, ["Destaque A", "Caixaria interna clara"]);
    assert.equal(productionResponse.body.publicState.finishId, v5.initialState.finishId);
    assert.deepEqual(Object.keys(productionResponse.body), ["schemaVersion", "modules", "publicState"]);
    const wire = JSON.stringify(productionResponse.body);
    for (const secret of ["pricing", "price", "revision", "etag", "private-etag", "draft",
      "objectAssets", "initialState", "dependencies", "events", "handleProducts", "presentationPolicy",
      "materialGroups", "privateSession", "commercial"]) {
      assert(!wire.includes(secret), "Leaked field: " + secret);
    }
    assert.equal(prod.reads, 1);
    assert.equal(prod.writes, 0);

    preview.setMock(v5);
    const isolated = await invoke("GET");
    assert.equal(isolated.status, 200);
    assert.deepEqual(isolated.body, productionResponse.body);
    assert.equal(prod.reads, 1, "preview must not share production store");
    for (const invalid of ["not-json", v3, { ...v5, schemaVersion: "unknown" },
      { ...v5, objects: null }, null]) {
      preview.setMock(invalid);
      assert.deepEqual(await invoke("GET"), {
        status: 503, body: { error: "public_modules_unavailable" }
      });
    }
    failRead = true;
    assert.deepEqual(await invoke("GET"), {
      status: 503, body: { error: "public_modules_unavailable" }
    });
    assert.equal(preview.writes, 0);
    assert.equal(prod.writes, 0);
    console.log("CP-PUBLIC-02b isolated public endpoint, v5 validation and no-leak: PASS");
  } finally {
    delete globalThis.__publicModuleHarness;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
