"use strict";
const assert = require("node:assert/strict");
const origin = process.env.PUBLIC_PAGES_URL;
if (!origin || new URL(origin).hostname !== "deploy-preview-180--mobilipresenter2d.netlify.app") {
  throw new Error("Only isolated PR #180 Deploy Preview is an allowed HTTP gate target");
}
async function main() {
  const endpoint = new URL("/api/public-modules", origin);
  const deny = await fetch(new URL("?inspection=v5-preflight", endpoint));
  assert.equal(deny.status, 400, "public endpoint must reject private inspection");

  // Netlify's alias may be updating while this CI job starts. Bounded read
  // retry only; never seed, mutate or access the production store.
  let status = 0, body = null;
  for (let attempt = 0; attempt < 15; attempt++) {
    const response = await fetch(endpoint, { headers: { Accept: "application/json" }, cache: "no-store",
      signal: AbortSignal.timeout(12000) });
    status = response.status;
    body = await response.json();
    if (status === 200) {
      assert.equal(response.headers.get("cache-control").includes("no-store"), true);
      break;
    }
    if (status !== 503 && status !== 404) break;
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  if (status !== 200) {
    let diagnostic = {};
    try {
      const checks = await fetch(new URL("/__cp-public-02c-seed-checks.json", origin));
      diagnostic = checks.ok ? await checks.json() : { status: checks.status };
    } catch { diagnostic = { inaccessible: true }; }
    throw new Error("Deploy-only publication failed: HTTP " + status
      + "; checks=" + JSON.stringify(diagnostic) + "; error=" + JSON.stringify(body));
  }
  assert.equal(body.schemaVersion, "PublicModulePresentation2D 0.1");
  const module01 = body.modules.find((m) => m.id === "module-01");
  assert.equal(module01?.title, "Módulo 01 — homologação PR 180",
    "The preview must return its own synthetic v5 title, never production or static catalog");
  assert.equal(module01?.benefits?.[0], "Destaque exclusivo do preview 180");
  assert(body.publicState.availableFinishes.some((f) => f.id === body.publicState.finishId));
  for (const forbidden of ["pricing", "revision", "etag", "objectAssets", "materials", "commercial"]) {
    assert(!Object.keys(body).includes(forbidden));
    assert(!Object.keys(module01).includes(forbidden));
  }
  const rejected = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notAllowed: true }) });
  assert.equal(rejected.status, 405);
  console.log("CP-PUBLIC-02c real Netlify deploy-specific v5 public readback: PASS, HTTP 200");
}
main().catch((err) => { console.error(err); process.exitCode = 1; });
