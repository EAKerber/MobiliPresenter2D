// CI experiment: no tokens, Netlify, writes or fixture mutation.
// Each fresh page is an independent read-only CSS/layout intervention.
import {chromium} from "playwright";
const browser=await chromium.launch({headless:true});
const origin="http://127.0.0.1:8123/config/";
const records=[];
async function snapshot(page,trial,stage) {
  const state=await page.evaluate(()=>{
    const nav=document.querySelector(".flow-nav"),r=nav.getBoundingClientRect(),style=getComputedStyle(nav);
    const steps=[...nav.querySelectorAll("[data-step]")].map(el=>{
      const rect=el.getBoundingClientRect(),css=getComputedStyle(el);
      return {step:el.dataset.step,connected:el.isConnected,visibleRects:el.getClientRects().length,
        box:[Math.round(rect.width),Math.round(rect.height)],offset:[el.offsetWidth,el.offsetHeight],
        display:css.display,minHeight:css.minHeight};
    });
    return {width:innerWidth,profile:document.documentElement.dataset.layoutProfile,
      detail:document.body.classList.contains("has-module-detail"),
      navBox:[Math.round(r.width),Math.round(r.height)],gridCols:style.gridTemplateColumns,
      gridRows:style.gridTemplateRows,containerType:style.containerType,steps};
  });
  records.push({trial,stage,...state});
  console.log("CI_CAUSAL_SNAPSHOT "+JSON.stringify({trial,stage,...state}));
}
async function fresh(trial,detail){
  const page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:"reduce"});
  await page.goto(origin,{waitUntil:"domcontentloaded",timeout:20000});
  await page.waitForFunction(()=>document.documentElement.dataset.publishedConfigurationStatus==="validated"
    && !document.querySelector(".workspace")?.hidden,null,{timeout:16000});
  await snapshot(page,trial,"initial");
  if(detail){
    await page.locator("#moduleList [data-select-entity]").first().click();
    await page.waitForFunction(()=>document.body.classList.contains("has-module-detail"));
    await snapshot(page,trial,"detail-open");
  }
  await page.setViewportSize({width:1050,height:900});
  await page.waitForTimeout(160);
  await snapshot(page,trial,"stacked");
  return page;
}
try{
 let page=await fresh("no-detail",false);
 await page.close();
 page=await fresh("detail",true);
 // Evaluate each reversible style intervention and its rollback.
 const experiments=[
   ["container-normal",el=>{el.style.containerType="normal";},el=>{el.style.removeProperty("container-type");}],
   ["display-flex",el=>{el.style.display="flex";},el=>{el.style.removeProperty("display");}],
   ["grid-columns-refresh",el=>{el.style.gridTemplateColumns="repeat(4, 1fr)";},el=>{el.style.gridTemplateColumns="repeat(4, minmax(0, 1fr))";}],
   ["paint-containment",el=>{el.style.contain="paint";},el=>{el.style.removeProperty("contain");}]
 ];
 for(const [label,apply,rollback] of experiments){
   await page.evaluate(label=>{const el=document.querySelector(".flow-nav"); if(label==="container-normal")el.style.containerType="normal"; else if(label==="display-flex")el.style.display="flex"; else if(label==="grid-columns-refresh")el.style.gridTemplateColumns="repeat(4, 1fr)"; else if(label==="paint-containment")el.style.contain="paint";},label);
   await page.waitForTimeout(100);
   await snapshot(page,"detail",label);
   await page.evaluate(label=>{const el=document.querySelector(".flow-nav"); if(label==="container-normal")el.style.removeProperty("container-type"); else if(label==="display-flex")el.style.removeProperty("display"); else if(label==="grid-columns-refresh")el.style.gridTemplateColumns="repeat(4, minmax(0, 1fr))"; else if(label==="paint-containment")el.style.removeProperty("contain");},label);
   await page.waitForTimeout(100);
   await snapshot(page,"detail",label+"-rollback");
 }
 await page.close();
} finally {
 await browser.close();
}
console.log("CI_CAUSAL_COMPLETE "+JSON.stringify({snapshots:records.length,
 zeroStates:records.filter(x=>x.steps.every(s=>s.visibleRects===0)).map(x=>x.trial+":"+x.stage)}));
