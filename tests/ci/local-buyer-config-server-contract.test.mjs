import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {once} from "node:events";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import assertLocalV5Url from "./assert-local-v5-url.cjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const serverScript=resolve(root,"tests/ci/local-buyer-config-server.mjs");
const stopScript=resolve(root,"tests/ci/stop-local-v5-browser.sh");

test("local Buyer V5 server announces ephemeral readiness and shuts down cleanly",async()=>{
 assert.equal(assertLocalV5Url("http://127.0.0.1:3456/config/"),"http://127.0.0.1:3456/config/");
 assert.throws(()=>assertLocalV5Url("https://example.test/config/"));
 assert.throws(()=>assertLocalV5Url("http://localhost:3456/config/"));
 const child=spawn(process.execPath,[serverScript],{
  cwd:root,env:{...process.env,CI_LOCAL_CONFIG_PORT:"0"},
  stdio:["ignore","pipe","pipe"]
 });
 let stdout="",stderr="",readyInfo=null;
 child.stdout.setEncoding("utf8");
 child.stderr.setEncoding("utf8");
 child.stdout.on("data",chunk=>{
  stdout+=chunk;
  const line=stdout.split(/\r?\n/).find(value=>value.startsWith("CI_LOCAL_BUYER_DEFAULTS_FIXTURE_READY "));
  if(line&&!readyInfo){
   try{readyInfo=JSON.parse(line.slice("CI_LOCAL_BUYER_DEFAULTS_FIXTURE_READY ".length))}
   catch(error){stderr+="\nInvalid readiness record: "+error.message}
  }
 });
 child.stderr.on("data",chunk=>{stderr+=chunk});
 const exit=once(child,"exit").then(([code,signal])=>({code,signal}));
 let exitResult=null;
 let cleanupOutput="";
 let cleanupCompleted=false;
 try{
  const deadline=Date.now()+10000;
  while(!readyInfo&&Date.now()<deadline){
   if(child.exitCode!==null)break;
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  assert(readyInfo,"fixture did not publish readiness: "+stdout+stderr);
  assert(Number.isInteger(readyInfo.port)&&readyInfo.port>0&&readyInfo.port<65536);
  assert.equal(readyInfo.schema,"ConfiguratorAdministration2D 5.0");
  assert.equal(readyInfo.buyerSchema,"BuyerConfiguratorPayload 1.0");

  const origin="http://127.0.0.1:"+readyInfo.port;
  const buyer=await fetch(origin+"/api/buyer-configuration");
  assert.equal(buyer.status,200);
  assert.equal(buyer.headers.get("set-cookie"),null,"fixture must not issue an auth cookie");
  const payload=await buyer.json();
  assert.equal(payload.schemaVersion,"BuyerConfiguratorPayload 1.0");
  assert(Array.isArray(payload.flow.stages));

  const session=await fetch(origin+"/api/access/session",{method:"POST",body:"{}",headers:{"content-type":"application/json"}});
  assert.equal(session.status,200);
  assert.deepEqual(await session.json(),{authenticated:false});
  const page=await fetch(origin+"/config/");
  assert.equal(page.status,200);

  if(process.platform!=="win32"){
   const cleanup=spawn("bash",[stopScript],{
    cwd:root,env:{...process.env,CI_LOCAL_CONFIG_PID:String(child.pid)},
    stdio:["ignore","pipe","pipe"]
   });
   cleanup.stdout.setEncoding("utf8");
   cleanup.stderr.setEncoding("utf8");
   cleanup.stdout.on("data",chunk=>{cleanupOutput+=chunk});
   cleanup.stderr.on("data",chunk=>{cleanupOutput+=chunk});
   const [code]=await once(cleanup,"exit");
   assert.equal(code,0,cleanupOutput);
   cleanupCompleted=true;
   exitResult=await exit;
  }
 }finally{
  if(!cleanupCompleted){
   if(child.exitCode===null&&child.signalCode===null)child.kill("SIGTERM");
   let timeout;
   const stopped=await Promise.race([
    exit,
    new Promise(resolve=>{timeout=setTimeout(()=>resolve(null),3000);timeout.unref()})
   ]);
   clearTimeout(timeout);
   exitResult=stopped;
   if(!stopped&&child.exitCode===null&&child.signalCode===null){
    child.kill("SIGKILL");
    exitResult=await exit;
   }
  }
 }
 assert(exitResult,"local Buyer fixture process must exit after shutdown");
 if(process.platform!=="win32"){
  assert.deepEqual(exitResult,{code:0,signal:null});
  assert.match(cleanupOutput,/CI_LOCAL_V5_FIXTURE_STOP_PASS/);
 }
});
