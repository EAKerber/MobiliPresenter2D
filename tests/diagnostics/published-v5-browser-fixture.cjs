"use strict";
// TEMPORARY DIAGNOSTIC fixture for business UI tests ONLY. This module
// intercepts Playwright GET. It never changes Netlify, Blob, or production.
const assert = require("node:assert/strict");
const configuration = require("../../app/core/configuration.js");
const administrationV5 = require("../../app/core/administration-v5.js");
const flow = require("../../app/core/flow-model.js");
const defaults = require("../../app/data/configurator-settings.js");
const catalog = require("../../app/data/catalog-data.js");
const priceBook = require("../../app/data/mock-price-book.js");
const scene = require("../../app/data/scene-data.js");
const hierarchyDefaults = require("../../app/data/hierarchy-defaults.js");
const v3 = configuration.normalizeConfiguratorSettings(
  configuration.createDefaultAdministration(defaults, catalog, priceBook, scene),
  catalog, priceBook, scene
);
const v5 = administrationV5.upgrade(
  v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults
);
assert.deepEqual(administrationV5.validate(v5, configuration, catalog, priceBook, scene), []);
const payload = JSON.stringify(v5);
const enabled = () => process.env.CP_PUBLIC_DIAGNOSTIC_V5 === "1";

async function attach(page) {
  if (!enabled()) return;
  await page.route("**/api/configuration", async route => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: payload,
      headers: { "Cache-Control": "no-store" } });
  });
}

async function assertApplied(page) {
  if (!enabled()) return;
  await page.waitForFunction(() =>
    document.documentElement.dataset.publishedConfigurationStatus === "validated"
    && window.CASA_NORMALIZED_FLOW?.source?.schemaVersion === "ConfiguratorAdministration2D 5.0",
    null, { timeout: 12000 }
  );
}
module.exports = Object.freeze({ attach, assertApplied, enabled });
