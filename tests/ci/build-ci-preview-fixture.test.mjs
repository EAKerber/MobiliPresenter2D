import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {
  PREVIEW_TARGETS, TARGET_SITE_ID, STORE, KEY, shouldSeed,
  prepareExplicitFixture, writeDeployFixture
} from "../../scripts/build-ci-preview-fixture.mjs";

const base = {
  NETLIFY: "true", CONTEXT: "deploy-preview", BRANCH: "main", HEAD: "ci/ci-baseline-01-isolated-auth-extraction-20261024",
  REVIEW_ID: PREVIEW_TARGETS["ci/ci-baseline-01-isolated-auth-extraction-20261024"], DEPLOY_ID: "aabbccdd11223344", SITE_ID: TARGET_SITE_ID
};
const fakeStore = (initial = null) => {
  let value = initial, writes = 0;
  return {
    get writes() { return writes; },
    async getWithMetadata(key, options) {
      assert.equal(key, KEY);
      assert.deepEqual(options, {type: "text", consistency: "strong"});
      return value === null ? null : {data: value, etag: '"mock-readback"'};
    },
    async setJSON(key, data, options) {
      assert.equal(key, KEY);
      assert.deepEqual(options, {onlyIfNew: true});
      if (value !== null) return {modified: false};
      value = JSON.stringify(data); writes++;
      return {modified: true, etag: '"mock-readback"'};
    }
  };
};

test("only enumerated preview, source branch and isolated site pairs can seed", async () => {
  for (const env of [
    {...base, CONTEXT: "production"}, {...base, CONTEXT: "branch-deploy"},
    {...base, REVIEW_ID: "237"}, {...base, HEAD: "main"},
    {...base, HEAD: "fix/config-stage-nav-grid-track-20261025", REVIEW_ID: "245"},
    {...base, SITE_ID: "other-site"}, {...base, CONTEXT: undefined}, {}
  ]) {
    assert.equal(shouldSeed(env), false);
    const store = fakeStore();
    assert.equal((await writeDeployFixture({env, store})).status, "SKIPPED_NOT_DEDICATED_PREVIEW");
    assert.equal(store.writes, 0);
  }

  for (const [sourceBranch, reviewId] of Object.entries(PREVIEW_TARGETS)) {
    const env = {...base, HEAD: sourceBranch, REVIEW_ID: reviewId};
    assert.equal(shouldSeed(env), true);
    const result = await writeDeployFixture({env, store: fakeStore()});
    assert.equal(result.status, "CI_DEPLOY_STORE_V5_VERIFIED");
    assert.equal(result.reviewID, Number(reviewId));
    assert.equal(result.sourceBranch, sourceBranch);
  }
});

test("matching preview fails closed when required deploy identity is ambiguous", () => {
  for (const env of [
    {...base, NETLIFY: undefined}, {...base, DEPLOY_ID: undefined},
    {...base, SITE_ID: undefined}
  ]) assert.throws(() => shouldSeed(env));
});

test("fixture is deterministic V5 data derived from checked-in defaults", () => {
  const a = prepareExplicitFixture(), b = prepareExplicitFixture();
  assert.equal(a.schema, "ConfiguratorAdministration2D 5.0");
  assert.equal(a.sha256, b.sha256);
  assert.deepEqual(a.value, b.value);
  assert.equal(createHash("sha256").update(a.bytes).digest("hex"), a.sha256);
  assert.match(a.sha256, /^[a-f0-9]{64}$/);
});

test("writes one conditional deploy-scoped record and verifies it by readback", async () => {
  const store = fakeStore();
  const result = await writeDeployFixture({env: base, store});
  assert.equal(STORE, "configurator-settings");
  assert.equal(KEY, "published");
  assert.equal(result.status, "CI_DEPLOY_STORE_V5_VERIFIED");
  assert.equal(result.sha256, prepareExplicitFixture().sha256);
  assert.equal(store.writes, 1);
  await assert.rejects(writeDeployFixture({env: base, store}), /REFUSES_EXISTING_PUBLISHED_RECORD/);
});

test("refuses overwriting any existing published configuration", async () => {
  const store = fakeStore('{"schemaVersion":"ConfiguratorAdministration2D 3.0"}');
  await assert.rejects(writeDeployFixture({env: base, store}), /REFUSES_EXISTING_PUBLISHED_RECORD/);
  assert.equal(store.writes, 0);
});
