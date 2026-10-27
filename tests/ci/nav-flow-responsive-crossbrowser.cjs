// CI-only regression extraction from nav-flow-profile-crossbrowser (legacy).
// Uses validated local buyer V5; never redeems grants or calls a live Netlify site.
"use strict";
const assert = require("node:assert/strict");
const { chromium, webkit } = require("playwright");

const url = process.env.FLOW_LAYOUT_URL || "http://127.0.0.1:8123/config/";
const cases = [
  [390, "compact"],
  [700, "compact"],
  [701, "stacked"],
  [900, "stacked"],
  [1050, "stacked"],
  [1051, "side-rail"],
  [1200, "side-rail"],
  [1366, "side-rail"]
];
let completed = 0;

async function inspect(page, context) {
  const state = await page.evaluate(() => {
    const nav = document.querySelector(".flow-nav");
    const flow = window.CASA_EM_MODULOS_DEBUG?.getNormalizedFlow?.();
    const ids = (flow?.stages || []).filter(stage => stage.enabled).map(stage => stage.id);
    const buttons = [...(nav?.querySelectorAll("[data-step]") || [])].map(button => {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return {
        id: button.dataset.step,
        visible: button.isConnected && !button.hidden && !button.disabled
          && style.display !== "none" && style.visibility !== "hidden",
        width: rect.width, height: rect.height,
        x: rect.x, y: rect.y
      };
    });
    return {
      profile: document.documentElement.dataset.layoutProfile,
      ids,
      buttons,
      navWidth: nav?.clientWidth ?? 0,
      navScrollWidth: nav?.scrollWidth ?? 0,
      current: nav?.querySelector('[data-step][aria-current="step"]')?.dataset.step ?? null
    };
  });
  const detail = context + " " + JSON.stringify(state);
  assert.ok(state.ids.length >= 2, "data-derived stages absent: " + detail);
  assert.deepEqual(state.buttons.map(button => button.id), state.ids, "navigation must reflect published stages: " + detail);
  assert.ok(state.buttons.every(button => button.visible && button.width > 0 && button.height >= 40), "navigation geometry invalid: " + detail);
  assert.ok(state.navWidth > 0 && state.navScrollWidth <= state.navWidth + 2, "navigation overflows horizontally: " + detail);
  assert.ok(state.current && state.ids.includes(state.current), "current stage invalid: " + detail);
  return state;
}

(async () => {
  for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
    const browser = await engine.launch({headless: true});
    try {
      for (const [width, expectedProfile] of cases) {
        for (const theme of ["light", "dark"]) {
          const context = engineName + "/" + width + "/" + theme;
          const page = await browser.newPage({
            viewport: {width: 1366, height: 900},
            reducedMotion: "reduce"
          });
          try {
            await page.goto(url, {waitUntil: "domcontentloaded", timeout: 25000});
            await page.waitForFunction(() => (
              document.documentElement.dataset.publishedConfigurationStatus === "validated" &&
              !document.querySelector(".workspace")?.hidden &&
              window.CASA_EM_MODULOS_DEBUG?.getNormalizedFlow?.()?.stages?.length
            ), null, {timeout: 25000});
            await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
            await page.locator("#moduleList [data-select-entity]").first().click();
            await page.waitForFunction(() => document.body.classList.contains("has-module-detail"));
            await page.setViewportSize({width, height: 900});
            // WebKit can deliver resize/layout-profile updates after a fixed
            // 180 ms delay, especially across light/dark contexts. Wait for
            // the actual model resolution; NEVER suppress profile assertions.
            await page.waitForFunction(expected =>
              document.documentElement.dataset.layoutProfile === expected,
              expectedProfile, {timeout: 7500});
            let state = await inspect(page, context + "/resize");
            assert.equal(state.profile, expectedProfile, "profile boundary " + context);
            const firstId = state.ids[0], secondId = state.ids[1];
            await page.locator('.flow-nav [data-step="' + secondId + '"]').click();
            await page.waitForFunction(id =>
              document.querySelector('.flow-nav [data-step="' + id + '"]')?.getAttribute("aria-current") === "step"
            , secondId);
            await inspect(page, context + "/click-next");
            await page.locator('.flow-nav [data-step="' + firstId + '"]').click();
            await page.waitForFunction(id =>
              document.querySelector('.flow-nav [data-step="' + id + '"]')?.getAttribute("aria-current") === "step"
            , firstId);
            if (width === 1050 || width === 1051) {
              await page.keyboard.press("Control+ArrowRight");
              await page.waitForFunction(id =>
                document.querySelector('.flow-nav [data-step="' + id + '"]')?.getAttribute("aria-current") === "step"
              , secondId, {timeout: 4500});
              await inspect(page, context + "/keyboard-next");
              // Adjacent 1050/1051 transitions occur in the SAME initialized
              // page, preserving the active published V5 stage and module.
              // This is intentionally NOT the legacy fixed-four-stage test.
              const peerWidth = width === 1050 ? 1051 : 1050;
              await page.setViewportSize({width: peerWidth, height: 900});
              await page.waitForFunction(expected =>
                document.documentElement.dataset.layoutProfile === expected,
                peerWidth === 1050 ? "stacked" : "side-rail", {timeout: 7500});
              const peer = await inspect(page, context + "/adjacent-" + peerWidth);
              assert.equal(peer.profile, peerWidth === 1050 ? "stacked" : "side-rail",
                "adjacent breakpoint resolves the expected profile: " + context);
              assert.deepEqual(peer.ids, state.ids,
                "published stage IDs must survive responsive transition: " + context);
              assert.equal(peer.current, secondId,
                "keyboard-selected stage must survive profile transition: " + context);
              await page.setViewportSize({width, height: 900});
              await page.waitForFunction(expected =>
                document.documentElement.dataset.layoutProfile === expected,
                expectedProfile, {timeout: 7500});
              const restored = await inspect(page, context + "/adjacent-return");
              assert.equal(restored.current, secondId,
                "active stage is stable after return across breakpoint: " + context);
            }
            await page.setViewportSize({width: 1366, height: 900});
            await page.waitForFunction(() =>
              document.documentElement.dataset.layoutProfile === "side-rail",
              null, {timeout: 7500});
            state = await inspect(page, context + "/restore");
            assert.equal(state.profile, "side-rail", "restored profile " + context);
            console.log("CI_NAV_RESPONSIVE_PASS " + JSON.stringify({engineName, width, theme, stages: state.ids.length}));
            completed++;
          } catch (error) {
            console.error("CI_NAV_RESPONSIVE_FAIL " + JSON.stringify({context, error: String(error?.message || error).slice(0, 600)}));
            throw error;
          } finally {
            await page.close();
          }
        }
      }
    } finally {
      await browser.close();
    }
  }
  assert.equal(completed, cases.length * 2 * 2);
  console.log("CI_NAV_RESPONSIVE_COMPLETE " + JSON.stringify({completed, evidence: "local-validated-v5-not-authenticated-preview"}));
})().catch(error => {console.error(error); process.exitCode = 1;});
