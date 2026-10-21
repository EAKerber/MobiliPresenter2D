import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fetchAdminBootstrap, AdminBootstrapRequestError } from "../app/core/admin-bootstrap-retry.mjs";

const response = (status, payload = { priceBook: { pricing: { schemaVersion: "CommercialPricingRules 1.0" } } }) =>
  ({ status, ok: status >= 200 && status < 300, json: async () => payload });
const run = ({ statuses, user = { id: "test" }, wait = async () => {}, payload } = {}) => {
  const calls = [];
  const queue = statuses.map(status => response(status,payload));
  return { calls, execute: () => fetchAdminBootstrap({
    fetchImpl: async (url,options) => { calls.push({url,options}); return queue.shift() || response(401); },
    getUserImpl: async () => user,
    wait,
  }) };
};

test("first authorized bootstrap requires one safe read", async()=>{
  const m=run({statuses:[200]});
  const result=await m.execute();
  assert.ok(result.priceBook.pricing);
  assert.equal(m.calls.length,1);
  assert.equal(m.calls[0].url,"/api/admin-bootstrap");
  assert.deepEqual(m.calls[0].options,{method:"GET",credentials:"same-origin",cache:"no-store"});
});
test("transient 401 after fresh Identity login retries exactly twice and recovers",async()=>{
  const waits=[];
  const m=run({statuses:[401,401,200],wait:async delay=>{waits.push(delay)}});
  assert.ok((await m.execute()).priceBook.pricing);
  assert.deepEqual(waits,[250,500]);
  assert.equal(m.calls.length,3);
});
test("repeated 401 is bounded and returns a named error",async()=>{
  const m=run({statuses:[401,401,401,200]});
  await assert.rejects(m.execute(),e=>e instanceof AdminBootstrapRequestError && e.code==="unauthorized");
  assert.equal(m.calls.length,3);
});
test("401 without a currently authenticated user is not retried",async()=>{
  const m=run({statuses:[401,200],user:null});
  await assert.rejects(m.execute(),e=>e.code==="unauthorized");
  assert.equal(m.calls.length,1);
});
test("403 is terminal even when Identity says admin",async()=>{
  const m=run({statuses:[403,200]});
  await assert.rejects(m.execute(),e=>e.code==="forbidden");
  assert.equal(m.calls.length,1);
});
test("503 and 500 are not retried blindly",async()=>{
  for(const first of [500,503]){
    const m=run({statuses:[first,200]});
    await assert.rejects(m.execute(),e=>e.code==="unavailable");
    assert.equal(m.calls.length,1);
  }
});
test("network failure is explicit and not automatically retried",async()=>{
  const e=()=>fetchAdminBootstrap({fetchImpl:async()=>{throw Error("offline")},getUserImpl:async()=>({id:"test"})});
  await assert.rejects(e(),err=>err.code==="network");
});
test("malformed and missing pricing payloads fail closed",async()=>{
  for(const value of [{},{priceBook:{}},null]){
    const m=run({statuses:[200],payload:value});
    await assert.rejects(m.execute(),e=>e.code==="invalid");
  }
  await assert.rejects(()=>fetchAdminBootstrap({fetchImpl:async()=>({status:200,ok:true,json:async()=>{throw Error("malformed")}}),getUserImpl:async()=>null}),e=>e.code==="invalid");
});
test("menu revalidates session on open, without introducing reload or polling",()=>{
  const code=readFileSync(new URL("../app/core/private-navigation.js",import.meta.url),"utf8");
  assert.match(code,/if \(opening\) syncFromAuth\(null\)/);
  assert.match(code,/const revision = \+\+authRevision/);
  assert.match(code,/if \(revision === authRevision\) render\(session\)/);
  assert.doesNotMatch(code,/location\.reload\(/);
});
test("admin offers explicit recovery after non-permission errors",()=>{
  const code=readFileSync(new URL("../app/admin/admin.js",import.meta.url),"utf8");
  assert.match(code,/error\.code === "forbidden"/);
  assert.match(code,/retry\.textContent = "Tentar novamente"/);
  assert.match(code,/fetchAdminBootstrap\(\{ fetchImpl: fetch, getUserImpl: getUser \}\)/);
});

test("an anonymous in-flight lookup is never reused for a newer auth revision", async()=>{
  const source=readFileSync(new URL("../app/core/private-navigation.js",import.meta.url),"utf8");
  const start=source.indexOf("    let authRevision = 0;");
  const end=source.indexOf("    function syncFromAuth(user)",start);
  assert.ok(start>=0&&end>start);
  const create=new Function("currentSession",source.slice(start,end)+"\nreturn resolveCurrentSession;");
  let resolveOld,resolveFresh,count=0;
  const old=new Promise(resolve=>{resolveOld=resolve;});
  const fresh=new Promise(resolve=>{resolveFresh=resolve;});
  const reconcile=create(()=>++count===1?old:fresh);
  const a=reconcile(1);
  const b=reconcile(2);
  assert.notStrictEqual(a,b);
  resolveFresh({id:"authenticated",roles:["admin"]});
  assert.equal((await b).id,"authenticated");
  resolveOld(null);
  assert.equal(await a,null);
  assert.equal(count,2);
});
