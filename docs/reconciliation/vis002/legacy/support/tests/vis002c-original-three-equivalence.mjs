// P-TOKEN-02B old three: exact v0.1 vs v0.2 comparison on SAME DOM.
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {chromium,webkit} from "playwright";
const origin="http://127.0.0.1:8123";
const routes=[
 {path:"/",selector:".hero-description"},
 {path:"/how-it-works/",selector:".how-hero-note"},
 {path:"/about/",selector:".about-scale p:not(.eyebrow)"}
];
const v1="/design-system/approved-contextual-support-text.css?v=vis002-ctx-0.1.0";
const v2="/design-system/approved-contextual-support-text-v2.css?v=vis002-ctx-0.2.0";
const token="--ds-vis002-approved-support-text-light";
await mkdir("artifacts/vis002c-original-three",{recursive:true});
const cases=[];
for(const [engine,lib] of [["chromium",chromium],["webkit",webkit]]){
 const browser=await lib.launch({headless:true});
 try{
  for(const route of routes)for(const width of [320,390,768,1366])for(const theme of ["light","dark"]){
   const page=await browser.newPage({viewport:{width,height:844},colorScheme:theme,reducedMotion:"reduce",deviceScaleFactor:1});
   try{
    await page.addInitScript(mode=>localStorage.setItem("casa-ui-theme-mode-v1",mode),theme);
    const res=await page.goto(origin+route.path,{waitUntil:"domcontentloaded",timeout:20000});
    assert.equal(res?.status(),200,route.path);
    assert.equal(await page.locator("html").getAttribute("data-theme"),theme);
    const loc=page.locator(route.selector).first();
    await loc.waitFor({state:"visible",timeout:10000});
    await page.evaluate(async()=>{
      await document.fonts.ready;
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    });
    if(route.path==="/")await page.waitForTimeout(800);
    // Stable locator: href itself changes from v0.2 to v0.1 and back.
    const link=page.locator('link[rel="stylesheet"][href*="approved-contextual-support-text"]');
    assert.equal(await link.count(),1);
    async function read(){
     const stats=await loc.evaluate((element,property)=>{
      const c=getComputedStyle(element),r=element.getBoundingClientRect();
      return {color:c.color,background:c.backgroundColor,fontFamily:c.fontFamily,fontSize:c.fontSize,
       fontWeight:c.fontWeight,lineHeight:c.lineHeight,letterSpacing:c.letterSpacing,
       opacity:c.opacity,width:r.width,height:r.height,x:r.left+scrollX,y:r.top+scrollY,
       content:element.textContent,token:c.getPropertyValue(property).trim()};
     },token);
     const shot=await loc.screenshot({animations:"disabled"});
     return {stats,shot};
    }
    const extended=await read();
    async function swap(href){
     await link.evaluate((el,url)=>new Promise((resolve,reject)=>{
      const onLoad=()=>{el.removeEventListener("load",onLoad);el.removeEventListener("error",onError);resolve()};
      const onError=()=>{el.removeEventListener("load",onLoad);el.removeEventListener("error",onError);reject(new Error("Stylesheet failed "+url))};
      el.addEventListener("load",onLoad,{once:true});el.addEventListener("error",onError,{once:true});
      el.setAttribute("href",url);
     }),href);
     await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    }
    await swap(v1);
    const original=await read();
    await swap(v2);
    const roundtrip=await read();
    const key=JSON.stringify({engine,width,theme,route:route.path});
    assert.deepEqual(original.stats,extended.stats,"v0.1/v0.2 changed computed CSS "+key);
    assert.deepEqual(roundtrip.stats,extended.stats,"v0.2 restore changed CSS "+key);
    assert.ok(original.shot.equals(extended.shot),"v0.1/v0.2 original consumer raster changed "+key);
    assert.ok(roundtrip.shot.equals(extended.shot),"v0.2 restore raster changed "+key);
    assert.equal(extended.stats.token,theme==="light"?"#705C4B":"","Approved token missing "+key);
    cases.push({engine,width,theme,route:route.path,selector:route.selector,identical:true});
   }finally{await page.close();}
  }
 }finally{await browser.close();}
}
assert.equal(cases.length,48);
await writeFile("artifacts/vis002c-original-three/report.json",JSON.stringify({schema:"P_TOKEN_02B_v0.1_to_v0.2_equivalence",method:"same-DOM stylesheet toggle, exact raster equality, full computed CSS and reversible roundtrip",cases},null,2)+"\n");
console.log("P_TOKEN_02B_V2_ORIGINAL_EQUIVALENCE_PASS "+JSON.stringify({scenarios:cases.length,byteIdenticalScreenshots:cases.length,computedUnchanged:cases.length}));
