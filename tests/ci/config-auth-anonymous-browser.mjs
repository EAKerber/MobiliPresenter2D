// CI-BASELINE-01: negative test only. Never authenticates or reads private HTML.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {chromium} from "playwright";

const base=process.env.CI_ANON_TARGET_ORIGIN||"https://mobilipresenter2d.netlify.app";
const origin=new URL(base).origin;
assert.ok(origin==="https://mobilipresenter2d.netlify.app"
 || /^https:\/\/deploy-preview-\d+--mobilipresenter2d\.netlify\.app$/.test(origin),
 "Anonymous gate target must be the known public host or an existing PR preview");
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({serviceWorkers:"block"});
const errors=[],scriptTasks=[];
const safePath=url=>{
 try{return new URL(url).pathname;}catch{return "invalid";}
};
page.on("pageerror",error=>errors.push(error.name||"Error"));
page.on("response",response=>{
 if(response.request().resourceType()!=="script")return;
 scriptTasks.push((async()=>{
  try{
   const bytes=await response.body();
   return {path:safePath(response.url()),status:response.status(),
    gitIndependentSha256:createHash("sha256").update(bytes).digest("hex")};
  }catch{return {path:safePath(response.url()),status:response.status(),bodyUnavailable:true};}
 })());
});
let report={schema:"M2DCIConfigAnonymousReadiness/1",origin:new URL(origin).hostname,
 requested:"/config/",status:"UNVERIFIED"};
try{
 const response=await page.goto(new URL("/config/",origin).toString(),{
  waitUntil:"domcontentloaded",timeout:25000});
 const finalPath=safePath(page.url());
 const nav=[];
 let request=response?.request();
 while(request){nav.unshift({path:safePath(request.url())});request=request.redirectedFrom();}
 report={...report,finalPath,finalHTTPStatus:response?.status(),redirectChain:nav,
  title:await page.title(),
  flags:await page.evaluate(()=>({
   configuratorWorkspace:Boolean(document.querySelector(".workspace")),
   debugAPI:Boolean(window.CASA_EM_MODULOS_DEBUG),
   accessConfirmButton:Boolean(document.querySelector("#confirmAccess"))
  })),
  scripts:await Promise.all(scriptTasks),
  jsErrorClasses:errors};
 assert.equal(finalPath,"/access/","Anonymous /config/ must redirect to /access/");
 assert.equal(response?.status(),200,"Public access landing must respond 200");
 assert.equal(report.flags.configuratorWorkspace,false,"Private workspace leaked to anonymous browser");
 assert.equal(report.flags.debugAPI,false,"Private config debug API leaked to anonymous browser");
 assert.equal(report.flags.accessConfirmButton,true,"Access screen did not initialize");
 report.status="ANONYMOUS_REDIRECT_PASS";
 console.log("CI_CONFIG_ANONYMOUS_PASS "+JSON.stringify({
  finalPath,status:report.finalHTTPStatus,workspace:report.flags.configuratorWorkspace,
  debug:report.flags.debugAPI,scriptCount:report.scripts.length
 }));
}finally{
 await mkdir("artifacts/ci-baseline-01",{recursive:true});
 await writeFile("artifacts/ci-baseline-01/anonymous.json",JSON.stringify(report,null,2)+"\n");
 await browser.close();
}
