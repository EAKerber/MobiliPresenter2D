// CI-BASELINE-01: one-time invitation redemption on an existing pinned Deploy Preview.
// Never prints/saves bearer token, session cookies or raw logs in Actions artifacts.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtemp,chmod,rm,writeFile,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {chromium} from "playwright";
import {ACCESS_COOKIE_NAME} from "../../netlify/access/tokens.mjs";

const ORIGIN="https://deploy-preview-234--mobilipresenter2d.netlify.app";
const TARGET=ORIGIN+"/config/";
const SAMPLE=/^[a-zA-Z0-9_-]{43}$/;
const tests=[
 ["mobile","tests/mobile-pip-main-browser.cjs","MOBILE_INTERACTIONS_URL"],
 ["keyboard","tests/keyboard-browser.cjs","KEYBOARD_BROWSER_URL"],
 ["flow","tests/flow-layout-browser.cjs","FLOW_LAYOUT_URL"],
 ["summary","tests/summary-pricing-browser.cjs","SUMMARY_PRICING_BROWSER_URL"],
 ["stone","tests/stone-browser.cjs","STONE_BROWSER_URL"]
];
let browser,context,folder,sessionIssued=false,logoutVerified=false;
const result={schema:"CIConfigTemporaryAccess/1",origin:"deploy-preview-234",status:"NOT_STARTED",
 preflight:{},redeemStatus:"NOT_ATTEMPTED",bootstrap:false,adminDenied:false,
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

 const token=process.env.CI_CONFIG_TEST_TOKEN?.trim()||"";
 assert.ok(SAMPLE.test(token),"BLOCKED_TOKEN_ABSENT_OR_INVALID");
 result.status="REDEEMING";
 const response=await context.request.post(ORIGIN+"/api/access/redeem",{
  headers:{Origin:ORIGIN,"Content-Type":"application/json"},
  data:{token},timeout:20000
 });
 result.redeemStatus=String(response.status());
 assert.equal(response.status(),200,"REDEEM_FAILED_CHECK_TOKEN_EXPIRATION_OR_PREVIEW_DB");
 const json=await response.json();
 assert.equal(json?.ok,true,"REDEEM_NOT_OK");
 sessionIssued=true;
 const cookies=await context.cookies(ORIGIN);
 assert.ok(cookies.some(c=>c.name===ACCESS_COOKIE_NAME && c.httpOnly && c.secure),
  "MISSING_SECURE_HTTPONLY_SESSION_COOKIE");
 result.cookieSecure=true;
 const probe=await context.newPage();
 const privateResponse=await probe.goto(TARGET,{waitUntil:"domcontentloaded",timeout:25000});
 assert.equal(privateResponse?.status(),200,"AUTHENTICATED_CONFIG_HTTP_ERROR");
 assert.equal(new URL(probe.url()).pathname,"/config/","AUTHENTICATED_CONFIG_REDIRECTED");
 await probe.waitForFunction(()=>
  Boolean(window.CASA_EM_MODULOS_DEBUG?.getLayoutProfile)
  && Boolean(document.querySelector(".workspace")),null,{timeout:30000});
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
 result.status=sessionIssued?"AUTH_FLOW_FAILURE":"AUTH_PRECHECK_OR_REDEEM_FAILURE";
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
