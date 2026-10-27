// A semantic adaptation of historical nav-label-width-boundary.mjs.
// Verify the actual named inline-size container, not equivalence of identical CSS blobs.
// All data is local V5; NO Netlify, database, grant, role, or production auth.
"use strict";
const assert = require("node:assert/strict");
const {chromium, webkit} = require("playwright");

const sourceUrl = process.env.FLOW_LAYOUT_URL || "http://127.0.0.1:8123/config/";
const widths = [496, 500, 502, 505, 509, 512, 514, 515, 518, 522, 526, 528, 529, 530, 532, 536, 540];
const styles = ["light", "dark"];
const profiles = [["chromium", chromium], ["webkit", webkit]];
const result = [];
const stablePaint = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

async function snapshot(page) {
  await page.evaluate(stablePaint);
  return page.evaluate(() => {
    const nav = document.querySelector(".flow-nav");
    const controls = document.querySelector(".controls");
    const navStyle = nav ? getComputedStyle(nav) : null;
    const width = nav ? (nav.clientWidth - parseFloat(navStyle.paddingLeft) - parseFloat(navStyle.paddingRight)) : null;
    const stages = window.CASA_EM_MODULOS_DEBUG?.getNormalizedFlow?.()?.stages
      ?.filter(s => s.enabled).map(s => s.id) || [];
    const buttons = [...(nav?.querySelectorAll("[data-step]") || [])].map(el => {
      const span = el.querySelector(".flow-step__label");
      const style = span && getComputedStyle(span);
      const after = span && getComputedStyle(span, "::after");
      return {
        id: el.dataset.step, hasLabel: !!span,
        compactText: span?.dataset.compactLabel || "",
        fontSize: style ? parseFloat(style.fontSize) : null,
        afterFont: after ? parseFloat(after.fontSize) : null,
        afterContent: after?.content || "",
        geometry: el.getBoundingClientRect().width
      };
    });
    return {
      status: document.documentElement.dataset.publishedConfigurationStatus,
      layoutProfile: document.documentElement.dataset.layoutProfile,
      detail: document.body.classList.contains("has-module-detail"),
      containerName: navStyle?.containerName || "",
      containerType: navStyle?.containerType || "",
      controlsWidth: controls?.getBoundingClientRect().width || 0,
      navClientWidth: nav?.clientWidth ?? 0,
      navScrollWidth: nav?.scrollWidth ?? 0,
      contentWidth: width,
      stages,
      buttons
    };
  });
}

(async () => {
  for (const [engineName, engine] of profiles) {
    const browser = await engine.launch({headless: true});
    try {
      for (const theme of styles) {
        const rows = {ordinary: [], detail: []};
        for (const controlWidth of widths) {
          const page = await browser.newPage({
            viewport: {width: 1366, height: 900}, reducedMotion: "reduce"
          });
          try {
            await page.goto(sourceUrl, {waitUntil: "domcontentloaded", timeout: 25000});
            await page.waitForFunction(() =>
              document.documentElement.dataset.publishedConfigurationStatus === "validated" &&
              !document.querySelector(".workspace")?.hidden &&
              !!window.CASA_EM_MODULOS_DEBUG?.getNormalizedFlow?.()?.stages?.length,
              null, {timeout: 25000});
            await page.evaluate(({theme, controlWidth}) => {
              document.documentElement.dataset.theme = theme;
              document.querySelector(".controls").style.width = controlWidth + "px";
            }, {theme, controlWidth});
            await page.waitForFunction(target => Math.abs(
              document.querySelector(".controls")?.getBoundingClientRect().width - target) < 1,
              controlWidth, {timeout: 7000});
            for (const detail of [false, true]) {
              if (detail) {
                await page.locator("#moduleList [data-select-entity]").first().click({timeout: 6000});
                await page.waitForFunction(() => document.body.classList.contains("has-module-detail"),
                  null, {timeout: 7000});
              }
              // Observe the computed CSS; never assume a 500px .controls width
              // equals the content width of the nested .flow-nav container.
              const state = await snapshot(page);
              const compact = state.contentWidth <= 500 + 0.02;
              const context = engineName + "/" + theme + "/" + controlWidth + "/" + (detail ? "detail" : "ordinary");
              assert.equal(state.status, "validated", context + " V5 fixture");
              assert.ok(state.stages.length >= 2, context + " data-driven stages absent");
              assert.deepEqual(state.buttons.map(b => b.id), state.stages, context + " dynamic stage IDs");
              assert.equal(state.detail, detail, context + " detail state");
              assert.equal(state.containerName, "flow-steps", context + " named query container");
              assert.ok(state.containerType.includes("inline-size"), context + " true container query");
              assert.ok(state.contentWidth > 0 && state.navClientWidth > 0, context + " measurable container");
              assert.ok(state.navScrollWidth <= state.navClientWidth + 2, context + " nav overflow");
              assert.ok(state.buttons.every(b => b.hasLabel && b.geometry > 0), context + " visible steps");
              assert.ok(state.buttons.every(b =>
                compact ? b.fontSize === 0 && b.afterFont >= 8 && b.afterContent !== "none" && b.compactText
                  : b.fontSize > 0
              ), context + " labels disagree with effective 500px container query: " +
                JSON.stringify({contentWidth: state.contentWidth, buttons: state.buttons}));
              rows[detail ? "detail" : "ordinary"].push({width: controlWidth,
                contentWidth: Number(state.contentWidth.toFixed(2)), compact});
              result.push({engineName, theme, controlWidth, detail, compact,
                contentWidth: Number(state.contentWidth.toFixed(2))});
              console.log("CI_NAV_LABEL500_PASS " + JSON.stringify(result[result.length - 1]));
            }
          } catch (error) {
            console.error("CI_NAV_LABEL500_FAIL " + JSON.stringify({
              engineName, theme, controlWidth, message: String(error?.message || error).slice(0, 700)
            }));
            throw error;
          } finally {
            await page.close();
          }
        }
        for (const mode of ["ordinary", "detail"]) {
          const checks = rows[mode];
          assert.ok(checks.some(s => s.compact) && checks.some(s => !s.compact),
            engineName + "/" + theme + "/" + mode + " must straddle actual query threshold");
          for (let i = 1; i < checks.length; i++) {
            assert.ok(checks[i].contentWidth >= checks[i-1].contentWidth - 0.05,
              "container width must be monotonic with .controls width");
            assert.ok(!(checks[i].compact && !checks[i-1].compact),
              "rising width must not restore compact labels");
          }
        }
      }
    } finally {
      await browser.close();
    }
  }
  assert.equal(result.length, widths.length * styles.length * profiles.length * 2);
  console.log("CI_NAV_LABEL500_COMPLETE " + JSON.stringify({
    observations: result.length, engines: profiles.length, widths,
    themeCount: styles.length, detailVariants: 2,
    evidence: "local-v5-named-container-boundary-not-pixel-equality"
  }));
})().catch(error => {console.error(error); process.exitCode = 1;});
