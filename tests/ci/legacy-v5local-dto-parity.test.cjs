"use strict";
// Differential between the exact old local V3->V5 helper path and the
// current local server's V3 inspection->buyer-projection path.
// No network, Netlify Identity, production Blob or DB is accessed.
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {isDeepStrictEqual} = require("node:util");
const configuration = require("../../app/core/configuration.js");
const administrationV5 = require("../../app/core/administration-v5.js");
const published = require("../../app/core/published-configuration.js");
const buyer = require("../../app/core/published-buyer-projection.js");
const flow = require("../../app/core/flow-model.js");
const hierarchy = require("../../app/data/hierarchy-defaults.js");
const defaults = require("../../app/data/configurator-settings.js");
const catalog = require("../../app/data/catalog-data.js");
const priceBook = require("../../app/data/mock-price-book.js");
const scene = require("../../app/data/scene-data.js");
const pricingContract = require("../../app/core/pricing-contract.js");
const presentationPolicy = require("../../app/data/presentation-policy-defaults.js");

const dependencies = {
 configuration, administrationV5, flow, catalog, priceBook, scene,
 hierarchyDefaults: hierarchy, pricingContract, defaultPresentationPolicy: presentationPolicy
};
const v3 = configuration.normalizeConfiguratorSettings(
 configuration.createDefaultAdministration(defaults,catalog,priceBook,scene),
 catalog,priceBook,scene
);
const v5 = administrationV5.upgrade(
 v3,configuration,flow,catalog,priceBook,scene,hierarchy
);

function inspect(value) {
 return published.inspectPublishedRaw({kind:"stored",value,etag:"LOCAL_TEST_ONLY"},{
  configuration,administrationV5,catalog,priceBook,scene
 });
}
function project(value) {
 const found=inspect(value);
 assert.equal(found.kind,"valid","stored local fixture must validate");
 return buyer.project(found.value,dependencies);
}
function paths(a,b,prefix="",limit=24) {
 if (isDeepStrictEqual(a,b)) return [];
 if (limit<=0) return [prefix||"$"];
 if (!a || !b || typeof a!=="object" || typeof b!=="object" ||
   Array.isArray(a)!==Array.isArray(b)) return [prefix||"$"];
 const keys=new Set([...Object.keys(a),...Object.keys(b)]);
 const output=[];
 for(const key of keys) {
  const k=prefix ? prefix+"."+key : key;
  if(!Object.hasOwn(a,key)||!Object.hasOwn(b,key)){output.push(k);continue;}
  output.push(...paths(a[key],b[key],k,limit-1));
  if(output.length>=20) break;
 }
 return output.slice(0,20);
}
function same(name,a,b) {
 const differences=paths(a,b);
 assert.equal(differences.length,0, name+" diverged (paths only): "+differences.join(", "));
}

test("both stored paths validate with the original schema and converge on buyer payload schema",()=>{
 assert.equal(inspect(v3).schema,configuration.SCHEMA);
 assert.equal(inspect(v5).schema,administrationV5.SCHEMA);
 assert.deepEqual(administrationV5.validate(v5,configuration,catalog,priceBook,scene),[]);
 assert.equal(project(v3).schemaVersion,buyer.BUYER_SCHEMA);
 assert.equal(project(v5).schemaVersion,buyer.BUYER_SCHEMA);
});
test("V3 direct projection and historical pre-upgraded V5 have identical buyer behavior",()=>{
 const current=project(v3), historical=project(v5);
 // The V3 source orders services as move-stone, glass, lighting.
 // V5's approved hierarchy projects lighting first, followed by other services.
 // Membership must match; ordering is governed by normalized flow, not flat V3 items.
 same("stage IDs and metadata",
   current.displaySettings.stages.map(({items,...s})=>s),
   historical.displaySettings.stages.map(({items,...s})=>s));
 for(let i=0;i<current.displaySettings.stages.length;i++){
  const oldStage=current.displaySettings.stages[i], newStage=historical.displaySettings.stages[i];
  same("stage membership "+newStage.id,[...oldStage.items].sort(),[...newStage.items].sort());
  if(!isDeepStrictEqual(oldStage.items,newStage.items)){
   assert.equal(newStage.id,"services","unexpected stage-order divergence");
   same("V3 default service ordering",oldStage.items,["move-stone","tempered-glass","lighting-08"]);
   same("V5 authored service grouping order",newStage.items,["lighting-08","move-stone","tempered-glass"]);
   const flattened=historical.flow.stages[i].groups.flatMap(group=>
     group.sections.flatMap(section=>section.itemIds));
   same("buyer presentation must respect V5 authored sections",newStage.items,flattened);
   console.log("V3_V5_ORDER_INTENT "+JSON.stringify({stageId:newStage.id,
     source:"V3 flat-order",target:"V5 lighting-first hierarchy",membership:"identical"}));
  }
 }
 for(const key of ["dependencies","events","objectAssets","objects",
   "initialState","moduleDimensions","finishes","materials","handleProducts","materialGroups"]){
   same("displaySettings."+key,current.displaySettings[key],historical.displaySettings[key]);
 }
 same("normalized stage/group/section hierarchy",current.flow.stages,historical.flow.stages);
 same("buyer pricing",current.pricingRules,historical.pricingRules);
 same("public presentation policy",current.presentationPolicy,historical.presentationPolicy);
});
test("published reader fails closed for malformed V5 and unsupported stored schema",()=>{
 const malformed=structuredClone(v5);
 malformed.presentationPolicy=null;
 assert.notEqual(inspect(malformed).kind,"valid");
 assert.equal(inspect({...v5,schemaVersion:"unsupported"}).code,"unsupported_stored_schema");
 assert.equal(published.inspectPublishedRaw({kind:"missing"},{
  configuration,administrationV5,catalog,priceBook,scene
 }).kind,"missing");
 assert.throws(()=>buyer.project(malformed,dependencies));
});
test("buyer DTO does not expose stored administrative state or raw ETag",()=>{
 const wire=JSON.stringify(project(v5));
 for(const word of ["LOCAL_TEST_ONLY","private-etag","privateSession",
  "\"revision\":7","\"viewerPricePublication\"","\"draft\""]){
  assert.equal(wire.includes(word),false,"buyer leaked forbidden marker: "+word);
 }
 const prepared=buyer.consume(project(v5));
 assert.deepEqual(prepared.displaySettings.stages,project(v5).displaySettings.stages);
});
