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
    console.log("public landing/viewer interactive desktop + mobile smoke: PASS");
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
