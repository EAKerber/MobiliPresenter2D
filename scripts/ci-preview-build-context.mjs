// CI diagnostics only: no secrets, no published data, no production writes.
// This marker proves Netlify's build command ran for the exact CI preview.
import {join} from "node:path";
import {mkdir,writeFile} from "node:fs/promises";
const env=process.env;
if(env.NETLIFY==="true"&&env.CONTEXT==="deploy-preview"&&env.REVIEW_ID==="235"){
 const dir=join("app","ci-validation");
 await mkdir(dir,{recursive:true});
 await writeFile(join(dir,"build-context.json"),JSON.stringify({
  schema:"M2DCIPreviewBuildContext/1",
  reviewId:235,
  branchMatches:env.BRANCH==="ci/ci-baseline-01-published-preview-fixture-20261023",
  hasDeployId:Boolean(env.DEPLOY_ID),
  hasSiteId:Boolean(env.SITE_ID||env.NETLIFY_SITE_ID),
  contextMatches:true,
  netlifyMatches:true
 },null,2)+"\n");
 console.log("CI_PREVIEW_BUILD_CONTEXT_RECORDED");
}else console.log("CI_PREVIEW_BUILD_CONTEXT_SKIPPED");
