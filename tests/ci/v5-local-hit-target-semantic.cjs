"use strict";
// Semantic extraction of the 2026-10-23 config-local-visibility-probe.
// V5 localhost only; no old browser scripts, auth, Netlify or database.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {chromium,webkit}=require("playwright");
const url=process.env.FLOW_LAYOUT_URL || "http://127.0.0.1:8123/config/";
if(!/^http:\/\/127\.0\.0\.1:8123\/config\/$/.test(url))throw Error("LOCAL_ONLY_TARGET_REQUIRED");
const output=process.argv[2]||"/tmp/m2d-v5local-visibility";
const cases=[["chromium",chromium],["webkit",webkit]];
const records=[];
const paint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

async function inspect(page,tag) {
 await page.evaluate(paint);
 await page.waitForFunction(()=>{
  const nav=document.querySelector(".flow-nav");
  const buttons=[...(nav?.querySelectorAll("[data-step]")||[])];
  const stages=window.CASA_EM_MODULOS_DEBUG?.getNormalizedFlow?.()?.stages?.filter(s=>s.enabled)||[];
  return document.documentElement.dataset.publishedConfigurationStatus==="validated" &&
    nav && stages.length>=2 && buttons.length===stages.length &&
    buttons.every(button=>{
      const r=button.getBoundingClientRect();
      const cs=getComputedStyle(button);
      return !button.hidden && !button.disabled && cs.display!=="none" &&
        cs.visibility!=="hidden" && r.width>0 && r.height>=40;
    });
 },null,{timeout:10000});
 const state=await page.evaluate(()=>{
   const nav=document.querySelector(".flow-nav");
   const ids=(window.CASA_EM_MODULOS_DEBUG.getNormalizedFlow().stages||[])
     .filter(s=>s.enabled).map(s=>s.id);
   const buttons=[...nav.querySelectorAll("[data-step]")].map(el=>{
    const rect=el.getBoundingClientRect();
    const css=getComputedStyle(el);
    const x=Math.max(0,Math.min(innerWidth-1,rect.x+rect.width/2));
    const y=Math.max(0,Math.min(innerHeight-1,rect.y+rect.height/2));
    const inViewport=rect.width>0&&rect.height>0&&rect.top>=0&&rect.bottom<=innerHeight&&rect.left>=0&&rect.right<=innerWidth;
    const hit=inViewport?document.elementFromPoint(x,y):null;
    return {id:el.dataset.step,width:rect.width,height:rect.height,
      visible:!el.hidden&&!el.disabled&&css.display!=="none"&&css.visibility!=="hidden",
      inViewport,actionable:inViewport ? el.contains(hit):null};
   });
   const selected=document.querySelector("#moduleList .module-card.is-selected");
   const selectedRect=selected?.getBoundingClientRect();
   const sentinel=document.getElementById("viewerPinSentinel");
   return {profile:document.documentElement.dataset.layoutProfile,ids,buttons,
    navWidth:nav.clientWidth,navScroll:nav.scrollWidth,
    active:nav.querySelector('[aria-current="step"]')?.dataset.step||null,
    hasDetail:document.body.classList.contains("has-module-detail"),
    selectedModule:!!selected,
    selectedModuleWidth:selectedRect?.width||0,
    hasSentinel:!!sentinel};
 });
 const note=tag+": "+JSON.stringify(state);
 assert.deepEqual(state.buttons.map(x=>x.id),state.ids,"navigation data IDs: "+note);
 assert.ok(state.buttons.every(x=>x.visible&&x.width>0&&x.height>=40),"zero-sized or hidden nav: "+note);
 assert.ok(state.buttons.filter(x=>x.inViewport).every(x=>x.actionable),"nav hit target occluded: "+note);
 assert.ok(state.navWidth>0 && state.navScroll<=state.navWidth+2,"nav horizontal overflow: "+note);
 assert.ok(state.ids.includes(state.active),"missing active stage: "+note);
 records.push({tag,profile:state.profile,stageCount:state.ids.length,
  actionableButtons:state.buttons.filter(x=>x.inViewport).length,
  selectedModule:state.selectedModule,hasSentinel:state.hasSentinel});
 return state;
}

(async()=>{
 try{
  for(const [engineName,engine] of cases){
   const browser=await engine.launch({headless:true});
   try{
    for(const width of [1050,1366]){
     for(const theme of ["light","dark"]){
      const label=engineName+"/"+width+"/"+theme;
      const page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:"reduce"});
      try{
       await page.goto(url,{waitUntil:"domcontentloaded",timeout:20000});
       await page.waitForFunction(()=>document.documentElement.dataset.publishedConfigurationStatus==="validated"&&
        window.CASA_EM_MODULOS_DEBUG?.getNormalizedFlow?.()?.stages?.length,
        null,{timeout:25000});
       await page.evaluate(t=>{document.documentElement.dataset.theme=t;},theme);
       await page.locator("#moduleList [data-select-entity]").first().click();
       await page.waitForFunction(()=>document.body.classList.contains("has-module-detail"),null,{timeout:12000});
       await page.setViewportSize({width,height:900});
       await page.waitForFunction(expected=>document.documentElement.dataset.layoutProfile===expected,
         width===1050?"stacked":"side-rail",{timeout:7500});
       await inspect(page,label+"/detail");
       if(width===1050){
        await page.evaluate(()=>{
         const sentinel=document.getElementById("viewerPinSentinel");
         if(sentinel)scrollTo(0,sentinel.getBoundingClientRect().top+scrollY+180);
        });
        await inspect(page,label+"/scroll");
       }
       const next=await page.evaluate(()=>window.CASA_EM_MODULOS_DEBUG.getNormalizedFlow()
         .stages.filter(s=>s.enabled)[1].id);
       await page.locator('.flow-nav [data-step="'+next+'"]').click({timeout:10000});
       await page.waitForFunction(id=>
         document.querySelector('.flow-nav [data-step="'+id+'"]')?.getAttribute("aria-current")==="step",
         next,{timeout:7000});
       const final=await inspect(page,label+"/next");
       assert.equal(final.active,next,"click must activate published stage: "+label);
       console.log("V5_LOCAL_HIT_TARGET_PASS "+JSON.stringify({engine:engineName,width,theme,stages:final.ids.length}));
      }finally{await page.close();}
     }
    }
   }finally{await browser.close();}
  }
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,"result.json"),JSON.stringify({
    schema:"M2DV5LocalHitTarget/0.1",source:"localhost-only",
    authenticatedPreview:false,records
  },null,2)+"\n");
  console.log("V5_LOCAL_HIT_TARGET_COMPLETE "+JSON.stringify({cases:8,snapshots:records.length}));
 }catch(e){console.error("V5_LOCAL_HIT_TARGET_FAIL "+e.name+": "+String(e.message).slice(0,1500));process.exitCode=1;}
})();
