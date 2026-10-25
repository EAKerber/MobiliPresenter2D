// CI-only fixture seed. The conditional Deploy Preview plugin block and the
// runtime identity checks both restrict this to the two enumerated isolated previews #238 and #245.
export async function onPostBuild({constants}) {
  const {join} = await import("node:path");
  const {mkdir, writeFile} = await import("node:fs/promises");
  const fixture = await import("../../../scripts/build-ci-preview-fixture.mjs");
  const env = {...process.env, SITE_ID: constants.SITE_ID || process.env.SITE_ID || process.env.NETLIFY_SITE_ID};
  if (!fixture.shouldSeed(env)) {
    console.log("CI_PREVIEW_PUBLISHED_FIXTURE_SKIPPED_OUTSIDE_APPROVED_TARGET");
    return;
  }
  if (constants.IS_LOCAL) throw new Error("CI_PREVIEW_FIXTURE_CANNOT_RUN_LOCALLY");
  const {getDeployStore} = await import("@netlify/blobs");
  const store = getDeployStore({name: fixture.STORE, consistency: "strong", region: "us-east-2"});
  const result = await fixture.writeDeployFixture({env, store});
  if (result.status !== "CI_DEPLOY_STORE_V5_VERIFIED") {
    throw new Error("CI_PREVIEW_PUBLISHED_FIXTURE_READBACK_FAILED");
  }
  const publishDir = constants.PUBLISH_DIR;
  if (!publishDir) throw new Error("CI_PREVIEW_FIXTURE_MISSING_PUBLISH_DIR");
  const dir = join(publishDir, "ci-validation");
  await mkdir(dir, {recursive: true});
  await writeFile(join(dir, "published-v5-status.json"), JSON.stringify({
    schema: "M2DPreviewPublishedFixtureStatus/1",
    reviewId: result.reviewID, verified: true, deployId: env.DEPLOY_ID,
    sourceBranch: result.sourceBranch, store: fixture.STORE, key: fixture.KEY,
    v5Schema: result.schema, sha256: result.sha256
  }, null, 2) + "\n", {mode: 0o644});
  console.log("CI_PREVIEW_PUBLISHED_FIXTURE_VERIFIED " + JSON.stringify({
    reviewId: result.reviewID, sha256: result.sha256, store: fixture.STORE
  }));
}
