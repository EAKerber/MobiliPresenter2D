"use strict";
// Read-only production verification. No POST, PUT, Blob edits, tokens,
// synthetic published data, secrets, or logging of customer/admin payload.
const assert = require("node:assert/strict");
const origin = process.env.PUBLIC_LIVE_ORIGIN || "https://mobilipresenter2d.netlify.app";
const base = new URL(origin);
assert.equal(base.protocol, "https:");
assert.equal(base.pathname, "/");
assert(["mobilipresenter2d.netlify.app", "casaemmodulos.casa"].includes(base.hostname),
  "Only the specified public production hosts may be probed");

async function get(path, init = {}) {
  const response = await fetch(new URL(path, base), {
    headers: { Accept: "text/html, application/json" },
    cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(12000), ...init
  });
  return response;
}
async function main() {
  const routes = [
    ["/", "id=\"environmentTrack\""],
    ["/config/", "class=\"workspace\""],
    ["/viewer/", "id=\"viewerLayout\""],
    ["/admin.html", "Casa em Módulos"]
  ];
  for(const [path, expected] of routes) {
    const response = await get(path);
    assert.equal(response.status, 200, path + " must return live 200");
    assert((await response.text()).includes(expected), path + " missing expected HTML signature");
    console.log("GET " + path + ": 200, expected shell present");
  }
  const response = await get("/api/public-modules", {
    headers: { Accept: "application/json" }
  });
  assert.equal(response.status, 200, "production public projection must read real published v5; no fallback fixture");
  assert.match(response.headers.get("content-type") || "", /application\/json/);
  const value = await response.json();
  assert.equal(value.schemaVersion, "PublicModulePresentation2D 0.1");
  assert(Array.isArray(value.modules) && value.modules.length >= 1 && value.modules.length <= 7);
  assert.equal(new Set(value.modules.map(x=>x.id)).size, value.modules.length);
  assert(Array.isArray(value.publicState?.availableFinishes));
  assert(Object.keys(value).sort().join("|") === ["schemaVersion","modules","publicState"].sort().join("|"));
  const serialized = JSON.stringify(value).toLowerCase();
  for (const banned of ['"pricing"', '"price"', '"etag"', '"revision"', '"secret"', '"app_metadata"', '"draft"']) {
    assert(!serialized.includes(banned), "public DTO must not include " + banned);
  }
  console.log("GET /api/public-modules: 200, validated public v5 DTO, no commercial fields");
  assert.equal((await get("/api/public-modules?inspection=source")).status, 400);
  assert.equal((await get("/api/public-modules", {method:"PUT"})).status, 405);
  console.log("Public routing production read-only smoke: PASS");
}
main().catch(err => { console.error("Production smoke failed:", err.message); process.exitCode = 1; });
