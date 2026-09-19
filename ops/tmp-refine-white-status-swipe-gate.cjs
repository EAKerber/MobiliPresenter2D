const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  const assert = (value, message) => { if (!value) throw new Error(message); };

  const status = await page.locator(".layer-status").evaluate(el => {
    const strong = el.querySelector("#visibleCount").getBoundingClientRect();
    const total = el.querySelector("#totalCount").getBoundingClientRect();
    return {
      emptyDecorative: el.querySelector(':scope > span[aria-hidden="true"]') !== null,
      visibleText: el.textContent.replace(/\s+/g, " ").trim(),
      visibleTop: strong.top,
      totalTop: total.top,
      visibleBottom: strong.bottom,
      totalBottom: total.bottom,
      totalWidth: total.width,
      totalHeight: total.height
    };
  });
  assert(!status.emptyDecorative, "decorative status dot still present");
  assert(status.visibleText.includes("8 de 8 itens incluídos"), "footer count copy changed unexpectedly");
  assert(Math.abs(status.visibleTop - status.totalTop) <= 2 || Math.abs(status.visibleBottom - status.totalBottom) <= 2, "footer counts are vertically misaligned");
  assert(status.totalWidth > 5 && status.totalHeight > 8, "totalCount is still dot-sized");

  await page.locator('[data-step="finishes"]').click();
  await page.locator('[data-finish-id="base-light"]').click();
  await page.waitForTimeout(120);
  const base = await page.locator(".finish-layer.is-texture").first().evaluate(el => ({
    background: getComputedStyle(el).backgroundColor,
    image: getComputedStyle(el).backgroundImage
  }));
  assert(base.background === "rgb(246, 245, 242)", "base white color did not move to intended lighter neutral");
  assert(base.image !== "none", "base white lost its texture");

  await page.locator('[data-step="modules"]').click();
  await page.locator("[data-select-entity]").first().click();
  const carousel = page.locator(".module-detail__carousel");
  await carousel.scrollIntoViewIfNeeded();
  const stage = carousel.locator(".module-detail__carousel-stage");
  const dots = carousel.locator(".module-detail__carousel-dots");
  const dotCount = await dots.locator("button").count();
  assert(dotCount >= 4, "visualization pager unexpectedly small");

  const pager = await dots.evaluate(el => {
    const r = el.getBoundingClientRect();
    const parent = el.closest(".module-detail__carousel").getBoundingClientRect();
    return {
      role: el.getAttribute("role"),
      left: r.left,
      right: r.right,
      parentLeft: parent.left,
      parentRight: parent.right
    };
  });
  assert(pager.role === "tablist", "visualization dots are not a tablist");
  assert(pager.left >= pager.parentLeft - 1 && pager.right <= pager.parentRight + 1, "visualization pager escapes carousel");

  const initialTitle = await stage.locator(".module-detail__carousel-page > h4").textContent();
  const box = await stage.boundingBox();
  assert(box && box.width > 100, "carousel stage has no swipeable geometry");

  await page.mouse.move(box.x + box.width * 0.80, box.y + box.height * 0.50);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.20, box.y + box.height * 0.52, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(260);
  const afterLeft = await stage.locator(".module-detail__carousel-page > h4").textContent();
  assert(afterLeft !== initialTitle, "left swipe did not advance visualization");
  assert(await dots.locator('button[aria-selected="true"]').count() === 1, "pager active state invalid after left swipe");

  const box2 = await stage.boundingBox();
  await page.mouse.move(box2.x + box2.width * 0.20, box2.y + box2.height * 0.50);
  await page.mouse.down();
  await page.mouse.move(box2.x + box2.width * 0.80, box2.y + box2.height * 0.49, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(260);
  const afterRight = await stage.locator(".module-detail__carousel-page > h4").textContent();
  assert(afterRight === initialTitle, "right swipe did not return to previous visualization");

  await page.screenshot({ path: "/tmp/review/refined-mobile-detail.png", fullPage: true });
  if (errors.length) throw new Error(errors.join(" | "));
  fs.writeFileSync("/tmp/review/gate.json", JSON.stringify({ pass: true, status, base, pager, dotCount, initialTitle, afterLeft, afterRight }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
