"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const shells = [
  { path: "/", placement: ".site-header .header-actions", order: { before: ".menu-toggle" }, keyboard: { start: ".brand", key: "Tab" }, target: { mobile: 44, desktop: 44 } },
  { path: "/about/", placement: ".site-header .header-actions", order: { before: ".menu-toggle" }, keyboard: { start: ".brand", key: "Tab" }, target: { mobile: 44, desktop: 44 } },
  { path: "/how-it-works/", placement: ".site-header .header-actions", order: { before: ".menu-toggle" }, keyboard: { start: ".brand", key: "Tab" }, target: { mobile: 44, desktop: 44 } },
  { path: "/viewer/", placement: ".viewer-header .header-actions", order: { after: ".back-link", before: ".viewer-header__menu-toggle" }, keyboard: { start: ".viewer-brand", key: "Tab" }, target: { mobile: 40, desktop: 40 } },
  { path: "/config/", placement: ".private-header__actions", order: { after: "#restoreButton", before: ".private-menu-toggle" }, keyboard: { start: "#restoreButton", key: "Tab" }, target: { mobile: 44, desktop: 40 } },
  { path: "/admin.html", placement: ".private-header__actions", order: { first: true }, keyboard: { start: ".private-header__brand", key: "Tab" }, target: { mobile: 44, desktop: 40 } },
  { path: "/access/manage.html", placement: ".private-header__actions", order: { first: true }, keyboard: { start: ".private-header__brand", key: "Tab" }, target: { mobile: 44, desktop: 40 } },
  { path: "/access/", placement: ".private-header__actions", order: { first: true }, keyboard: { start: ".private-header__brand", key: "Tab" }, target: { mobile: 44, desktop: 40 } }
];
const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 900 }
];
const visuallyHiddenRule = /\.visually-hidden\s*\{/g;

async function measureGlobalFocus(page, expectedColor, message) {
  const probe = await page.evaluateHandle(() => {
    const link = document.createElement("a");
    link.href = "#focus-token-probe";
    link.textContent = "Focus token probe";
    link.tabIndex = 0;
    link.setAttribute("aria-hidden", "true");
    link.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden";
    document.body.prepend(link);
    return link;
  });
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press("Tab");
  await page.waitForFunction((expectedColor) => {
    const link = document.activeElement;
    const style = getComputedStyle(link);
    return link.matches(":focus-visible") && style.outlineColor === expectedColor &&
      style.outlineWidth === "3px" && style.outlineOffset === "3px";
  }, expectedColor, { timeout: 1000 });
  const measured = await probe.evaluate((link) => {
    const style = getComputedStyle(link);
    return { focused: document.activeElement === link, focusVisible: link.matches(":focus-visible"), color: style.outlineColor, width: style.outlineWidth, offset: style.outlineOffset };
  });
  assert(measured.focused && measured.focusVisible, message + " reaches global focus probe by keyboard");
  assert.equal(measured.color, expectedColor, message + " global focus color preserves the baseline");
  assert.equal(measured.width, "3px", message + " global focus width preserves the baseline");
  assert.equal(measured.offset, "3px", message + " global focus offset preserves the baseline");
  await probe.evaluate((link) => link.remove());
  return measured;
}
const sharedCss = fs.readFileSync(path.join(__dirname, "../app/ui-theme.css"), "utf8");
const adminCss = fs.readFileSync(path.join(__dirname, "../app/admin/admin.css"), "utf8");
const configCss = fs.readFileSync(path.join(__dirname, "../app/styles.css"), "utf8");
assert.deepEqual([
  (sharedCss.match(visuallyHiddenRule) || []).length,
  (adminCss.match(visuallyHiddenRule) || []).length,
  (configCss.match(visuallyHiddenRule) || []).length
], [1, 0, 0], "the shared stylesheet is the sole owner of .visually-hidden");

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
        await page.addInitScript(() => {
          localStorage.setItem("casa-ui-theme-mode-v1", "dark");
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
          await page.waitForFunction(() => {
            const root = document.documentElement;
            return root.dataset.theme === "dark" &&
              getComputedStyle(root).getPropertyValue("--ui-theme-focus").trim() === "#d8bc7c";
          }, undefined, { timeout: 5000 });
          const hiddenSelector = shell.path === "/admin.html"
            ? ".private-header__brand strong.visually-hidden"
            : shell.path === "/config/"
              ? "h1.visually-hidden"
              : null;
          const visuallyHiddenUtility = hiddenSelector ? page.locator(hiddenSelector) : null;
          if (visuallyHiddenUtility) {
            const utility = visuallyHiddenUtility;
            assert.equal(await utility.count(), 1, shell.path + " has one visually-hidden consumer");
            const measuredUtility = await utility.evaluate((element) => {
              const style = getComputedStyle(element);
              return {
                text: element.textContent.trim(),
                position: style.position,
                width: style.width,
                height: style.height,
                overflow: style.overflow,
                clip: style.clip,
                margin: style.margin,
                whiteSpace: style.whiteSpace,
                rectWidth: element.getBoundingClientRect().width,
                rectHeight: element.getBoundingClientRect().height,
                tabIndex: element.tabIndex,
                ariaHidden: element.getAttribute("aria-hidden")
              };
            });
            assert.equal(measuredUtility.text, "Casa em Módulos", shell.path + " retains its accessible text");
            assert.equal(measuredUtility.position, "absolute", shell.path + " visually-hidden utility is applied");
            assert.equal(measuredUtility.width, "1px", shell.path + " utility width");
            assert.equal(measuredUtility.height, "1px", shell.path + " utility height");
            assert.equal(measuredUtility.overflow, "hidden", shell.path + " utility clips overflow");
            assert.equal(measuredUtility.clip, "rect(0px, 0px, 0px, 0px)", shell.path + " utility clips the full visual box");
            assert.equal(measuredUtility.margin, "-1px", shell.path + " utility removes its one-pixel box from layout");
            assert.equal(measuredUtility.whiteSpace, "nowrap", shell.path + " utility text does not wrap");
            assert.equal(measuredUtility.rectWidth, 1, shell.path + " utility box stays one pixel wide");
            assert.equal(measuredUtility.rectHeight, 1, shell.path + " utility box stays one pixel high");
            assert.equal(measuredUtility.tabIndex, -1, shell.path + " utility is not a keyboard stop");
            assert.equal(measuredUtility.ariaHidden, null, shell.path + " text remains in the accessibility tree");
            const accessibleConsumer = shell.path === "/admin.html"
              ? page.getByRole("link", { name: "Casa em Módulos, início" })
              : page.getByRole("heading", { name: "Casa em Módulos" });
            assert.equal(await accessibleConsumer.count(), 1,
              shell.path + " keeps its accessible brand name or heading");
            await utility.evaluate((element) => element.focus());
            assert.equal(await utility.evaluate((element) => document.activeElement === element), false,
              shell.path + " visually-hidden text cannot receive focus");
          }

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

          const darkGlobalFocus = viewport.name === "mobile" && shell.path === "/"
            ? await measureGlobalFocus(page, "rgb(216, 188, 124)", shell.path + " dark")
            : null;
          const keyboardStart = page.locator(shell.keyboard.start).first();
          await keyboardStart.focus();
          assert(await keyboardStart.evaluate((element) => document.activeElement === element),
            shell.path + " keyboard sequence starts from the expected focusable control");
          let reachedByKeyboard = false;
          for (let step = 0; step < 20; step += 1) {
            await page.keyboard.press(shell.keyboard.key);
            if (visuallyHiddenUtility) {
              assert.equal(await visuallyHiddenUtility.evaluate((element) => document.activeElement === element), false,
                shell.path + " Tab navigation skips the non-interactive hidden text");
            }
            reachedByKeyboard = await control.evaluate((button) => document.activeElement === button);
            if (reachedByKeyboard) break;
          }
          assert(reachedByKeyboard, shell.path + " theme control is reachable by keyboard");
          const focusStyle = await control.evaluate((button) => ({
            visible: button.matches(":focus-visible") && getComputedStyle(button).outlineStyle !== "none"
          }));
          assert(focusStyle.visible, shell.path + " keyboard focus is visibly indicated");





          await page.keyboard.press("Enter");
          const autoActivated = await control.evaluate((button) => ({
            mode: button.getAttribute("data-mode"),
            label: button.getAttribute("aria-label"),
            stored: localStorage.getItem("casa-ui-theme-mode-v1")
          }));
          assert.equal(autoActivated.mode, "auto", shell.path + " keyboard activation selects automatic mode after dark");
          assert.equal(autoActivated.stored, "auto", shell.path + " keyboard activation persists automatic mode");
          assert(autoActivated.label.includes("Ativar Claro"), shell.path + " announces the next mode from automatic");
          await page.keyboard.press("Enter");
          const activated = await control.evaluate((button) => ({
            mode: button.getAttribute("data-mode"),
            label: button.getAttribute("aria-label"),
            stored: localStorage.getItem("casa-ui-theme-mode-v1")
          }));
          assert.equal(activated.mode, "light", shell.path + " keyboard activation selects light mode after automatic");
          assert.equal(activated.stored, "light", shell.path + " keyboard activation persists light mode");
          assert(activated.label.includes("Ativar Escuro"), shell.path + " announces the next mode from light");
          const lightGlobalFocus = viewport.name === "mobile" && shell.path === "/"
            ? await measureGlobalFocus(page, "rgb(110, 81, 46)", shell.path + " light")
            : null;




          results.push({
            shell: shell.path,
            viewport: viewport.name,
            placement: shell.placement,
            measuredTargetMinimumCssPx: minTarget,
            measuredWidthCssPx: measured.width,
            measuredHeightCssPx: measured.height,
            keyboardFocusVisible: focusStyle.visible,
            darkFocus: darkGlobalFocus,
            lightFocus: lightGlobalFocus,
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

