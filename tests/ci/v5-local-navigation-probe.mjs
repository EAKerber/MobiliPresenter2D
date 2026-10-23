// Read-only local V5 navigation behavior probe. No auth, Netlify or DB.
import {chromium} from "playwright";
import {mkdir,writeFile} from "node:fs/promises";
const origin="http://127.0.0.1:8123/config/";
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:"reduce"});
const reports=[],failedResources=[];
page.on("response",r=>{if(r.status()>=400){
 const url=new URL(r.url());if(url.origin==="http://127.0.0.1:8123")failedResources.push({status:r.status(),path:url.pathname});
}});
const snapshot=async(label)=>{
 const data=await page.evaluate(()=>{
  const selectors=[".flow-nav [data-step='modules']",".flow-nav [data-step='finishes']",
   ".flow-nav [data-step='summary']","#moduleList [data-select-entity]","#modulesPanel",
   ".workspace","#introSplash"];
  const nodes={};
  for(const sel of selectors){
   const el=document.querySelector(sel);
   if(!el){nodes[sel]={exists:false};continue;}
   const cs=getComputedStyle(el),r=el.getBoundingClientRect();
   const x=Math.max(0,Math.min(innerWidth-1,r.x+r.width/2)),
    y=Math.max(0,Math.min(innerHeight-1,r.y+r.height/2));
   const hit=document.elementFromPoint(x,y);
   nodes[sel]={display:cs.display,visibility:cs.visibility,pointerEvents:cs.pointerEvents,
    hidden:el.hidden,ariaCurrent:el.getAttribute("aria-current"),
    disabled:el.disabled||el.getAttribute("aria-disabled")==="true",
    rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],
    hit:hit?.id||hit?.getAttribute("data-step")||hit?.tagName||null};
  }
  return {stage:document.querySelector(".flow-nav [aria-current='step']")?.dataset.step||null,
   profile:document.documentElement.dataset.layoutProfile,
   publishedStatus:document.documentElement.dataset.publishedConfigurationStatus,
   focus:document.activeElement?.id||document.activeElement?.tagName,
   hasModuleDetail:document.body.classList.contains("has-module-detail"),nodes};
 });
 reports.push({label,...data});console.log("CI_LOCAL_NAV_PROBE "+JSON.stringify({label,stage:data.stage,focus:data.focus,
  published:data.publishedStatus,modules:data.nodes[".flow-nav [data-step='modules']"],
  finishes:data.nodes[".flow-nav [data-step='finishes']"]}).slice(0,2100));
};
try{
 await page.goto(origin,{waitUntil:"domcontentloaded",timeout:15000});
 await page.waitForFunction(()=>document.documentElement.dataset.publishedConfigurationStatus==="validated"
   && !document.querySelector(".workspace")?.hidden,null,{timeout:14000});
 await snapshot("initial");
 await page.keyboard.press("Control+ArrowRight");
 await page.waitForTimeout(800);
 await snapshot("after-control-right");
 const finishes=page.locator(".flow-nav [data-step='finishes']");
 try{await finishes.click({timeout:3000});}catch(e){reports.push({label:"click-finishes-failed",errorClass:e.name});}
 await page.waitForTimeout(300);
 await snapshot("after-finishes-click");
 await page.setViewportSize({width:1050,height:900});
 await page.waitForTimeout(140);
 await snapshot("stacked-before-modules");
 const modules=page.locator(".flow-nav [data-step='modules']");
 try{await modules.click({timeout:3000});}catch(e){reports.push({label:"click-modules-failed",errorClass:e.name});}
 await page.waitForTimeout(300);
 await snapshot("after-modules-click");
}catch(e){reports.push({label:"probe-error",errorClass:e.name,message:String(e.message).slice(0,130)});}
finally{
 await mkdir("artifacts/ci-baseline-01",{recursive:true});
 await writeFile("artifacts/ci-baseline-01/v5-navigation.json",JSON.stringify({reports,failedResources},null,2)+"\n");
 await browser.close();
}
