import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";
const require=createRequire(import.meta.url);
const {project}=require("../app/core/public-module-projection.js");
const catalog=require("../app/data/catalog-data.js");
const scene=require("../app/data/scene-data.js");
const finishing=catalog.options.finishes;
const ids=catalog.modules.map(m=>m.entityId);
const base={
  schemaVersion:"ConfiguratorAdministration2D 5.0",
  stages:[{kind:"modules",enabled:true,groups:[{sections:[{itemIds:ids}]}]}],
  objects:Object.fromEntries(catalog.modules.map(m=>[m.entityId,{
    title:m.title,description:"",benefits:[...m.benefits],components:[...m.components],requirements:[...m.requirements]
  }])),
  finishes:finishing.map(f=>({id:f.id,enabled:f.status==="published",scope:"global"})),
  materialGroups:[{id:"fronts-all",materialIds:finishing.map(f=>f.id)}],
  materials:finishing.map(f=>({id:f.id,label:f.publicLabel,kind:"texture",color:f.color,textureAsset:f.textureAsset,textureSize:f.textureSize})),
  initialState:{entities:Object.fromEntries(ids.map(id=>[id,true])),finishId:"base-light"},
  pricing:{roles:{itemBase:Object.fromEntries(ids.map((id,i)=>[id,{type:"amount",cents:i===0?45200:i===1?12345678:10000+i*10000}]))}}
};
const on=project({...base,viewerPricePublication:{enabled:true}},catalog,scene);
const off=project({...base,viewerPricePublication:{enabled:false}},catalog,scene);
const venue="http://127.0.0.1:8123";
await mkdir("artifacts/viewer-base-price",{recursive:true});
let total=0;
for(const [name,engine] of [["chromium",chromium],["webkit",webkit]]){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [390,1366])for(const theme of ["light","dark"])for(const [permission,fixture] of [["on",on],["off",off]]){
   const context=await browser.newContext({viewport:{width,height:820},deviceScaleFactor:1,locale:"pt-BR",colorScheme:theme,reducedMotion:"reduce"});
   await context.addInitScript(x=>localStorage.setItem("casa-ui-theme-mode-v1",x),theme);
   await context.route("**/api/public-modules",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(fixture)}));
   const page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   const response=await page.goto(venue+"/viewer/?module=module-01",{waitUntil:"domcontentloaded",timeout:30000});
   assert.equal(response?.status(),200);
   await page.locator(".overview-title").waitFor({state:"visible",timeout:12000});
   const footer=page.locator(".overview-footer");
   const price=page.locator(".overview-base-price");
   const dimension=page.locator(".dimension-pill");
   assert.equal(await dimension.count(),1,"dimension disappeared");
   if(permission==="on"){
    assert.equal(await price.count(),1,"ON must display price");
    assert.match(await price.innerText(),/Valor base do módulo/);
    assert.match(await price.innerText(),/R\$\s*452,00/);
    const a=await dimension.boundingBox(),b=await price.boundingBox(),c=await footer.boundingBox();
    assert.ok(a&&b&&c);
    assert.ok(a.x < b.x,"dimensions left, price right");
    assert.ok(b.x+b.width<=c.x+c.width+2,"price within footer");
    assert.ok(a.y>=c.y-1&&b.y>=c.y-1,"footer content position");
   }else{
    assert.equal(await price.count(),0,"OFF must render no price");
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false,"horizontal overflow");
   assert.deepEqual(errors,[]);
   if(width===390)await page.locator(".block-overview").screenshot({path:`artifacts/viewer-base-price/${name}-${width}-${theme}-${permission}.png`,animations:"disabled"});
   await context.close();total++;
  }
 }finally{await browser.close();}
}
console.log("VIEWER_BASE_PRICE_BROWSER_RESULT",JSON.stringify({passed:total,expected:16}));
assert.equal(total,16);
