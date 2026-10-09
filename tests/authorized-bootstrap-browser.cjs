"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const config = require("../app/core/configuration.js");
const admin = require("../app/core/administration-v5.js");
const flow = require("../app/core/flow-model.js");
const defaults = require("../app/data/configurator-settings.js");
const catalog = require("../app/data/catalog-data.js");
const prices = require("../app/data/mock-price-book.js");
const scene = require("../app/data/scene-data.js");
const hierarchy = require("../app/data/hierarchy-defaults.js");
const buyer = require("../app/core/buyer-configuration-projection.js");
const pricingContract = require("../app/core/pricing-contract.js");

const v3 = config.normalizeConfiguratorSettings(
  config.createDefaultAdministration(defaults, catalog, prices, scene), catalog, prices, scene
);
const v5 = admin.upgrade(v3, config, flow, catalog, prices, scene, hierarchy);
assert.deepEqual(admin.validate(v5, config, catalog, prices, scene), []);
const dto = buyer.project(v5, { administrationV5: admin, configuration: config,
  catalog, priceBook: prices, scene, pricingContract });
const base = process.env.AUTHORIZED_BOOTSTRAP_BROWSER_URL;
assert(base, "set AUTHORIZED_BOOTSTRAP_BROWSER_URL to Deploy Preview");
const origin = new URL(base);
assert(origin.protocol === "https:" && /^deploy-preview-\d+--mobilipresenter2d\.netlify\.app$/.test(origin.hostname),
  "Only an isolated Netlify Deploy Preview is allowed");
const target = new URL("/", origin).href;
const output = process.argv[2] || "/tmp/authorized-bootstrap";
fs.mkdirSync(output, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    async function openCase(name, responseBody, expected, viewport = { width: 1366, height: 900 }) {
      const page = await browser.newPage({ viewport });
      const pageErrors = [];
      page.on("pageerror", e => pageErrors.push(e.message));
      await page.route("**/api/buyer-configuration", async route => {
        if (typeof responseBody === "function") return responseBody(route);
        await route.fulfill({
          status: responseBody.status,
          contentType: "application/json",
          body: responseBody.body === undefined ? "{}" : JSON.stringify(responseBody.body)
        });
      });
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForFunction(state =>
        document.documentElement.dataset.configurationAccessState === state,
        expected, { timeout: 15000 });
      const result = await page.evaluate(() => ({
        state: document.documentElement.dataset.configurationAccessState,
        published: document.documentElement.dataset.publishedConfigurationStatus,
        workspaceVisible: Boolean(document.querySelector(".workspace")?.getBoundingClientRect().height),
        workspaceInert: document.querySelector(".workspace")?.inert,
        workspaceHidden: document.querySelector(".workspace")?.hidden,
        estimateVisible: Boolean(document.querySelector("#configurationValue strong")?.getBoundingClientRect().height),
        restoreDisabled: document.getElementById("restoreButton")?.disabled,
        alertRole: document.getElementById("configurationAccessStatus")?.getAttribute("role"),
        statusVisible: Boolean(document.getElementById("configurationAccessStatus")?.getBoundingClientRect().height)
      }));
      assert.equal(result.state, expected, name);
      assert.deepEqual(pageErrors, [], name + " unexpected uncaught script error");
      if (expected === "ready") {
        assert.equal(result.published, "validated");
        assert.equal(result.workspaceVisible, true);
        assert.equal(result.workspaceInert, false);
        assert.equal(result.workspaceHidden, false);
        assert.equal(result.estimateVisible, true);
        assert.equal(result.restoreDisabled, false);
        assert.equal(result.statusVisible, false);
      } else {
        assert.equal(result.published, expected);
        assert.equal(result.workspaceVisible, false, name + " must never show workspace");
        assert.equal(result.workspaceInert, true, name + " must be inert");
        assert.equal(result.workspaceHidden, true, name + " must be hidden");
        assert.equal(result.estimateVisible, false, name + " no estimate");
        assert.equal(result.restoreDisabled, true, name + " restore disabled");
        assert.equal(result.alertRole, "alert", name + " accessible status");
        assert.equal(result.statusVisible, true);
      }
      await page.screenshot({ path: path.join(output, name + ".png"), fullPage: true, animations: "disabled" });
      await page.close();
      console.log("CP-PUBLIC-03a2-0 browser " + name + ": PASS");
      return result;
    }
    for (const [status, state] of [
      [401, "unauthorized"], [403, "forbidden"], [404, "invalid"],
      [422, "invalid"], [429, "unavailable"], [503, "unavailable"]
    ]) await openCase("http-" + status, { status, body: { error: "expected_error" } }, state);

    const bad = structuredClone(v5);
    bad.presentationPolicy = null;
    await openCase("invalid-v5", { status: 200, body: bad }, "invalid");
    await openCase("raw-v3-rejected", { status: 200, body: v3 }, "invalid");
    await openCase("raw-v5-rejected", { status: 200, body: v5 }, "invalid");
    await openCase("valid-buyer-dto", { status: 200, body: dto }, "ready");
    await openCase("network-error", async route => route.abort("failed"), "unavailable");
    // Regression: the page must remain locked until the requested configuration
    // is applied; never briefly display a local estimate before the response.
    const loading = await browser.newPage();
    await loading.route("**/api/buyer-configuration", async route => {
      await new Promise(resolve => setTimeout(resolve, 900));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(dto) });
    });
    await loading.goto(target, { waitUntil: "domcontentloaded", timeout: 20000 });
    assert.equal(await loading.locator(".workspace").isVisible(), false);
    assert.equal(await loading.locator("#restoreButton").isEnabled(), false);
    await loading.waitForFunction(() => document.documentElement.dataset.configurationAccessState === "ready", null, {timeout:15000});
    assert.equal(await loading.locator(".workspace").isVisible(), true);
    await loading.close();
    console.log("CP-PUBLIC-03a2-0 browser loading-before-200: PASS");

    const retry = await browser.newPage();
    let hits = 0;
    await retry.route("**/api/buyer-configuration", async route => {
      hits += 1;
      await route.fulfill({
        status: hits === 1 ? 503 : 200,
        contentType: "application/json",
        body: JSON.stringify(hits === 1 ? { error: "temporary_failure" } : dto)
      });
    });
    await retry.goto(target, { waitUntil: "domcontentloaded", timeout: 20000 });
    await retry.waitForFunction(() => document.documentElement.dataset.configurationAccessState === "unavailable");
    assert.equal(await retry.locator(".workspace").isVisible(), false);
    await retry.locator("#configurationAccessRetry").click();
    await retry.waitForFunction(() => document.documentElement.dataset.configurationAccessState === "ready", null, {timeout:15000});
    assert.equal(await retry.locator(".workspace").isVisible(), true);
    assert.equal(hits, 2);
    await retry.close();
    console.log("CP-PUBLIC-03a2-0 browser retry-after-503: PASS");
    console.log("CP-PUBLIC-03a2-0 browser positive/negative bootstrap: PASS");
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
