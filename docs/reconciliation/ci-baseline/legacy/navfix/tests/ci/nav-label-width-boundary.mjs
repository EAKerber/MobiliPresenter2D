// Boundary-only differential: did moving the query container shift the 500px label rule?
// Two immutable CSS inputs, localhost V5 fixture, no production write.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {chromium,webkit} from "playwright";
const baseline=execFileSync("git",["show","refs/remotes/origin/main:app/styles.css"],{encoding:"utf8"});
const candidate=readFileSync("app/styles.css","utf8");
const widths=[496,500,502,505,509,512,514,515,518,522];
const issues=[];
for(const [engineName,engine] of [["chromium",chromium],["webkit",webkit]]){
  const browser=await engine.launch({headless:true});
  try{
    for(const width of widths){
      const pair={};
      for(const [mode,css] of [["baseline",baseline],["candidate",candidate]]){
        const page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:"reduce"});
        try{
          await page.route("**/styles.css?*",route=>route.fulfill({status:200,contentType:"text/css",body:css}));
          await page.goto("http://127.0.0.1:8123/config/",{waitUntil:"domcontentloaded",timeout:18000});
          await page.waitForFunction(()=>document.documentElement.dataset.publishedConfigurationStatus==="validated"
            && !document.querySelector(".workspace")?.hidden,null,{timeout:15000});
          await page.locator("#moduleList [data-select-entity]").first().click();
          await page.waitForFunction(()=>document.body.classList.contains("has-module-detail"));
          await page.evaluate(w=>{document.querySelector(".controls").style.width=w+"px"},width);
          await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
          const png=await page.locator(".flow-nav").screenshot({animations:"disabled"});
          pair[mode]=await page.evaluate(()=>{
            const nav=document.querySelector(".flow-nav"),ctrl=document.querySelector(".controls");
            const r=nav.getBoundingClientRect(),c=getComputedStyle(nav),step=nav.querySelector(".flow-step");
            return {navWidth:r.width,containerWidth:ctrl.getBoundingClientRect().width,
              navContentWidth:r.width-(parseFloat(c.paddingLeft)+parseFloat(c.paddingRight)+parseFloat(c.borderLeftWidth)+parseFloat(c.borderRightWidth)),
              stepDisplay:getComputedStyle(step).display,
              stepSize:[step.getBoundingClientRect().width,step.getBoundingClientRect().height]};
          });
          pair[mode].pngSha=createHash("sha256").update(png).digest("hex");
        }finally{await page.close()}
      }
      const same=JSON.stringify(pair.baseline)===JSON.stringify(pair.candidate);
      if(!same)issues.push({engine:engineName,width,baseline:pair.baseline,candidate:pair.candidate});
      console.log("CI_NAV_BOUNDARY_CASE "+JSON.stringify({engine:engineName,width,same,
        baseline:pair.baseline.stepDisplay,candidate:pair.candidate.stepDisplay,
        navContentWidth:pair.baseline.navContentWidth}));
    }
  }finally{await browser.close()}
}
console.log("CI_NAV_BOUNDARY_COMPLETE "+JSON.stringify({cases:2*widths.length,differences:issues.length,issues}));
assert.equal(issues.length,0,"Moving container query must retain exact 500px compact-label boundary");
