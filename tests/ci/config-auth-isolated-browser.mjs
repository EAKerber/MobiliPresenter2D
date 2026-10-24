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
let db,browser,context,grantId;
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
 const jsErrors=[];
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
 // Exercise one client-side module change and return the checkbox and counter to their initial state.
 const availableModuleToggles=page.locator("[data-module-toggle]:not(:disabled)");
 assert.ok(await availableModuleToggles.count()>0,"DS-05A: no enabled module toggle rendered");
 const moduleToggle=availableModuleToggles.first();
 const originalModuleChecked=await moduleToggle.isChecked();
 const originalVisibleCount=Number((await page.locator("#visibleCount").textContent())?.trim());
 assert.ok(Number.isFinite(originalVisibleCount),"DS-05A: initial visible count is not numeric");
 if(originalModuleChecked)await moduleToggle.uncheck();else await moduleToggle.check();
 await page.waitForFunction((previous)=>{
  const count=Number(document.querySelector("#visibleCount")?.textContent?.trim());
  return Number.isFinite(count)&&count!==previous;
 },originalVisibleCount,{timeout:10000});
 if(originalModuleChecked)await moduleToggle.check();else await moduleToggle.uncheck();
 await page.waitForFunction(({expected,visibleCount})=>{
  const toggle=document.querySelector("[data-module-toggle]:not(:disabled)");
  const count=Number(document.querySelector("#visibleCount")?.textContent?.trim());
  return toggle?.checked===expected&&count===visibleCount;
 },{expected:originalModuleChecked,visibleCount:originalVisibleCount},{timeout:10000});
 report.ds05aConfigInteraction={moduleToggleAvailable:true,visibleCountChanged:true,visibleCountRestored:true};
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
  bootstrap:report.bootstrap,revoked:report.revoked,adminAccessDenied:report.adminAccessDenied,ds05aConfigSurface:report.ds05aConfigSurface,ds05aConfigInteraction:report.ds05aConfigInteraction}));
}catch(error){
 report.errorClass=safeErrorClass(error);
 report.classification=report.stage==="preflight"||report.stage==="isolated-role-check"
  ?"BLOCKED_AUTH_FIXTURE":"AUTHENTICATED_FIXTURE_FAIL";
 console.error(report.classification+" stage="+report.stage+" errorClass="+report.errorClass);
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
