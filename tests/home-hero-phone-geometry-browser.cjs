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
const expectedPosterSha256 = "dcba120a318c43403d85d6b4acc9f96b911520eba7972fb84f7adbf9baa3da08";
const assetPath = path.join(appRoot, "landing", "assets", "hero", "lifestyle-phone-expanded.svg");
const posterPath = path.join(appRoot, "landing", "assets", "hero", "home-video-poster.png");
const asset = fs.readFileSync(assetPath);
const assetSha256 = crypto.createHash("sha256").update(asset).digest("hex");

assert.equal(assetSha256, expectedAssetSha256,
  "Phone artwork changed; recalibrate the screen bounds before updating this pin.");
const posterBytes = fs.readFileSync(posterPath);
const posterSha256 = crypto.createHash("sha256").update(posterBytes).digest("hex");
assert.equal(posterSha256, expectedPosterSha256, "The cleaned video poster changed; review its visible crop.");
assert.equal(posterBytes.readUInt32BE(16), 949, "The poster should keep its reviewed upscale width.");
assert.equal(posterBytes.readUInt32BE(20), 1658, "The poster should keep its reviewed upscale height.");

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
for (const [html, label] of [[canonicalHtml, "canonical root page"], [publishedHtml, "published home page"]]) {
  assert.match(html, /home-video-poster\.png\?v=clean-v2/, label + " cleaned poster URL");
  assert.match(html, /hero-phone-poster__play/, label + " centered poster play button");
  assert.doesNotMatch(html, /hero-phone-controls|heroPhonePlayToggle/, label + " must use native YouTube controls");
}

const landingJs = fs.readFileSync(path.join(appRoot, "landing", "landing.js"), "utf8");
const landingCss = fs.readFileSync(path.join(appRoot, "landing", "landing.css"), "utf8");
assert.ok(landingJs.includes('controls: "1"'), "YouTube progress and native controls must remain enabled");
assert.ok(!landingJs.includes("cc_load_policy"), "caption visibility must follow the viewer preference");
assert.ok(landingCss.includes(".hero-phone-player { position: absolute; inset: 2px;"), "player must be inset 2px to reveal the phone bezel");
assert.ok(landingCss.includes(".hero-phone-media { position: absolute; inset: 0;"), "player media must fill its inset frame");
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
          const player = screen.querySelector(".hero-phone-player");
          const media = screen.querySelector(".hero-phone-media");
          const poster = screen.querySelector(".hero-phone-poster");
          const play = screen.querySelector(".hero-phone-poster__play");
          const frameBox = frame.getBoundingClientRect();
          const imageBox = image.getBoundingClientRect();
          const screenBox = screen.getBoundingClientRect();
          const playerBox = player.getBoundingClientRect();
          const mediaBox = media.getBoundingClientRect();
          const posterBox = poster.getBoundingClientRect();
          const playBox = play.getBoundingClientRect();
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
            player: { left: playerBox.left, top: playerBox.top, width: playerBox.width, height: playerBox.height },
            media: { left: mediaBox.left, top: mediaBox.top, width: mediaBox.width, height: mediaBox.height },
            poster: { left: posterBox.left, top: posterBox.top, width: posterBox.width, height: posterBox.height },
            play: { left: playBox.left, top: playBox.top, width: playBox.width, height: playBox.height },
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
        assert.ok(closeEnough(measured.player.left, measured.actual.left + 2, 0.1)
          && closeEnough(measured.player.top, measured.actual.top + 2, 0.1)
          && closeEnough(measured.player.width, measured.actual.width - 4, 0.1)
          && closeEnough(measured.player.height, measured.actual.height - 4, 0.1),
        context + " player bezel inset is not exactly 2px: " + JSON.stringify(measured));
        for (const layer of ["media", "poster"]) {
          for (const edge of ["left", "top", "width", "height"]) {
            assert.ok(closeEnough(measured[layer][edge], measured.player[edge], 0.25),
              context + " " + layer + " does not fill player: " + JSON.stringify(measured));
          }
        }
        assert.ok(closeEnough(measured.play.left + measured.play.width / 2, measured.media.left + measured.media.width / 2, 0.25)
          && closeEnough(measured.play.top + measured.play.height / 2, measured.media.top + measured.media.height / 2, 0.25),
        context + " poster play control is not centered: " + JSON.stringify(measured));
        assert.ok(measured.player.width >= 200 && measured.player.height >= 200,
          context + " YouTube viewport is below the documented 200px minimum: " + JSON.stringify(measured));

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
