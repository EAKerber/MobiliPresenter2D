"use strict";
const assert = require("node:assert/strict");
const guard = require("../../netlify/lib/configuration-access.cjs");

const nowSeconds = 1791504000; // deterministic fixture clock, not wall-clock time
const clock = () => nowSeconds * 1000;
const request = (method, headers = {}) => new Request(
  "https://fixture.invalid/.netlify/functions/configuration",
  { method, headers }
);
const anonymous = async () => null;
const buyerIdentity = async () => ({ roles: ["buyer"], app_metadata: { roles: [] } });
const adminIdentity = async () => ({ roles: ["admin"], app_metadata: { roles: [] } });
const appAdminIdentity = async () => ({ roles: [], app_metadata: { roles: ["admin"] } });
const validSession = Object.freeze({
  verified: true, kind: "customer-session", subject: "case-123",
  scopes: ["configuration:read"], issuedAt: nowSeconds - 100, expiresAt: nowSeconds + 600
});

async function main() {
  assert.equal(guard.hasAdminRole({ roles: "admin" }), false,
    "string role must not be spread into fake roles");
  assert.equal(guard.hasAdminRole({ app_metadata: { roles: ["admin"] } }), true);

  for (const [method, expected] of [["GET", 401], ["PUT", 401]]) {
    const result = await guard.authorize(request(method, {
      Cookie: "__Host-casa-config-session=forged", "x-user-role": "admin",
      Authorization: "Bearer forged"
    }), { getIdentityUser: anonymous, now: clock });
    assert.equal(result.ok, false);
    assert.equal(result.status, expected);
  }
  for (const method of ["GET", "PUT"]) {
    const result = await guard.authorize(request(method), { getIdentityUser: buyerIdentity, now: clock });
    assert.equal(result.status, 403, "Identity buyer must never be mistaken for admin");
  }
  for (const principal of [adminIdentity, appAdminIdentity]) {
    for (const method of ["GET", "PUT"]) {
      assert.deepEqual(await guard.authorize(request(method), { getIdentityUser: principal, now: clock }),
        { ok: true, principal: "admin" });
    }
  }
  assert.equal((await guard.authorize(request("DELETE"), { getIdentityUser: adminIdentity })).status, 405);

  for (const bad of [
    null, { ...validSession, verified: false }, { ...validSession, kind: "jwt" },
    { ...validSession, subject: "" }, { ...validSession, scopes: ["configuration:write"] },
    { ...validSession, expiresAt: nowSeconds }, { ...validSession, issuedAt: nowSeconds + 120 },
    { ...validSession, expiresAt: nowSeconds + 13 * 3600 },
    { ...validSession, expiresAt: "9999999999" }
  ]) {
    assert.equal(guard.isVerifiedCustomerReadSession(bad, nowSeconds), false);
    const result = await guard.authorize(request("GET"), {
      getIdentityUser: anonymous, verifyCustomerSession: async () => bad, now: clock
    });
    assert.equal(result.status, 401);
  }
  assert.deepEqual(await guard.authorize(request("GET"), {
    getIdentityUser: anonymous,
    verifyCustomerSession: async () => structuredClone(validSession),
    now: clock
  }), { ok: true, principal: "customer", subject: "case-123" },
  "Only an independently verified, scoped, unexpired server principal can be read-authorized");

  const badPut = await guard.authorize(request("PUT"), {
    getIdentityUser: anonymous,
    verifyCustomerSession: async () => validSession, now: clock
  });
  assert.equal(badPut.status, 401, "even verified customer sessions never authorize PUT");
  const nonAdminPut = await guard.authorize(request("PUT"), {
    getIdentityUser: buyerIdentity,
    verifyCustomerSession: async () => validSession, now: clock
  });
  assert.equal(nonAdminPut.status, 403);

  assert.deepEqual(await guard.authorize(request("GET"), {
    getIdentityUser: async () => { throw Error("identity service unavailable"); }, now: clock
  }), { ok: false, status: 503, error: "identity_unavailable" });
  assert.deepEqual(await guard.authorize(request("GET"), {
    getIdentityUser: anonymous,
    verifyCustomerSession: async () => { throw Error("session verification failure"); },
    now: clock
  }), { ok: false, status: 503, error: "session_unavailable" });

  console.log("CP-PUBLIC-03a1 full configuration authorization guard: PASS");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
