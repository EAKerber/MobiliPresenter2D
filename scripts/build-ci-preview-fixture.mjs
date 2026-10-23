// CI-BASELINE-01: synthetic admin fixture explicitly approved for CI preview.
// Prepared from checked-in defaults; never a runtime fallback or production seed.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import configCore from "../app/core/configuration.js";
import adminV5 from "../app/core/administration-v5.js";
import publishedReader from "../app/core/published-configuration.js";
import buyerProjection from "../app/core/published-buyer-projection.js";
import flow from "../app/core/flow-model.js";
import hierarchy from "../app/data/hierarchy-defaults.js";
import defaults from "../app/data/configurator-settings.js";
import catalog from "../app/data/catalog-data.js";
import priceBook from "../app/data/mock-price-book.js";
import scene from "../app/data/scene-data.js";
import pricingContract from "../app/core/pricing-contract.js";
import presentationPolicy from "../app/data/presentation-policy-defaults.js";

export const TARGET_BRANCH="ci/ci-baseline-01-published-preview-fixture-20261023";
export const STORE="configurator-settings";
export const KEY="published";
const digest=s=>createHash("sha256").update(s).digest("hex");

export function shouldSeed(env){
 if(env.CONTEXT!=="deploy-preview"||env.BRANCH!==TARGET_BRANCH)return false;
 assert.equal(env.NETLIFY,"true","REFUSE_CI_PREVIEW_SEED_OUTSIDE_NETLIFY");
 assert.match(String(env.REVIEW_ID||""),/^[1-9]\d{0,5}$/,"CI_PREVIEW_REVIEW_ID_REQUIRED");
 assert.match(String(env.DEPLOY_ID||""),/^[a-zA-Z0-9_-]{8,}$/,"CI_PREVIEW_DEPLOY_ID_REQUIRED");
 // Existing Netlify project, never a site whose identity is ambiguous.
 assert.equal(env.SITE_ID||env.NETLIFY_SITE_ID,
  "20c0dc08-2490-4418-8eec-b298c90cfcce","CI_PREVIEW_WRONG_NETLIFY_SITE");
 return true;
}

export function prepareExplicitFixture(){
 const v3=configCore.normalizeConfiguratorSettings(
  configCore.createDefaultAdministration(defaults,catalog,priceBook,scene),
  catalog,priceBook,scene
 );
 const v5=adminV5.upgrade(v3,configCore,flow,catalog,priceBook,scene,hierarchy);
 assert.equal(v5.schemaVersion,adminV5.SCHEMA);
 assert.deepEqual(adminV5.validate(v5,configCore,catalog,priceBook,scene),[],
  "CI_PREVIEW_FIXTURE_FAILED_SCHEMA_VALIDATION");
 const deps={configuration:configCore,administrationV5:adminV5,catalog,priceBook,scene};
 const inspection=publishedReader.inspectPublishedRaw({
  kind:"stored",value:v5,etag:'"in-memory-verification"'
 },deps);
 assert.equal(inspection.kind,"valid");
 const payload=buyerProjection.project(inspection.value,{
  ...deps,flow,hierarchyDefaults:hierarchy,pricingContract,
  defaultPresentationPolicy:presentationPolicy
 });
 assert.equal(payload.schemaVersion,buyerProjection.BUYER_SCHEMA);
 buyerProjection.consume(payload);
 const bytes=JSON.stringify(v5);
 assert.ok(Buffer.byteLength(bytes,"utf8")<65536,"CI_PREVIEW_FIXTURE_OVERSIZED");
 return {value:v5,sha256:digest(bytes),bytes,
  schema:v5.schemaVersion,revision:v5.revision,
  provenance:"repo defaults > normalized V3 > upgraded V5 > schema & buyer projection checked"};
}

export async function writeDeployFixture({env,store}){
 if(!shouldSeed(env))return {status:"SKIPPED_NOT_DEDICATED_PREVIEW"};
 assert.ok(store&&typeof store.getWithMetadata==="function"&&
  typeof store.setJSON==="function","CI_PREVIEW_NAMED_STORE_REQUIRED");
 const before=await store.getWithMetadata(KEY,{type:"text",consistency:"strong"});
 assert.equal(before,null,"CI_PREVIEW_REFUSES_EXISTING_PUBLISHED_RECORD");
 const data=prepareExplicitFixture();
 const write=await store.setJSON(KEY,data.value,{onlyIfNew:true});
 assert.equal(write?.modified,true,"CI_PREVIEW_CONDITIONAL_BLOB_WRITE_REJECTED");
 const after=await publishedReader.readRawPublished(store);
 const inspected=publishedReader.inspectPublishedRaw(after,{
  configuration:configCore,administrationV5:adminV5,catalog,priceBook,scene
 });
 assert.equal(inspected.kind,"valid","CI_PREVIEW_BLOB_READBACK_NOT_VALID");
 assert.equal(digest(JSON.stringify(after.value)),data.sha256,
  "CI_PREVIEW_BLOB_READBACK_DIGEST_MISMATCH");
 return {status:"CI_DEPLOY_STORE_V5_VERIFIED",store:STORE,key:KEY,
  sha256:data.sha256,schema:data.schema,revision:data.revision,
  reviewID:env.REVIEW_ID,provenance:data.provenance};
}
