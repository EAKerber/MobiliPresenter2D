"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const shells = [
  { path: "/", placement: ".site-header .header-actions", order: { before: ".menu-toggle" }, keyboard: { start: ".brand", key: "Tab" }, target: { mobile: 44, desktop: 44 } },
  { path: "/about/", placement: ".site-header .header-actions", order: { before: ".menu-toggle" }, keyboard: { start: ".brand", key: "Tab" }, target: { mobile: 44, desktop: 44 } },
  { path: "/how-it-works/", placement: ".site-header .header-actions", order: { before: ".menu-toggle" }, keyboard: { start: ".brand", key: "Tab" }, target: { mobile: 44, desktop: 44 } },
  { path: "/viewer/", placement: ".viewer-header .header-actions", order: { after: ".back-link", before: ".viewer-header__menu-toggle" }, keyboard: { start: ".viewer-brand", key: "Tab" }, target: { mobile: 44, desktop: 44 } },
  { path: "/config/", placement: ".private-header__actions", order: { after: "#restoreButton", before: ".private-menu-toggle" }, keyboard: { start: "#restoreButton", key: "Tab" }, target: { mobile: 44, desktop: 40 } },
  { path: "/admin.html", placement: ".private-header__actions", order: { first: true }, keyboard: { start: ".private-header__brand", key: "Tab" }, target: { mobile: 44, desktop: 40 } },
  { path: "/access/manage.html", placement: ".private-header__actions", order: { first: true }, keyboard: { start: ".private-header__brand", key: "Tab" }, target: { mobile: 44, desktop: 40 } },
  { path: "/access/", placement: ".private-header__actions", order: { first: true }, keyboard: { start: ".private-header__brand", key: "Tab" }, target: { mobile: 44, desktop: 40 } }
];
const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 900 }
];
const targetUrl = new URL(process.env.MOBILE_INTERACTIONS_URL || "http://127.0.0.1:8123/config/");
assert(["127.0.0.1", "localhost"].includes(targetUrl.hostname),
  "theme shell browser gate must use the anonymous local V5 fixture, not a deployed site");
const origin = targetUrl.origin;
const outputDir = process.argv[2] || "/tmp/mobile-browser-review";

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const viewport of viewports) {
      for (const shell of shells) {
        const page = await browser.newPage({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1,
          colorScheme: "light",
          reducedMotion: "reduce",
          serviceWorkers: "block"
        });
        await page.route("**/*", (route) => {
          const requestOrigin = new URL(route.request().url()).origin;
          return requestOrigin === origin ? route.continue() : route.abort();
        });

        try {
          const response = await page.goto(origin + shell.path, {
            waitUntil: "domcontentloaded",
            timeout: 20000
          });
          assert.equal(response && response.status(), 200, shell.path + " HTTP");

          const control = page.locator("[data-ui-theme-toggle]");
          await control.waitFor({ state: "visible", timeout: 10000 });
          assert.equal(await control.count(), 1, shell.path + " has exactly one theme control");

          const measured = await control.evaluate((button, expected) => {
            const rect = button.getBoundingClientRect();
            const style = getComputedStyle(button);
            const parent = button.parentElement;
            const previous = expected.after ? parent && parent.querySelector(expected.after) : null;
            const next = expected.before ? parent && parent.querySelector(expected.before) : null;
            const followsPrevious = !expected.after || Boolean(previous &&
              (previous.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING));
            const precedesNext = !expected.before || Boolean(next &&
              (button.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING));
            return {
              parentMatches: Boolean(parent && parent.matches(expected.parent)),
              orderMatches: expected.first ? parent.firstElementChild === button : followsPrevious && precedesNext,
              visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden",
              width: rect.width,
              height: rect.height,
              minWidth: style.minWidth,
              minHeight: style.minHeight,
              ariaLabel: button.getAttribute("aria-label"),
              title: button.getAttribute("title")
            };
          }, { ...shell.order, parent: shell.placement });
          assert(measured.parentMatches, shell.path + " control belongs to " + shell.placement);
          assert(measured.orderMatches, shell.path + " control keeps its expected position within the action group");
          assert(measured.visible, shell.path + " control has a visible browser box");
          const minTarget = shell.target[viewport.name];
          assert(measured.width >= minTarget, shell.path + " measured width is at least " + minTarget + "px at " + viewport.name);
          assert(measured.height >= minTarget, shell.path + " measured height is at least " + minTarget + "px at " + viewport.name);
          assert(measured.ariaLabel && measured.ariaLabel.length > 8, shell.path + " has an accessible name");
          assert(measured.title, shell.path + " has a concise title");

          const keyboardStart = page.locator(shell.keyboard.start).first();
          await keyboardStart.focus();
          assert(await keyboardStart.evaluate((element) => document.activeElement === element),
            shell.path + " keyboard sequence starts from the expected focusable control");
          let reachedByKeyboard = false;
          for (let step = 0; step < 20; step += 1) {
            await page.keyboard.press(shell.keyboard.key);
            reachedByKeyboard = await control.evaluate((button) => document.activeElement === button);
            if (reachedByKeyboard) break;
          }
          assert(reachedByKeyboard, shell.path + " theme control is reachable by keyboard");
          const focusVisible = await control.evaluate((button) => {
            const style = getComputedStyle(button);
            return button.matches(":focus-visible") && style.outlineStyle !== "none"
              && parseFloat(style.outlineWidth) >= 2;
          });
          assert(focusVisible, shell.path + " keyboard focus is visibly indicated");

          await page.keyboard.press("Enter");
          const activated = await control.evaluate((button) => ({
            mode: button.getAttribute("data-mode"),
            label: button.getAttribute("aria-label"),
            stored: localStorage.getItem("casa-ui-theme-mode-v1")
          }));
          assert.equal(activated.mode, "light", shell.path + " keyboard activation selects light mode");
          assert.equal(activated.stored, "light", shell.path + " keyboard activation persists the mode");
          assert(activated.label.includes("Ativar Escuro"), shell.path + " announces the next mode");

          results.push({
            shell: shell.path,
            viewport: viewport.name,
            placement: shell.placement,
            measuredTargetMinimumCssPx: minTarget,
            measuredWidthCssPx: measured.width,
            measuredHeightCssPx: measured.height,
            keyboardFocusVisible: focusVisible,
            keyboardActivation: activated.mode
          });
        } finally {
          await page.close();
        }
      }
    }

    fs.writeFileSync(path.join(outputDir, "ui-theme-browser-review.json"), JSON.stringify({
      target: "anonymous local V5 static shell fixture",
      shellCount: shells.length,
      viewportCount: viewports.length,
      cases: results
    }, null, 2) + "\n");
    console.log("TST-015 eight shells x two viewports, one control, placement, keyboard focus/activation and measured target: PASS");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

