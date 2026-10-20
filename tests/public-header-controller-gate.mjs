import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const BASELINE="http://127.0.0.1:8124";
const CANDIDATE="http://127.0.0.1:8123";
const routes=["/","/about/","/how-it-works/"];
const widths=[390,1366];
const themes=["light","dark"];
const output="artifacts/public-nav";
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
function asErrorMessages(messages){return messages.slice(0,8).map(x=>x.slice(0,200));}
async function snapshot(origin,route,width,theme){
  const context=await browser.newContext({viewport:{width,height:844},colorScheme:theme,
    reducedMotion:"reduce",locale:"pt-BR",serviceWorkers:"block",deviceScaleFactor:1});
  await context.addInitScript(mode=>{localStorage.setItem("casa-ui-theme-mode-v1",mode);},theme);
  const page=await context.newPage(), errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  page.on("response",res=>{if(res.status()>=400&&new URL(res.url()).origin===origin)
    errors.push("http-"+res.status()+" "+new URL(res.url()).pathname);});
  const res=await page.goto(origin+route,{waitUntil:"networkidle",timeout:30000});
  assert.equal(res?.status(),200);
  await page.evaluate(async()=>{await document.fonts?.ready;});
  const common=async()=>page.evaluate(()=>{
    const header=document.querySelector(".site-header"),nav=document.querySelector("#primaryNav"),button=document.querySelector("#menuToggle");
    const computed=el=>{
      const css=getComputedStyle(el),r=el.getBoundingClientRect();
      return {
        display:css.display,position:css.position,color:css.color,backgroundColor:css.backgroundColor,
        fontSize:css.fontSize,opacity:css.opacity,zIndex:css.zIndex,
        rect:[r.x,r.y,r.width,r.height].map(v=>Math.round(v*100)/100)
      };
    };
    return {html:header.outerHTML,header:computed(header),nav:computed(nav),button:computed(button),
      theme:document.documentElement.dataset.theme,
      expanded:button.getAttribute("aria-expanded"),menuOpen:document.body.classList.contains("menu-open"),
      currentLinks:[...nav.querySelectorAll("a[aria-current=page]")].map(a=>a.getAttribute("href")),
      menuScriptCount:[...document.scripts].filter(s=>s.src.includes("header-menu.js")).length
    };
  });
  const initial=await common();
  assert.equal(initial.theme,theme);
  const image0=await page.locator(".site-header").screenshot({animations:"disabled"});
  let opened=null,image1=null;
  if(width===390){
    const toggle=page.locator("#menuToggle");
    assert.equal(await toggle.isVisible(),true);
    await toggle.click();
    await page.waitForTimeout(260);
    opened=await common();
    assert.equal(opened.expanded,"true");
    assert.equal(opened.menuOpen,true);
    image1=await page.screenshot({animations:"disabled",clip:{x:0,y:0,width,height:300}});
  } else {
    assert.equal(await page.locator("#menuToggle").isVisible(),false);
    assert.equal(await page.locator("#primaryNav").isVisible(),true);
  }
  const result={initial,opened,image0,image1,errors:asErrorMessages(errors)};
  await context.close();
  return result;
}
try {
  for(const route of routes)for(const width of widths)for(const theme of themes){
    const before=await snapshot(BASELINE,route,width,theme);
    const after=await snapshot(CANDIDATE,route,width,theme);
    assert.deepEqual(before.errors,[],route+" baseline script errors");
    assert.deepEqual(after.errors,[],route+" candidate script errors");
    const {menuScriptCount:oldCount,...beforeInitial}=before.initial;
    const {menuScriptCount:newCount,...afterInitial}=after.initial;
    assert.deepEqual(afterInitial,beforeInitial,"initial DOM/theme/CSS/geometry changed in "+route+"/"+width+"/"+theme);
    assert.equal(after.image0.equals(before.image0),true,"header closed pixels changed: "+route+"/"+width+"/"+theme);
    if(width===390){
      const {menuScriptCount:_old,...oldOpen}=before.opened;
      const {menuScriptCount:_new,...newOpen}=after.opened;
      assert.deepEqual(newOpen,oldOpen,"open nav DOM/theme/CSS/geometry changed in "+route+"/"+theme);
      assert.equal(after.image1.equals(before.image1),true,"open menu pixels changed: "+route+"/"+theme);
    }
    assert.equal(newCount,1,"exactly one shared menu controller script");
    results.push({route,width,theme,initialAndOpenEqual:true,pixelsEqual:true,errors:0,
      sourceMenuScripts:{baseline:oldCount,candidate:newCount}});
    console.log("P4_NAV_VISUAL_EQUIVALENCE "+JSON.stringify(results.at(-1)));
  }
}finally{await browser.close();}

async function exercise(engine,route,width) {
  const instance=await engine.launch({headless:true});
  try {
    const context=await instance.newContext({viewport:{width,height:844},colorScheme:"light",
      reducedMotion:"reduce",locale:"pt-BR",serviceWorkers:"block"});
    const page=await context.newPage(),errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    const response=await page.goto(CANDIDATE+route,{waitUntil:"networkidle",timeout:30000});
    assert.equal(response?.status(),200);
    assert.equal(await page.locator("script[src*='header-menu.js']").count(),1);
    if(width===390){
      const toggle=page.locator("#menuToggle");
      await toggle.focus();
      await page.keyboard.press("Enter");
      assert.equal(await toggle.getAttribute("aria-expanded"),"true","keyboard activation");
      assert.equal(await page.locator("body").evaluate(el=>el.classList.contains("menu-open")),true);
      await page.keyboard.press("Escape");
      assert.equal(await toggle.getAttribute("aria-expanded"),"false","Escape closes");
      await toggle.click();
      assert.equal(await toggle.getAttribute("aria-expanded"),"true");
      await page.locator("body").dispatchEvent("pointerdown");
      assert.equal(await toggle.getAttribute("aria-expanded"),"false","outside pointer closes");
      await toggle.click();
      assert.equal(await toggle.getAttribute("aria-expanded"),"true");
      const firstLink=page.locator("#primaryNav a").first();
      await firstLink.evaluate(el=>el.addEventListener("click",event=>event.preventDefault(),{once:true}));
      await firstLink.click();
      assert.equal(await toggle.getAttribute("aria-expanded"),"false","link closes");
      await toggle.click();
      assert.equal(await toggle.getAttribute("aria-expanded"),"true","no double listener");
      await toggle.click();
      assert.equal(await toggle.getAttribute("aria-expanded"),"false");
    } else {
      assert.equal(await page.locator("#menuToggle").isVisible(),false);
      assert.equal(await page.locator("#primaryNav").isVisible(),true);
    }
    if(route==="/"){
      assert.equal(await page.locator("#environmentTrack .environment").count(),5);
      assert.equal(await page.locator("#miniBenefits .mini-benefit").count(),3);
      assert.equal(await page.locator("#benefits .benefit-item").count(),4);
      await page.locator('[data-environment-id="cozinha"]').click();
      await page.waitForFunction(()=>document.querySelector("#featureAction")?.getAttribute("href")==="/viewer/");
    }
    if(route==="/how-it-works/"){
      // Other interactive panels must still initialize.
      assert.equal(await page.locator("main").count(),1);
    }
    assert.deepEqual(errors,[]);
    console.log("P4_NAV_FUNCTIONAL "+JSON.stringify({engine:engine.name(),route,width,passed:true,errors:0}));
    await context.close();
  }finally{await instance.close();}
}
for(const item of [
  {engine:chromium,width:390},{engine:chromium,width:1366},
  {engine:webkit,width:390},{engine:webkit,width:1366}
])for(const route of routes)await exercise(item.engine,route,item.width);

const report={schema:"P4PublicNavDifferential0.1",at:new Date().toISOString(),
  scope:"Local product main baseline versus isolated candidate; no auth or deployment.",
  visualMatrix:results,
  conclusion:"PASS only if script exits successfully; Landing gains Escape/outside-click behavior intentionally."
};
await writeFile(output+"/report.json",JSON.stringify(report,null,2)+"\n");
console.log("P4_NAV_GATE_PASS "+JSON.stringify({visual:results.length,functional:12}));
