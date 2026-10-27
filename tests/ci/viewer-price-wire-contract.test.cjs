"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { runInNewContext } = require("node:vm");

// Exercita o código entregue ao navegador, não outro validador substituto.
// A resposta é inteiramente em memória, sem Netlify, banco, deploy ou network.
const source = readFileSync(resolve(__dirname, "../../app/viewer/public-data.js"), "utf8");
const UNPRICED = "PublicModulePresentation2D 0.1";
const PRICED = "PublicModulePresentation2D 0.2";
function fixture(version = UNPRICED) {
  return {
    schemaVersion: version,
    modules: [{
      id: "module-01", title: "Módulo A",
      nominalDimensionsMm: { width: 1000, height: 800, depth: 550 },
      dimensionLabel: "1000 × 800 × 550 mm",
      ...(version === PRICED ? { basePriceCents: 45200 } : {})
    }],
    publicState: {
      viewerEntities: { "module-01": true },
      finishId: "base-light",
      availableFinishes: [{ id: "base-light", label: "Branco" }]
    }
  };
}
async function invoke(payload, { status = 200, reject = false } = {}) {
  const calls = [];
  const context = {
    window: {
      fetch: async (url, options) => {
        calls.push({ url, options });
        if (reject) throw new Error("simulated_offline");
        return { ok: status >= 200 && status < 300, json: async () => payload };
      }
    }
  };
  runInNewContext(source, context, { filename: "app/viewer/public-data.js" });
  let result, error;
  try { result = await context.window.CASA_PUBLIC_VIEWER_DATA.load(); }
  catch (caught) { error = caught; }
  assert.equal(calls.length, 1, "one read, no data source fallback");
  assert.equal(calls[0].url, "/api/public-modules");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.credentials, "same-origin");
  assert.equal(calls[0].options.headers["X-Public-Modules-Version"], "0.2");
  return { result, error };
}
test("0.1 response has no price: OFF/default are safe for new Viewer", async () => {
  const { result, error } = await invoke(fixture());
  assert.equal(error, undefined);
  assert.equal(result.publicModules.length, 1);
  assert.equal(Object.hasOwn(result.publicModules[0], "basePriceCents"), false);
  assert.equal(result.publicModules[0].dimensionLabel, "1000 × 800 × 550 mm");
});
test("0.2 explicitly priced scalar survives unchanged without local pricebook", async () => {
  const { result, error } = await invoke(fixture(PRICED));
  assert.equal(error, undefined);
  assert.equal(result.publicModules[0].basePriceCents, 45200);
  assert.equal(result.publicState.viewerEntities["module-01"], true);
});
test("stale 0.1 clients cannot smuggle prices into the 0.2-capable Viewer", async () => {
  const body = fixture();
  body.modules[0].basePriceCents = 45200;
  const { error, result } = await invoke(body);
  assert.equal(result, undefined);
  assert.match(error.message, /invalid_public_base_price/);
});
test("malformed or unauthorized price scalars fail closed", async () => {
  for (const cents of [0, -1, 100000001, 4.5, "45200", null, Number.NaN, Infinity]) {
    const body = fixture(PRICED);
    body.modules[0].basePriceCents = cents;
    const { error, result } = await invoke(body);
    assert.equal(result, undefined, "must reject cents " + String(cents));
    assert.match(error.message, /invalid_public_base_price/);
  }
});
test("module membership and published scene state remain authoritative", async () => {
  const invalid = [
    (v) => v.modules.push({ ...v.modules[0] }),
    (v) => { v.publicState.viewerEntities = {}; },
    (v) => { v.publicState.finishId = "nonexistent"; },
    (v) => { v.modules[0].nominalDimensionsMm.width = 0; }
  ];
  for (const mutate of invalid) {
    const body = fixture(PRICED);
    mutate(body);
    const { result, error } = await invoke(body);
    assert.equal(result, undefined);
    assert.ok(error instanceof Error, "invalid published state must be denied");
  }
});
test("HTTP failure, network failure, unknown schema: no fallback to local catalog", async () => {
  for (const options of [{ status: 503 }, { reject: true }]) {
    const { result, error } = await invoke(fixture(PRICED), options);
    assert.equal(result, undefined);
    assert.ok(error);
  }
  const unknown = fixture("PublicModulePresentation2D 0.3");
  unknown.modules[0].basePriceCents = 45200;
  const { result, error } = await invoke(unknown);
  assert.equal(result, undefined);
  assert.match(error.message, /invalid_public_module_projection/);
});
