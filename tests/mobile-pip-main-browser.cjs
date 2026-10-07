const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

(async () => {
  const output = process.argv[2] || "/tmp/mobile-pip-main-review";
  fs.mkdirSync(output, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const targetUrl = process.env.MOBILE_INTERACTIONS_URL ||
    pathToFileURL(path.resolve(__dirname, "../app/index.html")).href;

  const stackedContext = await browser.newContext({
    viewport: { width: 1050, height: 900 },
    deviceScaleFactor: 1
  });
  const stackedPage = await stackedContext.newPage();
  const stackedErrors = [];
  stackedPage.on("pageerror", error => stackedErrors.push(error.message));
  stackedPage.on("console", message => {
    if (message.type() === "error") stackedErrors.push(message.text());
  });
  await stackedPage.goto(targetUrl);
  await stackedPage.evaluate(() => Promise.all(Array.from(document.images, image => image.decode())));
  assert.equal(await stackedPage.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getLayoutProfile()), "stacked",
    "1050px resolves through the canonical stacked profile");
  assert.equal(await stackedPage.evaluate(() => document.documentElement.dataset.layoutProfile), "stacked",
    "stacked viewport exposes the canonical profile marker");
  assert.equal(await stackedPage.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getPresentationPolicy().scene.pip.activationByProfile.stacked), "manual",
    "stacked PiP activation is owned by the presentation policy");

  await stackedPage.evaluate(() => {
    const sentinel = document.getElementById("viewerPinSentinel");
    window.scrollTo(0, sentinel.getBoundingClientRect().top + window.scrollY + 180);
  });
  await stackedPage.waitForTimeout(80);
  assert.equal(await stackedPage.evaluate(() => document.body.classList.contains("is-mobile-scene-pinned")), false,
    "stacked manual PiP does not auto-open after the scene anchor is passed");

  const stackedLauncher = stackedPage.locator("#mobileSceneRepin");
  assert.equal(await stackedLauncher.isVisible(), true,
    "stacked manual PiP exposes the existing Fixar cena launcher while closed");
  await stackedLauncher.focus();
  await stackedLauncher.click();
  await stackedPage.waitForFunction(() =>
    document.body.classList.contains("is-mobile-scene-pinned")
    && document.activeElement?.id === "mobileScenePin"
  );
  assert.equal(await stackedPage.locator("#viewerCard").evaluate(element => getComputedStyle(element).position), "fixed",
    "stacked manual activation projects the existing viewer as fixed PiP");
  assert.equal(await stackedPage.locator("#mobileSceneTransparency").isVisible(), true,
    "stacked PiP reuses the transparency control");
  assert.equal(await stackedPage.locator("#mobileSceneResizeHandle").isVisible(), true,
    "stacked PiP reuses the resize handle");

  const stackedCard = stackedPage.locator("#viewerCard");
  const stackedWidthBefore = (await stackedCard.boundingBox()).width;
  await stackedPage.locator("#mobileSceneResize").click();
  await stackedPage.waitForTimeout(50);
  const stackedWidthAfter = (await stackedCard.boundingBox()).width;
  assert(stackedWidthAfter > stackedWidthBefore + 20,
    "stacked PiP reuses the existing size control");
  await stackedPage.locator("#mobileSceneTransparency").click();
  assert.equal(await stackedPage.evaluate(() => document.body.classList.contains("is-mobile-scene-transparent")), true,
    "stacked PiP reuses the transparency state");

  await stackedPage.locator('[data-select-scene-entity="module-03"]').click();
  await stackedPage.waitForFunction(() => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId === "module-03");
  assert.equal(await stackedPage.evaluate(() => document.body.classList.contains("is-mobile-scene-pinned")), true,
    "stacked PiP scene hotspots keep the PiP open");
  await stackedPage.locator("[data-close-module-detail]").click();
  await stackedPage.waitForFunction(() => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId === null);
  await stackedPage.locator("#mobileScenePin").focus();
  await stackedPage.locator("#mobileScenePin").click();
  await stackedPage.waitForFunction(() =>
    !document.body.classList.contains("is-mobile-scene-pinned")
    && !document.getElementById("mobileSceneRepin").hidden
    && document.activeElement?.id === "mobileSceneRepin"
  );

  await stackedLauncher.click();
  await stackedPage.waitForFunction(() =>
    document.body.classList.contains("is-mobile-scene-pinned")
    && document.activeElement?.id === "mobileScenePin"
  );
  await stackedPage.setViewportSize({ width: 390, height: 844 });
  await stackedPage.waitForFunction(() =>
    document.documentElement.dataset.layoutProfile === "compact"
    && document.body.classList.contains("is-mobile-scene-pinned")
  );
  await stackedPage.setViewportSize({ width: 1050, height: 900 });
  await stackedPage.waitForFunction(() =>
    document.documentElement.dataset.layoutProfile === "stacked"
    && document.body.classList.contains("is-mobile-scene-pinned")
  );
  await stackedPage.locator("#mobileScenePin").focus();
  await stackedPage.setViewportSize({ width: 1366, height: 900 });
  await stackedPage.waitForFunction(() =>
    document.documentElement.dataset.layoutProfile === "side-rail"
    && !document.body.classList.contains("is-mobile-scene-pinned")
    && document.activeElement?.matches?.(".flow-nav [data-step]")
  );
  await stackedPage.setViewportSize({ width: 1050, height: 900 });
  await stackedPage.waitForFunction(() =>
    document.documentElement.dataset.layoutProfile === "stacked"
    && !document.body.classList.contains("is-mobile-scene-pinned")
    && !document.getElementById("mobileSceneRepin").hidden
  );
  await stackedPage.screenshot({ path: path.join(output, "stacked-pip.png"), fullPage: true, animations: "disabled" });
  assert.deepEqual(stackedErrors, []);
  await stackedContext.close();

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

  await page.goto(targetUrl);
  await page.evaluate(() => Promise.all(Array.from(document.images, image => image.decode())));
  assert.equal(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getLayoutProfile()), "compact",
    "mobile viewport resolves through the canonical compact profile");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.layoutProfile), "compact",
    "mobile viewport exposes the compact profile marker");
  assert.equal(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getPresentationPolicy().scene.pip.activationByProfile.compact), "auto-after-anchor",
    "current compact PiP behavior is represented by the presentation policy");

  await page.evaluate(() => {
    const sentinel = document.getElementById("viewerPinSentinel");
    window.scrollTo(0, sentinel.getBoundingClientRect().top + window.scrollY + 180);
  });
  await page.waitForFunction(() => document.body.classList.contains("is-mobile-scene-pinned"));

  const transparency = page.locator("#mobileSceneTransparency");
  const transparencyBox = await transparency.boundingBox();
  assert(transparencyBox, "transparency control must be visible in pinned PiP");
  const hit = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return element?.id || element?.closest?.("button")?.id || null;
  }, { x: transparencyBox.x + transparencyBox.width / 2, y: transparencyBox.y + transparencyBox.height / 2 });
  assert.equal(hit, "mobileSceneTransparency", "PiP control must win hit-testing over scene hotspots");

  const beforeControlSelection = await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId);
  await transparency.tap();
  const afterControlSelection = await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId);
  assert.equal(afterControlSelection, beforeControlSelection, "PiP control must not select a module behind it");
  assert(await page.evaluate(() => document.body.classList.contains("is-mobile-scene-transparent")),
    "transparency control must still perform its own action");

  await page.locator('[data-select-scene-entity="module-03"]').tap();
  await page.waitForFunction(() => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId === "module-03");
  assert(await page.evaluate(() => document.body.classList.contains("is-mobile-scene-pinned")),
    "opening a module from the PiP must keep the PiP open");
  assert.equal(await page.locator('[data-stage-view-id="modules-list"]').isHidden(), true,
    "opening module detail from pinned compact PiP executes replace by hiding the primary list");
  assert.equal(await page.locator('[data-stage-view-id="modules-detail"]').isVisible(), true,
    "opening module detail from pinned compact PiP keeps the companion detail visible");
  await page.waitForFunction(() => document.activeElement?.matches?.("[data-close-module-detail]"));
  assert.equal(await page.locator("[data-close-module-detail]").evaluate((element) => element === document.activeElement), true,
    "pinned-scene detail opening focuses the visible close action");

  const card = page.locator("#viewerCard");
  const resize = page.locator("#mobileSceneResizeHandle");
  const beforeResize = await card.boundingBox();
  const resizeBox = await resize.boundingBox();
  assert(beforeResize && resizeBox, "PiP and bottom-left resize handle must be measurable");

  const client = await context.newCDPSession(page);
  const start = { x: resizeBox.x + resizeBox.width / 2, y: resizeBox.y + resizeBox.height / 2 };
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: start.x, y: start.y, radiusX: 2, radiusY: 2, force: 1 }]
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: start.x - 42, y: start.y, radiusX: 2, radiusY: 2, force: 1 }]
  });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(100);

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
  assert.equal(await stage.evaluate(element => getComputedStyle(element).touchAction), "pan-y",
    "carousel stage must reserve vertical panning while exposing horizontal pointer swipes");
  const swipeStart = { x: stageBox.x + stageBox.width * 0.78, y: stageBox.y + stageBox.height * 0.5 };
  const swipeEnd = { x: stageBox.x + stageBox.width * 0.22, y: swipeStart.y };
  await stage.evaluate((element, points) => {
    const pointerId = 41;
    const dispatch = (type, x, y, buttons) => element.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId,
      pointerType: "touch",
      isPrimary: true,
      clientX: x,
      clientY: y,
      button: 0,
      buttons
    }));
    dispatch("pointerdown", points.start.x, points.start.y, 1);
    dispatch("pointermove", (points.start.x + points.end.x) / 2, points.start.y, 1);
    dispatch("pointermove", points.end.x, points.end.y, 1);
    dispatch("pointerup", points.end.x, points.end.y, 0);
  }, { start: swipeStart, end: swipeEnd });
  await page.waitForFunction((previousIndex) => {
    const dot = document.querySelector(".module-detail__carousel-dot.is-active");
    return dot && Array.from(dot.parentElement.children).indexOf(dot) !== previousIndex;
  }, beforeSwipe, { timeout: 1500 });
  const afterSwipe = await activeIndex();
  assert.notEqual(afterSwipe, beforeSwipe, "horizontal touch swipe must change the module-detail carousel page");
  assert(await page.evaluate(() => document.body.classList.contains("is-mobile-scene-pinned")),
    "PiP must remain pinned after navigating the module detail");

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
    stacked: {
      manualActivation: true,
      noAnchorAutoOpen: true,
      supportedProfileRoundTrip: true,
      closesOnSideRail: true,
      widthBefore: stackedWidthBefore,
      widthAfter: stackedWidthAfter,
      pageErrors: stackedErrors
    },
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
