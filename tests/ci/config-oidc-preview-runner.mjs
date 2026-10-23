// CI-BASELINE-01: one-time invitation redemption on an existing pinned Deploy Preview.
// Never prints/saves bearer token, session cookies or raw logs in Actions artifacts.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtemp,chmod,rm,writeFile,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {chromium} from "playwright";
import {ACCESS_COOKIE_NAME} from "../../netlify/access/tokens.mjs";
import {CI_OIDC_AUDIENCE} from "../../netlify/access/github-oidc-ci.mjs";

const ORIGIN="https://deploy-preview-235--mobilipresenter2d.netlify.app";
const TARGET=ORIGIN+"/config/";
const tests=[
 ["mobile","tests/mobile-pip-main-browser.cjs","MOBILE_INTERACTIONS_URL"],
 ["keyboard","tests/keyboard-browser.cjs","KEYBOARD_BROWSER_URL"],
 ["flow","tests/flow-layout-browser.cjs","FLOW_LAYOUT_URL"],
 ["summary","tests/summary-pricing-browser.cjs","SUMMARY_PRICING_BROWSER_URL"],
 ["stone","tests/stone-browser.cjs","STONE_BROWSER_URL"]
];
let browser,context,folder,sessionIssued=false,logoutVerified=false;
const result={schema:"CIConfigOIDCAccess/1",origin:"deploy-preview-235",status:"NOT_STARTED",
 preflight:{},exchangeStatus:"NOT_ATTEMPTED",bootstrap:false,adminDenied:false,
 tests:[],logout:"NOT_ATTEMPTED",replayDenied:false};
const classify=e=>(e?.name==="AssertionError"?"ASSERTION_FAILURE":e?.name||"ERROR").slice(0,40);
try{
 folder=await mkdtemp(join(tmpdir(),"m2d-ci-auth-"));
 await chmod(folder,0o700);
 browser=await chromium.launch({headless:true});
 context=await browser.newContext({viewport:{width:1366,height:900},serviceWorkers:"block"});
 const anon=await context.newPage();
 const access=await anon.goto(ORIGIN+"/access/",{waitUntil:"domcontentloaded",timeout:25000});
 assert.equal(access?.status(),200,"PRECHECK_ACCESS_NOT_READY");
 assert.ok(await anon.locator("#confirmAccess").count()>0,"PRECHECK_ACCESS_UI_MISSING");
 result.preflight.accessReady=true;
 const redirected=await anon.goto(TARGET,{waitUntil:"domcontentloaded",timeout:25000});
 assert.equal(new URL(anon.url()).pathname,"/access/","PRECHECK_ANON_GATE_NOT_PROTECTED");
 assert.equal(redirected?.status(),200);
 result.preflight.anonRedirect=true;
 await anon.close();

 const oidcRequestUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL||"";
 const oidcRequestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN||"";
 assert.ok(/^https:\/\/[^/]+/.test(oidcRequestUrl)&&oidcRequestToken,"BLOCKED_GITHUB_OIDC_NOT_AVAILABLE");
 result.status="EXCHANGING_OIDC";
 const tokenUrl=new URL(oidcRequestUrl);
 tokenUrl.searchParams.set("audience",CI_OIDC_AUDIENCE);
 assert.ok(tokenUrl.protocol==="https:" && tokenUrl.hostname.endsWith(".actions.githubusercontent.com") && !tokenUrl.username && !tokenUrl.password,"OIDC_REQUEST_ORIGIN_UNEXPECTED");
 const oidcResponse=await fetch(tokenUrl,{
  headers:{Authorization:"Bearer "+oidcRequestToken,Accept:"application/json"},
  signal:AbortSignal.timeout(20000)
 });
 assert.equal(oidcResponse.status,200,"GITHUB_OIDC_REQUEST_FAILED");
 const jwt=(await oidcResponse.json()).value;
 assert.ok(typeof jwt==="string"&&jwt.length>64&&jwt.length<=16000,"GITHUB_OIDC_PAYLOAD_INVALID");
 const response=await context.request.post(ORIGIN+"/api/ci/config-session",{
  headers:{Origin:ORIGIN,"Content-Type":"application/json"},
  data:{jwt},timeout:20000
 });
 result.exchangeStatus=String(response.status());
 if(response.status()===401){
  // OIDC JWT is not logged or written; only equality flags for exact trust predicates.
  let flags={parseable:false};
  try{
   const parts=jwt.split(".");
   const header=JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8"));
   const c=JSON.parse(Buffer.from(parts[1],"base64url").toString("utf8"));
   flags={
    parseable:true,alg:header.alg==="RS256",kid:Boolean(header.kid),
    iss:c.iss==="https://token.actions.githubusercontent.com",
    aud:c.aud===CI_OIDC_AUDIENCE,
    repository:c.repository==="EAKerber/MobiliPresenter2D",
    repositoryId:c.repository_id==="1356562826",ownerId:c.repository_owner_id==="62451548",
    ref:c.ref==="refs/heads/security/oidc-ci-preview235-v0-20261023",
    workflowRef:c.workflow_ref==="EAKerber/MobiliPresenter2D/.github/workflows/ci-preview-oidc.yml@refs/heads/security/oidc-ci-preview235-v0-20261023",
    environment:c.environment==="ci-auth-preview",
    subject:c.sub==="repo:EAKerber/MobiliPresenter2D:environment:ci-auth-preview",
    event:["push","workflow_dispatch"].includes(c.event_name),
    jti:typeof c.jti==="string"&&c.jti.length>=12&&c.jti.length<=256,
    runId:/^[0-9]{1,22}$/.test(String(c.run_id??"")),
    timing:Number.isInteger(c.iat)&&Number.isInteger(c.exp)&&c.iat<=Math.floor(Date.now()/1000)+60&&c.iat>=Math.floor(Date.now()/1000)-600&&c.exp>Math.floor(Date.now()/1000)&&c.exp<=Math.floor(Date.now()/1000)+900
   };
  }catch{}
  console.error("CI_OIDC_CLAIM_MATCH_FLAGS "+JSON.stringify(flags));
 }
 assert.equal(response.status(),200,"OIDC_EXCHANGE_FAILED");
 const json=await response.json();
 assert.equal(json?.ok,true,"OIDC_EXCHANGE_NOT_OK");
 assert.equal(json?.access,"config-only","OIDC_SCOPE_NOT_CONFIG_ONLY");
 sessionIssued=true;
 const cookies=await context.cookies(ORIGIN);
 assert.ok(cookies.some(c=>c.name===ACCESS_COOKIE_NAME && c.httpOnly && c.secure),
  "MISSING_SECURE_HTTPONLY_SESSION_COOKIE");
 result.cookieSecure=true;
 const sessionReadback=await context.request.post(ORIGIN+"/api/access/session",{
  headers:{Origin:ORIGIN,"Content-Type":"application/json"},data:{},timeout:18000
 });
 result.sessionReadbackHTTP=sessionReadback.status();
 assert.equal(sessionReadback.status(),200,"TEMPORARY_SESSION_STATUS_ROUTE_UNAVAILABLE");
 const sessionStatus=await sessionReadback.json();
 assert.equal(sessionStatus?.authenticated,true,"TEMPORARY_SESSION_STATUS_NOT_AUTHENTICATED");
 assert.equal(sessionStatus?.accessType,"temporary","TEMPORARY_SESSION_SCOPE_UNEXPECTED");
 const published=await context.request.get(ORIGIN+"/api/buyer-configuration",{timeout:18000});
 result.buyerConfigurationHTTP=published.status();
 assert.equal(published.status(),200,"PUBLISHED_CONFIGURATION_NOT_AVAILABLE_IN_PREVIEW");
 const probe=await context.newPage();
 const bootstrapErrors=[];
 const bootstrapHttpErrors=[];
 probe.on("pageerror",e=>bootstrapErrors.push(String(e?.name||"PAGE_ERROR").slice(0,40)));
 probe.on("console",m=>{if(m.type()==="error")bootstrapErrors.push(m.text());});
 probe.on("response",response=>{
  if(response.status()<400)return;
  try{
   const uri=new URL(response.url());
   if(uri.origin===ORIGIN)bootstrapHttpErrors.push({status:response.status(),path:uri.pathname.slice(0,180)});
  }catch{}
 });
 const privateResponse=await probe.goto(TARGET,{waitUntil:"domcontentloaded",timeout:25000});
 assert.equal(privateResponse?.status(),200,"AUTHENTICATED_CONFIG_HTTP_ERROR");
 assert.equal(new URL(probe.url()).pathname,"/config/","AUTHENTICATED_CONFIG_REDIRECTED");
 await probe.waitForFunction(()=>{
  const workspace=document.querySelector(".workspace");
  const rect=workspace?.getBoundingClientRect();
  return document.documentElement.dataset.publishedConfigurationStatus==="validated"
   && Boolean(window.CASA_EM_MODULOS_DEBUG?.getLayoutProfile)
   && Boolean(workspace)&&!workspace.hidden
   && !workspace.inert && getComputedStyle(workspace).display!=="none"
   && rect?.width>0 && rect?.height>0;
 },null,{timeout:30000});
 result.bootstrap=true;
 const classifyBrowserError=raw=>{
  const message=String(raw||"");
  const path=message.match(/https:\/\/deploy-preview-235--mobilipresenter2d[.]netlify[.]app(\/[a-zA-Z0-9/_-]+(?:\.[a-zA-Z0-9]+)?)/)?.[1]||null;
  const type=/Failed to load resource/i.test(message)?"RESOURCE_LOAD":
   /content security policy|CSP/i.test(message)?"CSP":
   /Refused to execute/i.test(message)?"SCRIPT_EXECUTION":
   /Cross-Origin|CORS/i.test(message)?"CORS":
   /TypeError/.test(message)?"TYPE_ERROR":/ReferenceError/.test(message)?"REFERENCE_ERROR":
   /net::ERR_/i.test(message)?"NETWORK":/404|401|403|500|503/.test(message)?"HTTP_ERROR":"OTHER";
  return {type,path};
 };
 const summarized=bootstrapErrors.slice(0,25).map(classifyBrowserError);
 result.bootstrapConsole={count:bootstrapErrors.length,classified:summarized};
 result.bootstrapHttp={count:bootstrapHttpErrors.length,items:bootstrapHttpErrors.slice(0,25)};
 console.log("CI_AUTHENTICATED_BOOTSTRAP_DIAGNOSTICS "+JSON.stringify({console:result.bootstrapConsole,http:result.bootstrapHttp}));
 const denied=await context.request.get(ORIGIN+"/api/admin-bootstrap",{timeout:15000});
 assert.ok([401,403].includes(denied.status()),"TEMP_SESSION_GAINED_ADMIN_ACCESS");
 result.adminDenied=true;

 const statePath=join(folder,"session.json");
 await context.storageState({path:statePath});
 await chmod(statePath,0o600);
 await probe.close();
 const safeEnv={...process.env,PLAYWRIGHT_AUTH_STATE_FILE:statePath};
 delete safeEnv.CI_CONFIG_TEST_TOKEN;
 delete safeEnv.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 delete safeEnv.ACTIONS_ID_TOKEN_REQUEST_URL;
 const targeted=process.env.CI_TARGET_ONLY==="summary,stone";
 const selectedTests=targeted?tests.filter(([name])=>name==="summary"||name==="stone"):tests;
 for(const [name,file,key] of selectedTests){
  const output=join(folder,name);
  safeEnv[key]=TARGET;
  const run=spawnSync(process.execPath,[file,output],{
   cwd:process.cwd(),env:safeEnv,encoding:"utf8",timeout:420000,
   maxBuffer:8*1024*1024
  });
  delete safeEnv[key];
  const status=run.error?.code==="ETIMEDOUT"?"TIMEOUT":run.status===0?"PASS":"FAIL";
  const transcript=String(run.stderr||"")+"\n"+String(run.stdout||"");
  const diagnostic=/AssertionError|TimeoutError|ERR_ASSERTION|TypeError|ReferenceError|Error:/.exec(transcript);
  const location=transcript.match(/(?:\/tests\/|tests\/)[A-Za-z0-9_./-]+[.]cjs:[0-9]+(?::[0-9]+)?/)?.[0]||null;
  // Only known bounded diagnostic JSON generated by test files may leave the child.
  // Never print stdout/stderr in full (could carry cookies, browser URLs or fixture data).
  for(const marker of ["CI_SUMMARY_RESTORE_DIAGNOSTIC","CI_STONE_OFF_DIAGNOSTIC"]){
   const match=transcript.match(new RegExp(marker+" (\\\\{[^\\\\n]{1,900}\\\\})"));
   if(!match)continue;
   try{
    const entry=JSON.parse(match[1]);
    if(marker==="CI_SUMMARY_RESTORE_DIAGNOSTIC"){
     const safe={amountReadable:entry.amountReadable===true,
      deltaCents:Number.isSafeInteger(entry.deltaCents)?entry.deltaCents:null,
      skirtingChecked:entry.skirtingChecked===true,
      skirtingDisabled:entry.skirtingDisabled===true,
      skirtingConnected:entry.skirtingConnected===true,
      currentStage:["finishes","summary"].includes(entry.currentStage)?entry.currentStage:"other",
      stonePackagePresent:entry.stonePackagePresent===true};
     console.log(marker+" "+JSON.stringify(safe));
    }else{
     const safe={stateOff:entry.stateOff===true,toggleOff:entry.toggleOff===true,
      stateServicesArray:entry.stateServicesArray===true,stoneIsCloud:entry.stoneIsCloud===true,
      finishIsCocoa:entry.finishIsCocoa===true,currentStage:["finishes","summary"].includes(entry.currentStage)?entry.currentStage:"other"};
     console.log(marker+" "+JSON.stringify(safe));
    }
   }catch{}
  }
  result.tests.push({name,status,exitCode:run.status,
   errorClass:status==="PASS"?null:(diagnostic?.[0]||run.error?.code||"UNKNOWN"),
   failureLocation:status==="PASS"?null:location});
  console.log("CI_CONFIG_TEST "+JSON.stringify({name,status,errorClass:status==="PASS"?null:(diagnostic?.[0]||run.error?.code||"UNKNOWN"),failureLocation:status==="PASS"?null:location}));
 }
 result.status=targeted
  ?(result.tests.every(t=>t.status==="PASS")?"TARGETED_TWO_FLOWS_PASS":"TARGETED_TWO_FLOWS_PARTIAL")
  :(result.tests.every(t=>t.status==="PASS")?"FIVE_FLOWS_PASS":"FIVE_FLOWS_PARTIAL");
} catch(e){
 result.errorClass=classify(e);
 result.status=sessionIssued?"AUTH_FLOW_FAILURE":"AUTH_PRECHECK_OR_OIDC_FAILURE";
 const stage=typeof e?.message==="string" ? (/^[A-Z][A-Z0-9_]{4,90}$/.exec(e.message.split("\n")[0])?.[0]||"UNCLASSIFIED") : "UNCLASSIFIED";
 result.failureStage=stage;
 console.error("CI_CONFIG_AUTH_GATE "+result.status+" errorClass="+result.errorClass+" stage="+stage+" exchangeStatus="+result.exchangeStatus);
 process.exitCode=1;
} finally{
 if(sessionIssued&&context){
  try{
   const logout=await context.request.post(ORIGIN+"/api/access/session/logout",{
    headers:{Origin:ORIGIN,"Content-Type":"application/json"},
    data:{},timeout:18000
   });
   result.logout=String(logout.status());
   assert.equal(logout.status(),200,"LOGOUT_REVOCATION_FAILED");
   const after=await context.newPage();
   const end=await after.goto(TARGET,{waitUntil:"domcontentloaded",timeout:15000});
   result.replayDenied=new URL(after.url()).pathname==="/access/" && end?.status()===200;
   await after.close();
   assert.ok(result.replayDenied,"REVOKED_SESSION_STILL_AUTHORIZES_CONFIG");
   logoutVerified=true;
  }catch(e){
   result.logout="REVOCATION_NOT_CONFIRMED";
   result.cleanupErrorClass=classify(e);
   process.exitCode=1;
  }
 }
 try{await context?.close();}catch{}
 try{await browser?.close();}catch{}
 try{if(folder)await rm(folder,{recursive:true,force:true});}catch{process.exitCode=1;}
 await mkdir("artifacts/ci-baseline-01",{recursive:true});
 await writeFile("artifacts/ci-baseline-01/preview-invitation.json",JSON.stringify(result,null,2)+"\n");
 if(sessionIssued&&!logoutVerified)process.exitCode=1;
 if(result.tests.some(t=>t.status!=="PASS"))process.exitCode=1;
 console.log("CI_CONFIG_PREVIEW_RESULT "+JSON.stringify({
  status:result.status,bootstrap:result.bootstrap,
  adminDenied:result.adminDenied,revocationVerified:logoutVerified,
  results:result.tests.map(x=>({name:x.name,status:x.status}))
 }));
}
