"use strict";
// Buyer DOMAIN test harness only. No authentication or production API claim.
// Enabled explicitly by GitHub Actions jobs (BUYER_DOMAIN_FIXTURE_V5=1).
// Never mutates production/deploy Blobs or exposes a public seed endpoint.
const assert = require("node:assert/strict");
const config = require("../../app/core/configuration.js");
const v5Core = require("../../app/core/administration-v5.js");
const flow = require("../../app/core/flow-model.js");
const buyer = require("../../app/core/buyer-configuration-projection.js");
const pricingContract = require("../../app/core/pricing-contract.js");
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
const dto = buyer.project(v5, { configuration: config, administrationV5: v5Core,
  catalog, priceBook: book, scene, pricingContract });
const enabled = () => process.env.BUYER_DOMAIN_FIXTURE_V5 === "1";
function asDto(source) {
  const published = source.schemaVersion === config.SCHEMA
    ? v5Core.upgrade(source, config, flow, catalog, book, scene, hierarchy)
    : source;
  return buyer.project(published, { configuration: config, administrationV5: v5Core,
    catalog, priceBook: book, scene, pricingContract });
}

async function attach(page, url, { schema = "v5" } = {}) {
  if (!enabled()) return;
  const target = new URL(url);
  assert(/^deploy-preview-\d+--mobilipresenter2d\.netlify\.app$/.test(target.hostname)
    && target.protocol === "https:", "domain fixture only allowed in isolated Netlify preview");
  assert(["v3", "v5"].includes(schema));
  const payload = dto;
  await page.route("**/api/buyer-configuration", async route => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200, contentType: "application/json", body: JSON.stringify(payload),
      headers: { "Cache-Control": "no-store" }
    });
  });
  // Legacy-only staging fixture: used by flow-layout checks to author mutated
  // historical stage shapes. The actual app must NEVER request this raw API.
  if (schema === "v3") await page.route("**/api/configuration", async route => {
    await route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify(v3), headers: { "Cache-Control": "no-store" } });
  });
}

async function requireReady(page, { schema = "v5" } = {}) {
  if (!enabled()) return;
  const expectedSchema = buyer.SCHEMA;
  await page.waitForFunction(expected =>
    document.documentElement.dataset.configurationAccessState === "ready"
      && document.documentElement.dataset.publishedConfigurationStatus === "validated"
      && window.CASA_NORMALIZED_FLOW?.source?.schemaVersion === expected
      && document.querySelector(".workspace")?.hidden === false
      && document.querySelector(".workspace")?.inert === false,
    expectedSchema, { timeout: 12000 }
  );
}
module.exports = Object.freeze({ enabled, attach, requireReady, asDto, dto, v3, v5 });
