const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode().catch(() => null))));
  const assert = (value, message) => { if (!value) throw new Error(message); };

  // White is materially lighter, not merely a swatch change.
  await page.locator('[data-step="finishes"]').click();
  await page.locator('[data-finish-id="base-light"]').click();
  await page.waitForTimeout(150);
  const white = await page.locator(".finish-layer.is-texture").first().evaluate(el => ({
    color: getComputedStyle(el).backgroundColor,
    opacity: Number(getComputedStyle(el).opacity),
    filter: getComputedStyle(el).filter,
    image: getComputedStyle(el).backgroundImage
  }));
  assert(white.color === "rgb(250, 249, 246)", "base white color target mismatch");
  assert(Math.abs(white.opacity - 0.90) < 0.01, "base white opacity target mismatch");
  assert(white.filter.includes("brightness(1.05)"), "base white brightness gain missing");
  assert(white.image !== "none", "base white texture disappeared");

  // Upper module numbers must be placed below the hotspot and remain inside the viewer.
  await page.locator('[data-step="modules"]').click();
  const upperTag = await page.locator('[data-select-scene-entity="module-06"]').evaluate(hotspot => {
    const tag = hotspot.querySelector(".scene-hotspot__tag");
    const viewer = hotspot.closest(".viewer").getBoundingClientRect();
    const hr = hotspot.getBoundingClientRect();
    const tr = tag.getBoundingClientRect();
    return {
      below: tag.classList.contains("scene-hotspot__tag--below"),
      tagTop: tr.top, tagBottom: tr.bottom,
      hotspotBottom: hr.bottom,
      viewerTop: viewer.top, viewerBottom: viewer.bottom
    };
  });
  assert(upperTag.below, "module-06 tag was not moved below the upper hotspot");
  assert(upperTag.tagTop >= upperTag.hotspotBottom - 1, "upper tag is not geometrically below the hotspot");
  assert(upperTag.tagTop >= upperTag.viewerTop && upperTag.tagBottom <= upperTag.viewerBottom, "upper tag still clips outside viewer");

  const lowerTag = await page.locator('[data-select-scene-entity="module-03"]').evaluate(hotspot =>
    hotspot.querySelector(".scene-hotspot__tag").classList.contains("scene-hotspot__tag--below")
  );
  assert(!lowerTag, "lower module tag incorrectly uses the upper-module placement");

  // Seam-derived guide must exist and contain mixed topology for module 06.
  const guide = await page.evaluate(() => window.CASA_FRONT_GUIDES["module-06"]);
  assert(guide && guide.source === "finish-mask-components", "module-06 front guide missing");
  assert(guide.componentCount === 3, "module-06 guide component count mismatch");
  assert(guide.lines.some(line => Math.abs(line.x1-line.x2) < .001), "module-06 guide has no vertical seam");
  assert(guide.lines.some(line => Math.abs(line.y1-line.y2) < .001), "module-06 guide has no horizontal seam");

  // Open module 06 and the frontal drawing; guide lines must be the rendered geometry.
  await page.locator('[data-select-entity="module-06"]').click();
  const carousel = page.locator(".module-detail__carousel");
  await carousel.scrollIntoViewIfNeeded();
  const stage = carousel.locator(".module-detail__carousel-stage");
  const dots = carousel.locator(".module-detail__carousel-dots");
  await dots.locator("button").nth(1).click();
  await page.waitForTimeout(240);
  const drawing = await stage.evaluate((el, expected) => ({
    title: el.querySelector(".module-detail__carousel-page > h4")?.textContent,
    guideLines: el.querySelectorAll(".module-detail__view-guide-line").length,
    expected
  }), guide.lines.length);
  assert(drawing.title === "Vista frontal", "front view did not open");
  assert(drawing.guideLines === drawing.expected, "SVG does not render all seam-derived guide lines");

  // Desktop mouse drag survives pointer leaving the stage because of pointer capture.
  await dots.locator("button").nth(0).click();
  await page.waitForTimeout(240);
  const initialTitle = await stage.locator(".module-detail__carousel-page > h4").textContent();
  const box = await stage.boundingBox();
  assert(box && box.width > 100, "carousel stage missing desktop geometry");
  await page.mouse.move(box.x + box.width * .82, box.y + box.height * .50);
  await page.mouse.down();
  await page.mouse.move(box.x - 80, box.y + box.height * .52, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(260);
  const afterDrag = await stage.locator(".module-detail__carousel-page > h4").textContent();
  assert(afterDrag !== initialTitle, "desktop drag did not advance the carousel");

  // Desktop trackpad-style horizontal wheel is also recognized.
  const beforeWheel = afterDrag;
  await stage.dispatchEvent("wheel", { deltaX: 35, deltaY: 0, bubbles: true, cancelable: true });
  await stage.dispatchEvent("wheel", { deltaX: 35, deltaY: 0, bubbles: true, cancelable: true });
  await page.waitForTimeout(260);
  const afterWheel = await stage.locator(".module-detail__carousel-page > h4").textContent();
  assert(afterWheel !== beforeWheel, "horizontal desktop wheel/trackpad gesture did not advance carousel");

  await page.screenshot({ path: "/tmp/review/b10-b13-desktop.png", fullPage: true });
  if (errors.length) throw new Error("page errors: " + errors.join(" | "));
  fs.writeFileSync("/tmp/review/gate.json", JSON.stringify({
    pass: true, white, upperTag, guide, drawing, initialTitle, afterDrag, afterWheel
  }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
