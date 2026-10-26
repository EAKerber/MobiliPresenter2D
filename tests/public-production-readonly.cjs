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
    ["/viewer/", "id=\"viewerLayout\""],
    ["/admin.html", "Casa em Módulos"]
  ];
  for(const [path, expected] of routes) {
    const response = await get(path);
    assert.equal(response.status, 200, path + " must return live 200");
    assert((await response.text()).includes(expected), path + " missing expected HTML signature");
    console.log("GET " + path + ": 200, expected shell present");
  }
  // The Configurator is protected by the Netlify access edge function.
  // An unauthenticated GET must NOT disclose the workspace HTML. The previous
  // smoke test incorrectly expected a public workspace and followed the 302
  // to /access/, then reported a missing markup signature as a regression.
  const deniedConfig = await get("/config/", { redirect: "manual" });
  assert.equal(deniedConfig.status, 302,
    "anonymous /config/ must redirect to access, not expose workspace");
  const loginUrl = new URL(deniedConfig.headers.get("location") || "", new URL("/config/", base));
  assert.equal(loginUrl.origin, base.origin, "redirect must stay on production origin");
  assert.equal(loginUrl.pathname, "/access/", "anonymous /config/ must lead to access");
  const loginShell = await get("/access/");
  assert.equal(loginShell.status, 200, "access route must return the login shell");
  assert.match(await loginShell.text(), /Confirmar acesso/,
    "access page must contain its expected public heading");
  console.log("GET /config/: 302 to /access/ (fail-closed), access shell 200");

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
