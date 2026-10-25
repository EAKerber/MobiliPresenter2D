import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import pg from "pg";
import {chromium} from "playwright";
import {SUPABASE_DATABASE_CA} from "../../netlify/access/supabase-database-ca.mjs";
import {createOpaqueToken,hashOpaqueToken,ACCESS_COOKIE_NAME} from "../../netlify/access/tokens.mjs";
import {validateFixtureEnvironment,safeErrorClass,ISOLATION_TAG} from "./config-auth-isolation.mjs";

// CI-BASELINE-01: positive integration against the dedicated test site and user-confirmed internal test DB. All session secrets remain in memory.
const out="artifacts/ci-baseline-01/authenticated.json";
await mkdir("artifacts/ci-baseline-01",{recursive:true});
let report={schema:"M2DCIIsolatedSessionFixture/1",classification:"BLOCKED_AUTH_FIXTURE",
  stage:"preflight",realAccessRedeem:false,bootstrap:false,revoked:false};
let db,browser,context,grantId,jsErrors=[];
try{
 const input={
  origin:process.env.CI_STAGING_ORIGIN,
  databaseUrl:process.env.CI_STAGING_DATABASE_URL,
  projectRef:process.env.CI_STAGING_SUPABASE_REF,
  expectedHost:process.env.CI_STAGING_EXPECTED_HOST,
  isolationTag:process.env.CI_STAGING_ISOLATION_TAG
 };
 const gate=validateFixtureEnvironment(input);
 report.stage="staging-site-preflight";
 const stagingAccess=await fetch(new URL("/access/",gate.origin));
 assert.equal(new URL(stagingAccess.url).pathname,"/access/",
  "BLOCKED_AUTH_FIXTURE: dedicated staging site did not serve /access/");
 assert.equal(stagingAccess.status,200,
  "BLOCKED_AUTH_FIXTURE: dedicated staging app did not return HTTP 200");
 report.stage="isolated-role-check";
 db=new pg.Client({connectionString:input.databaseUrl,
  ssl:{ca:SUPABASE_DATABASE_CA,rejectUnauthorized:true},
  connectionTimeoutMillis:6000,application_name:"m2d-ci-access-fixture"});
 await db.connect();
 const role=await db.query("select current_user as name");
 assert.equal(role.rows[0]?.name,"access_ci_fixture",
  "BLOCKED_AUTH_FIXTURE: database connection role is not access_ci_fixture");
 const functions=await db.query("select to_regprocedure('access_control.ci_create_config_fixture_grant(uuid,text)') as create_fn, "+
  "to_regprocedure('access_control.ci_revoke_config_fixture_grant(uuid)') as revoke_fn");
 assert.ok(functions.rows[0]?.create_fn&&functions.rows[0]?.revoke_fn,
  "BLOCKED_AUTH_FIXTURE: fixture functions absent; apply the reviewed migration first");

 // Only nonreal address in the RFC-reserved example domain. Five-minute grant.
 grantId=randomUUID();
 const grantToken=createOpaqueToken();
 await db.query("SELECT access_control.ci_create_config_fixture_grant($1::uuid,$2::text)",
  [grantId,hashOpaqueToken(grantToken)]);
 report.stage="real-redeem";
 browser=await chromium.launch({headless:true});
 context=await browser.newContext({viewport:{width:1366,height:768},serviceWorkers:"block"});
 const page=await context.newPage();
 jsErrors=[];
 page.on("pageerror",error=>jsErrors.push(error.name||"Error"));
 const redeem=await context.request.post(new URL("/api/access/redeem",gate.origin).toString(),{
  headers:{Origin:gate.origin,"Content-Type":"application/json"},
  data:{token:grantToken},timeout:15000
 });
 assert.equal(redeem.status(),200,"Access redeem rejected isolated fixture");
 const redeemBody=await redeem.json();
 assert.equal(redeemBody?.ok,true,"Access redeem returned not-ok");
 report.realAccessRedeem=true;
 // Grant secret is never written to disk or echoed. The browser context's
 // HttpOnly cookie comes from the *real* redeem endpoint.
 const cookies=await context.cookies(gate.origin);
 assert.ok(cookies.some(c=>c.name===ACCESS_COOKIE_NAME),
  "BLOCKED_AUTH_FIXTURE: redeem did not establish a scoped browser cookie");
 report.stage="authenticated-readiness";
 const config=await page.goto(new URL("/config/",gate.origin).toString(),{
  waitUntil:"domcontentloaded",timeout:20000});
 assert.equal(config?.status(),200,"Authenticated Config HTML not returned");
 assert.equal(new URL(page.url()).pathname,"/config/","Authenticated session redirected away");
 await page.waitForFunction(()=>Boolean(window.CASA_EM_MODULOS_DEBUG &&
  typeof window.CASA_EM_MODULOS_DEBUG.getLayoutProfile==="function"),null,{timeout:20000});
 assert.ok(await page.locator(".workspace").count()>0,"Configurator workspace not found");
 report.bootstrap=true;
 report.layoutProfile=await page.evaluate(()=>window.CASA_EM_MODULOS_DEBUG.getLayoutProfile());
 report.stage="ds05a-config-surface";
 // DS-05A Config surface: collect readiness booleans only; never persist prices or customer/configuration data.
 const ds05aConfigSurface=await page.evaluate(()=>{
  const visible=(element)=>{
   if(!element||element.hidden)return false;
   const style=getComputedStyle(element),rect=element.getBoundingClientRect();
   return style.display!=="none"&&style.visibility==="visible"&&rect.width>0&&rect.height>0;
  };
  const visibleText=document.querySelector("#visibleCount")?.textContent?.trim()||"";
  const totalText=document.querySelector("#totalCount")?.textContent?.trim()||"";
  const price=document.querySelector("#configurationValue");
  const priceText=price?.textContent?.trim()||"";
  const next=document.querySelector("#nextStepButton");
  const visibleCount=Number(visibleText),totalCount=Number(totalText);
  return {
   visibleCountReady:visibleText.length>0&&Array.from(visibleText).every(ch=>ch>="0"&&ch<="9"),
   totalCountReady:totalText.length>0&&Array.from(totalText).every(ch=>ch>="0"&&ch<="9"),
   visibleCountWithinTotal:Number.isFinite(visibleCount)&&Number.isFinite(totalCount)&&visibleCount>=0&&visibleCount<=totalCount,
   priceBarVisible:visible(price),
   priceBarHasText:Boolean(priceText),
   priceEstimateHasCurrency:priceText.includes("R$")&&Array.from(priceText).some(ch=>ch>="0"&&ch<="9"),
   nextStepVisible:visible(next)&&!next.disabled
  };
 });
 assert.ok(ds05aConfigSurface.visibleCountReady&&ds05aConfigSurface.totalCountReady&&
  ds05aConfigSurface.visibleCountWithinTotal,"DS-05A: Config module counters not ready");
 assert.ok(ds05aConfigSurface.priceBarVisible&&ds05aConfigSurface.priceBarHasText,
  "DS-05A: Config price/status bar not visible");
 assert.ok(ds05aConfigSurface.nextStepVisible,"DS-05A: next-step action not visible");
 report.ds05aConfigSurface=ds05aConfigSurface;
 report.stage="ds05a-module-interactions";
 // Exercise two client-side module changes; restore each checkbox and counter before continuing.
 const availableModuleToggles=page.locator("[data-module-toggle]:not(:disabled)");
 const moduleToggleCount=await availableModuleToggles.count();
 assert.ok(moduleToggleCount>=2,"DS-05A: fewer than two enabled module toggles rendered");
 const priceEstimateStatus=async()=>page.evaluate(()=>{
  const price=document.querySelector("#configurationValue");
  const text=price?.textContent?.trim()||"";
  const style=price&&getComputedStyle(price),rect=price?.getBoundingClientRect();
  return {
   visible:Boolean(price&&!price.hidden&&style?.display!=="none"&&style?.visibility==="visible"&&rect?.width>0&&rect?.height>0),
   hasCurrency:text.includes("R$")&&Array.from(text).some(ch=>ch>="0"&&ch<="9")
  };
 });
 const exerciseModuleToggle=async(index)=>{
  const moduleToggle=availableModuleToggles.nth(index);
  const originalModuleChecked=await moduleToggle.isChecked();
  const originalVisibleCount=Number((await page.locator("#visibleCount").textContent())?.trim());
  assert.ok(Number.isFinite(originalVisibleCount),"DS-05A: initial visible count is not numeric");
  if(originalModuleChecked)await moduleToggle.uncheck();else await moduleToggle.check();
  await page.waitForFunction((previous)=>{
   const count=Number(document.querySelector("#visibleCount")?.textContent?.trim());
   return Number.isFinite(count)&&count!==previous;
  },originalVisibleCount,{timeout:10000});
  const changedEstimate=await priceEstimateStatus();
  assert.ok(changedEstimate.visible&&changedEstimate.hasCurrency,
   "DS-05A: price estimate missing after module toggle");
  if(originalModuleChecked)await moduleToggle.check();else await moduleToggle.uncheck();
  await page.waitForFunction(({expected,index,visibleCount})=>{
   const toggles=Array.from(document.querySelectorAll("[data-module-toggle]:not(:disabled)"));
   const count=Number(document.querySelector("#visibleCount")?.textContent?.trim());
   return toggles[index]?.checked===expected&&count===visibleCount;
  },{expected:originalModuleChecked,index,visibleCount:originalVisibleCount},{timeout:10000});
  const restoredEstimate=await priceEstimateStatus();
  assert.ok(restoredEstimate.visible&&restoredEstimate.hasCurrency,
   "DS-05A: price estimate missing after restoring module toggle");
 };
 await exerciseModuleToggle(0);
 await exerciseModuleToggle(1);
 report.ds05aConfigInteraction={
  twoModuleTogglesAvailable:true,
  firstModuleChangedAndRestored:true,
  secondModuleChangedAndRestored:true,
  priceEstimateVisibleAfterToggleAndRestore:true
 };
 const ds05aStageProgression={};
 const captureNavigationDiagnostic=async(key)=>page.evaluate((stepKey)=>{
  const target=document.querySelector(`.flow-nav [data-step="${stepKey}"]`);
  const rect=target?.getBoundingClientRect();
  const active=document.activeElement;
  return {
   targetFound:Boolean(target),
   targetTag:target?.tagName||null,
   targetDisabled:Boolean(target?.disabled),
   targetAriaDisabled:target?.getAttribute("aria-disabled")||null,
   targetCurrent:target?.getAttribute("aria-current")||null,
   targetClass:typeof target?.className==="string"?target.className.slice(0,120):null,
   targetRect:rect?{width:rect.width,height:rect.height}:null,
   currentSteps:Array.from(document.querySelectorAll(".flow-nav [data-step]")).map(node=>({
    step:node.getAttribute("data-step"),current:node.getAttribute("aria-current"),disabled:Boolean(node.disabled),ariaDisabled:node.getAttribute("aria-disabled")
   })),
   activeElement:active?{tag:active.tagName,id:active.id||null,role:active.getAttribute("role")}:null,
   visiblePanels:Array.from(document.querySelectorAll("#finishesStagePanel,#servicesPanel,#summaryPanel")).filter(panel=>!panel.hidden).map(panel=>panel.id)
  };
 },key);
 const expectedStages=[
  {id:"finishesStagePanel",key:"finishes"},
  {id:"servicesPanel",key:"services"},
  {id:"summaryPanel",key:"summary"}
 ];
 for(const stage of expectedStages){
  if(stage.key==="finishes"){
   report.stage="ds05a-finishes-next-action-readiness";
   try{
    await page.waitForFunction(()=>{
     const button=document.querySelector("#nextStepButton");
     const style=button&&getComputedStyle(button),rect=button?.getBoundingClientRect();
     return Boolean(button&&!button.disabled&&style?.display!=="none"&&style?.visibility==="visible"&&rect?.width>0&&rect?.height>0);
    },null,{timeout:10000});
   }catch(error){
    report.nextActionDiagnostic=await page.evaluate(()=>{
     const button=document.querySelector("#nextStepButton");
     const style=button&&getComputedStyle(button),rect=button?.getBoundingClientRect();
     return {
      buttonPresent:Boolean(button),buttonDisabled:Boolean(button?.disabled),buttonAriaDisabled:button?.getAttribute("aria-disabled")||null,
      buttonHidden:Boolean(button?.hidden),buttonDisplay:style?.display||null,buttonVisibility:style?.visibility||null,
      buttonHasArea:Boolean(rect&&rect.width>0&&rect.height>0),
      currentStep:document.querySelector(".flow-nav [aria-current=step]")?.getAttribute("data-step")||null,
      visiblePanels:Array.from(document.querySelectorAll("#finishesStagePanel,#servicesPanel,#summaryPanel")).filter(panel=>!panel.hidden).map(panel=>panel.id),
      enabledModuleToggleCount:document.querySelectorAll("[data-module-toggle]:not(:disabled)").length,
      checkedModuleToggleCount:document.querySelectorAll("[data-module-toggle]:not(:disabled):checked").length,
      visibleCount:document.querySelector("#visibleCount")?.textContent?.trim()||null
     };
    });
    throw error;
   }
   report.stage="ds05a-finishes-next-action";
   await page.locator("#nextStepButton").click({timeout:10000});
  }else{
   report.stage="ds05a-"+stage.key+"-next-action-readiness";
   const nextAction=page.locator("#nextStepButton");
   await nextAction.waitFor({state:"visible",timeout:10000});
   await page.waitForFunction(()=>{
    const button=document.querySelector("#nextStepButton");
    const style=button&&getComputedStyle(button),rect=button?.getBoundingClientRect();
    return Boolean(button&&!button.disabled&&style?.display!=="none"&&style?.visibility==="visible"&&rect?.width>0&&rect?.height>0);
   },null,{timeout:10000});
   report.stage="ds05a-"+stage.key+"-next-action";
   try{
    await nextAction.click({timeout:10000});
   }catch(error){
    report.nextActionDiagnostic=await page.evaluate(()=>{
     const button=document.querySelector("#nextStepButton");
     const rect=button?.getBoundingClientRect();
     return {
      buttonPresent:Boolean(button),buttonDisabled:Boolean(button?.disabled),
      buttonHasArea:Boolean(rect&&rect.width>0&&rect.height>0),
      currentStep:document.querySelector(".flow-nav [aria-current=step]")?.dataset.step||null,
      visiblePanels:Array.from(document.querySelectorAll("#finishesStagePanel,#servicesPanel,#summaryPanel")).filter(panel=>!panel.hidden).map(panel=>panel.id)
     };
    });
    throw error;
   }
   try{
    await page.waitForFunction((key)=>
     document.querySelector(".flow-nav [aria-current=step]")?.dataset.step===key,
     stage.key,{timeout:10000});
   }catch(error){
    report.navigationDiagnostic=await captureNavigationDiagnostic(stage.key);
    throw error;
   }
  }
  report.stage=`ds05a-${stage.key}-panel-readiness`;
  await page.waitForFunction((id)=>{
   const panel=document.getElementById(id);
   return Boolean(panel&&!panel.hidden);
  },stage.id,{timeout:10000});
  report.stage=`ds05a-${stage.key}-estimate-readiness`;
  try{
   await page.waitForFunction((id)=>{
    const panel=document.getElementById(id);
    const price=document.querySelector("#configurationValue");
    const text=price?.textContent?.trim()||"";
    const style=price&&getComputedStyle(price),rect=price?.getBoundingClientRect();
    const visible=Boolean(price&&!price.hidden&&style?.display!=="none"&&style?.visibility==="visible"&&rect?.width>0&&rect?.height>0);
    return Boolean(panel&&!panel.hidden&&visible&&text.includes("R$")&&Array.from(text).some(ch=>ch>="0"&&ch<="9"));
   },stage.id,{timeout:10000});
  }catch(error){
   report.estimateDiagnostic=await page.evaluate((id)=>{
    const panel=document.getElementById(id);
    const price=document.querySelector("#configurationValue");
    const text=price?.textContent?.trim()||"";
    const chain=[];
    for(let node=price;node&&chain.length<6;node=node.parentElement){
     const style=getComputedStyle(node),rect=node.getBoundingClientRect();
     chain.push({tag:node.tagName,id:node.id||null,class:typeof node.className==="string"?node.className.slice(0,100):null,hidden:node.hidden,display:style.display,visibility:style.visibility,opacity:style.opacity,hasArea:rect.width>0&&rect.height>0});
    }
    const panelRect=panel?.getBoundingClientRect();
    return {
     stagePanelPresent:Boolean(panel),stagePanelHidden:Boolean(panel?.hidden),stagePanelHasArea:Boolean(panelRect&&panelRect.width>0&&panelRect.height>0),
     estimateElementPresent:Boolean(price),estimateHasCurrency:text.includes("R$")&&Array.from(text).some(ch=>ch>="0"&&ch<="9"),
     estimateElementHidden:Boolean(price?.hidden),ancestorChain:chain
    };
   },stage.id);
   throw error;
  }
  report.stage=`ds05a-${stage.key}-state-check`;
  const readStageState=()=>page.evaluate((id)=>{
   const panel=document.getElementById(id);
   const price=document.querySelector("#configurationValue");
   const priceText=price?.textContent?.trim()||"";
   const style=price&&getComputedStyle(price),rect=price?.getBoundingClientRect();
   return {
    stageVisible:Boolean(panel&&!panel.hidden),
    priceBarVisible:Boolean(price&&!price.hidden&&style?.display!=="none"&&style?.visibility==="visible"&&rect?.width>0&&rect?.height>0),
    priceEstimateHasCurrency:priceText.includes("R$")&&Array.from(priceText).some(ch=>ch>="0"&&ch<="9")
   };
  },stage.id);
  let state=await readStageState();
  if(!state.stageVisible||!state.priceBarVisible||!state.priceEstimateHasCurrency){
   try{
    await page.waitForFunction((id)=>{
     const panel=document.getElementById(id),price=document.querySelector("#configurationValue");
     const text=price?.textContent?.trim()||"",style=price&&getComputedStyle(price),rect=price?.getBoundingClientRect();
     const visible=Boolean(price&&!price.hidden&&style?.display!=="none"&&style?.visibility==="visible"&&rect?.width>0&&rect?.height>0);
     return Boolean(panel&&!panel.hidden&&visible&&text.includes("R$")&&Array.from(text).some(ch=>ch>="0"&&ch<="9"));
    },stage.id,{timeout:5000});
   }catch{}
   state=await readStageState();
  }
  report.ds05aLastStageState={key:stage.key,...state};
  assert.ok(state.stageVisible,"DS-05A: stage did not open: "+stage.key);
  assert.ok(state.priceBarVisible&&state.priceEstimateHasCurrency,
   "DS-05A: estimate missing after opening "+stage.key);
  ds05aStageProgression[stage.key]={
   stageVisible:state.stageVisible,
   priceBarVisible:state.priceBarVisible,
   priceEstimateHasCurrency:state.priceEstimateHasCurrency
  };

 }
 report.ds05aNextStep=ds05aStageProgression;
 // Staging user must not acquire admin capabilities.
 const admin=await context.request.get(new URL("/api/admin-bootstrap",gate.origin).toString(),{
  timeout:10000});
 assert.ok([401,403].includes(admin.status()),
  "Temporary session unexpectedly authorized admin endpoint");
 report.adminAccessDenied=true;
 report.jsErrorClasses=jsErrors;
 report.stage="revoke-and-check";
 // Tear down sessions and grant. Revoked cookie should never authorize /config.
 const revoked=await db.query("SELECT access_control.ci_revoke_config_fixture_grant($1::uuid) AS revoked",[grantId]);
 assert.equal(revoked.rows[0]?.revoked,true,"Fixture grant was not revoked");
 report.revoked=true;
 const after=await page.goto(new URL("/config/",gate.origin).toString(),{
  waitUntil:"domcontentloaded",timeout:20000});
 assert.equal(new URL(page.url()).pathname,"/access/",
  "Revoked session still reaches protected Config");
 assert.equal(after?.status(),200,"Access screen unavailable after revoke");
 report.classification="AUTHENTICATED_FIXTURE_PASS";
 report.stage="complete";
 console.log("CI_CONFIG_AUTHENTICATED_PASS "+JSON.stringify({
  bootstrap:report.bootstrap,revoked:report.revoked,adminAccessDenied:report.adminAccessDenied,ds05aConfigSurface:report.ds05aConfigSurface,ds05aConfigInteraction:report.ds05aConfigInteraction,ds05aNextStep:report.ds05aNextStep}));
}catch(error){
 report.jsErrorClasses=jsErrors;
 report.errorClass=safeErrorClass(error);
 report.classification=report.stage==="preflight"||report.stage==="isolated-role-check"
  ?"BLOCKED_AUTH_FIXTURE":"AUTHENTICATED_FIXTURE_FAIL";
 const safeDiagnostic=report.navigationDiagnostic?{navigation:report.navigationDiagnostic}:report.nextActionDiagnostic?{nextAction:report.nextActionDiagnostic}:report.ds05aLastStageState?{stage:report.ds05aLastStageState}:report.estimateDiagnostic?{estimate:report.estimateDiagnostic}:{};
 console.error(report.classification+" stage="+report.stage+" errorClass="+report.errorClass+" evidence="+JSON.stringify(safeDiagnostic));
 process.exitCode=1;
}finally{
 if(grantId&&db&&!report.revoked){
  try{
   await db.query("SELECT access_control.ci_revoke_config_fixture_grant($1::uuid)",[grantId]);
   report.revoked=true;
  }catch{
   report.cleanup="FAILED_MANUAL_REVOCATION_REQUIRED";
   process.exitCode=1;
  }
 }
 try{await context?.close();}catch{}
 try{await browser?.close();}catch{}
 try{await db?.end();}catch{}
 await writeFile(out,JSON.stringify(report,null,2)+"\n",{mode:0o600});
}
