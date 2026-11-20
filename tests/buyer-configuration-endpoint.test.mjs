import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {canUseConfigurator,canUseInternalPages} from "../netlify/access/identity-policy.mjs";
import {cookieValue,jsonResponse} from "../netlify/access/http.mjs";
import {ACCESS_COOKIE_NAME} from "../netlify/access/tokens.mjs";

const require=createRequire(import.meta.url);
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const configCore=require("../app/core/configuration.js");
const administrationV5=require("../app/core/administration-v5.js");
const publishedReader=require("../app/core/published-configuration.js");
const buyerProjection=require("../app/core/published-buyer-projection.js");
const flowCore=require("../app/core/flow-model.js");
const hierarchyDefaults=require("../app/data/hierarchy-defaults.js");
const catalog=require("../app/data/catalog-data.js");
const priceBook=require("../app/data/mock-price-book.js");
const scene=require("../app/data/scene-data.js");
const pricingContract=require("../app/core/pricing-contract.js");
const presentationPolicy=require("../app/data/presentation-policy-defaults.js");
const defaults=require("../app/data/configurator-settings.js");

const v3=configCore.normalizeConfiguratorSettings(
 configCore.createDefaultAdministration(defaults,catalog,priceBook,scene),
 catalog,priceBook,scene
);
const v5=administrationV5.upgrade(
 v3,configCore,flowCore,catalog,priceBook,scene,hierarchyDefaults
);

test("Buyer endpoint denies before storage and exposes only the projected DTO",async()=>{
 let actor=null,identityUnavailable=false,activeSession=null,sessionStoreUnavailable=false;
 const counts={siteOpens:0,previewOpens:0,reads:0,sessionLookups:0};
 const store={
  async getWithMetadata(key,options) {
   counts.reads++;
   assert.equal(key,"published");
   assert.deepEqual(options,{type:"text",consistency:"strong"});
   return {data:JSON.stringify(v5),etag:'"fixture-v5"',metadata:{}};
  }
 };
 const harness={
  getStore(options) {
   counts.siteOpens++;
   assert.deepEqual(options,{name:"configurator-settings",consistency:"strong"});
   return store;
  },
  getDeployStore(options) {
   counts.previewOpens++;
   assert.deepEqual(options,{name:"configurator-settings",consistency:"strong"});
   return store;
  },
  async getUser() {
   if(identityUnavailable)throw new Error("fixture identity unavailable");
   return actor;
  },
  configCore,administrationV5,publishedReader,buyerProjection,flowCore,hierarchyDefaults,
  catalog,priceBook,scene,pricingContract,presentationPolicy,
  canUseConfigurator,canUseInternalPages,cookieValue,jsonResponse,
  async findActiveSession(token) {
   counts.sessionLookups++;
   assert.equal(token,"buyer-fixture-token");
   if(sessionStoreUnavailable)throw new Error("fixture access store unavailable");
   return activeSession;
  },
  ACCESS_COOKIE_NAME
 };
 const source=await readFile(join(ROOT,"netlify/functions/buyer-configuration.mjs"),"utf8");
 const withoutImports=source.replace(/^import\s+.*?\s+from\s+["'][^"']+["'];\s*$/gm,"");
 assert.doesNotMatch(withoutImports,/^\s*import\s/m,"the fixture must replace every external import");
 const prefix=[
  "const {getStore,getDeployStore,getUser,configCore,administrationV5,publishedReader,",
  "buyerProjection,flowCore,hierarchyDefaults,catalog,priceBook,scene,pricingContract,",
  "presentationPolicy,canUseConfigurator,canUseInternalPages,cookieValue,jsonResponse,",
  "findActiveSession,ACCESS_COOKIE_NAME}=globalThis.__buyerConfigurationEndpointHarness;"
 ].join("")+"\n";
 const moduleUrl="data:text/javascript;base64,"+Buffer.from(prefix+withoutImports).toString("base64");
 globalThis.__buyerConfigurationEndpointHarness=harness;
 try {
  const endpoint=await import(moduleUrl);
  const invoke=async(token=null)=>{
   const headers=token?{cookie:ACCESS_COOKIE_NAME+"="+token}:{};
   const response=await endpoint.default(
    new Request("https://unit-test.invalid/api/buyer-configuration",{method:"GET",headers}),
    {deploy:{context:"deploy-preview"}}
   );
   return {status:response.status,body:await response.json(),headers:response.headers};
  };
  const assertBuyerPayload=payload=>{
   assert.deepEqual(Object.keys(payload).sort(),[
    "displaySettings","flow","presentationPolicy","pricingRules","schemaVersion"
   ]);
   assert.deepEqual(Object.keys(payload.displaySettings).sort(),[
    "dependencies","events","finishes","handleProducts","initialState","materialGroups",
    "materials","moduleDimensions","objectAssets","objects","stages"
   ]);
   assert.equal(payload.schemaVersion,buyerProjection.BUYER_SCHEMA);
   assert.equal(Object.hasOwn(payload,"source"),false,"raw administrative source is not exposed");
   assert.equal(Object.hasOwn(payload.displaySettings,"revision"),false,"admin revision is not exposed");
   assert.equal(Object.hasOwn(payload.displaySettings,"pricing"),false,"admin pricing storage is not exposed");
  };

  let result=await invoke();
  assert.equal(result.status,401,"anonymous access is denied");
  assert.equal(counts.previewOpens,0,"anonymous denial happens before opening Blob storage");
  assert.equal(counts.reads,0);

  actor={id:"buyer-1",roles:["user"]};
  result=await invoke();
  assert.equal(result.status,403,"a buyer without an active grant is denied");
  assert.equal(counts.previewOpens,0,"buyer denial happens before opening Blob storage");
  assert.equal(counts.reads,0);

  result=await invoke("buyer-fixture-token");
  assert.equal(result.status,403,"a missing temporary session is denied");
  assert.equal(counts.sessionLookups,1);
  assert.equal(counts.previewOpens,0,"missing-session denial happens before opening Blob storage");

  sessionStoreUnavailable=true;
  result=await invoke("buyer-fixture-token");
  assert.equal(result.status,503,"temporary-session store failure is fail-closed");
  assert.equal(counts.previewOpens,0);
  assert.equal(counts.reads,0);
  sessionStoreUnavailable=false;

  identityUnavailable=true;
  result=await invoke();
  assert.equal(result.status,503,"Identity failure is fail-closed");
  assert.equal(counts.previewOpens,0);
  assert.equal(counts.reads,0);
  identityUnavailable=false;

  activeSession={id:"temporary-session-1",grant_id:"grant-1",expires_at:"2099-12-31T23:59:59.000Z"};
  result=await invoke("buyer-fixture-token");
  assert.equal(result.status,200,"a valid temporary session may read the buyer projection");
  assertBuyerPayload(result.body);
  assert.equal(result.headers.get("cache-control"),"no-store, max-age=0");
  assert.equal(counts.previewOpens,1);
  assert.equal(counts.reads,1);
  assert.equal(counts.siteOpens,0);

  actor={id:"admin-1",roles:["admin"]};
  result=await invoke();
  assert.equal(result.status,200,"an internal admin may read the buyer projection");
  assertBuyerPayload(result.body);
  assert.equal(counts.sessionLookups,3,"internal access does not consult the temporary-session store");
  assert.equal(counts.previewOpens,2);
  assert.equal(counts.reads,2);
  assert.equal(counts.siteOpens,0,"a preview request never opens the production store");

  actor={id:"staff-1",roles:["staff"]};
  result=await invoke();
  assert.equal(result.status,200,"internal staff may read the buyer projection");
  assertBuyerPayload(result.body);
  assert.equal(counts.sessionLookups,3,"internal staff access does not consult the temporary-session store");
  assert.equal(counts.previewOpens,3);
  assert.equal(counts.reads,3);
  assert.equal(counts.siteOpens,0);
 } finally {
  delete globalThis.__buyerConfigurationEndpointHarness;
 }
});
