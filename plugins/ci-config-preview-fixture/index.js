// Local Netlify Build Plugin: only a single dedicated CI Deploy Preview can seed
// the exact deploy-scoped store the authenticated buyer Function reads.
// Never use getStore (site-wide) or permit a production write.
module.exports = {
 async onPostBuild({constants}) {
  const {shouldSeed,STORE,writeDeployFixture}=await import(
   "../../scripts/build-ci-preview-fixture.mjs"
  );
  const env={...process.env,SITE_ID:constants.SITE_ID};
  if(!shouldSeed(env)){
   console.log("CI_PREVIEW_PUBLISHED_FIXTURE_SKIPPED");
   return;
  }
  if(constants.IS_LOCAL)throw Error("CI_PREVIEW_FIXTURE_CANNOT_RUN_LOCALLY");
  const {getDeployStore}=await import("@netlify/blobs");
  const store=getDeployStore({name:STORE,consistency:"strong"});
  const result=await writeDeployFixture({env,store});
  console.log("CI_PREVIEW_PUBLISHED_FIXTURE "+JSON.stringify(result));
 }
};
