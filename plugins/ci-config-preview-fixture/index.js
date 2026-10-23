// CI-only, deploy-scoped preview fixture. This plugin writes neither production
// store nor auth data. A public *status-only* marker proves the hook ran.
module.exports = {
 async onPostBuild({constants}) {
  const {join}=await import("node:path");
  const {mkdir,writeFile}=await import("node:fs/promises");
  const {shouldSeed,STORE,writeDeployFixture,TARGET_BRANCH}=await import(
    "../../scripts/build-ci-preview-fixture.mjs"
  );
  const env={...process.env,
    SITE_ID:constants.SITE_ID||process.env.SITE_ID||process.env.NETLIFY_SITE_ID};
  if(env.CONTEXT!=="deploy-preview" || env.REVIEW_ID!=="235"){
   console.log("CI_PREVIEW_PUBLISHED_FIXTURE_SKIPPED_OTHER_CONTEXT");
   return;
  }
  // A matching CI branch MUST fail rather than silently skip due to
  // misconfigured Netlify context or absent deploy metadata.
  if(!shouldSeed(env))throw Error("CI_FIXTURE_DEPLOY_CONTEXT_NOT_VERIFIED");
  if(env.REVIEW_ID!=="235")throw Error("CI_FIXTURE_UNEXPECTED_REVIEW_ID");
  if(constants.IS_LOCAL)throw Error("CI_PREVIEW_FIXTURE_CANNOT_RUN_LOCALLY");
  const {getDeployStore}=await import("@netlify/blobs");
  const store=getDeployStore({name:STORE,consistency:"strong",region:"us-east-2"});
  const result=await writeDeployFixture({env,store});
  if(result.status!=="CI_DEPLOY_STORE_V5_VERIFIED")
   throw Error("CI_FIXTURE_PUBLISHED_READBACK_MISSING");
  // Explicit, public *nonsecret* marker. No content, cookie, account, DB or
  // authorization information. Build hook must run for file to exist.
  const publicDir=constants.PUBLISH_DIR;
  if(!publicDir)throw Error("CI_FIXTURE_MISSING_PUBLISH_DIR");
  const output=join(publicDir,"ci-validation","published-v5-status.json");
  await mkdir(join(publicDir,"ci-validation"),{recursive:true});
  await writeFile(output,JSON.stringify({
    schema:"M2DPreviewPublishedFixtureStatus/1",
    reviewId:235,verified:true,deployId:env.DEPLOY_ID,
    sourceBranch:TARGET_BRANCH,store:STORE,key:"published",
    v5Schema:result.schema,sha256:result.sha256
  },null,2)+"\n",{mode:0o644});
  console.log("CI_PREVIEW_PUBLISHED_FIXTURE_VERIFIED "+JSON.stringify({
    reviewId:235,sha256:result.sha256,store:STORE
  }));
 }
};
