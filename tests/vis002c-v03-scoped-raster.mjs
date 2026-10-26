// R7: adapt the earlier VIS-002C v0.2 scoped full-page raster audit to v0.3.
// A synthetic temporary legacy color is applied to the SAME rendered DOM.
// This checks change containment, not visual approval or equivalence to a live v0.2 site.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";
import { chromium, webkit } from "playwright";

const origin = process.env.PUBLIC_AUDIT_ORIGIN || "http://127.0.0.1:8123";
const source = JSON.parse(await readFile(
  new URL("../design-system/pins/vis-002/context-v0.3.0/contextual-mapping.json", import.meta.url), "utf8"
));
assert.equal(source.version, "0.3.0");
assert.equal(source.contexts.length, 10);
assert.equal(source.roleRef, "VIS-002.approvedPalette.colors.textPrimary.light");
assert.equal(source.value.toLowerCase(), "#292723");
const routes = ["/", "/about/", "/how-it-works/"];
const byRoute = routes.map(route => ({
  route,
  selectors: source.contexts.filter(item => item.route === route).map(item => item.selector)
}));
assert.deepEqual(byRoute.map(x => x.selectors.length), [3, 3, 4]);

const resultDir = "artifacts/vis002c-v03-scoped-raster";
await mkdir(resultDir, { recursive: true });
const results = [];
const sample = selectors => selectors.map(selector => {
  const elements = [...document.querySelectorAll(selector)].filter(element => {
    const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && css.display !== "none"
      && css.visibility !== "hidden" && Number(css.opacity) > 0;
  }).map(element => {
    const rect = element.getBoundingClientRect();
    return {
      selector, color: getComputedStyle(element).color,
      x: rect.left + scrollX, y: rect.top + scrollY,
      width: rect.width, height: rect.height
    };
  });
  return { selector, elements };
});
const ready = async (page, route) => {
  await page.evaluate(async () => {
    for (const img of document.images) img.loading = "eager";
    await document.fonts.ready;
    await Promise.all([...document.images].filter(i => i.src).map(i => i.decode?.().catch(() => {})));
  });
  await page.waitForLoadState("load", { timeout: 12000 }).catch(() => {});
  if (route === "/") {
    await page.locator("#environmentFeature").waitFor({state:"visible", timeout:16000});
    await page.locator("#featureDescription").waitFor({state:"visible", timeout:16000});
  }
  await page.waitForTimeout(300);
};
const flattened = observations => observations.flatMap(row => row.elements);
const expectTargetColor = (rows, rgb, label) => {
  for (const item of rows) {
    assert.ok(item.elements.length > 0, label + " missing visible " + item.selector);
    for (const element of item.elements)
      assert.equal(element.color, rgb, label + " wrong color: " + item.selector);
  }
};
for (const [browserName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [390, 1366]) for (const {route, selectors} of byRoute) {
      const page = await browser.newPage({
        viewport: { width, height: 900 }, colorScheme: "light",
        reducedMotion: "reduce", deviceScaleFactor: 1, serviceWorkers: "block"
      });
      const label = browserName + "-" + width + "-" + (route.replaceAll("/", "_") || "root");
      try {
        // Pin only the remote YouTube iframe to avoid cross-origin video animation.
        await page.route("https://www.youtube-nocookie.com/embed/**", request => request.fulfill({
          status: 200, contentType: "text/html",
          body: "<!doctype html><html><body style='margin:0;background:#000'></body></html>"
        }));
        await page.addInitScript(() => localStorage.setItem("casa-ui-theme-mode-v1", "light"));
        const response = await page.goto(new URL(route, origin).toString(),
          {waitUntil: "domcontentloaded", timeout: 20000});
        assert.equal(response?.status(), 200, label + " HTTP error");
        assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
        await ready(page, route);
        const approved = await page.evaluate(sample, selectors);
        expectTargetColor(approved, "rgb(41, 39, 35)", label + " approved");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true, label + " horizontal overflow");

        // Deliberately synthetic former text color, not a production baseline.
        // The DOM, dimensions, media, text and image state stay identical.
        const oldCss = selectors.map(s =>
          'html[data-theme="light"] ' + s + ' { color: #705C4B !important; }'
        ).join("\n");
        const injected = await page.addStyleTag({content: oldCss});
        await page.evaluate(() => new Promise(done => requestAnimationFrame(() =>
          requestAnimationFrame(done))));
        const legacy = await page.evaluate(sample, selectors);
        expectTargetColor(legacy, "rgb(112, 92, 75)", label + " synthetic reference");
        const before = PNG.sync.read(await page.screenshot({
          fullPage: true, animations: "disabled", caret: "hide"
        }));
        await injected.evaluate(element => element.remove());
        await page.evaluate(() => new Promise(done => requestAnimationFrame(() =>
          requestAnimationFrame(done))));
        const afterState = await page.evaluate(sample, selectors);
        assert.deepEqual(afterState, approved, label + " geometry or restored style drift");
        const after = PNG.sync.read(await page.screenshot({
          fullPage: true, animations: "disabled", caret: "hide"
        }));
        assert.equal(before.width, after.width, label + " page width changed");
        assert.equal(before.height, after.height, label + " page height changed");
        const bounds = flattened(approved).map(r => ({
          x1: Math.floor(r.x - 5), x2: Math.ceil(r.x + r.width + 5),
          y1: Math.floor(r.y - 5), y2: Math.ceil(r.y + r.height + 5)
        }));
        let changed = 0, outside = 0;
        for (let y = 0; y < before.height; y++) for (let x = 0; x < before.width; x++) {
          const offset = 4 * (y * before.width + x);
          const delta = Math.max(...[0, 1, 2, 3].map(k =>
            Math.abs(before.data[offset + k] - after.data[offset + k])));
          if (delta <= 1) continue; // PNG raster rounding only
          changed++;
          if (!bounds.some(r => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2))
            outside++;
        }
        assert.ok(changed > 0, label + " no visible scoped change");
        assert.equal(outside, 0, label + " pixels changed outside authorized text bounds");
        const row = {browser: browserName, width, route, selectors: selectors.length,
          targets: bounds.length, changed, outside};
        results.push(row);
        console.log("VIS002C_V03_SCOPED_RASTER_CASE " + JSON.stringify(row));
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}
assert.equal(results.length, 12);
assert.equal(results.reduce((sum, row) => sum + row.selectors, 0), 40);
await writeFile(join(resultDir, "report.json"),
  JSON.stringify({
    schema: "VIS002CScopedRaster/0.3",
    mode: "same-DOM synthetic legacy style; does not constitute human visual review",
    sourceGitBlob: "e8f42f76e2732cbcf3e9a68d1dc8f82ea79dd73d",
    results
  }, null, 2) + "\n");
console.log("VIS002C_V03_SCOPED_RASTER_PASS " +
  JSON.stringify({scenarios: results.length, selectorCases: 40, outside: 0}));
