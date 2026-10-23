import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {
 TARGET_BRANCH,STORE,KEY,shouldSeed,prepareExplicitFixture,writeDeployFixture
} from "../../scripts/build-ci-preview-fixture.mjs";

const base={NETLIFY:"true",CONTEXT:"deploy-preview",BRANCH:TARGET_BRANCH,
 REVIEW_ID:"345",DEPLOY_ID:"aabbccdd11223344",
 SITE_ID:"20c0dc08-2490-4418-8eec-b298c90cfcce"};
const fakeStore=(initial=null)=>{
 let text=initial;
 let writes=0;
 return {get writes(){return writes},
  async getWithMetadata(key,options){
   assert.equal(key,"published");
   assert.deepEqual(options,{type:"text",consistency:"strong"});
   return text===null?null:{data:text,etag:'"ci-mock-readback"'};
  },
  async setJSON(key,value,options){
   assert.equal(key,"published");
   assert.deepEqual(options,{onlyIfNew:true});
   if(text!==null)return {modified:false};
   text=JSON.stringify(value);
   writes++;
   return {modified:true,etag:'"ci-mock-readback"'};
  }
 };
};
test("no fixture outside one explicit preview branch / context / site",async()=>{
 const variants=[
  {...base,CONTEXT:"production"},
  {...base,CONTEXT:"branch-deploy"},
  {...base,BRANCH:"main"},
  {...base,BRANCH:"ci/ci-baseline-01-shared-db-preview-20261023"},
  {...base,BRANCH:"architecture/arc03c-static-page-build-20261022"},
  {...base,CONTEXT:undefined},
  {}
 ];
 for(const env of variants){
  assert.equal(shouldSeed(env),false);
  const store=fakeStore();
  assert.equal((await writeDeployFixture({env,store})).status,"SKIPPED_NOT_DEDICATED_PREVIEW");
  assert.equal(store.writes,0);
 }
});
test("preview requires Netlify, valid review/deploy IDs and correct site",()=>{
 for(const env of [
  {...base,NETLIFY:undefined}, {...base,REVIEW_ID:undefined},
  {...base,REVIEW_ID:"0"}, {...base,DEPLOY_ID:undefined},
  {...base,SITE_ID:"d92799b1-9afc-4b52-9eee-22824bba7925"}
 ])assert.throws(()=>shouldSeed(env));
});
test("source is deterministic valid V5 published configuration, not buyer-only defaults",()=>{
 const a=prepareExplicitFixture(),b=prepareExplicitFixture();
 assert.equal(a.schema,"ConfiguratorAdministration2D 5.0");
 assert.equal(a.sha256,b.sha256);
 assert.deepEqual(a.value,b.value);
 assert.match(a.sha256,/^[a-f0-9]{64}$/);
 assert.equal(createHash("sha256").update(a.bytes).digest("hex"),a.sha256);
});
test("dedicated preview writes single V5 blob in matching named deploy store and verifies readback",async()=>{
 assert.equal(STORE,"configurator-settings");
 assert.equal(KEY,"published");
 const store=fakeStore();
 const result=await writeDeployFixture({env:base,store});
 assert.equal(result.status,"CI_DEPLOY_STORE_V5_VERIFIED");
 assert.equal(result.sha256,prepareExplicitFixture().sha256);
 assert.equal(store.writes,1);
 await assert.rejects(writeDeployFixture({env:base,store}),/REFUSES_EXISTING_PUBLISHED_RECORD/);
});
test("refuses overwriting an already published v3/v5 source",async()=>{
 const store=fakeStore('{"schemaVersion":"ConfiguratorAdministration2D 3.0"}');
 await assert.rejects(writeDeployFixture({env:base,store}),/REFUSES_EXISTING_PUBLISHED_RECORD/);
 assert.equal(store.writes,0);
});
