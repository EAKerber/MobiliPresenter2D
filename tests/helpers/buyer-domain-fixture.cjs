"use strict";
// Buyer DOMAIN test harness only. No authentication or production API claim.
// Enabled explicitly by GitHub Actions jobs (BUYER_DOMAIN_FIXTURE_V5=1).
// Never mutates production/deploy Blobs or exposes a public seed endpoint.
const assert = require("node:assert/strict");
const config = require("../../app/core/configuration.js");
const v5Core = require("../../app/core/administration-v5.js");
const flow = require("../../app/core/flow-model.js");
const defaults = require("../../app/data/configurator-settings.js");
const hierarchy = require("../../app/data/hierarchy-defaults.js");
const catalog = require("../../app/data/catalog-data.js");
const book = require("../../app/data/mock-price-book.js");
const scene = require("../../app/data/scene-data.js");

const v3 = config.normalizeConfiguratorSettings(
  config.createDefaultAdministration(defaults, catalog, book, scene), catalog, book, scene
);
const v5 = v5Core.upgrade(v3, config, flow, catalog, book, scene, hierarchy);
assert.deepEqual(v5Core.validate(v5, config, catalog, book, scene), []);
const enabled = () => process.env.BUYER_DOMAIN_FIXTURE_V5 === "1";

async function attach(page, url) {
  if (!enabled()) return;
  const target = new URL(url);
  assert(/^deploy-preview-\d+--mobilipresenter2d\.netlify\.app$/.test(target.hostname)
    && target.protocol === "https:", "domain fixture only allowed in isolated Netlify preview");
  await page.route("**/api/configuration", async route => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200, contentType: "application/json", body: JSON.stringify(v5),
      headers: { "Cache-Control": "no-store" }
    });
  });
}

async function requireReady(page) {
  if (!enabled()) return;
  await page.waitForFunction(() =>
    document.documentElement.dataset.configurationAccessState === "ready"
      && document.documentElement.dataset.publishedConfigurationStatus === "validated"
      && window.CASA_NORMALIZED_FLOW?.source?.schemaVersion === "ConfiguratorAdministration2D 5.0"
      && document.querySelector(".workspace")?.hidden === false
      && document.querySelector(".workspace")?.inert === false,
    null, { timeout: 12000 }
  );
}
module.exports = Object.freeze({ enabled, attach, requireReady });
