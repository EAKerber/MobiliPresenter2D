import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import { chromium, webkit } from "playwright";

const require=createRequire(import.meta.url);
const {project}=require("../app/core/public-module-projection.js");
const catalog=require("../app/data/catalog-data.js");
const scene=require("../app/data/scene-data.js");
const ORIGIN="http://127.0.0.1:8123", artifact="artifacts/viewer-secondary-header";
const widths=[320,390,486,768,1366],themes=["light","dark"];
await mkdir(artifact,{recursive:true});
const results=[];
const moduleIds=catalog.modules.map(module=>module.entityId);
const finishes=catalog.options.finishes;
const published={
 schemaVersion:"ConfiguratorAdministration2D 5.0",revision:1,
 pricing:{internal:"must-not-leak"},
 stages:[{id:"modules-test",kind:"modules",enabled:true,groups:[{sections:[{itemIds:moduleIds}]}]}],
 objects:Object.fromEntries(catalog.modules.map(module=>[module.entityId,{
   title:module.title,description:"",benefits:[...module.benefits],
   components:[...module.components],requirements:[...module.requirements]
 }])),
 finishes:finishes.map(finish=>({id:finish.id,enabled:finish.status==="published",scope:"global"})),
 materialGroups:[{id:"fronts-all",materialIds:finishes.map(finish=>finish.id)}],
 materials:finishes.map(finish=>({id:finish.id,label:finish.publicLabel,kind:"texture",
   color:finish.color,textureAsset:finish.textureAsset,textureSize:finish.textureSize})),
 initialState:{entities:Object.fromEntries(moduleIds.map(id=>[id,true])),finishId:"base-light"}
};
const viewerFixture=project(published,catalog,scene);
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of widths)for(const theme of themes){
   const context=await browser.newContext({viewport:{width,height:844},colorScheme:theme,
     reducedMotion:"reduce",deviceScaleFactor:1,locale:"pt-BR"});
   await context.addInitScript(mode=>{localStorage.setItem("casa-ui-theme-mode-v1",mode);},theme);
   const page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.route("**/api/public-modules",route=>route.fulfill({
     status:200,contentType:"application/json",body:JSON.stringify(viewerFixture)
   }));
   const r=await page.goto(ORIGIN+"/viewer/?module="+encodeURIComponent(moduleIds[1]),{waitUntil:"domcontentloaded",timeout:30000});
   assert.equal(r?.status(),200);
   await page.waitForSelector("[data-ui-theme-toggle]");
   await page.locator("#block-details .detail-grid h3").nth(1).waitFor({state:"visible",timeout:12000});
   await page.evaluate(async()=>{await document.fonts?.ready;});
   const detailHeadingState=await page.evaluate(()=>({
     rendered:[...document.querySelectorAll("#block-details .detail-grid h3")].map(node=>node.textContent),
     expected:window.CASA_UI_COPY.viewer.detailHeadings
   }));
   assert.deepEqual(detailHeadingState.rendered,[detailHeadingState.expected.components,detailHeadingState.expected.requirements],
     "Viewer detail headings follow the shared catalog in stable order");
   const initial=await page.evaluate(()=>{
     const rect=sel=>{
       const r=document.querySelector(sel).getBoundingClientRect();
       return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
     };
     return {
       header:rect(".viewer-header"),
       logo:rect(".viewer-brand__logo"),
       back:rect(".viewer-header .back-link"),
       theme:rect(".viewer-header [data-ui-theme-toggle]"),
       toggle:rect(".viewer-header #menuToggle"),
       rootScrollWidth:document.documentElement.scrollWidth,
       themeMode:document.documentElement.dataset.themeMode,
       themeResolved:document.documentElement.dataset.theme,
       navHref:[...document.querySelectorAll("#primaryNav a")].map(a=>a.getAttribute("href")),
       navCurrent:[...document.querySelectorAll("#primaryNav [aria-current=page]")].length,
       themeInHeader:document.querySelector(".viewer-header").contains(document.querySelector("[data-ui-theme-toggle]")),
       themeContextRows:document.querySelectorAll(".ui-theme-context-row").length,
       headerElements:document.querySelectorAll(".viewer-header").length,
       menuButtons:document.querySelectorAll("#menuToggle").length,
       menuScripts:[...document.scripts].filter(s=>s.src.includes("header-menu.js")).length,
     };
   });
   assert.equal(initial.themeMode,theme);
   assert.equal(initial.themeResolved,theme);
   assert.equal(initial.themeInHeader,true);
   assert.equal(initial.themeContextRows,0);
   assert.equal(initial.headerElements,1);
   assert.equal(initial.menuButtons,1);
   assert.equal(initial.menuScripts,1);
   assert.equal(initial.navCurrent,0,"Viewer is not the active Ambientes page");
   assert.deepEqual(initial.navHref,["/#ambientes","/how-it-works/","/about/","https://wa.me/"]);
   // NAV-005 correction approved by user: logo LEFT; return, theme and hamburger RIGHT.
   assert.equal(await page.locator(".viewer-header__actions > a.back-link").count(),1,
     "contextual return must be in right-side action cluster");
   assert.equal(await page.locator(".viewer-header__context > a.back-link").count(),0,
     "contextual return must not remain next to the brand");
   assert.equal(await page.locator(".viewer-header__actions > .back-link + [data-ui-theme-toggle]").count(),1,
     "return must immediately precede theme selector");
   assert.equal(await page.locator(".viewer-header__actions > [data-ui-theme-toggle] + #menuToggle").count(),1,
     "theme must immediately precede hamburger");
   assert.ok(initial.logo.left<initial.back.left,"brand must stay at left");
   assert.ok(initial.back.left>=initial.logo.right-1,"right-side return must not overlap brand");
   assert.ok(initial.back.right<=initial.theme.left+1,"contextual return must precede theme");
   assert.ok(initial.theme.right<=initial.toggle.left+1,"theme must precede hamburger");
   assert.ok(initial.toggle.right<=width+1,"hamburger must remain inside viewport");
   assert.ok(initial.rootScrollWidth<=width+1,"no horizontal overflow");
   assert.ok(initial.header.height<=94,"header should remain on a single row");
   if(width===320)assert.ok(initial.logo.width>=84,"brand cannot shrink beyond the 30% compact floor");
   const toggle=page.locator("#menuToggle"),nav=page.locator("#primaryNav");
   assert.equal(await toggle.getAttribute("aria-expanded"),"false");
   assert.equal(await nav.isVisible(),false);
   const closed=await page.locator(".viewer-header").screenshot({animations:"disabled"});
   await toggle.click();
   assert.equal(await toggle.getAttribute("aria-expanded"),"true");
   const navState=await page.evaluate(()=>{
     const el=document.querySelector("#primaryNav"),css=getComputedStyle(el),r=el.getBoundingClientRect();
     return {body:document.body.className,display:css.display,visibility:css.visibility,
       opacity:css.opacity,pointerEvents:css.pointerEvents,rect:{x:r.x,y:r.y,width:r.width,height:r.height},
       parent:el.parentElement?.className};
   });
   console.log("VIEWER_NAV005_OPEN_STATE "+JSON.stringify({engine:engine.name(),width,theme,...navState}));
   await page.waitForTimeout(300);
   const settled=await page.evaluate(()=>{
     const nav=document.querySelector("#primaryNav"),parent=nav.parentElement,css=getComputedStyle(nav);
     const pc=getComputedStyle(parent),root=getComputedStyle(document.querySelector(".viewer-header"));
     return {nav:{display:css.display,visibility:css.visibility,opacity:css.opacity,pointerEvents:css.pointerEvents},
       parent:{display:pc.display,visibility:pc.visibility,opacity:pc.opacity},header:{visibility:root.visibility,opacity:root.opacity},
       body:document.body.className,cssRules:[...document.styleSheets].map(sheet=>sheet.href)};
   });
   console.log("VIEWER_NAV005_SETTLED_STATE "+JSON.stringify({engine:engine.name(),width,theme,...settled}));
   assert.equal(await nav.isVisible(),true,"menu must be visible when settled: "+JSON.stringify(settled));
   const open=await page.locator(".viewer-header").screenshot({animations:"disabled"});
   await page.keyboard.press("Escape");
   assert.equal(await toggle.getAttribute("aria-expanded"),"false");
   await toggle.click();
   assert.equal(await toggle.getAttribute("aria-expanded"),"true");
   await page.locator("main").dispatchEvent("pointerdown");
   assert.equal(await toggle.getAttribute("aria-expanded"),"false");
   await toggle.click();
   const about=page.locator('#primaryNav a[href="/about/"]');
   await about.evaluate(el=>el.addEventListener("click",e=>e.preventDefault(),{once:true}));
   await about.click();
   assert.equal(await toggle.getAttribute("aria-expanded"),"false");
   const themeButton=page.locator(".viewer-header [data-ui-theme-toggle]");
   await themeButton.click();
   assert.notEqual(await page.locator("html").getAttribute("data-theme-mode"),theme);
   assert.deepEqual(errors,[]);
   const scenario={engine:engine.name(),width,theme,nav:true,secondary:true,themeInside:true,detailHeadings:true,
     singleRow:true,keyboard:true,outsideClick:true,errors:0};
   results.push(scenario);
   if(width===320||width===1366){
     await writeFile(artifact+"/"+engine.name()+"-"+width+"-"+theme+"-closed.png",closed);
     await writeFile(artifact+"/"+engine.name()+"-"+width+"-"+theme+"-open.png",open);
   }
   console.log("VIEWER_NAV005_SECONDARY_PASS "+JSON.stringify(scenario));
   await context.close();
  }
  const fallbackContext=await browser.newContext({viewport:{width:390,height:844}});
  try{
   const page=await fallbackContext.newPage(),errors=[];
   page.on("pageerror",error=>errors.push(error.message));
   await page.route("**/core/ui-copy.js*",route=>route.abort());
   await page.route("**/api/public-modules",route=>route.fulfill({
     status:200,contentType:"application/json",body:JSON.stringify(viewerFixture)
   }));
   await page.goto(ORIGIN+"/viewer/?module="+encodeURIComponent(moduleIds[1]),{waitUntil:"domcontentloaded"});
   await page.locator("#block-details .detail-grid h3").nth(1).waitFor({state:"visible",timeout:12000});
   assert.deepEqual(await page.locator("#block-details .detail-grid h3").allTextContents(),["Componentes","Requisitos"],
     "Viewer retains both detail headings if the catalog fails to load");
   assert.deepEqual(errors,[],"catalog failure must not interrupt Viewer startup");
  }finally{await fallbackContext.close();}
  const sceneContext=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:"reduce"});
  try{
   const page=await sceneContext.newPage(),errors=[];
   page.on("pageerror",error=>errors.push(error.message));
   const hiddenFixture=structuredClone(viewerFixture);
   hiddenFixture.publicState.viewerEntities[moduleIds[1]]=false;
   await page.route("**/api/public-modules",route=>route.fulfill({
     status:200,contentType:"application/json",body:JSON.stringify(hiddenFixture)
   }));
   await page.goto(ORIGIN+"/viewer/",{waitUntil:"domcontentloaded"});
   const stage=page.locator("#sceneStage"),first=stage.locator(`[data-select-scene-entity="${moduleIds[0]}"]`),
     hidden=stage.locator(`[data-select-scene-entity="${moduleIds[1]}"]`),
     next=stage.locator(`[data-select-scene-entity="${moduleIds[2]}"]`);
   await first.waitFor({state:"visible",timeout:12000});
   assert.equal(await first.getAttribute("aria-pressed"),"true","initial public selection is reflected in the scene");
   assert.equal(await hidden.isHidden(),true,"an unpublished module hotspot is hidden");
   assert.equal(await hidden.isDisabled(),true,"an unpublished module hotspot is disabled");
   assert.equal(await hidden.getAttribute("tabindex"),"-1","an unpublished module cannot be tabbed to");
   assert.equal(await hidden.getAttribute("aria-disabled"),"true");
   await first.focus();
   await page.keyboard.press("ArrowRight");
   assert.equal(await next.getAttribute("aria-pressed"),"true","keyboard selection skips hidden modules");
   assert.equal(await first.getAttribute("aria-pressed"),"false");
   assert.equal(await next.evaluate(node=>node===document.activeElement),true,"selection moves focus to the visible hotspot");
   await page.keyboard.press("2");
   assert.equal(await next.getAttribute("aria-pressed"),"true","numeric shortcut cannot select hidden modules");
   assert.deepEqual(errors,[]);
  }finally{await sceneContext.close();}
 }finally{await browser.close();}
}
await writeFile(artifact+"/report.json",JSON.stringify({schema:"ViewerSecondaryHeaderGate0.1",results},null,2));
console.log("VIEWER_NAV005_RESULT PASS "+results.length+"/20");
