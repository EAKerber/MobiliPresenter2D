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
    assert.equal(response.headers()["cache-control"], "no-store, max-age=0");
    assert.equal(response.headers()["access-control-allow-origin"], undefined);
    assert([200, 503].includes(response.status()), "Unexpected public API status: " + response.status());
    const data = await response.json();
    const expectedFirst = response.status() === 200 ? checkPublicShape(data) : null;
    if (response.status() === 503) {
      assert.deepEqual(data, { error: "public_modules_unavailable" },
        "Missing or incompatible preview v5 must fail closed");
    } else assert(expectedFirst, "A successful publication needs a visible module");

    // The same browser now consumes the ACTUAL public Netlify endpoint.
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.addInitScript(() => { window.CASA_PUBLIC_VIEWER_INTEGRATION = { usePublishedApi: true }; });
    await page.goto(new URL("/viewer/", origin).href, { waitUntil: "networkidle" });
    if (response.status() === 503) {
      const error = page.locator("#viewerLayout [role=alert]");
      await error.waitFor({ timeout: 12000 });
      assert.match(await error.textContent(), /temporariamente indisponíveis/);
      assert.equal(await page.locator("#block-overview").count(), 0,
        "A failed public API must not silently present bundled catalog data");
    } else {
      const title = page.locator("#block-overview .overview-title");
      await title.waitFor({ timeout: 12000 });
      assert.equal((await title.textContent()).trim(), expectedFirst.title);
      assert.equal(await page.locator("#sceneStage [data-select-scene-entity]").count(),
        data.modules.filter((item) => data.publicState.entities[item.id] === true).length);
      assert.deepEqual(await page.locator("#block-overview .overview-highlights li").allTextContents(),
        expectedFirst.benefits || [], "Destaques must be preserved exactly");
    }
    assert.deepEqual(pageErrors, [], "Uncaught viewer errors: " + pageErrors.join(" | "));
    console.log("CP-PUBLIC-02c real preview endpoint + viewer: PASS, API=" + response.status()
      + (response.status() === 503 ? " (no preview publication, expected safe state)" : " (published v5 readback)"));
    await ctx.close();
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
