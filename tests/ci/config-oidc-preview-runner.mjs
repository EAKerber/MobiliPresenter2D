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
 assert.equal(response.status(),200,"OIDC_EXCHANGE_FAILED");
 const json=await response.json();
 assert.equal(json?.ok,true,"OIDC_EXCHANGE_NOT_OK");
 assert.equal(json?.access,"config-only","OIDC_SCOPE_NOT_CONFIG_ONLY");
 sessionIssued=true;
 const cookies=await context.cookies(ORIGIN);
 assert.ok(cookies.some(c=>c.name===ACCESS_COOKIE_NAME && c.httpOnly && c.secure),
  "MISSING_SECURE_HTTPONLY_SESSION_COOKIE");
 result.cookieSecure=true;
 const published=await context.request.get(ORIGIN+"/api/buyer-configuration",{timeout:18000});
 result.buyerConfigurationHTTP=published.status();
 assert.equal(published.status(),200,"PUBLISHED_CONFIGURATION_NOT_AVAILABLE_IN_PREVIEW");
 const probe=await context.newPage();
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
 for(const [name,file,key] of tests){
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
  result.tests.push({name,status,exitCode:run.status,
   errorClass:status==="PASS"?null:(diagnostic?.[0]||run.error?.code||"UNKNOWN"),
   failureLocation:status==="PASS"?null:location});
  console.log("CI_CONFIG_TEST "+JSON.stringify({name,status}));
 }
 result.status=result.tests.every(t=>t.status==="PASS")?"FIVE_FLOWS_PASS":"FIVE_FLOWS_PARTIAL";
} catch(e){
 result.errorClass=classify(e);
 result.status=sessionIssued?"AUTH_FLOW_FAILURE":"AUTH_PRECHECK_OR_OIDC_FAILURE";
 console.error("CI_CONFIG_AUTH_GATE "+result.status+" errorClass="+result.errorClass);
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
