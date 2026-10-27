import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import * as policy from "../../netlify/access/identity-policy.mjs";
import { cookieValue, jsonResponse } from "../../netlify/access/http.mjs";

// Exercita o handler de produção com dependências injetadas. Sem banco, Netlify,
// credenciais, rede, seeds, mutation ou redirects a um host externo.
test("buyer API denies before Blob and only trusts verified sessions", async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const source = readFileSync(resolve(root, "netlify/functions/buyer-configuration.mjs"), "utf8");
  const stripped = source.replace(/^import\s+.*?\s+from\s+["'][^"']+["'];\s*$/gm, "");
  assert.doesNotMatch(stripped, /^import\s/m);
  let user = null, cookie = null, session = null, identityDown = false;
  let sessionDown = false, publicationKind = "stored", inspectedKind = "valid";
  let previewOpens = 0, prodOpens = 0, projects = 0, reads = 0;
  const store = Object.freeze({ offline: true });
  const fixture = {
    getDeployStore() { previewOpens++; return store; },
    getStore() { prodOpens++; return store; },
    async getUser() {
      if (identityDown) throw new Error("fixture_identity_down");
      return user;
    },
    canUseConfigurator: policy.canUseConfigurator,
    canUseInternalPages: policy.canUseInternalPages,
    cookieValue: (request, name) => cookieValue(request, name),
    jsonResponse,
    async findActiveSession() {
      if (sessionDown) throw new Error("fixture_store_down");
      return session;
    },
    ACCESS_COOKIE_NAME: "fixture_session",
    publishedReader: {
      async readRawPublished(input) {
        assert.equal(input, store);
        reads++;
        return { kind: publicationKind };
      },
      inspectPublishedRaw() { return { kind: inspectedKind, value: { fixture: "published" } }; }
    },
    buyerProjection: {
      project() { projects++; return { schemaVersion: "BuyerFixture 1.0", displaySettings: { safe: true } }; }
    },
    configCore: {}, administrationV5: {}, flowCore: {}, hierarchyDefaults: {},
    catalog: {}, priceBook: {}, scene: {}, pricingContract: {}, presentationPolicy: {}
  };
  const globalKey = "__developmentBuyerAuthorizationFixture";
  assert.equal(globalThis[globalKey], undefined);
  globalThis[globalKey] = fixture;
  try {
    const prefix = `const {
      getDeployStore, getStore, getUser, canUseConfigurator, canUseInternalPages,
      cookieValue, jsonResponse, findActiveSession, ACCESS_COOKIE_NAME,
      publishedReader, buyerProjection, configCore, administrationV5, flowCore,
      hierarchyDefaults, catalog, priceBook, scene, pricingContract, presentationPolicy
    } = globalThis.${globalKey};\n`;
    const mod = await import("data:text/javascript;base64," +
      Buffer.from(prefix + stripped).toString("base64"));
    const preview = { deploy: { context: "deploy-preview" } };
    const prod = { deploy: { context: "production" } };
    async function request(method = "GET", query = "", context = preview) {
      const req = new Request("https://fixture.invalid/api/buyer-configuration" + query,
        { method, ...(cookie ? { headers: { Cookie: "fixture_session=" + cookie } } : {}) });
      const resp = await mod.default(req, context);
      assert.equal(resp.headers.get("cache-control"), "no-store, max-age=0");
      assert.equal(resp.headers.get("x-content-type-options"), "nosniff");
      assert.equal(resp.headers.get("access-control-allow-origin"), null);
      return { status: resp.status, body: await resp.json() };
    }
    assert.deepEqual(await request("PUT"), { status: 405, body: { error: "method_not_allowed" } });
    assert.deepEqual(await request("GET", "?inspection=raw"),
      { status: 400, body: { error: "unsupported_query" } });
    assert.deepEqual(await request(), { status: 401, body: { error: "unauthorized" } });
    user = { id: "buyer", roles: ["buyer"] };
    assert.deepEqual(await request(), { status: 403, body: { error: "forbidden" } });
    user = { roles: ["admin"] };
    assert.deepEqual(await request(), { status: 403, body: { error: "forbidden" } });
    identityDown = true;
    assert.deepEqual(await request(), { status: 503, body: { error: "identity_unavailable" } });
    identityDown = false;
    user = null;
    assert.equal(previewOpens, 0);
    assert.equal(prodOpens, 0);
    assert.equal(reads, 0);
    assert.equal(projects, 0);

    cookie = "unrecognized_token";
    assert.deepEqual(await request(), { status: 401, body: { error: "unauthorized" } });
    sessionDown = true;
    assert.deepEqual(await request(), { status: 503, body: { error: "access_store_unavailable" } });
    sessionDown = false;
    session = { id: "session", grant_id: "grant", expires_at: "future_from_verified_store" };
    assert.equal((await request()).status, 200, "only DB-verified session permits buyer read");
    assert.equal(previewOpens, 1);
    assert.equal(prodOpens, 0);
    assert.equal(reads, 1);
    assert.equal(projects, 1);

    publicationKind = "missing";
    assert.deepEqual(await request(), { status: 503, body: { error: "published_configuration_unavailable" } });
    publicationKind = "stored";
    inspectedKind = "invalid";
    assert.deepEqual(await request(), { status: 503, body: { error: "published_configuration_invalid" } });
    inspectedKind = "valid";
    user = { id: "staff", roles: ["staff"] };
    cookie = null;
    assert.equal((await request("GET", "", prod)).status, 200);
    assert.equal(prodOpens, 1, "only authorized production context may use production store");
    assert.equal(projects, 2, "no projection of missing or invalid publications");
  } finally {
    delete globalThis[globalKey];
  }
});
