import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

// Differential against untouched main, served locally. NO Netlify deployment or production API.
const BASE="http://127.0.0.1:8124", CANDIDATE="http://127.0.0.1:8123";
const routes=["/","/about/","/how-it-works/","/viewer/"];
const widths=[320,390,486,768,1366], themes=["light","dark"];
const folder="artifacts/p-comp-01";
await mkdir(folder,{recursive:true});
const report={schema:"PCOMP01PublicMenuGate/0.1",visual:[],functional:[],limitations:[
  "Isolated local HTTP server does not provide Netlify backend data/auth",
  "Does not certify iPad legacy versions or resolve existing Landing carousel/splash bugs",
  "No CSS/HTML generation or schema V5 changes under test"
]};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function errMsg(err){return String(err?.message||err).slice(0,240);}
async function state(page,rootSel){
  return await page.evaluate(sel=>{
    const root=document.querySelector(sel),nav=document.getElementById("primaryNav"),toggle=document.getElementById("menuToggle");
    const metrics=el=>{const c=getComputedStyle(el),r=el.getBoundingClientRect();
      return {display:c.display,visibility:c.visibility,color:c.color,bg:c.backgroundColor,
        position:c.position,opacity:c.opacity,rect:[r.x,r.y,r.width,r.height].map(n=>Math.round(n*100)/100)};};
    return {
      html:root?.outerHTML,
      header:metrics(root),nav:metrics(nav),button:metrics(toggle),
      theme:document.documentElement.dataset.theme,
      expanded:toggle.getAttribute("aria-expanded"),
      isOpen:document.body.classList.contains("menu-open"),
      current:[...nav.querySelectorAll("[aria-current='page']")].map(el=>el.getAttribute("href")),
      menuScriptCount:[...document.scripts].filter(s=>s.src.includes("/landing/header-menu.js")).length
    };
  },rootSel);
}
async function sample(browser,origin,route,width,theme){
  const context=await browser.newContext({viewport:{width,height:844},colorScheme:theme,
    reducedMotion:"reduce",locale:"pt-BR",deviceScaleFactor:1,serviceWorkers:"block"});
  await context.addInitScript(mode=>localStorage.setItem("casa-ui-theme-mode-v1",mode),theme);
  const page=await context.newPage(),errors=[];
  page.on("pageerror",error=>errors.push(errMsg(error)));
  try{
    const res=await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:30000});
    assert.equal(res?.status(),200,origin+route);
    await page.locator("[data-ui-theme-toggle]").first().waitFor({timeout:12000});
    await page.evaluate(async()=>{await document.fonts?.ready;});
    await sleep(150);
    const root=route==="/viewer/"?".viewer-header":".site-header";
    const initial=await state(page,root);
    assert.equal(initial.theme,theme);
    const closed=await page.locator(root).screenshot({animations:"disabled"});
    let open=null,opened=null;
    const toggle=page.locator("#menuToggle");
    if(await toggle.isVisible()){
      await toggle.click();
      opened=await state(page,root);
      assert.equal(opened.expanded,"true");
      assert.equal(opened.isOpen,true);
      open=await page.locator("#primaryNav").screenshot({animations:"disabled"});
    }else{
      assert.equal(await page.locator("#primaryNav").isVisible(),true);
    }
    return {initial,opened,closed,open,errors};
  }finally{await context.close();}
}
const visualBrowser=await chromium.launch({headless:true});
try {
  for(const route of routes)for(const width of widths)for(const theme of themes){
    const before=await sample(visualBrowser,BASE,route,width,theme);
    const after=await sample(visualBrowser,CANDIDATE,route,width,theme);
    assert.deepEqual(after.errors,before.errors,"new page errors "+route+"/"+width+"/"+theme);
    const {menuScriptCount:oldCount,...original}=before.initial;
    const {menuScriptCount:newCount,...updated}=after.initial;
    assert.deepEqual(updated,original,"header markup or CSS changed "+route+"/"+width+"/"+theme);
    assert.equal(after.closed.equals(before.closed),true,"header closed pixels changed "+route+"/"+width+"/"+theme);
    if(before.opened){
      const {menuScriptCount:ignored,...oldOpened}=before.opened;
      const {menuScriptCount:ignoredAgain,...newOpened}=after.opened;
      assert.deepEqual(newOpened,oldOpened,"opened header/CSS changed "+route+"/"+width+"/"+theme);
      assert.equal(after.open.equals(before.open),true,"menu open pixels changed "+route+"/"+width+"/"+theme);
    }else assert.equal(after.opened,null);
    assert.equal(newCount,1,"candidate must use exactly one shared controller "+route);
    report.visual.push({route,width,theme,originalMenuScripts:oldCount,sharedMenuScripts:newCount,passed:true});
    console.log("P_COMP_01_DIFFERENTIAL "+JSON.stringify(report.visual.at(-1)));
  }
}finally{await visualBrowser.close();}

for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 try{
  for(const route of routes)for(const width of [390,1366]){
   const context=await browser.newContext({viewport:{width,height:844},colorScheme:"light",
     reducedMotion:"reduce",locale:"pt-BR",serviceWorkers:"block"});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(errMsg(e)));
   try{
     const res=await page.goto(CANDIDATE+route,{waitUntil:"domcontentloaded",timeout:30000});
     assert.equal(res?.status(),200);
     await page.locator("[data-ui-theme-toggle]").first().waitFor({timeout:12000});
     const toggle=page.locator("#menuToggle"),nav=page.locator("#primaryNav");
     assert.equal(await page.locator('script[src*="/landing/header-menu.js"]').count(),1);
     const visible=await toggle.isVisible();
     if(visible){
       await toggle.focus();
       await page.keyboard.press("Enter");
       assert.equal(await toggle.getAttribute("aria-expanded"),"true","Enter opens");
       assert.equal(await nav.isVisible(),true);
       assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector("#primaryNav a")),true,
         "keyboard open focuses first nav link");
       await page.keyboard.press("Escape");
       assert.equal(await toggle.getAttribute("aria-expanded"),"false","Escape closes");
       assert.equal(await toggle.evaluate(el=>document.activeElement===el),true,"Escape returns focus");
       await toggle.click();
       assert.equal(await toggle.getAttribute("aria-expanded"),"true","pointer opens");
       await page.locator("main").dispatchEvent("pointerdown");
       assert.equal(await toggle.getAttribute("aria-expanded"),"false","outside pointer closes");
       await toggle.click();
       const first=nav.locator("a").first();
       await first.evaluate(el=>el.addEventListener("click",e=>e.preventDefault(),{once:true}));
       await first.click();
       assert.equal(await toggle.getAttribute("aria-expanded"),"false","link closes");
       await toggle.click();
       assert.equal(await toggle.getAttribute("aria-expanded"),"true","no double initialization");
       await toggle.click();
       assert.equal(await toggle.getAttribute("aria-expanded"),"false");
     } else {
       assert.equal(route==="/viewer/",false,"Viewer menu must be available at all widths");
       assert.equal(await nav.isVisible(),true,"desktop primary nav remains visible");
     }
     if(route==="/viewer/"){
       assert.equal(await page.locator(".viewer-header__actions > .back-link + [data-ui-theme-toggle]").count(),1,
         "NAV-005 return immediately before theme");
       assert.equal(await page.locator(".viewer-header__actions > [data-ui-theme-toggle] + #menuToggle").count(),1,
         "NAV-005 theme immediately before menu");
       assert.equal(await page.locator("#primaryNav [aria-current='page']").count(),0);
     }
     if(route==="/"){
       assert.equal(await page.locator("#environmentTrack .environment").count(),5);
       assert.equal(await page.locator("#miniBenefits .mini-benefit").count(),3);
       assert.equal(await page.locator("#benefits .benefit-item").count(),4);
     }
     if(route==="/how-it-works/"){
       const cards=page.locator("[data-economy]");
       assert.equal(await cards.count(),6,"explanation cards preserved");
       await cards.first().click();
       assert.equal(await page.locator("#economyDetail").isVisible(),true,"explanation panel still works");
     }
     assert.deepEqual(errors,[],"script errors "+route);
     const result={engine:engine.name(),route,width,menuVisible:visible,passed:true};
     report.functional.push(result);
     console.log("P_COMP_01_FUNCTIONAL "+JSON.stringify(result));
   }finally{await context.close()}
  }
 }finally{await browser.close()}
}
await writeFile(folder+"/report.json",JSON.stringify({...report,at:new Date().toISOString()},null,2)+"\n");
console.log("P_COMP_01_PASS "+JSON.stringify({differential:report.visual.length,functional:report.functional.length}));
