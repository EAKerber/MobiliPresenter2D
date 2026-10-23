// CI-only: validated synthetic local buyer V5; no auth, data mutations or Netlify.
import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";
const origin="http://127.0.0.1:8123/config/";
const browsers=[["chromium",chromium],["webkit",webkit]];
const widths=[390,701,900,1050,1051,1200,1366];
let passed=0,failed=0;
const failures=[];
for(const [name,engine] of browsers){
  const browser=await engine.launch({headless:true});
  try{
    for(const width of widths){
      for(const theme of ["light","dark"]){
        const page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:"reduce"});
        const key=name+"-"+width+"-"+theme;
        try{
          await page.goto(origin,{waitUntil:"domcontentloaded",timeout:20000});
          await page.waitForFunction(()=>
            document.documentElement.dataset.publishedConfigurationStatus==="validated"
            && !document.querySelector(".workspace")?.hidden,null,{timeout:16000});
          await page.evaluate(t=>{document.documentElement.dataset.theme=t},theme);
          await page.locator("#moduleList [data-select-entity]").first().click({timeout:5000});
          await page.waitForFunction(()=>document.body.classList.contains("has-module-detail"));
          await page.setViewportSize({width,height:900});
          await page.waitForTimeout(180);
          const validate=async(label)=>{
            const state=await page.evaluate(()=>{
              const nav=document.querySelector(".flow-nav");
              const box=nav?.getBoundingClientRect();
              const controls=document.querySelector(".controls");
              const steps=[...nav.querySelectorAll("[data-step]")].map(el=>{
                const r=el.getBoundingClientRect();
                return {step:el.dataset.step,rect:[r.x,r.y,r.width,r.height],
                  connected:el.isConnected,disabled:el.disabled,
                  display:getComputedStyle(el).display};
              });
              return {profile:document.documentElement.dataset.layoutProfile,
                navWidth:box?.width,controlsWidth:controls?.getBoundingClientRect().width,
                stage:nav.querySelector('[aria-current="step"]')?.dataset.step,
                steps};
            });
            assert.equal(state.steps.length,4,key+" "+label+" stage count");
            assert.ok(state.steps.every(v=>v.connected&&!v.disabled&&v.rect[2]>0&&v.rect[3]>=40),
              key+" "+label+" geometry "+JSON.stringify(state));
            return state;
          };
          await validate("after-resize");
          await page.keyboard.press("Control+ArrowRight");
          await page.waitForFunction(()=>document.querySelector('.flow-nav [data-step="finishes"]')?.getAttribute("aria-current")==="step",
            null,{timeout:3500});
          await validate("keyboard-next");
          await page.locator('.flow-nav [data-step="modules"]').click({timeout:4000});
          await page.waitForFunction(()=>document.querySelector('.flow-nav [data-step="modules"]')?.getAttribute("aria-current")==="step",
            null,{timeout:3500});
          await validate("click-back");
          await page.setViewportSize({width:1366,height:900});
          await page.waitForTimeout(180);
          await validate("return-side-rail");
          passed++;
          console.log("CI_NAV_CROSSBROWSER_PASS "+JSON.stringify({name,width,theme}));
        }catch(e){
          failed++;
          const msg=String(e?.message||e).slice(0,420);
          failures.push({name,width,theme,errorClass:e?.name||"ERROR",summary:msg});
          console.error("CI_NAV_CROSSBROWSER_FAIL "+JSON.stringify({name,width,theme,errorClass:e?.name||"ERROR",summary:msg}));
        }finally{await page.close()}
      }
    }
  }finally{await browser.close()}
}
console.log("CI_NAV_CROSSBROWSER_COMPLETE "+JSON.stringify({passed,failed,failures}));
assert.equal(failed,0,"cross-browser stage geometry and interactions must all pass");
