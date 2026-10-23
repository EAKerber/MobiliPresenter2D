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
      gridRows:style.gridTemplateRows,containerType:style.containerType,
      computedDisplay:style.display,inlineDisplay:nav.style.display,
      stylesheets:[...document.styleSheets].map(sheet=>sheet.href||"inline"),
      fetchedCss:document.querySelector('link[href*="styles.css"]')?.href||null,steps};
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
  page=await fresh("detail-control",true);
  await page.close();

  const interventions=[
    "pin-hide", "grid-template-columns", "grid-template-rows",
    "grid-auto-flow", "grid-explicit", "grid-auto-rows", "display-flex"
  ];
  for(const label of interventions){
    const page=await fresh(label,true);
    await page.evaluate(label=>{
      const nav=document.querySelector(".flow-nav");
      if(label==="pin-hide")nav.querySelector("#mobileSceneRepin").hidden=true;
      if(label==="grid-template-columns")nav.style.gridTemplateColumns="repeat(4,1fr)";
      if(label==="grid-template-rows")nav.style.gridTemplateRows="44px 44px";
      if(label==="grid-auto-flow")nav.style.gridAutoFlow="row dense";
      if(label==="grid-explicit")nav.style.display="grid";
      if(label==="grid-auto-rows")nav.style.gridAutoRows="minmax(44px,auto)";
      if(label==="display-flex")nav.style.display="flex";
    },label);
    await page.waitForTimeout(100);
    await snapshot(page,label,"intervention");
    await page.evaluate(label=>{
      const nav=document.querySelector(".flow-nav");
      if(label==="pin-hide")nav.querySelector("#mobileSceneRepin").hidden=false;
      if(label==="grid-template-columns")nav.style.removeProperty("grid-template-columns");
      if(label==="grid-template-rows")nav.style.removeProperty("grid-template-rows");
      if(label==="grid-auto-flow")nav.style.removeProperty("grid-auto-flow");
      if(label==="grid-explicit"||label==="display-flex")nav.style.removeProperty("display");
      if(label==="grid-auto-rows")nav.style.removeProperty("grid-auto-rows");
    },label);
    await page.waitForTimeout(100);
    await snapshot(page,label,"rollback");
    await page.close();
  }
} finally {await browser.close();}
console.log("CI_CAUSAL_COMPLETE "+JSON.stringify({snapshots:records.length,
  zeroStates:records.filter(x=>x.steps.every(s=>s.visibleRects===0)).map(x=>x.trial+":"+x.stage)}));
