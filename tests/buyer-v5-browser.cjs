"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const configuration = require("../app/core/configuration.js");
const flow = require("../app/core/flow-model.js");
const administrationV5 = require("../app/core/administration-v5.js");
const settings = require("../app/data/configurator-settings.js");
const hierarchyDefaults = require("../app/data/hierarchy-defaults.js");
const catalog = require("../app/data/catalog-data.js");
const priceBook = require("../app/data/mock-price-book.js");
const scene = require("../app/data/scene-data.js");
const pricingContract = require("../app/core/pricing-contract.js");
const buyer = require("../app/core/buyer-configuration-projection.js");

const v3 = configuration.normalizeConfiguratorSettings(
  configuration.createDefaultAdministration(settings, catalog, priceBook, scene),
  catalog, priceBook, scene
);
const v5 = administrationV5.upgrade(v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
assert.deepEqual(administrationV5.validate(v5, configuration, catalog, priceBook, scene), []);

async function main() {
  const output = process.argv[2] || "/tmp/buyer-v5-browser";
  fs.mkdirSync(output, { recursive: true });
  const targetUrl = process.env.FLOW_LAYOUT_URL || "https://mobilipresenter2d.netlify.app/";
  const browser = await chromium.launch({ headless: true });
  const result = {};
  try {
    async function openFixture(name, payload) {
      const dto = buyer.project(payload.schemaVersion === configuration.SCHEMA
        ? administrationV5.upgrade(payload, configuration, flow, catalog, priceBook, scene, hierarchyDefaults)
        : payload, { administrationV5, configuration, catalog, priceBook, scene, pricingContract });
      const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/api/buyer-configuration", async (route) => {
        if (route.request().method() !== "GET") return route.continue();
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(dto) });
      });
      let error;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        try {
          await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
          await page.waitForFunction(() => document.documentElement.dataset.publishedConfigurationStatus === "validated", null, { timeout: 7000 });
          error = null;
          break;
        } catch (caught) {
          error = caught;
          await page.waitForTimeout(2000);
        }
      }
      if (error) throw error;
      assert.deepEqual(errors, [], name + " should load without JavaScript errors");
      const record = await page.evaluate(() => ({
        schema: window.CASA_NORMALIZED_FLOW?.source?.schemaVersion,
        stages: window.CASA_NORMALIZED_FLOW?.stages?.map((stage) => ({
          id: stage.id,
          groups: stage.groups.map((group) => ({
            id: group.id,
            sections: group.sections.map((section) => ({ id: section.id, itemIds: section.itemIds }))
          }))
        })),
        navigation: [...document.querySelectorAll(".flow-nav [data-step]")].map((node) => node.dataset.step),
        modules: document.querySelectorAll("#moduleList [data-select-entity]").length,
        estimate: document.querySelector("#configurationValue")?.textContent?.trim(),
        errors: window.CASA_EM_MODULOS_DEBUG?.getFlowLayoutErrors() || [],
        policy: window.CASA_EM_MODULOS_DEBUG?.getPresentationPolicy()
      }));
      result[name] = record;
      await page.close();
      return record;
    }

    const old = await openFixture("v3", v3);
    const current = await openFixture("v5", v5);
    assert.equal(old.schema, buyer.SCHEMA);
    assert.equal(current.schema, buyer.SCHEMA);
    assert.deepEqual(current.navigation, old.navigation, "same published semantics preserve navigation");
    assert.deepEqual(current.stages, old.stages, "same published semantics preserve stage/group/section/item hierarchy");
    assert.equal(current.modules, old.modules, "same seven canonical module controls");
    assert.equal(current.estimate, old.estimate, "default buyer estimate must not change under pure v5 migration");
    assert.deepEqual(current.errors, [], "v5 runtime binds all sections without fallback");
    assert.deepEqual(current.policy, v5.presentationPolicy, "authored v5 policy must control buyer presentation");

    const bad = structuredClone(v5);
    bad.presentationPolicy = null;
    const negativePage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await negativePage.route("**/api/buyer-configuration", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bad) });
    });
    await negativePage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    await negativePage.waitForFunction(() => document.documentElement.dataset.publishedConfigurationStatus === "invalid", null, { timeout: 12000 });
    assert.equal(await negativePage.locator("#configurationAccessStatus[role=alert]").isVisible(), true,
      "invalid v5 must surface accessible error");
    assert.equal(await negativePage.locator(".workspace").isVisible(), false,
      "invalid v5 must never leave plausible default buyer controls visible");
    result.invalidV5 = "fail_closed";
    await negativePage.close();

    fs.writeFileSync(path.join(output, "result.json"), JSON.stringify({ targetUrl, ...result }, null, 2));
    console.log("buyer published v3/v5 browser: PASS");
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
