import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const base = "http://127.0.0.1:8123/";
const scenarios = [
  { engine:"chromium",browserType:chromium,width:390 },
  { engine:"webkit",browserType:webkit,width:390 },
  { engine:"webkit",browserType:webkit,width:1366 }
];

async function assertLanding(page,engine,width) {
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  const response=await page.goto(base,{waitUntil:"networkidle",timeout:30000});
  assert.equal(response?.status(),200,"local Landing must serve 200");
  await page.locator("#benefits > .benefit-item").first().waitFor();
  assert.equal(await page.locator("#benefits > .benefit-item").count(),4);
  assert.equal(await page.locator("#miniBenefits > .mini-benefit").count(),3);
  assert.equal(await page.locator("#environmentTrack .environment").count(),5);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),"light");
  assert.deepEqual(errors,[],"no uncaught script errors");

  // Kitchen action must remain available after selecting the first environment.
  const kitchen=page.locator('[data-environment-id="cozinha"]');
  await kitchen.click();
  await page.waitForFunction(()=>document.querySelector("#featureAction")?.getAttribute("href")==="/viewer/");
  assert.equal(await kitchen.getAttribute("aria-pressed"),"true");
  const actions=await page.locator("#featureAction").count();assert.equal(actions,1);

  // Navigation should remain functional with the same menu toggle.
  const menu=page.locator("#menuToggle");
  await menu.click();
  assert.equal(await menu.getAttribute("aria-expanded"),"true");
  await menu.click();
  assert.equal(await menu.getAttribute("aria-expanded"),"false");
  assert.deepEqual(errors,[],"no exceptions during interactions");
  console.log("LANDING_INTERACTION_PASS "+JSON.stringify({engine,width,benefits:4,miniBenefits:3,environments:5,menu:true,kitchen:true,errors:0}));
}

for (const scenario of scenarios) {
  const browser=await scenario.browserType.launch({headless:true});
  try {
    const context=await browser.newContext({
      viewport:{width:scenario.width,height:844},colorScheme:"light",
      reducedMotion:"reduce",locale:"pt-BR",serviceWorkers:"block"
    });
    await context.addInitScript(()=>{
      localStorage.setItem("casa-ui-theme-mode-v1","light");
    });
    const page=await context.newPage();
    await assertLanding(page,scenario.engine,scenario.width);
    await context.close();
  } finally { await browser.close(); }
}

// Failure-injection smoke: no silent substitute content and no crash of independent widgets.
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:"reduce"});
  const exceptions=[];page.on("pageerror",e=>exceptions.push(e.message));
  await page.route("**/landing/benefit-strip.js?*",route=>route.abort("failed"));
  const response=await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
  assert.equal(response?.status(),200);
  await page.waitForSelector("#benefits[role=status]",{timeout:8000});
  assert.match(await page.locator("#benefits").textContent(),/Benefícios temporariamente indisponíveis/);
  assert.equal(await page.locator("#benefits > .benefit-item").count(),0);
  assert.equal(await page.locator("#miniBenefits > .mini-benefit").count(),3);
  assert.equal(await page.locator("#environmentTrack .environment").count(),5);
  assert.equal(exceptions.length,0,"isolated component script failure must not crash page renderer");
  await page.locator('[data-environment-id="cozinha"]').click();
  await page.waitForFunction(()=>document.querySelector("#featureAction")?.getAttribute("href")==="/viewer/");
  console.log("LANDING_COMPONENT_FAILURE_ISOLATED "+JSON.stringify({benefitsFallback:0,miniBenefits:3,environments:5,uncaughtExceptions:0,kitchenStillFunctional:true}));
} finally { await browser.close(); }
