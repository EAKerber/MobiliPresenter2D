const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

(async () => {
  const output = process.argv[2] || "/tmp/mobile-pip-interactions";
  fs.mkdirSync(output, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });

  const targetUrl = process.env.MOBILE_INTERACTIONS_URL ||
    pathToFileURL(path.resolve(__dirname, "../app/index.html")).href;
  await page.goto(targetUrl);
  await page.evaluate(() => Promise.all(Array.from(document.images, image => image.decode())));

  await page.evaluate(() => {
    const sentinel = document.getElementById("viewerPinSentinel");
    const y = sentinel.getBoundingClientRect().top + window.scrollY + 180;
    window.scrollTo(0, y);
  });
  await page.waitForFunction(() => document.body.classList.contains("is-mobile-scene-pinned"));

  const opacity = page.locator("#mobileSceneOpacity");
  const opacityBox = await opacity.boundingBox();
  assert(opacityBox, "opacity control must be visible in pinned PiP");
  const hit = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return element?.id || element?.closest?.("button")?.id || null;
  }, { x: opacityBox.x + opacityBox.width / 2, y: opacityBox.y + opacityBox.height / 2 });
  assert.equal(hit, "mobileSceneOpacity", "PiP control must win hit-testing over scene hotspots");

  const beforeControlSelection = await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId);
  await opacity.tap();
  const afterControlSelection = await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId);
  assert.equal(afterControlSelection, beforeControlSelection, "PiP control must not select a module behind it");
  assert(await page.evaluate(() => document.body.classList.contains("is-mobile-scene-transparent")),
    "opacity control must still perform its own action");

  const hotspot = page.locator('[data-select-scene-entity="module-03"]');
  await hotspot.tap();
  await page.waitForFunction(() => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId === "module-03");
  assert(await page.evaluate(() => document.body.classList.contains("is-mobile-scene-pinned")),
    "opening a module from the PiP must keep the PiP open");

  const card = page.locator("#viewerCard");
  const resize = page.locator("#mobileSceneResize");
  const beforeResize = await card.boundingBox();
  const resizeBox = await resize.boundingBox();
  assert(beforeResize && resizeBox, "PiP and bottom-left resize handle must be measurable");

  const client = await context.newCDPSession(page);
  const start = {
    x: resizeBox.x + resizeBox.width / 2,
    y: resizeBox.y + resizeBox.height / 2
  };
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: start.x, y: start.y, radiusX: 2, radiusY: 2, force: 1 }]
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: start.x - 42, y: start.y, radiusX: 2, radiusY: 2, force: 1 }]
  });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(80);

  const afterResize = await card.boundingBox();
  assert(afterResize.width > beforeResize.width + 20,
    "dragging the bottom-left resize handle left must increase PiP width");
  assert(Math.abs(afterResize.x + afterResize.width - (beforeResize.x + beforeResize.width)) <= 4,
    "bottom-left resize must keep the PiP right edge effectively anchored");

  const stage = page.locator(".module-detail__carousel-stage");
  await stage.scrollIntoViewIfNeeded();
  const stageBox = await stage.boundingBox();
  assert(stageBox, "module detail carousel stage must be visible");
  const activeIndex = () => page.locator(".module-detail__carousel-dot.is-active").evaluate(dot =>
    Array.from(dot.parentElement.children).indexOf(dot)
  );
  const beforeSwipe = await activeIndex();
  const swipeStart = { x: stageBox.x + stageBox.width * 0.78, y: stageBox.y + stageBox.height * 0.5 };
  const swipeEnd = { x: stageBox.x + stageBox.width * 0.22, y: swipeStart.y };
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: swipeStart.x, y: swipeStart.y, radiusX: 2, radiusY: 2, force: 1 }]
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: (swipeStart.x + swipeEnd.x) / 2, y: swipeStart.y, radiusX: 2, radiusY: 2, force: 1 }]
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: swipeEnd.x, y: swipeEnd.y, radiusX: 2, radiusY: 2, force: 1 }]
  });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(260);
  const afterSwipe = await activeIndex();
  assert.notEqual(afterSwipe, beforeSwipe, "horizontal touch swipe must change the module-detail carousel page");

  await page.screenshot({ path: path.join(output, "mobile-interactions.png"), fullPage: true, animations: "disabled" });
  assert.deepEqual(errors, []);

  fs.writeFileSync(path.join(output, "result.json"), JSON.stringify({
    status: "PASS",
    targetUrl,
    viewport: [390, 844],
    hitTarget: hit,
    selectedAfterControl: afterControlSelection,
    selectedAfterHotspot: "module-03",
    pipPinnedAfterDetail: true,
    resize: {
      beforeWidth: beforeResize.width,
      afterWidth: afterResize.width,
      rightEdgeDelta: (afterResize.x + afterResize.width) - (beforeResize.x + beforeResize.width)
    },
    carousel: { beforeSwipe, afterSwipe },
    pageErrors: errors
  }, null, 2));

  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
