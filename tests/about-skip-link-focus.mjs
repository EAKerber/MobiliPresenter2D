"use strict";
import assert from "node:assert/strict";
import { chromium } from "playwright";

async function main() {
  const base = process.env.PUBLIC_PAGES_URL;
  assert(base && /^https?:\/\//.test(base), "Set PUBLIC_PAGES_URL to the built public site");

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(new URL("/about/", base).href, { waitUntil: "domcontentloaded" });
    const skipLink = page.locator(".about-skip[href=\"#main\"]");
    await skipLink.waitFor();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.matches(".about-skip")), true,
      "the first keyboard stop must be the skip link");

    await page.keyboard.press("Enter");
    await page.waitForFunction(() =>
      location.hash === "#main" && document.activeElement?.matches("main#main"),
      null, { timeout: 3000 }
    );
    assert.equal(await page.locator("main#main").getAttribute("tabindex"), "-1",
      "the main landmark must be programmatically focusable without joining the Tab order");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
