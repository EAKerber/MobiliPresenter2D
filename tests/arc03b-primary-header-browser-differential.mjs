import assert from "node:assert/strict";
import { readFile,writeFile,mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium,webkit } from "playwright";
import { PNG } from "pngjs";
import { OUT } from "../scripts/compile-primary-pages.mjs";

const origin="http://127.0.0.1:8123";
const scenes=[
 {route:"/",source:"index.html"},
 {route:"/about/",source:"about/index.html"},
 {route:"/how-it-works/",source:"how-it-works/index.html"}
];
const widths=[320,390,486,768,1366],themes=["light","dark"];
const report={schema:"M2DARC03BHeaderDifferential/0.1",scenarios:[],
 control:"Baseline static app with generated HTML overlaid for document requests only; all CSS/JS/assets served from same original app directory",
 tolerance:{maxChannel:1,maxPixelFraction:0.001},
 limitations:["Not a release or a build cutover","Does not validate authenticated Configurator or Netlify functions","Only primary public header, no Viewer header migration"]};
const imageDifference=(a,b)=>{
 const x=PNG.sync.read(a),y=PNG.sync.read(b);
 if(x.width!==y.width||x.height!==y.height)return{kind:"differentDimensions"};
 let changed=0,maxChannel=0;
 for(let i=0;i<x.data.length;i+=4){
  let d=0;for(let k=0;k<4;k++)d=Math.max(d,Math.abs(x.data[i+k]-y.data[i+k]));
  if(d>0){changed++;maxChannel=Math.max(d,maxChannel);}
 }
 return{kind:"pixels",changed,all:x.width*x.height,
   fraction:changed/(x.width*x.height),maxChannel};
};

async function evaluate(browser,scenario,width,theme,sourceHtml){
 const context=await browser.newContext({viewport:{width,height:850},
   locale:"pt-BR",colorScheme:theme,reducedMotion:"reduce",deviceScaleFactor:1,
   serviceWorkers:"block"});
 await context.addInitScript(t=>localStorage.setItem("casa-ui-theme-mode-v1",t),theme);
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.name||"Error"));
 if(sourceHtml){
  await page.route("**/*",route=>{
   const req=route.request();
   if(req.isNavigationRequest()&&req.resourceType()==="document"&&
       new URL(req.url()).pathname===scenario.route){
     return route.fulfill({status:200,contentType:"text/html; charset=utf-8",body:sourceHtml});
   }
   return route.continue();
  });
 }
 try{
  const r=await page.goto(origin+scenario.route,{waitUntil:"domcontentloaded",timeout:30000});
  assert.equal(r?.status(),200);
  await page.locator(".site-header").waitFor({timeout:12000});
  await page.evaluate(async()=>{
   await document.fonts.ready;
   await Promise.all([...document.querySelectorAll(".site-header img")].map(i=>i.decode().catch(()=>{})));
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
  const data=await page.evaluate(()=>{
   const header=document.querySelector(".site-header"),nav=document.querySelector("#primaryNav"),
      toggle=document.querySelector("#menuToggle");
   const metrics=el=>{
    const c=getComputedStyle(el),r=el.getBoundingClientRect();
    return {display:c.display,visibility:c.visibility,color:c.color,
      backgroundColor:c.backgroundColor,fontSize:c.fontSize,opacity:c.opacity,
      width:Math.round(r.width*100)/100,height:Math.round(r.height*100)/100,
      x:Math.round(r.x*100)/100,y:Math.round(r.y*100)/100};
   };
   return {markup:header.outerHTML.replace(/>\s+</g,"><"),
    header:metrics(header),nav:metrics(nav),toggle:metrics(toggle),
    active:[...nav.querySelectorAll("[aria-current='page']")].map(x=>x.getAttribute("href")),
    target:document.documentElement.dataset.theme,
    bodyClass:document.body.className};
  });
  assert.equal(data.target,theme);
  assert.equal(data.active.length,1);
  const closed=await page.locator(".site-header").screenshot({animations:"disabled"});
  let open=null,expanded=null;
  if(await page.locator("#menuToggle").isVisible()){
    await page.locator("#menuToggle").click();
    expanded=await page.locator("#menuToggle").getAttribute("aria-expanded");
    assert.equal(expanded,"true");
    open=await page.locator(".site-header").screenshot({animations:"disabled"});
  }
  return{data,closed,open,expanded,errors};
 }finally{await context.close();}
}
await mkdir("artifacts/arc03b/browser",{recursive:true});
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 try{
  for(const scene of scenes){
   const html=await readFile(join(OUT,scene.source),"utf8");
   for(const width of widths)for(const theme of themes){
    const before=await evaluate(browser,scene,width,theme,null);
    const after=await evaluate(browser,scene,width,theme,html);
    assert.deepEqual(after.data,before.data,"DOM/CSS/layout drift "+scene.route+"/"+width+"/"+theme);
    assert.deepEqual(after.errors,before.errors,"JS errors changed");
    assert.equal(after.expanded,before.expanded);
    const shotPairs=[["closed",before.closed,after.closed]];
    if(before.open||after.open){assert.ok(before.open&&after.open);shotPairs.push(["open",before.open,after.open]);}
    const raster=[];
    for(const [state,x,y] of shotPairs){
     if(x.equals(y))continue;
     const d=imageDifference(x,y);
     const id=engine.name()+"-"+scene.source.replaceAll("/","_")+"-"+width+"-"+theme+"-"+state;
     await writeFile("artifacts/arc03b/browser/"+id+"-before.png",x);
     await writeFile("artifacts/arc03b/browser/"+id+"-after.png",y);
     console.log("ARC03B_RASTER_DELTA "+JSON.stringify({scene:scene.route,width,theme,state,...d}));
     assert.ok(d.kind==="pixels"&&d.maxChannel<=1&&d.fraction<=0.001,
        "Header screenshot regression "+JSON.stringify(d));
     raster.push({state,...d});
    }
    report.scenarios.push({engine:engine.name(),route:scene.route,width,theme,
      openHeaderCompared:!!before.open,DOMAndComputedCSSIdentical:true,raster});
    console.log("ARC03B_HEADER_PASS "+JSON.stringify({engine:engine.name(),route:scene.route,width,theme,rasterExceptions:raster.length}));
   }
  }
 }finally{await browser.close();}
}
assert.equal(report.scenarios.length,60);
await writeFile("artifacts/arc03b/browser/gate.json",JSON.stringify(report,null,2)+"\n");
console.log("ARC03B_BROWSER_PASS "+JSON.stringify({scenarios:report.scenarios.length,
  rasterCases:report.scenarios.filter(x=>x.raster.length).length}));
