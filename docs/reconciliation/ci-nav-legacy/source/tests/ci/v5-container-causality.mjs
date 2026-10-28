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
async function fresh(trial,detail,treatment=null){
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
  if(treatment){
    await page.evaluate(treatment=>{
      const nav=document.querySelector(".flow-nav");
      if(treatment==="pre-no-container")nav.style.containerType="normal";
      if(treatment==="pre-display-change")nav.querySelectorAll(".flow-step").forEach(el=>el.style.display="grid");
      if(treatment==="pre-transform")nav.style.transform="translateZ(0)";
      if(treatment==="pre-columns")nav.style.gridTemplateColumns="repeat(4,1fr)";
      if(treatment==="pre-outline")nav.querySelectorAll(".flow-step").forEach(el=>el.style.outline="0 solid transparent");
    },treatment);
    await snapshot(page,trial,"pre-resize-treatment");
  }
  await page.setViewportSize({width:1050,height:900});
  await page.waitForTimeout(160);
  await snapshot(page,trial,"stacked");
  return page;
}
try{
  for(let round=1;round<=3;round++){
    const variants=[
      ["control",null],["pre-no-container","pre-no-container"],
      ["pre-display-change","pre-display-change"],
      ["pre-transform","pre-transform"],
      ["pre-columns","pre-columns"],["pre-outline","pre-outline"]
    ];
    for(const [name,treatment] of variants){
      const label=name+"-"+round;
      const page=await fresh(label,true,treatment);
      await page.close();
    }
  }
}finally{await browser.close();}
const results=records.filter(x=>x.stage==="stacked").map(x=>({
  trial:x.trial,profile:x.profile,
  failed:x.steps.some(s=>s.visibleRects===0),
  navBox:x.navBox,stepBoxes:x.steps.map(s=>s.box)
}));
console.log("CI_CAUSAL_MATRIX "+JSON.stringify(results));
