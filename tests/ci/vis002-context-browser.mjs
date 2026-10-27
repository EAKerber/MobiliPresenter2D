// VIS-002C v0.3: read-only presentation audit on the three approved routes.
// Checks computed text, light-only scope, visible copies, and keyboard focus.
// No CSS mutation, no external hosts, no Netlify deployment or auth.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {chromium,webkit}=require("playwright");
const m=JSON.parse(await readFile(
  new URL("../../design-system/pins/vis-002/context-v0.3.0/contextual-mapping.json",import.meta.url),"utf8"));
assert.equal(m.version,"0.3.0");
const ORIGIN=process.env.M2D_VIS002_LOOPBACK_ORIGIN||"http://127.0.0.1:8123";
const routes=["/","/about/","/how-it-works/"],widths=[390,1366],themes=["light","dark"];
let scenarios=0,lightContexts=0,darkAbsent=0;
for(const [engineName,engine] of [["chromium",chromium],["webkit",webkit]]){
 const browser=await engine.launch({headless:true});
 try{
  for(const route of routes)for(const width of widths)for(const theme of themes){
   const label=engineName+"|"+route+"|"+width+"|"+theme;
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:"reduce",
     colorScheme:theme,serviceWorkers:"block",locale:"pt-BR"});
   await context.route("**/*",async request=>{
     const url=new URL(request.request().url());
     if(url.protocol==="data:"||(url.hostname==="127.0.0.1"&&url.port==="8123"))
       await request.continue();else await request.abort("blockedbyclient");
   });
   await context.addInitScript(mode=>{
     try{localStorage.setItem("casa-ui-theme-mode-v1",mode)}
     catch{/* external sandboxed frames do not own local storage */}
   },theme);
   const page=await context.newPage();
   try{
    const response=await page.goto(ORIGIN+route,{waitUntil:"domcontentloaded",timeout:20000});
    assert.equal(response?.status(),200,label+" HTTP");
    await page.waitForFunction(expected=>
      document.documentElement.dataset.theme===expected,theme,{timeout:12000});
    if(route==="/"){
      await page.locator("#featureDescription").waitFor({state:"visible",timeout:15000});
    }
    await page.evaluate(()=>document.fonts?.ready);
    const entries=m.contexts.filter(x=>x.route===route);
    for(const entry of entries){
      const candidates=page.locator(entry.selector);
      assert.ok(await candidates.count()>0,label+" unmapped selector "+entry.selector);
      const observations=await candidates.evaluateAll(nodes=>nodes.map(el=>{
        const css=getComputedStyle(el),r=el.getBoundingClientRect();
        return {
          visible:r.width>0&&r.height>0&&css.display!=="none"&&css.visibility!=="hidden"&&css.opacity!=="0",
          foreground:css.color,
          scopedToken:css.getPropertyValue("--ds-vis002c-long-copy-light").trim(),
          text:(el.textContent||"").trim().length
        };
      }));
      const visible=observations.filter(x=>x.visible);
      assert.ok(visible.length>0,label+" no visible "+entry.selector);
      for(const obs of visible){
        assert.ok(obs.text>0,label+" empty text "+entry.selector);
        if(theme==="light"){
          assert.equal(obs.foreground,"rgb(41, 39, 35)",label+" incorrect approved light foreground "+entry.selector);
          assert.equal(obs.scopedToken,"#292723",label+" wrong effective scoped custom property");
          lightContexts++;
        }else{
          assert.equal(obs.scopedToken,"",label+" light-only token leaked into dark DOM");
          darkAbsent++;
        }
      }
    }
    if(route==="/about/"){
      const skip=page.locator(".about-skip");
      await skip.focus();
      assert.equal(await skip.evaluate(el=>document.activeElement===el),true,label+" skip keyboard focus");
      assert.equal(await skip.evaluate(el=>{
        const css=getComputedStyle(el);return css.transform!=="none"&&css.visibility!=="hidden";
      }),true,label+" accessible skip focus");
    }
    scenarios++;
    console.log("M2D_VIS002_CONTEXT_PASS "+JSON.stringify({engineName,route,width,theme,selectors:entries.length}));
   }catch(error){
     console.error("M2D_VIS002_CONTEXT_FAIL "+JSON.stringify({label,message:String(error?.message||error).slice(0,1100)}));
     throw error;
   }finally{await context.close()}
  }
 }finally{await browser.close()}
}
assert.equal(scenarios,2*3*2*2);
assert.ok(lightContexts>=40);
assert.ok(darkAbsent>=40);
console.log("M2D_VIS002_CONTEXT_COMPLETE "+JSON.stringify({scenarios,lightContexts,darkAbsent,
  evidence:"local computed style; scoped 10 only; no claim of all-route compliance"}));
