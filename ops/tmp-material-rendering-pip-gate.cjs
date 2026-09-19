const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode().catch(() => null))));
  await page.waitForTimeout(700);

  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const sig = async (id, y=820, h=100) => page.$eval(id, (canvas,args) => {
    const data=canvas.getContext("2d").getImageData(0,args.y,canvas.width,args.h).data;
    let alpha=0,sum=0;
    for(let i=0;i<data.length;i+=4){
      if(data[i+3]) alpha++;
      sum=(sum+data[i]*3+data[i+1]*5+data[i+2]*7+data[i+3])>>>0;
    }
    return {alpha,sum};
  }, {y,h});

  const waitPlinth = () => page.waitForFunction(() => {
    const data=document.getElementById("plinthCanvas").getContext("2d").getImageData(450,840,800,80).data;
    for(let i=3;i<data.length;i+=4) if(data[i]) return true;
    return false;
  });

  await waitPlinth();
  const initial = await sig("#plinthCanvas");
  assert(initial.alpha > 0, "MDF plinth missing at initial state");

  await page.locator('[data-step="finishes"]').click();
  await page.locator('[data-stone-package-id="stone-light"]').click();
  await page.waitForTimeout(500);
  const offAfterStone = await sig("#plinthCanvas");
  assert(offAfterStone.sum === initial.sum, "stone choice leaked into plinth while skirting is OFF");

  await page.locator('[data-finish-id="tone-25-a"]').click();
  await page.waitForTimeout(500);
  const offAfterMdf = await sig("#plinthCanvas");
  assert(offAfterMdf.sum !== offAfterStone.sum, "MDF choice did not affect plinth while skirting is OFF");

  await page.locator("#stoneSkirtingToggle").check();
  await page.waitForTimeout(500);
  const onStoneLight = await sig("#plinthCanvas");
  assert(onStoneLight.sum !== offAfterMdf.sum, "skirting ON did not switch plinth to stone");

  await page.locator('[data-finish-id="tone-25-b"]').click();
  await page.waitForTimeout(500);
  const onAfterMdf = await sig("#plinthCanvas");
  assert(onAfterMdf.sum === onStoneLight.sum, "MDF choice leaked into plinth while skirting is ON");

  await page.locator('[data-stone-package-id="stone-dark"]').click();
  await page.waitForTimeout(500);
  const onStoneDark = await sig("#plinthCanvas");
  assert(onStoneDark.sum !== onAfterMdf.sum, "stone choice did not affect plinth while skirting is ON");

  await page.locator('[data-finish-id="base-light"]').click();
  await page.waitForTimeout(200);
  const finishStyle = await page.locator(".finish-layer.is-texture").first().evaluate(el => ({
    mix: getComputedStyle(el).mixBlendMode,
    backgroundBlend: getComputedStyle(el).backgroundBlendMode,
    opacity: Number(getComputedStyle(el).opacity)
  }));
  assert(finishStyle.mix === "normal", "MDF texture still uses cross-layer multiply");
  assert(finishStyle.backgroundBlend.includes("luminosity"), "MDF texture is not tonal/luminosity detail");
  assert(Math.abs(finishStyle.opacity - 0.84) < 0.02, "base white did not recover main opacity");

  const navState = await page.locator(".flow-nav").evaluate(nav => ({
    width: nav.getBoundingClientRect().width,
    steps: [...nav.querySelectorAll(".flow-step")].map(step => ({
      client: step.clientWidth,
      scroll: step.scrollWidth,
      compact: getComputedStyle(step.querySelector(".flow-step__label")).fontSize === "0px",
      title: step.title
    }))
  }));
  assert(navState.width < 500, "desktop control column did not reproduce narrow nav");
  assert(navState.steps.every(step => step.scroll <= step.client + 1), "desktop step text overflows");
  assert(navState.steps.every(step => step.compact), "narrow desktop nav did not compact labels");
  assert(navState.steps.some(step => step.title === "Acabamentos"), "full hover title missing");

  await page.screenshot({ path: "/tmp/review/desktop-materials-nav.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode().catch(() => null))));
  await page.evaluate(() => window.scrollTo(0, document.querySelector(".flow-nav").getBoundingClientRect().top + window.scrollY + 220));
  await page.waitForFunction(() => document.body.classList.contains("is-mobile-scene-pinned"));

  const pinnedControls = await page.evaluate(() => {
    const card=document.getElementById("viewerCard").getBoundingClientRect();
    const pin=document.getElementById("mobileScenePin").getBoundingClientRect();
    const opacity=document.getElementById("mobileSceneOpacity").getBoundingClientRect();
    return {
      pinInside: pin.left >= card.left && pin.right <= card.right && pin.top >= card.top && pin.bottom <= card.bottom,
      opacityInside: opacity.left >= card.left && opacity.right <= card.right && opacity.top >= card.top && opacity.bottom <= card.bottom,
      opacityDisplay: getComputedStyle(document.getElementById("mobileSceneOpacity")).display
    };
  });
  assert(pinnedControls.pinInside && pinnedControls.opacityInside, "PiP controls are not affiliated with viewerCard");
  assert(pinnedControls.opacityDisplay !== "none", "opacity control hidden while pinned");

  await page.locator('[data-select-scene-entity="module-03"]').click({ force: true });
  await page.waitForFunction(() => document.querySelector("#moduleDetail h3")?.textContent?.includes("Inferior da pia"));
  assert(await page.evaluate(() => document.body.classList.contains("is-mobile-scene-pinned")), "module click dropped PiP");

  await page.evaluate(() => {
    const root=document.documentElement.style;
    root.setProperty("--mobile-pip-left","900px");
    root.setProperty("--mobile-pip-top","900px");
    root.setProperty("--mobile-pip-right","auto");
    root.setProperty("--mobile-pip-width","500px");
    document.getElementById("viewerCard").dataset.pipPositioned="true";
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.waitForTimeout(350);
  const clamped = await page.locator("#viewerCard").evaluate(card => {
    const r=card.getBoundingClientRect();
    return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width};
  });
  assert(clamped.left >= 7 && clamped.right <= 313, "PiP horizontal geometry not clamped");
  assert(clamped.top >= 7 && clamped.bottom <= 693, "PiP vertical geometry not clamped");

  await page.locator("#mobileScenePin").click();
  await page.evaluate(() => window.scrollTo(0,0));
  await page.waitForTimeout(250);
  const normalControls = await page.evaluate(() => {
    const card=document.getElementById("viewerCard").getBoundingClientRect();
    const pin=document.getElementById("mobileScenePin").getBoundingClientRect();
    return {
      pinned: document.body.classList.contains("is-mobile-scene-pinned"),
      cardPosition: getComputedStyle(document.getElementById("viewerCard")).position,
      opacityDisplay: getComputedStyle(document.getElementById("mobileSceneOpacity")).display,
      pinInside: pin.left >= card.left && pin.right <= card.right && pin.top >= card.top && pin.bottom <= card.bottom
    };
  });
  assert(!normalControls.pinned, "pin disable did not return normal viewer");
  assert(normalControls.cardPosition === "relative", "normal mobile viewer is not the controls containing block");
  assert(normalControls.opacityDisplay === "none", "opacity control remains active outside PiP");
  assert(normalControls.pinInside, "pin control escapes normal viewer card");

  const mobileOverflow = await page.locator(".flow-nav").evaluate(nav =>
    [...nav.querySelectorAll(".flow-step")].every(step => step.scrollWidth <= step.clientWidth + 1)
  );
  assert(mobileOverflow, "mobile step text overflows");

  await page.screenshot({ path: "/tmp/review/mobile-pip-normal.png", fullPage: true });
  if (errors.length) throw new Error("page errors: "+errors.join(" | "));

  fs.writeFileSync("/tmp/review/gate.json", JSON.stringify({
    pass:true, initial, offAfterStone, offAfterMdf, onStoneLight, onAfterMdf, onStoneDark,
    finishStyle, navState, pinnedControls, clamped, normalControls
  }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
