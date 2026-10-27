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
  let productionResponse = null, productionFetches = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options = {}) => {
    productionFetches++;
    assert.equal(String(input), "https://production.fixture.invalid/api/public-modules");
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    return productionResponse
      ? new Response(JSON.stringify(productionResponse.body), { status: 200, headers: { "content-type": "application/json" } })
      : new Response("{}", { status: 503 });
  };
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
    const previewCtx = { deploy: { context: "deploy-preview" }, site: { url: "https://production.fixture.invalid" } };
    const prodCtx = { deploy: { context: "production" }, site: { url: "https://production.fixture.invalid" } };
    async function invoke(method, suffix = "", context = previewCtx, version = "") {
      const response = await endpoint.default(new Request("https://preview.fixture.invalid/api/public-modules" + suffix, {
        method, ...(version ? { headers: { "X-Public-Modules-Version": version } } : {})
      }), context);
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

    productionResponse = await invoke("GET", "", prodCtx);
    assert.equal(productionResponse.status, 200);
    assert.equal(productionResponse.body.schemaVersion, publicModules.SCHEMA);
    assert.equal(productionResponse.body.modules.length, 7);
    assert.equal(productionResponse.body.modules[0].title, "Título realmente publicado");
    assert.equal(productionResponse.body.modules[0].description, undefined);
    assert.deepEqual(productionResponse.body.modules[0].benefits, ["Destaque A", "Caixaria interna clara"]);
    assert.equal(productionResponse.body.publicState.finishId, v5.initialState.finishId);
    assert.equal(productionResponse.body.publicState.viewerEntities["module-01"], true,
      "public projection exposes viewer visibility separately from configurator visibility");
    assert.deepEqual(Object.keys(productionResponse.body), ["schemaVersion", "modules", "publicState"]);
    const wire = JSON.stringify(productionResponse.body);
    for (const secret of ["pricing", "price", "revision", "etag", "private-etag", "draft",
      "objectAssets", "initialState", "dependencies", "events", "handleProducts", "presentationPolicy",
      "materialGroups", "privateSession", "commercial"]) {
      assert(!wire.includes(secret), "Leaked field: " + secret);
    }
    assert.equal(prod.reads, 1);
    assert.equal(prod.writes, 0);

    // A preview never reads the production Blob; if its own Blob is missing,
    // it consumes only the public projection from the primary site endpoint.
    const previewProjection = await invoke("GET");
    assert.deepEqual(previewProjection, productionResponse);
    assert.equal(prodOpens, 1);
    assert.equal(preview.reads, 1);
    assert.equal(prod.reads, 1, "preview must not read the production published Blob");
    assert.equal(productionFetches, 1);

    // Legacy #179/#180 preview-security gap: only public DTO fields may flow
    // through the PRIMARY PUBLIC endpoint, even if that origin returns a bad
    // body. Never treat an upstream 0.2 response as permission for 0.1 clients.
    const cleanPrimary = structuredClone(productionResponse);
    const originalPublished = cleanPrimary.body;
    const forged = [
      { ...originalPublished, administrativeSecret: { token: "must-never-cross" } },
      { ...originalPublished, publicState: { ...originalPublished.publicState, pricing: { secret: true } } },
      { ...originalPublished, publicState: { ...originalPublished.publicState,
          availableFinishes: originalPublished.publicState.availableFinishes.map(
            (finish, i) => i ? finish : { ...finish, administrativeColorToken: "private" }) } },
      { ...originalPublished, schemaVersion: publicModules.PRICED_SCHEMA,
        modules: originalPublished.modules.map((module,i) => i
          ? module : { ...module, basePriceCents: 90000 }) }
    ];
    for (const [index, body] of forged.entries()) {
      productionResponse = { ...cleanPrimary, body };
      const denied = await invoke("GET", "", previewCtx);
      assert.deepEqual(denied, { status: 503, body: { error: "public_modules_unavailable" } },
        "forged primary-public response must fail closed #" + index);
      assert.equal(prod.reads, 1, "preview never accesses primary private storage");
    }
    productionResponse = cleanPrimary;
    const productionFetchesAfterNegativeProbes = productionFetches;

    // Negotiation never grants permission: only the published V5 flag can.
    assert.deepEqual(await invoke("GET", "", prodCtx, "0.7"), {
      status: 406, body: { error: "unsupported_public_modules_version" }
    });
    const enabledDocument = structuredClone(v5);
    enabledDocument.viewerPricePublication = { enabled: true };
    prod.setMock(enabledDocument);
    const legacyWhenOn = await invoke("GET", "", prodCtx);
    const pricedWhenOn = await invoke("GET", "", prodCtx, "0.2");
    assert.equal(legacyWhenOn.body.schemaVersion, publicModules.SCHEMA);
    assert.equal(JSON.stringify(legacyWhenOn.body).includes("basePriceCents"), false);
    assert.equal(pricedWhenOn.body.schemaVersion, publicModules.PRICED_SCHEMA);
    assert.equal(pricedWhenOn.body.modules[0].basePriceCents, v5.pricing.roles.itemBase["module-01"].cents);
    assert.equal(JSON.stringify(pricedWhenOn.body).includes('"pricing"'),false);
    prod.setMock(v5);
    const pricedWhileOff = await invoke("GET", "", prodCtx, "0.2");
    assert.equal(pricedWhileOff.body.schemaVersion,publicModules.SCHEMA);
    assert.equal(JSON.stringify(pricedWhileOff.body).includes("basePriceCents"),false);
    const prodReadsAfterVersionChecks = prod.reads;

    // Turning off a module in the configurator must not suppress its public
    // viewer state. Preview fallback accepts the current viewerEntities DTO.
    const configuratorHidden = structuredClone(v5);
    for (const item of catalog.modules) configuratorHidden.initialState.entities[item.entityId] = false;
    const independentProjection = publicModules.project(configuratorHidden, catalog, scene);
    assert(catalog.modules.every((item) => independentProjection.publicState.viewerEntities[item.entityId] === true));

    preview.setMock(v5);
    const isolated = await invoke("GET");
    assert.equal(isolated.status, 200);
    assert.deepEqual(isolated.body, productionResponse.body);
    assert.equal(productionFetches, productionFetchesAfterNegativeProbes, "a valid preview publication takes precedence over the public primary projection");
    assert.equal(prod.reads, prodReadsAfterVersionChecks, "preview must not share production store");
    for (const invalid of ["not-json", v3, { ...v5, schemaVersion: "unknown" },
      { ...v5, objects: null }]) {
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
    globalThis.fetch = originalFetch;
    delete globalThis.__publicModuleHarness;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
