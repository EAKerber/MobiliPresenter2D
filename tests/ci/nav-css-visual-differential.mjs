// Differential CSS gate for the private Configurator, using validated LOCAL V5.
// Baseline stylesheet is an immutable Git main ref; no Netlify or auth required.
import assert from "node:assert/strict";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {chromium,webkit} from "playwright";
const css={
  baseline:execFileSync("git",["show","refs/remotes/origin/main:app/styles.css"],{encoding:"utf8"}),
  candidate:readFileSync("app/styles.css","utf8")
};
const widths=[390,701,900,1050,1051,1200,1366];
const failures=[];
let comparable=0,exact=0;
const hash=b=>createHash("sha256").update(b).digest("hex");
for(const [browserName,driver] of [["chromium",chromium],["webkit",webkit]]){
  const browser=await driver.launch({headless:true});
  try{
    for(const width of widths)for(const theme of ["light","dark"])for(const detail of [false,true]){
      const results={};
      for(const version of ["baseline","candidate"]){
        const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"});
        try{
          await page.route("**/styles.css?*",route=>route.fulfill({status:200,contentType:"text/css",body:css[version]}));
          await page.goto("http://127.0.0.1:8123/config/",{waitUntil:"domcontentloaded",timeout:18000});
          await page.waitForFunction(()=>document.documentElement.dataset.publishedConfigurationStatus==="validated"
            && !document.querySelector(".workspace")?.hidden,null,{timeout:14000});
          await page.evaluate(t=>{document.documentElement.dataset.theme=t},theme);
          if(detail){
            await page.locator("#moduleList [data-select-entity]").first().click({timeout:4000});
            await page.waitForFunction(()=>document.body.classList.contains("has-module-detail"));
          }
          await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
          const geometry=await page.evaluate(()=>{
            const nav=document.querySelector(".flow-nav"),r=nav.getBoundingClientRect();
            const buttons=[...nav.querySelectorAll("[data-step]")];
            return {
              nav:[r.width,r.height].map(n=>Math.round(n*100)/100),
              steps:buttons.map(el=>{
                const box=el.getBoundingClientRect(),style=getComputedStyle(el);
                return {step:el.dataset.step,rect:[box.x,box.y,box.width,box.height].map(n=>Math.round(n*100)/100),
                  display:style.display,letterSpacing:style.letterSpacing,fontSize:style.fontSize};
              })
            };
          });
          const capture=await page.locator(".flow-nav").screenshot({animations:"disabled",timeout:7000});
          results[version]={geometry,hash:hash(capture),length:capture.length};
        }finally{await page.close()}
      }
      comparable++;
      const sameRaster=results.baseline.hash===results.candidate.hash;
      const sameGeometry=JSON.stringify(results.baseline.geometry)===JSON.stringify(results.candidate.geometry);
      if(sameRaster&&sameGeometry)exact++;
      else {
        const row={browser:browserName,width,theme,detail,sameRaster,sameGeometry,
          baseline:results.baseline,candidate:results.candidate};
        failures.push(row);
        console.error("CI_NAV_VISUAL_DIFFERENCE "+JSON.stringify(row).slice(0,1400));
      }
    }
  }finally{await browser.close()}
}
mkdirSync("artifacts/ci-baseline-01",{recursive:true});
writeFileSync("artifacts/ci-baseline-01/nav-visual-differential.json",JSON.stringify({
  schema:"NavVisualDifferential/1",comparable,exact,failures
},null,2)+"\n");
console.log("CI_NAV_VISUAL_COMPLETE "+JSON.stringify({comparable,exact,differences:failures.length}));
assert.equal(failures.length,0,"Nav CSS should remain pixel and geometry equivalent in stable static states");
