"use strict";
// Offline old-vs-new contract replay: no identity provider, tokens, Postgres, network or Netlify.
const { test }=require("node:test");
const assert=require("node:assert/strict");
const historic=require("../../docs/reconciliation/cp-public/legacy/projection/app/core/buyer-configuration-projection.js");
const current=require("../../app/core/published-buyer-projection.js");
const configuration=require("../../app/core/configuration.js");
const administrationV5=require("../../app/core/administration-v5.js");
const flow=require("../../app/core/flow-model.js");
const pricingContract=require("../../app/core/pricing-contract.js");
const presentationCore=require("../../app/core/presentation-contract.js");
const layoutProfiles=require("../../app/core/layout-profiles.js");
const defaults=require("../../app/data/configurator-settings.js");
const catalog=require("../../app/data/catalog-data.js");
const scene=require("../../app/data/scene-data.js");
const priceBook=require("../../app/data/mock-price-book.js");
const hierarchyDefaults=require("../../app/data/hierarchy-defaults.js");
const defaultPresentationPolicy=require("../../app/data/presentation-policy-defaults.js");

const runtime={configuration,administrationV5,flow,catalog,scene,priceBook,
 hierarchyDefaults,pricingContract,presentationCore,layoutProfiles,defaultPresentationPolicy};
const v3=configuration.normalizeConfiguratorSettings(
 configuration.createDefaultAdministration(defaults,catalog,priceBook,scene),
 catalog,priceBook,scene);
const v5=administrationV5.upgrade(v3,configuration,flow,catalog,priceBook,scene,hierarchyDefaults);
assert.deepEqual(administrationV5.validate(v5,configuration,catalog,priceBook,scene),[]);
const oldProject=v=>historic.project(v,runtime);
const newProject=v=>current.project(v,runtime);

test("semantic parity: current and old preserve hierarchy, initial selection and typed pricing",()=>{
 const old=oldProject(v5),now=newProject(v5);
 assert.equal(old.schemaVersion,"BuyerConfiguration2D 0.1");
 assert.equal(now.schemaVersion,"BuyerConfiguratorPayload 1.0");
 assert.deepEqual(old.stages.map(s=>s.id),now.displaySettings.stages.map(s=>s.id));
 assert.deepEqual(old.initialState,now.displaySettings.initialState);
 assert.deepEqual(old.pricing,now.pricingRules);
 assert.deepEqual(old.finishes,now.displaySettings.finishes);
 assert.deepEqual(old.dependencies,now.displaySettings.dependencies);
 assert.deepEqual(old.events,now.displaySettings.events);
});
test("buyer payload does not serialize administrative revision even indirectly",()=>{
 const now=newProject(v5);
 assert.equal(Object.hasOwn(now,"revision"),false);
 assert.equal(Object.hasOwn(now.displaySettings,"revision"),false);
 assert.equal(now.flow.source.revision,null,"flow.source is a client contract; administrative revision is private");
});
test("deep unknown administrative metadata never crosses the buyer boundary",()=>{
 const poison=structuredClone(v5);
 poison.adminOnlyToken="ADMIN_SECRET_ROOT";
 poison.objects["module-01"].adminNotes="ADMIN_SECRET_OBJECT";
 poison.stages[0].groups[0].sections[0].adminNotes="ADMIN_SECRET_SECTION";
 poison.materialGroups[0].adminPrivateLabel="ADMIN_SECRET_GROUP";
 poison.materials[0].adminCost="ADMIN_SECRET_MATERIAL";
 poison.objectAssets["module-01"].secretUrl="ADMIN_SECRET_ASSET";
 poison.initialState.privateSession="ADMIN_SECRET_SESSION";
 poison.presentationPolicy.shell.bottomDock.internal="ADMIN_SECRET_POLICY";
 assert.deepEqual(administrationV5.validate(poison,configuration,catalog,priceBook,scene),[]);
 const legacy=oldProject(poison),now=newProject(poison);
 assert.equal(JSON.stringify(legacy).includes("ADMIN_SECRET"),false,
   "historic field-level allowlist is a control for this replay");
 assert.equal(JSON.stringify(now).includes("ADMIN_SECRET"),false,
   "current wire payload must not include newly introduced admin-only fields");
});
test("published V5 projection still refuses malformed and unsupported administration",()=>{
 assert.throws(()=>newProject({...v5,schemaVersion:"ConfiguratorAdministration2D 4.0"}));
 const broken=structuredClone(v5);
 broken.stages[0].groups[0].sections[0].component="unknown-renderer";
 assert.throws(()=>newProject(broken));
});
