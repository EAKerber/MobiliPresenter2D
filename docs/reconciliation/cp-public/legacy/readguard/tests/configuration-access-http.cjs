"use strict";
// CP-PUBLIC-03a1 real anonymous-preview security gate. NO credentials,
// writes, user sessions, production URLs or publish/seed operations.
const assert = require("node:assert/strict");
const base = process.env.CONFIG_ACCESS_PREVIEW_URL;
const url = new URL(base || "https://invalid.invalid");
assert.equal(url.protocol, "https:");
assert.equal(url.hostname, "deploy-preview-182--mobilipresenter2d.netlify.app",
  "Safety guard: never probe production with this test");

function assertNoPrivatePayload(payload) {
  assert(payload && typeof payload === "object" && !Array.isArray(payload));
  assert.equal(Object.hasOwn(payload, "schemaVersion"), false);
  for (const field of ["objects", "pricing", "materials", "objectAssets",
    "revision", "stages", "etag", "handleProducts"]) {
    assert.equal(Object.hasOwn(payload, field), false, "private field leaked: " + field);
  }
}
async function request(path, options = {}) {
  return fetch(new URL(path, url), { redirect: "manual",
    signal: AbortSignal.timeout(12000), cache: "no-store", ...options });
}
async function check(path) {
  let result;
  for (let i = 0; i < 24; i++) {
    result = await request(path);
    if ([404, 502, 503].includes(result.status) && i < 23) {
      // 503 may also be the correct fail-closed Identity outage: retry only
      // until deploy is ready; final assertion remains strict.
      await new Promise((resolve) => setTimeout(resolve, 2500));
      continue;
    }
    break;
  }
  assert.equal(result.status, 401, path + " must deny anonymous GET (got " + result.status + ")");
  assert.equal(result.headers.get("x-content-type-options"), "nosniff");
  assert((result.headers.get("cache-control") || "").includes("no-store"));
  assert.equal(result.headers.get("access-control-allow-origin"), null);
  const payload = await result.json();
  assert.deepEqual(payload, { error: "unauthorized" });
  assertNoPrivatePayload(payload);
  return payload;
}
async function main() {
  await check("/api/configuration");
  await check("/.netlify/functions/configuration");
  const forged = await request("/api/configuration", { headers: {
    "x-user-role": "admin", Cookie: "__Host-casa-config-session=forged",
    Authorization: "Bearer invalid"
  } });
  assert.notEqual(forged.status, 200, "Unverified HTTP claims must not authorize GET");
  assert([401, 403, 503].includes(forged.status), "forged identity denied with safe status");
  assertNoPrivatePayload(await forged.json());

  const put = await request("/api/configuration", { method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schemaVersion: "ConfiguratorAdministration2D 5.0" })
  });
  assert.equal(put.status, 401, "Anonymous PUT denied before reading/writing Blob");
  assertNoPrivatePayload(await put.json());
  console.log("CP-PUBLIC-03a1 real anonymous preview API access (alias + direct): PASS");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
