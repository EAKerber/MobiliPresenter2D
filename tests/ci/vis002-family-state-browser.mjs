// VIS-002C family: formerly untested availability state and stable hero visibility.
// Localhost only, no mutations to source and no CSS injection.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {chromium,webkit}=require("playwright");
const origin=process.env.PUBLIC_AUDIT_ORIGIN||"http://127.0.0.1:8123";
let cases=0;
for(const [engineName,engine] of [["chromium",chromium],["webkit",webkit]]){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [390,1366])for(const theme of ["light","dark"]){
   const label=[engineName,width,theme].join("|");
   const ctx=await browser.newContext({viewport:{width,height:900},colorScheme:theme,reducedMotion:"reduce",serviceWorkers:"block"});
   await ctx.route("**/*",async req=>{
    const u=new URL(req.request().url());
    if(u.protocol==="data:"||(u.hostname==="127.0.0.1"&&u.port==="8123"))await req.continue();
    else await req.abort("blockedbyclient");
   });
   await ctx.addInitScript(mode=>{try{localStorage.setItem("casa-ui-theme-mode-v1",mode)}catch{}},theme);
   const page=await ctx.newPage();
   try{
    const res=await page.goto(origin+"/",{waitUntil:"domcontentloaded",timeout:20000});
    assert.equal(res?.status(),200,label+" HTTP");
    await page.waitForFunction(t=>document.documentElement.dataset.theme===t,theme,{timeout:10000});
    await page.locator(".hero-description").waitFor({state:"visible",timeout:12000});
    await page.locator("#environmentFeature").waitFor({state:"visible",timeout:16000});
    await page.locator("#featureDescription").waitFor({state:"visible",timeout:16000});
    await page.evaluate(async()=>await document.fonts.ready);
    const hero=await page.locator(".hero-description").evaluate(el=>{
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      return {visible:r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden",color:s.color,token:s.getPropertyValue("--ds-vis002c-long-copy-light").trim()};
    });
    assert.equal(hero.visible,true,label+" hero text not visible after settle");
    if(theme==="light"){
      assert.equal(hero.color,"rgb(41, 39, 35)",label+" hero color");
      assert.equal(hero.token,"#292723",label+" scoped token");
    }else assert.equal(hero.token,"",label+" light token leaked to dark");
    assert.equal(await page.locator("#featureAction").isVisible(),true,label+" initial CTA");
    assert.equal(await page.locator("#featureAvailability").isVisible(),false,label+" initial availability should be hidden");
    await page.locator('[data-environment-id="sala"]').click();
    await page.waitForFunction(()=>document.querySelector("#featureTitle")?.textContent==="Sala"
      &&!document.querySelector("#environmentFeature")?.hasAttribute("aria-busy"),null,{timeout:12000});
    assert.equal(await page.locator("#featureAvailability").isVisible(),true,label+" unavailable environment notice missing");
    assert.equal(await page.locator("#featureAction").isVisible(),false,label+" unavailable environment has CTA");
    const notice=await page.locator("#featureAvailability").evaluate(el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return {visible:r.width>0&&r.height>0&&s.visibility!=="hidden",token:s.getPropertyValue("--ds-vis002c-long-copy-light").trim(),color:s.color};
    });
    assert.equal(notice.visible,true,label+" unavailable notice not rendered");
    assert.equal(notice.token,"",label+" long-copy token leaked into availability notice");
    await page.locator('[data-environment-id="cozinha"]').click();
    await page.waitForFunction(()=>document.querySelector("#featureTitle")?.textContent==="Cozinha"
      &&!document.querySelector("#environmentFeature")?.hasAttribute("aria-busy"),null,{timeout:12000});
    assert.equal(await page.locator("#featureAction").isVisible(),true,label+" restored CTA");
    assert.equal(await page.locator("#featureAvailability").isVisible(),false,label+" availability did not re-hide");
    cases++;
    console.log("VIS002_FAMILY_AVAILABILITY_PASS "+JSON.stringify({engineName,width,theme,noticeColor:notice.color}));
   }finally{await ctx.close()}
  }
 }finally{await browser.close()}
}
assert.equal(cases,8);
console.log("VIS002_FAMILY_STATE_COMPLETE "+JSON.stringify({cases,contexts:5,sources:5}));
