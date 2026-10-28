"use strict";
// No remote URLs, fixtures or live credentials. Reconcile the old layout intent
// with today's V5 policy, and detect the old keyboard-focus obligation.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require("playwright");
const base=process.env.FLOW_LAYOUT_URL;
assert(/^http:\/\/127\.0\.0\.1:8123\/config\/$/.test(base||""),"requires isolated loopback V5, not Netlify");
const out=process.argv[2]||"/tmp/m2d-ux04";
const rect=async(page,selector)=>page.locator(selector).evaluate(x=>{const r=x.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};});
const settle=async(page)=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.waitForTimeout(180)};
const overflow=async(page,selector)=>page.locator(selector).evaluate(x=>({scroll:x.scrollWidth,client:x.clientWidth,ok:x.scrollWidth<=x.clientWidth+2}));
const flush=async(page,profile)=>page.waitForFunction(x=>document.documentElement.dataset.layoutProfile===x,profile,{timeout:6000});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({headless:true});
 let p;
 const geometry={};
 const errors=[];
 try{
 p=await b.newPage({viewport:{width:1366,height:900},reducedMotion:"reduce"});
 p.on("pageerror",e=>errors.push(e.message));
 p.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 await p.goto(base,{waitUntil:"domcontentloaded",timeout:25000});
 await p.waitForFunction(()=>document.documentElement.dataset.publishedConfigurationStatus==="validated"&&window.CASA_NORMALIZED_FLOW?.stages?.length&&document.querySelector("#moduleList [data-select-entity]"),null,{timeout:25000});
 await flush(p,"side-rail");
 await p.locator("#moduleList [data-select-entity]").first().click();
 await p.waitForFunction(()=>document.body.classList.contains("has-module-detail"));
 await settle(p);
 geometry.desktopModules={detail:await rect(p,'[data-stage-pane="detail"]'),list:await rect(p,'[data-stage-pane="list"]')};
 assert.ok(geometry.desktopModules.list.top>=geometry.desktopModules.detail.bottom-2,"current side-rail is single column, replaces older wide split "+JSON.stringify(geometry.desktopModules));
 assert.equal((await overflow(p,"#modulesPanel")).ok,true);
 await p.locator('.flow-nav [data-step="services"]').click();
 await p.waitForFunction(()=>!document.getElementById("servicesPanel").hidden);
 await settle(p);
 geometry.desktopServices={light:await rect(p,'[data-keyboard-section="lighting"]'),additional:await rect(p,'[data-keyboard-section="additional-services"]')};
 assert.ok(geometry.desktopServices.additional.top>=geometry.desktopServices.light.bottom-2,"current side-rail Services is single column");
 await p.setViewportSize({width:1050,height:900});
 await flush(p,"stacked");
 await p.locator('.flow-nav [data-step="modules"]').click();
 await p.waitForFunction(()=>!document.getElementById("modulesPanel").hidden);
 await settle(p);
 geometry.stackedModules={detail:await rect(p,'[data-stage-pane="detail"]'),list:await rect(p,'[data-stage-pane="list"]')};
 assert.ok(Math.abs(geometry.stackedModules.detail.top-geometry.stackedModules.list.top)<4);
 assert.ok(geometry.stackedModules.detail.right<=geometry.stackedModules.list.left+4);
 await p.locator('.flow-nav [data-step="services"]').click();
 await p.waitForFunction(()=>!document.getElementById("servicesPanel").hidden);
 await settle(p);
 geometry.stackedServices={light:await rect(p,'[data-keyboard-section="lighting"]'),additional:await rect(p,'[data-keyboard-section="additional-services"]')};
 assert.ok(Math.abs(geometry.stackedServices.light.top-geometry.stackedServices.additional.top)<4);
 assert.ok(geometry.stackedServices.light.right<=geometry.stackedServices.additional.left+4);
 await p.setViewportSize({width:390,height:844});
 await flush(p,"compact");
 await p.locator('.flow-nav [data-step="modules"]').click();
 await p.waitForFunction(()=>!document.getElementById("modulesPanel").hidden);
 await settle(p);
 geometry.compact={
  listHidden:await p.locator('[data-stage-view-id="modules-list"]').isHidden(),
  detailVisible:await p.locator('[data-stage-view-id="modules-detail"]').isVisible(),
  moduleOverflow:await overflow(p,"#modulesPanel")
 };
 assert.equal(geometry.compact.listHidden,true,"compact mode replaces list with selected detail, not old simultaneous stack");
 assert.equal(geometry.compact.detailVisible,true);
 assert.equal(geometry.compact.moduleOverflow.ok,true);
 await p.keyboard.press("Escape");
 await p.waitForFunction(()=>!document.body.classList.contains("has-module-detail"));
 assert.equal(await p.locator('[data-stage-view-id="modules-list"]').isVisible(),true);
 // Old keyboard UX04 assertion disappeared from new suite. Test it as a separate
 // accessibility gate, not as proof of a pre-existing regression.
 await p.setViewportSize({width:1366,height:900});
 await flush(p,"side-rail");
 await p.locator('.flow-nav [data-step="finishes"]').click();
 await p.waitForFunction(()=>!document.getElementById("finishesStagePanel").hidden);
 const handle=p.locator("[data-handle-id]").first();
 const id=await handle.getAttribute("data-handle-id");
 await handle.click();
 await p.waitForFunction(()=>document.querySelector('[data-keyboard-section="handles"]')?.dataset.keyboardActiveSection==="true");
 geometry.focus={expected:id,actual:await p.evaluate(()=>document.activeElement?.dataset?.handleId||null)};
 fs.writeFileSync(path.join(out,"result.json"),JSON.stringify({geometry,errors,environment:"isolated-local-buyer-V5"},null,2));
 assert.equal(geometry.focus.actual,id,"selected handle should recover keyboard focus after redraw (legacy accessibility obligation)");
 assert.deepEqual(errors,[],"page and console errors");
 console.log("UX04_CURRENT_GEOMETRY_AND_FOCUS_PASS");
 }finally{await p?.close();await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
