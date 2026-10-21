import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const require=createRequire(import.meta.url);
const {project}=require("../app/core/public-module-projection.js");
const catalog=require("../app/data/catalog-data.js");
const scene=require("../app/data/scene-data.js");
const baseline="http://127.0.0.1:8124",candidate="http://127.0.0.1:8123";
const artifacts="artifacts/viewer-overview-editorial";
await mkdir(artifacts,{recursive:true});

const finishes=catalog.options.finishes;
const ids=catalog.modules.map(m=>m.entityId);
const published={
  schemaVersion:"ConfiguratorAdministration2D 5.0",revision:1,
  pricing:{internal:"must-not-leak"},
  stages:[{id:"modules-test",kind:"modules",enabled:true,groups:[{sections:[{itemIds:ids}]}]}],
  objects:Object.fromEntries(catalog.modules.map(m=>[m.entityId,{
    title:m.title,description:"",benefits:[...m.benefits],
    components:[...m.components],requirements:[...m.requirements]
  }])),
  finishes:finishes.map(x=>({id:x.id,enabled:x.status==="published",scope:"global"})),
  materialGroups:[{id:"fronts-all",materialIds:finishes.map(x=>x.id)}],
  materials:finishes.map(x=>({id:x.id,label:x.publicLabel,kind:"texture",
    color:x.color,textureAsset:x.textureAsset,textureSize:x.textureSize})),
  initialState:{entities:Object.fromEntries(ids.map(id=>[id,true])),finishId:"base-light"}
};
const fixture=project(published,catalog,scene);
const specialCases=[
  {id:ids[0],benefits:[],description:""},
  {id:ids[1],benefits:["Destaque de teste"],description:""},
  {id:ids[2],benefits:["Benefício visual de teste A","Benefício visual de teste B","Benefício visual de teste C"],description:"Descrição de teste do módulo"},
  {id:ids[3],benefits:[
    "Benefício de teste com um rótulo bem mais extenso para avaliar a quebra de linha",
    "Outro benefício de teste para avaliar a densidade do card",
    "Terceiro benefício de teste que não deve sobrepor as dimensões",
    "Quarto benefício de teste para exercitar a extensão vertical"
  ],description:"Descrição de teste opcional, sem interferência no valor comercial"}
];
for(const c of specialCases){const item=fixture.modules.find(m=>m.id===c.id);item.benefits=c.benefits;item.description=c.description;}
const forbidden=["priceBook","itemBase","pricing","privateToken"];
for(const word of forbidden)assert.equal(JSON.stringify(fixture).includes('"'+word+'"'),false,word);

async function load(browser,origin,width,theme,moduleId){
 const context=await browser.newContext({viewport:{width,height:820},
   deviceScaleFactor:1,locale:"pt-BR",colorScheme:theme,reducedMotion:"reduce"});
 await context.addInitScript(mode=>{localStorage.setItem("casa-ui-theme-mode-v1",mode);},theme);
 await context.route("**/api/public-modules",route=>route.fulfill({
   status:200,contentType:"application/json",body:JSON.stringify(fixture)
 }));
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 const response=await page.goto(origin+"/viewer/?module="+encodeURIComponent(moduleId),{waitUntil:"domcontentloaded",timeout:30000});
 assert.equal(response?.status(),200);
 await page.locator(".block-overview .overview-title").waitFor({state:"visible",timeout:12000});
 await page.evaluate(async()=>{await document.fonts?.ready;});
 const data=await page.evaluate(()=>{
   const rect=el=>{const r=el?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}:null;};
   const overview=document.querySelector(".block-overview");
   const dimensions=overview.querySelector(".dimension-pill");
   const benefits=[...overview.querySelectorAll(".overview-highlights li")];
   const footer=overview.querySelector(".overview-footer");
   const li=benefits[0];
   const markerStyle=li?getComputedStyle(li,"::before"):null;
   return {
     overview:rect(overview),
     title:overview.querySelector(".overview-title")?.textContent,
     benefits:benefits.map(el=>({text:el.textContent,rect:rect(el)})),
     benefitFont:li?getComputedStyle(li).fontSize:null,
     bulletWidth:markerStyle?.width??null,
     footer:rect(footer),dimension:rect(dimensions),
     dimensionText:dimensions?.textContent??null,
     viewport:document.documentElement.clientWidth,
     overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
     unpublishedCommercialTerms:[...overview.querySelectorAll("[class*=price],[class*=valor],[data-price]")].length
   };
 });
 const screenshot=await page.locator(".block-overview").screenshot({animations:"disabled"});
 assert.deepEqual(errors,[]);
 await context.close();
 return {data,screenshot};
}
const results=[];
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [390,1366])for(const theme of ["light","dark"])for(const c of specialCases){
   const [before,after]=await Promise.all([
     load(browser,baseline,width,theme,c.id),load(browser,candidate,width,theme,c.id)
   ]);
   assert.equal(after.data.title,before.data.title,"published title changed");
   assert.equal(after.data.benefits.length,c.benefits.length,"benefit content lost");
   assert.deepEqual(after.data.benefits.map(x=>x.text),c.benefits);
   assert.equal(after.data.dimensionText,before.data.dimensionText,"nominal dimensions changed");
   assert.equal(after.data.unpublishedCommercialTerms,0,"price must stay absent");
   assert.equal(after.data.overflow,false,"horizontal overflow introduced");
   assert.ok(after.data.footer,"footer absent");
   assert.ok(after.data.dimension,"dimension absent");
   assert.ok(after.data.dimension.y>=after.data.overview.y+1,"dimension remains inside card");
   assert.ok(after.data.dimension.bottom<=after.data.overview.bottom+1,"dimension outside card");
   assert.ok(after.data.dimension.x<after.data.overview.x+after.data.overview.width/2,"dimension not left aligned");
   if(c.benefits.length){
     assert.ok(parseFloat(after.data.benefitFont)>parseFloat(before.data.benefitFont),
       "typography not larger");
     assert.ok(parseFloat(after.data.bulletWidth)>parseFloat(before.data.bulletWidth),
       "bullets not larger");
     const last=after.data.benefits.at(-1).rect;
     assert.ok(last.bottom<=after.data.dimension.y+1,"benefits overlap footer");
   }
   if(width===1366){
     assert.ok(after.data.dimension.y>=before.data.dimension.y-1,"footer not anchored lower");
   }
   const scenario={engine:engine.name(),width,theme,moduleId:c.id,benefits:c.benefits.length,
     largerBenefits:true,footerBottomLeft:true,noPrice:true,errors:0};
   results.push(scenario);
   if(c.id===ids[2]){
     await writeFile(artifacts+"/"+engine.name()+"-"+width+"-"+theme+"-main.png",before.screenshot);
     await writeFile(artifacts+"/"+engine.name()+"-"+width+"-"+theme+"-candidate.png",after.screenshot);
   }
   console.log("VIEWER_OVERVIEW_EDITORIAL_PASS "+JSON.stringify(scenario));
  }
 }finally{await browser.close();}
}
await writeFile(artifacts+"/report.json",JSON.stringify({schema:"ViewerOverviewEditorialGate0.1",results},null,2));
console.log("VIEWER_OVERVIEW_EDITORIAL_RESULT PASS "+results.length+"/32");
