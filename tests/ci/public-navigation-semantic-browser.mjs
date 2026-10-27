// Semantic, localhost-only public navigation test.
// Derived from P-COMP-01 behavioral goals without differential snapshots.
// No production request, browser auth, grant, external script, or Netlify deploy.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {chromium,webkit}=require("playwright");

const BASE=process.env.M2D_PUBLIC_LOOPBACK_URL || "http://127.0.0.1:8123";
const ROUTES=[
  {path:"/",active:"/#ambientes",kind:"primary"},
  {path:"/about/",active:"/about/",kind:"primary"},
  {path:"/how-it-works/",active:"/how-it-works/",kind:"primary"},
  {path:"/viewer/",active:null,kind:"viewer"}
];
const WIDTHS=[390,768,1366],THEMES=["light","dark"];
const ENGINES=[["chromium",chromium],["webkit",webkit]];
let passed=0;

for(const [engineName,engine] of ENGINES){
  const browser=await engine.launch({headless:true});
  try{
    for(const {path,active,kind} of ROUTES){
      for(const width of WIDTHS)for(const theme of THEMES){
        const id=[engineName,path,width,theme].join("|");
        const context=await browser.newContext({viewport:{width,height:844},
          reducedMotion:"reduce",locale:"pt-BR",serviceWorkers:"block"});
        // Keep all network traffic on the localhost static fixture.
        await context.route("**/*",async route=>{
          const url=new URL(route.request().url());
          if(url.protocol==="data:" || (url.hostname==="127.0.0.1" && url.port==="8123"))
            await route.continue();
          else await route.abort("blockedbyclient");
        });
        await context.addInitScript(mode=>{
          try { localStorage.setItem("casa-ui-theme-mode-v1",mode); }
          catch { /* Sandboxed third-party iframe has no storage origin. */ }
        },theme);
        const page=await context.newPage(),errors=[];
        page.on("pageerror",e=>errors.push(String(e.message).slice(0,250)));
        try{
          const res=await page.goto(BASE+path,{waitUntil:"domcontentloaded",timeout:25000});
          assert.equal(res?.status(),200,id+" route must load");
          await page.locator("[data-ui-theme-toggle]").first().waitFor({timeout:14000});
          const toggle=page.locator("#menuToggle"),nav=page.locator("#primaryNav");
          assert.equal(await toggle.count(),1,id+" one toggle");
          assert.equal(await nav.count(),1,id+" one shared nav");
          assert.equal(await page.locator('script[src*="/landing/header-menu.js"]').count(),1,
            id+" exactly one controller");
          assert.equal(await toggle.getAttribute("aria-expanded"),"false",
            id+" initially closed");
          assert.equal(await toggle.getAttribute("aria-controls"),"primaryNav");
          assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),
            theme,id+" theme");
          assert.deepEqual(await nav.locator("[aria-current='page']").evaluateAll(
            elements=>elements.map(e=>{const u=new URL(e.getAttribute("href"),document.baseURI);return u.pathname+u.hash;})),active?[active]:[],
            id+" active nav must match route (Viewer has none)");
          if(kind==="primary"){
            assert.equal(await page.locator(".site-header").count(),1);
            assert.equal(await page.locator(".viewer-header").count(),0);
          }else{
            assert.equal(await page.locator(".site-header").count(),0);
            assert.equal(await page.locator(".viewer-header").count(),1);
            assert.equal(await page.locator(".viewer-header__actions > .back-link + [data-ui-theme-toggle]").count(),1,
              id+" Viewer Ambientes precedes theme");
            assert.equal(await page.locator(".viewer-header__actions > [data-ui-theme-toggle] + #menuToggle").count(),1,
              id+" Viewer theme precedes menu");
          }
          if(await toggle.isVisible()){
            await toggle.focus();
            await page.keyboard.press("Enter");
            assert.equal(await toggle.getAttribute("aria-expanded"),"true",
              id+" Enter must open");
            assert.equal(await nav.isVisible(),true,id+" opened nav must be visible");
            assert.equal(await page.evaluate(()=>document.activeElement===
              document.querySelector("#primaryNav a[href]")),true,
              id+" keyboard activation focuses first link");
            await page.keyboard.press("Escape");
            assert.equal(await toggle.getAttribute("aria-expanded"),"false",
              id+" Escape closes");
            assert.equal(await toggle.evaluate(e=>document.activeElement===e),true,
              id+" Escape returns focus");
            await toggle.click();
            assert.equal(await toggle.getAttribute("aria-expanded"),"true",
              id+" pointer opens");
            await page.locator("main").first().dispatchEvent("pointerdown");
            assert.equal(await toggle.getAttribute("aria-expanded"),"false",
              id+" pointer outside closes");
            await toggle.click();
            const first=nav.locator("a[href]").first();
            await first.evaluate(e=>e.addEventListener("click",ev=>ev.preventDefault(),{once:true}));
            await first.click();
            assert.equal(await toggle.getAttribute("aria-expanded"),"false",
              id+" link closes without navigation");
            await toggle.click();
            assert.equal(await toggle.getAttribute("aria-expanded"),"true",
              id+" one controller, not double-initialized");
            await toggle.click();
            assert.equal(await toggle.getAttribute("aria-expanded"),"false",
              id+" pointer closes again");
          }else{
            assert.equal(kind,"primary",id+" Viewer menu must be exposed at every width");
            assert.equal(await nav.isVisible(),true,id+" desktop nav");
          }
          if(path==="/about/"){
            assert.equal(await page.locator('a.about-skip[href="#main"]').count(),1,
              id+" skip link");
            assert.equal(await page.locator("#main").count(),1,id+" skip target");
          }
          if(path==="/how-it-works/"){
            const cards=page.locator("[data-economy]");
            assert.equal(await cards.count(),6,id+" six economy subjects");
            await cards.first().click();
            assert.equal(await page.locator("#economyDetail").isVisible(),true,
              id+" one details panel opens");
            assert.deepEqual(await cards.evaluateAll(items=>items.slice(0,2).map(
              e=>e.getAttribute("aria-expanded"))),["true","false"],
              id+" only selected card is expanded");
            await cards.nth(1).click();
            assert.deepEqual(await cards.evaluateAll(items=>items.slice(0,2).map(
              e=>e.getAttribute("aria-expanded"))),["false","true"],
              id+" selecting another card collapses previous");
          }
          assert.deepEqual(errors,[],id+" no uncaught public script errors");
          passed++;
          console.log("M2D_PUBLIC_NAV_SEMANTIC_PASS "+JSON.stringify({engineName,path,width,theme}));
        }catch(error){
          console.error("M2D_PUBLIC_NAV_SEMANTIC_FAIL "+JSON.stringify({
            id,message:String(error?.message||error).slice(0,1800),errors
          }));
          throw error;
        }finally{
          await context.close();
        }
      }
    }
  }finally{await browser.close();}
}
assert.equal(passed,ENGINES.length*ROUTES.length*WIDTHS.length*THEMES.length);
console.log("M2D_PUBLIC_NAV_SEMANTIC_COMPLETE "+JSON.stringify({
  passed,engines:ENGINES.length,routes:ROUTES.length,widths:WIDTHS.length,themes:THEMES.length,
  scope:"static localhost; generated public headers vs independently authored Viewer"
}));
