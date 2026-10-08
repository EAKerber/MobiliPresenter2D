"use strict";

// Route-level falsification tests for the temporary production-only endpoint.
// No real Netlify app credentials or Blob stores are opened.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const endpointText = fs.readFileSync(path.resolve(__dirname, "../../netlify/functions/v5-publication-once.mjs"), "utf8");
  const adminHtml = fs.readFileSync(path.resolve(__dirname, "../admin.html"), "utf8");
  const adminJs = fs.readFileSync(path.resolve(__dirname, "../admin/admin.js"), "utf8");
  const mainEndpoint = fs.readFileSync(path.resolve(__dirname, "../../netlify/functions/configuration.mjs"), "utf8");

  assert.match(mainEndpoint, /const V5_MIGRATION_ENABLED = false;/,
    "normal production API migration toggle must remain OFF");
  assert.match(endpointText, /2026-10-09T03:00:00\.000Z/);
  assert.match(endpointText, /config = \{ path: "\/api\/publish-v5-once", method: "PUT" \}/);
  assert.match(adminHtml, /id="publishV5OnceButton"/);
  assert.match(adminJs, /fresh\.candidatePayload/);
  assert.match(adminJs, /"MIGRAR V5"/);

  const importsRemoved = endpointText.replace(/^import\s+.*?\s+from\s+["'][^"']+["'];\s*$/gm, "");
  const injected = `const {
    getStore, getUser, configCore, administrationV5, v5Migration,
    flow, hierarchyDefaults, legacyStageRepair, catalog, priceBook, scene
  } = globalThis.__v5OnceHarness;\n`;
  const code = injected + importsRemoved.replace(/Date\.now\(\)/g, "globalThis.__v5OnceHarness.testTime");
  let user = null;
  let opened = 0;
  let invocations = 0;
  let outcome = "success";
  const sourceDigest = "1bdee1066214fb097486b1b412899db751d4a1942b89c0721fb79e12fbcd7317";
  const candidate = { schemaVersion: "ConfiguratorAdministration2D 5.0", revision: 6 };
  globalThis.__v5OnceHarness = {
    testTime: Date.parse("2026-10-08T12:00:00Z"),
    getStore(opts) {
      opened++;
      assert.deepEqual(opts, { name: "configurator-settings", consistency: "strong" });
      return { fixture: "site-store" };
    },
    async getUser() { return user; },
    configCore: { SCHEMA: "ConfiguratorAdministration2D 3.0" },
    administrationV5: { SCHEMA: "ConfiguratorAdministration2D 5.0" },
    flow: {}, hierarchyDefaults: {}, legacyStageRepair: {}, catalog: {}, priceBook: {}, scene: {},
    v5Migration: {
      async publishV5Migration({ store, payload, sourceDigest: digest }) {
        invocations++;
        assert.deepEqual(store, { fixture: "site-store" });
        assert.deepEqual(payload, candidate);
        assert.equal(digest, sourceDigest);
        if (outcome === "already-v5") return { ok: false, status: 409, code: "source_not_v3" };
        return {
          ok: true, status: 200, code: "published_v5_verified",
          schemaVersion: candidate.schemaVersion, revision: 7,
          sourceDigest, publishedDigest: "fixture-verified", publicationSignatureDigest: "fixture-signature",
          etag: '"fixture-write-etag"'
        };
      }
    }
  };

  try {
    const endpoint = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
    const production = { deploy: { context: "production" } };
    const preview = { deploy: { context: "deploy-preview" } };
    const invoke = async ({ ctx = production, method = "PUT", body = candidate, digest = sourceDigest, origin = "" } = {}) => {
      const headers = { "Content-Type": "application/json", "X-Configuration-Source-Digest": digest };
      if (origin) headers.Origin = origin;
      const request = new Request("https://unit-test.invalid/api/publish-v5-once", {
        method, headers, body: method === "GET" ? undefined : JSON.stringify(body)
      });
      const response = await endpoint.default(request, ctx);
      assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
      return { status: response.status, body: await response.json() };
    };
    assert.equal((await invoke({ method: "GET" })).status, 405);
    assert.equal((await invoke({ ctx: preview })).status, 403);
    assert.equal((await invoke()).status, 401);
    assert.equal(opened, 0);
    user = { roles: ["buyer"] };
    assert.equal((await invoke()).status, 403);
    assert.equal(opened, 0);

    user = { roles: ["admin"] };
    assert.equal((await invoke({ origin: "https://outside.invalid" })).status, 403);
    assert.equal((await invoke({ digest: "0".repeat(64) })).status, 409);
    assert.equal((await invoke({ body: { ...candidate, revision: 5 } })).status, 409);
    assert.equal(opened, 0);
    assert.equal(invocations, 0);

    globalThis.__v5OnceHarness.testTime = Date.parse("2026-10-10T00:00:00Z");
    assert.equal((await invoke()).body.error, "activation_window_expired");
    assert.equal(opened, 0);
    globalThis.__v5OnceHarness.testTime = Date.parse("2026-10-08T12:00:00Z");

    const result = await invoke();
    assert.equal(result.status, 200);
    assert.equal(result.body.code, "published_v5_verified");
    assert.equal(opened, 1);
    assert.equal(invocations, 1);
    outcome = "already-v5";
    const replay = await invoke();
    assert.equal(replay.status, 409);
    assert.equal(replay.body.error, "source_not_v3");
    assert.equal(invocations, 2);
    console.log("temporary v5 operator auth, preview isolation, source guard, expiry and replay: PASS");
  } finally {
    delete globalThis.__v5OnceHarness;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
