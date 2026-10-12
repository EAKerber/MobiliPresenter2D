"use strict";
// TEMPORARY CP-PUBLIC-03a1 DIAGNOSTIC, not a release-approval test.
// Detects a known BAD state on PR #182: anonymous 401 + interactive
// local fallback. Delete/replace with a fail-closed invariant after fix.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const target = "https://deploy-preview-182--mobilipresenter2d.netlify.app/";
async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = [];
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    page.on("pageerror", err => errors.push("pageerror: " + err.message));
    const apiResponse = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.hostname === "deploy-preview-182--mobilipresenter2d.netlify.app"
        && url.pathname === "/api/configuration"
        && response.request().method() === "GET";
    }, { timeout: 15000 });
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 20000 });
    const response = await apiResponse;
    await page.waitForFunction(() =>
      Boolean(window.CASA_EM_MODULOS_DEBUG?.getState)
      && /R\$/.test(document.querySelector("#configurationValue strong")?.textContent || ""),
      null, { timeout: 15000 }
    );
    const observed = await page.evaluate(() => {
      const workspace = document.querySelector(".workspace");
      const price = document.querySelector("#configurationValue strong");
      return {
        publicationStatus: document.documentElement.dataset.publishedConfigurationStatus || null,
        workspaceInteractive: Boolean(workspace && !workspace.inert
          && !workspace.hidden && getComputedStyle(workspace).display !== "none"),
        estimateVisible: Boolean(price && getComputedStyle(price).display !== "none"
          && price.getBoundingClientRect().width > 0),
        visibleAlert: Boolean([...document.querySelectorAll('[role="alert"]')].some(
          item => item.getBoundingClientRect().height > 0
        )),
        modulesPresent: document.querySelectorAll("[data-module-toggle]").length,
        stoneControlPresent: Boolean(document.getElementById("stoneSkirtingToggle")),
        debugStatePresent: Boolean(window.CASA_EM_MODULOS_DEBUG?.getState())
      };
    });
    const summary = {
      endpointHttpStatus: response.status(),
      publicationStatus: observed.publicationStatus,
      workspaceInteractive: observed.workspaceInteractive,
      estimateVisible: observed.estimateVisible,
      visibleAlert: observed.visibleAlert,
      modulesPresent: observed.modulesPresent,
      stoneControlPresent: observed.stoneControlPresent,
      debugStatePresent: observed.debugStatePresent,
      httpErrorReportedInConsole: errors.some(message => /401/.test(message)),
      pageErrorCount: errors.filter(message => message.startsWith("pageerror:")).length
    };
    console.log("CP-PUBLIC-03a1 OBSERVED (diagnosis, NOT approval): " + JSON.stringify(summary));
    assert.equal(summary.endpointHttpStatus, 401);
    assert.equal(summary.publicationStatus, null,
      "the current client fails to mark denied publication as denied");
    assert.equal(summary.workspaceInteractive, true,
      "BUG REPRO: denied browser still exposes buyer workspace");
    assert.equal(summary.estimateVisible, true,
      "BUG REPRO: buyer still displays locally computed price despite denied publication");
    assert.equal(summary.visibleAlert, false,
      "BUG REPRO: no accessible authorization/error message");
    assert.equal(summary.httpErrorReportedInConsole, true,
      "all three old browser workflows are failing on the same console resource error");
    console.log("CP-PUBLIC-03a1 BUG CONFIRMED: 401 rejected by server, fallback UI remains active");
    await page.close();
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
