"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

async function main() {
  const base = process.env.PUBLIC_PAGES_URL;
  assert(base && /^https:\/\//.test(base), "Set PUBLIC_PAGES_URL to a deployed preview origin");
  const target = new URL(base);
  const outputDir = process.argv[2] || "/tmp/public-pages-review";
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [
      { name: "desktop", width: 1366, height: 768 },
      { name: "mobile", width: 390, height: 844 }
    ]) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      const errors = [];
      page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
      page.on("response", (r) => {
        if (r.status() >= 400 && new URL(r.url()).origin === target.origin) {
          errors.push("HTTP " + r.status() + " " + r.url());
        }
      });

      await page.goto(new URL("/landing/", base).href, { waitUntil: "networkidle" });
      assert.match(await page.title(), /Casa em Módulos/);
      assert.equal(await page.locator("#environmentTrack .environment").count(), 5,
        "landing must render five environments");
      const kitchen = page.locator('[data-environment-id="cozinha"]');
      assert.equal(await kitchen.count(), 1);
      await kitchen.click();
      await page.waitForFunction(() => document.getElementById("featureAction")?.getAttribute("href")?.includes("viewer"));
      const kitchenHref = await page.locator("#featureAction").getAttribute("href");
      assert(kitchenHref && kitchenHref.includes("viewer"), "kitchen card must link to viewer");
      await page.screenshot({ path: path.join(outputDir, `landing-${viewport.name}.png`), fullPage: true });

      errors.length = 0;
      await page.goto(new URL("/viewer/?module=module-03", base).href, { waitUntil: "networkidle" });
      const heading = page.locator("#block-overview .overview-title");
      await heading.waitFor({ timeout: 12000 });
      assert.match(await heading.textContent(), /Inferior da pia/);
      assert.equal(await page.locator("#sceneStage [data-select-scene-entity]").count(), 7);
      assert((await page.locator("#block-views .technical-view").count()) >= 3);
      assert((await page.locator("#block-details .detail-row").count()) >= 3);
      const sceneImg = page.locator("#sceneStage img.scene-layer").first();
      assert(await sceneImg.evaluate((img) => img.complete && img.naturalWidth > 0),
        "viewer base scene must load");
      await page.locator('#sceneStage [data-select-scene-entity="module-04"]').click();
      assert.match(await heading.textContent(), /Lateral da geladeira/);
      assert.equal(await page.locator('#sceneStage [data-select-scene-entity="module-04"]').getAttribute("aria-pressed"), "true");
      await page.screenshot({ path: path.join(outputDir, `viewer-${viewport.name}.png`), fullPage: true });
      assert.deepEqual(errors, [], "viewer errors: " + errors.join(" | "));
      await page.close();
    }
    // CP-PUBLIC-02b: exercise the optional asynchronous public projection
    // in an isolated browser with a fully mocked same-origin endpoint.
    // Never read or modify real production/preview configuration Blobs.
    const approvedProjection = {
      schemaVersion: "PublicModulePresentation2D 0.1",
      modules: [
        { id: "module-07", title: "Nome publicado 07",
          benefits: ["Destaque publicado 07"], components: ["Componente 07"], requirements: [] },
        { id: "module-03", title: "Nome publicado 03",
          benefits: ["Destaque publicado 03"], components: ["Componente 03"],
          requirements: ["Requisito publicado 03"] }
      ],
      publicState: {
        entities: { "module-07": true, "module-03": true },
        finishId: "base-light",
        availableFinishes: [{ id: "base-light", label: "Branco", color: "#faf9f6",
          textureAsset: "", textureSize: "cover" }]
      }
    };
    const published = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await published.addInitScript(() => {
      window.CASA_PUBLIC_VIEWER_INTEGRATION = { usePublishedApi: true };
    });
    await published.route("**/api/public-modules", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify(approvedProjection) });
    });
    await published.goto(new URL("/viewer/", base).href, { waitUntil: "networkidle" });
    const publishedTitle = published.locator("#block-overview .overview-title");
    await publishedTitle.waitFor({ timeout: 12000 });
    assert.equal(await publishedTitle.textContent(), "Nome publicado 07",
      "default must follow published order, not static catalog");
    assert.equal(await published.locator("#sceneStage [data-select-scene-entity]").count(), 2,
      "unpublished modules must not be selectable");
    assert.equal(await published.locator("#block-overview .overview-highlights li").first().textContent(),
      "Destaque publicado 07", "authored highlights must not be replaced by description");
    await published.locator('#sceneStage [data-select-scene-entity="module-03"]').click();
    assert.equal(await publishedTitle.textContent(), "Nome publicado 03");
    assert.equal(await published.locator("#block-details .detail-row").count(), 2);
    await published.close();

    const unavailable = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await unavailable.addInitScript(() => {
      window.CASA_PUBLIC_VIEWER_INTEGRATION = { usePublishedApi: true };
    });
    await unavailable.route("**/api/public-modules", (route) =>
      route.fulfill({ status: 503, contentType: "application/json",
        body: JSON.stringify({ error: "public_modules_unavailable" }) })
    );
    await unavailable.goto(new URL("/viewer/", base).href, { waitUntil: "networkidle" });
    const alert = unavailable.locator("#viewerLayout [role=alert]");
    await alert.waitFor({ timeout: 12000 });
    assert.match(await alert.textContent(), /temporariamente indisponíveis/);
    assert.equal(await unavailable.locator("#block-overview .overview-title").count(), 0,
      "failed public API must not expose static catalog fallback");
    await unavailable.close();

    console.log("public landing/viewer interactive desktop + mobile smoke and mocked public bootstrap: PASS");
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
