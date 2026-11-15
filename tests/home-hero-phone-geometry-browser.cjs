// Calibrated geometry for the home hero video inside the phone artwork.
// Source: lifestyle-phone-expanded.svg, whose embedded raster is stretched into a 1024x1536 viewBox.
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const appRoot = path.join(repoRoot, "app");
const reportDir = path.resolve(process.argv[2] || path.join(repoRoot, "artifacts", "home-hero-phone-geometry"));
const expected = Object.freeze({ left: 305, top: 617, width: 350, height: 779 });
const expectedAssetSha256 = "b87416e232852489fdb310896776c6362aa5eba79d8fe696254a06d4b54fca0d";
const assetPath = path.join(appRoot, "landing", "assets", "hero", "lifestyle-phone-expanded.svg");
const asset = fs.readFileSync(assetPath);
const assetSha256 = crypto.createHash("sha256").update(asset).digest("hex");

assert.equal(assetSha256, expectedAssetSha256,
  "Phone artwork changed; recalibrate the screen bounds before updating this pin.");

function readScreenAttributes(html, label) {
  const tag = html.match(/<div class="hero-phone-screen" id="heroPhoneScreen"[^>]*>/)?.[0];
  assert.ok(tag, label + " is missing #heroPhoneScreen");
  const fields = [
    ["left", "data-screen-left"],
    ["top", "data-screen-top"],
    ["width", "data-screen-width"],
    ["height", "data-screen-height"]
  ];
  const actual = {};
  for (const [key, attribute] of fields) {
    const value = tag.match(new RegExp(attribute + '="(\\d+)"'));
    assert.ok(value, label + " is missing " + attribute);
    actual[key] = Number(value[1]);
  }
  assert.deepEqual(actual, expected, label + " screen calibration");
}

const canonicalHtml = fs.readFileSync(path.join(repoRoot, "architecture", "pages", "root.page.html"), "utf8");
const publishedHtml = fs.readFileSync(path.join(appRoot, "index.html"), "utf8");
readScreenAttributes(canonicalHtml, "canonical root page");
readScreenAttributes(publishedHtml, "published home page");

const landingJs = fs.readFileSync(path.join(appRoot, "landing", "landing.js"), "utf8");
for (const property of ["screenLeft", "screenTop", "screenWidth", "screenHeight"]) {
  assert.ok(landingJs.includes("screenElement.dataset." + property),
    "runtime must use calibrated " + property + " from the published page");
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);

const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    const relative = decodeURIComponent(pathname === "/" ? "/index.html" : pathname).replace(/^\/+/, "");
    const filePath = path.resolve(appRoot, relative);
    if (filePath !== appRoot && !filePath.startsWith(appRoot + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    const body = await fs.promises.readFile(filePath);
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": contentTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream"
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

async function startServer() {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return "http://127.0.0.1:" + server.address().port;
}

function closeEnough(actual, expectedValue, tolerance = 1.25) {
  return Math.abs(actual - expectedValue) <= tolerance;
}

async function main() {
  await fs.promises.mkdir(reportDir, { recursive: true });
  const origin = await startServer();
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const width of [390, 516, 1024, 1366]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        serviceWorkers: "block"
      });
      await page.route("**/*", (route) => {
        const requestOrigin = new URL(route.request().url()).origin;
        return requestOrigin === origin ? route.continue() : route.abort();
      });
      const context = "home hero phone screen at " + width + "px";
      try {
        const response = await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
        assert.equal(response?.status(), 200, context + " HTTP");
        await page.waitForFunction(() => {
          const image = document.querySelector(".hero-image-frame > img");
          const screen = document.getElementById("heroPhoneScreen");
          return image?.complete && image.naturalWidth === 1024
            && image.naturalHeight === 1536 && screen && !screen.hidden;
        }, null, { timeout: 15000 });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
        });

        const measured = await page.evaluate(() => {
          const frame = document.querySelector(".hero-image-frame");
          const image = frame.querySelector("img");
          const screen = document.getElementById("heroPhoneScreen");
          const frameBox = frame.getBoundingClientRect();
          const imageBox = image.getBoundingClientRect();
          const screenBox = screen.getBoundingClientRect();
          const scale = imageBox.width / 1024;
          return {
            screen: {
              left: Number(screen.dataset.screenLeft),
              top: Number(screen.dataset.screenTop),
              width: Number(screen.dataset.screenWidth),
              height: Number(screen.dataset.screenHeight)
            },
            frame: { left: frameBox.left, top: frameBox.top, right: frameBox.right, bottom: frameBox.bottom },
            image: { left: imageBox.left, top: imageBox.top, width: imageBox.width, height: imageBox.height },
            actual: { left: screenBox.left, top: screenBox.top, width: screenBox.width, height: screenBox.height },
            expected: {
              left: imageBox.left + 305 * scale,
              top: imageBox.top + 617 * scale,
              width: 350 * scale,
              height: 779 * scale
            }
          };
        });
        assert.deepEqual(measured.screen, expected, context + " calibration");
        for (const edge of ["left", "top", "width", "height"]) {
          assert.ok(closeEnough(measured.actual[edge], measured.expected[edge]),
            context + " " + edge + " drift: " + JSON.stringify(measured));
        }
        assert.ok(measured.actual.left >= measured.frame.left - 1
          && measured.actual.left + measured.actual.width <= measured.frame.right + 1,
        context + " screen exceeds horizontal art crop: " + JSON.stringify(measured));
        assert.ok(measured.actual.top >= measured.frame.top - 1
          && measured.actual.top + measured.actual.height <= measured.frame.bottom + 1,
        context + " screen exceeds vertical art crop: " + JSON.stringify(measured));

        await page.locator(".hero-art").screenshot({
          path: path.join(reportDir, "home-hero-phone-" + width + ".png")
        });
        results.push({ width, ...measured });
        console.log("HOME_HERO_PHONE_GEOMETRY_CASE " + JSON.stringify({ width, actual: measured.actual }));
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  await fs.promises.writeFile(
    path.join(reportDir, "home-hero-phone-geometry.json"),
    JSON.stringify({
      schema: "HomeHeroPhoneGeometry/1.0",
      sourceAssetSha256: assetSha256,
      calibration: expected,
      localOnly: true,
      results
    }, null, 2) + "\n"
  );
  console.log("HOME_HERO_PHONE_GEOMETRY_PASS " + JSON.stringify({ viewports: results.map(item => item.width) }));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
