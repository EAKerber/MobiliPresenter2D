"use strict";
// CI browser contract for the REAL Netlify preview endpoint + viewer.
// GET never writes or seeds any Blob; fail closed if the preview is unpopulated.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const FORBIDDEN_KEYS = new Set([
  "pricing", "price", "publicPriceCents", "commercial", "revision",
  "etag", "objects", "draft", "objectAssets", "initialState",
  "materials", "materialGroups", "handleProducts", "dependencies",
  "pricingRules", "events", "presentationPolicy", "geometryMm"
]);
function checkPublicShape(value) {
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node)) {
      assert(!FORBIDDEN_KEYS.has(key), "Unexpected private key in public payload: " + key);
      visit(child);
    }
  };
  visit(value);
  assert.deepEqual(Object.keys(value).sort(), ["modules", "publicState", "schemaVersion"]);
  assert.equal(value.schemaVersion, "PublicModulePresentation2D 0.1");
  assert(Array.isArray(value.modules) && value.modules.length > 0);
  const ids = value.modules.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert(value.modules.every((item) => typeof item.title === "string" && item.title.length > 0));
  assert(value.publicState.entities && typeof value.publicState.entities === "object");
  assert(Array.isArray(value.publicState.availableFinishes));
  assert(value.publicState.availableFinishes.some((f) => f.id === value.publicState.finishId));
  return value.modules.find((item) => value.publicState.entities[item.id] === true);
}
async function main() {
  const base = process.env.PUBLIC_PAGES_URL;
  assert(base, "PUBLIC_PAGES_URL required");
  const origin = new URL(base);
  assert(/^deploy-preview-\d+--mobilipresenter2d\.netlify\.app$/.test(origin.hostname),
    "Only the dedicated Netlify Deploy Preview can be exercised by this gate");

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const api = new URL("/api/public-modules", origin).href;
    const invalidQuery = await ctx.request.get(api + "?inspection=v5-preflight");
    assert.equal(invalidQuery.status(), 400, "No administrative inspection via public API");
    assert.deepEqual(await invalidQuery.json(), { error: "unsupported_query" });
    const deniedPut = await ctx.request.put(api, { data: { leaked: true } });
    assert.equal(deniedPut.status(), 405, "Public API must be read-only");
    assert.deepEqual(await deniedPut.json(), { error: "method_not_allowed" });

    const response = await ctx.request.get(api, { headers: { Accept: "application/json" } });
    assert.deepEqual((response.headers()["cache-control"] || "").split(",").map((part) => part.trim()).sort(), ["max-age=0", "no-store"]);
    assert.equal(response.headers()["access-control-allow-origin"], undefined);
    assert.equal(response.status(), 200,
      "PR #180 must read its deploy-scoped v5 fixture; 503 means the isolated build upload is missing");
    const data = await response.json();
    const expectedFirst = checkPublicShape(data);
    assert(expectedFirst, "A published preview needs a visible module");
    const sentinel = data.modules.find((module) => module.id === "module-01");
    assert.equal(sentinel?.title, "Módulo 01 — homologação PR 180",
      "The endpoint must read the explicitly seeded preview v5, not production or bundled static data");
    assert.equal(sentinel?.benefits?.[0], "Destaque exclusivo do preview 180");

    // The same browser now consumes the ACTUAL public Netlify endpoint.
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.addInitScript(() => { window.CASA_PUBLIC_VIEWER_INTEGRATION = { usePublishedApi: true }; });
    console.log("CP-PUBLIC-02c preview API response: " + response.status());
    await page.goto(new URL("/viewer/", origin).href, { waitUntil: "domcontentloaded", timeout: 20000 });
    const title = page.locator("#block-overview .overview-title");
    await title.waitFor({ timeout: 12000 });
    assert.equal((await title.textContent()).trim(), expectedFirst.title);
    assert.equal(await page.locator("#sceneStage [data-select-scene-entity]").count(),
      data.modules.filter((item) => data.publicState.entities[item.id] === true).length);
    assert.deepEqual(await page.locator("#block-overview .overview-highlights li").allTextContents(),
      expectedFirst.benefits || [], "Destaques must be preserved exactly");
    assert.deepEqual(pageErrors, [], "Uncaught viewer errors: " + pageErrors.join(" | "));
    console.log("CP-PUBLIC-02c real deploy-scoped v5 readback + viewer: PASS, API=200");
    await ctx.close();
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
