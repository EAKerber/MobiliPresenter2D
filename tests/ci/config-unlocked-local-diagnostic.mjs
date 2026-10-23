// Diagnostic ONLY: run existing config browser suites on a local static server.
// A PASS here does not prove Netlify Edge/Functions/authenticated behavior.
import {spawnSync} from "node:child_process";
import {mkdir,writeFile,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
const site="http://127.0.0.1:8123/config/";
const cases=[
 ["mobile","tests/mobile-pip-main-browser.cjs","MOBILE_INTERACTIONS_URL"],
 ["keyboard","tests/keyboard-browser.cjs","KEYBOARD_BROWSER_URL"],
 ["flow","tests/flow-layout-browser.cjs","FLOW_LAYOUT_URL"],
 ["summary","tests/summary-pricing-browser.cjs","SUMMARY_PRICING_BROWSER_URL"],
 ["stone","tests/stone-browser.cjs","STONE_BROWSER_URL"]
];
const out=[];
const tmp=await mkdtemp(join(tmpdir(),"m2d-ci-local-diagnostic-"));
try{
 for(const [name,file,key] of cases){
  const env={...process.env,[key]:site};
  delete env.CI_CONFIG_TEST_TOKEN;
  delete env.PLAYWRIGHT_AUTH_STATE_FILE;
  const res=spawnSync(process.execPath,[file,join(tmp,name)],{
    encoding:"utf8",env,timeout:180000,maxBuffer:6*1024*1024
  });
  const message=String(res.stderr||"")+"\n"+String(res.stdout||"");
  const diagnostic=/AssertionError|TimeoutError|ERR_ASSERTION|TypeError|ReferenceError|Error:/.exec(message);
  const className=diagnostic?.[0]??(res.error?.code==="ETIMEDOUT"?"PROCESS_TIMEOUT":res.status===0?"PASS":"PROCESS_FAILURE");
  const location=message.match(/(?:\/tests\/|tests\/)[A-Za-z0-9_./-]+[.]cjs:[0-9]+(?::[0-9]+)?/)?.[0]??null;
  const result={name,status:res.status===0?"PASS":"FAIL",errorClass:className,
   failureLocation:location,exitCode:res.status};
  out.push(result);
  console.log("LOCAL_CONFIG_DIAGNOSTIC "+JSON.stringify(result));
 }
}finally{await rm(tmp,{recursive:true,force:true})}
await mkdir("artifacts/ci-baseline-01",{recursive:true});
await writeFile("artifacts/ci-baseline-01/unlocked-local.json",JSON.stringify({
 schema:"LocalConfigBrowserDiagnostic/1",
 warning:"Local server bypasses Edge and Functions; PASS does not imply authenticated preview PASS",
 cases:out
},null,2)+"\n");
console.log("LOCAL_CONFIG_DIAGNOSTIC_COMPLETE "+JSON.stringify({
 passed:out.filter(x=>x.status==="PASS").length,failed:out.filter(x=>x.status!=="PASS").length
}));
