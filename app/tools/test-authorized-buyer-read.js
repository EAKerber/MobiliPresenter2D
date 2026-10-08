"use strict";
const assert = require("node:assert/strict");
const service = require("../../netlify/lib/authorized-buyer-read.cjs");
const published = require("../core/published-configuration.js");
const projection = require("../core/buyer-configuration-projection.js");
const configuration = require("../core/configuration.js");
const administrationV5 = require("../core/administration-v5.js");
const flow = require("../core/flow-model.js");
const catalog = require("../data/catalog-data.js");
const scene = require("../data/scene-data.js");
const priceBook = require("../data/mock-price-book.js");
const pricingContract = require("../core/pricing-contract.js");
const hierarchy = require("../data/hierarchy-defaults.js");
const defaults = require("../data/configurator-settings.js");
const runtime = { configuration, administrationV5, catalog, scene, priceBook, pricingContract };
const v3 = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
const v5 = administrationV5.upgrade(v3, configuration, flow, catalog, priceBook, scene, hierarchy);
const context = { deploy: { context: "deploy-preview" } };
const makeRequest = (method = "GET", url = "https://deploy-preview-185--mobilipresenter2d.netlify.app/api/buyer-configuration",
  headers = {}) => new Request(url, { method, headers });

async function main() {
  function deps({ user = null, identityError = false, document = v5, raw = null } = {}) {
    let selected = 0, accessed = 0;
    const store = {
      async getWithMetadata(key, options) {
        accessed++;
        assert.equal(key, "published");
        assert.deepEqual(options, { type: "text", consistency: "strong" });
        if (raw !== null) return raw;
        if (document === null) return null;
        return { data: JSON.stringify(document), etag: '"opaque-server-etag"' };
      }
    };
    return {
      dependencies: {
        getIdentityUser: async () => {
          if (identityError) throw Error("Identity unavailable");
          return user;
        },
        selectStore: () => { selected++; return store; },
        reader: published, projection, runtime
      },
      calls: () => ({ selected, accessed })
    };
  }
  async function check(args, expectedStatus, { method = "GET", url, headers } = {}) {
    const test = deps(args);
    const response = await service.handle(makeRequest(method, url, headers), context, test.dependencies);
    const data = await response.json();
    assert.equal(response.status, expectedStatus);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store, max-age=0");
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(response.headers.get("Vary"), "Cookie, Authorization");
    return { data, calls: test.calls() };
  }
  const unauth = await check({}, 401);
  assert.deepEqual(unauth.calls, { selected: 0, accessed: 0 });
  const forged = await check({}, 401, { headers: { "x-user-role": "admin",
    Authorization: "Bearer user-supplied", Cookie: "admin=true" } });
  assert.deepEqual(forged.calls, { selected: 0, accessed: 0 });
  const buyer = await check({ user: { id: "buyer", roles: ["customer"] } }, 403);
  assert.deepEqual(buyer.calls, { selected: 0, accessed: 0 });
  const outage = await check({ identityError: true }, 503);
  assert.deepEqual(outage.calls, { selected: 0, accessed: 0 });
  const put = await check({ user: { roles: ["admin"] } }, 405, { method: "PUT" });
  assert.deepEqual(put.calls, { selected: 0, accessed: 0 });
  const badQuery = await check({ user: { roles: ["admin"] } }, 400, {
    url: "https://deploy-preview-185--mobilipresenter2d.netlify.app/api/buyer-configuration?inspection=raw"
  });
  assert.deepEqual(badQuery.calls, { selected: 0, accessed: 0 });
  const admin = { user: { roles: ["admin"] } };
  const success = await check(admin, 200);
  assert.deepEqual(success.calls, { selected: 1, accessed: 1 });
  assert.deepEqual(success.data, projection.project(v5, runtime));
  const serialized = JSON.stringify(success.data);
  assert(!serialized.includes("opaque-server-etag"));
  assert(!serialized.includes('"revision"'));
  assert(!serialized.includes('"source":'));
  assert(!serialized.includes('"locked"'));
  assert(!serialized.includes('"admin"'));
  const metadataAdmin = await check({ user: { app_metadata: { roles: ["admin"] } } }, 200);
  assert.equal(metadataAdmin.data.schemaVersion, projection.SCHEMA);

  for (const document of [null, v3, { ...v5, presentationPolicy: null },
    { ...v5, schemaVersion: "ConfiguratorAdministration2D 6.0" }]) {
    const response = await check({ ...admin, document }, 503);
    assert.deepEqual(response.data, { error: "published_configuration_unavailable" });
    assert.deepEqual(response.calls, { selected: 1, accessed: 1 });
  }
  const brokenBlob = await check({ ...admin, raw: { data: "{", etag: "abc" } }, 503);
  assert.deepEqual(brokenBlob.data, { error: "published_configuration_unavailable" });

  const actor = await service.handle(makeRequest(), context, {
    getIdentityUser: () => ({ roles: ["admin"] }), selectStore: () => { throw Error("blob down"); },
    reader: published, projection, runtime
  });
  assert.equal(actor.status, 503, "storage errors never emit 200");

  const validSession = {
    verified: true, kind: "customer-session", subject: "sha256-subject",
    scopes: ["configuration:read"], issuedAt: 1000, expiresAt: 2000
  };
  const sessionRequest = makeRequest("GET", undefined, {
    Cookie: "__Host-casa-config-session=opaque-secret"
  });
  const authenticatedStore = deps({ document: v5 });
  const authorizedSession = await service.handle(sessionRequest, context, {
    ...authenticatedStore.dependencies,
    getIdentityUser: () => { throw Error("Identity down but buyer session still valid"); },
    verifyCustomerSession: async () => validSession,
    now: () => 1500 * 1000
  });
  assert.equal(authorizedSession.status, 200);
  assert.equal((await authorizedSession.json()).schemaVersion, projection.SCHEMA);
  assert.deepEqual(authenticatedStore.calls(), { selected: 1, accessed: 1 });
  for (const invalid of [
    { ...validSession, verified: false },
    { ...validSession, scopes: ["other:scope"] },
    { ...validSession, expiresAt: 1499 },
    { ...validSession, subject: "" },
    { ...validSession, issuedAt: 2200 }
  ]) {
    const invalidDeps = deps({ document: v5 });
    const denied = await service.handle(sessionRequest, context, {
      ...invalidDeps.dependencies,
      getIdentityUser: async () => null,
      verifyCustomerSession: async () => invalid,
      now: () => 1500 * 1000
    });
    assert.equal(denied.status, 401);
    assert.deepEqual(invalidDeps.calls(), { selected: 0, accessed: 0 });
  }
  const brokenSession = deps({ document: v5 });
  const providerDown = await service.handle(sessionRequest, context, {
    ...brokenSession.dependencies,
    verifyCustomerSession: async () => { throw Error("DB connection unavailable"); },
    now: () => 1500 * 1000
  });
  assert.equal(providerDown.status, 503);
  assert.deepEqual(brokenSession.calls(), { selected: 0, accessed: 0 });
  console.log("CP-PUBLIC-03a2-2 buyer endpoint: verified customer scope, expiry, Identity independence: PASS");
  console.log("CP-PUBLIC-03a2-1 buyer endpoint: authorization-before-blob, no fallback, strict v5: PASS");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
