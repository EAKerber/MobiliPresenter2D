import test from "node:test";
import assert from "node:assert/strict";
import {attestPublishedPreviewMarker} from "./preview-identity-attestation.mjs";

const E = Object.freeze({
  reviewId: 238,
  branch: "ci/synthetic-local-test",
  commit: "1".repeat(40)
});
const good = () => ({
  schema: "M2DPreviewPublishedFixtureStatus/1",
  verified: true,
  reviewId: E.reviewId,
  sourceBranch: E.branch,
  sourceCommit: E.commit,
  v5Schema: "ConfiguratorAdministration2D 5.0",
  sha256: "a".repeat(64)
});
const fail = (marker, expected = E) =>
  assert.throws(() => attestPublishedPreviewMarker(marker, expected),
    error => error instanceof Error && /^BLOCKED_AUTH_FIXTURE: /.test(error.message));

test("exact PR/branch/SHA/V5/digest passes, without a live preview", () => {
  const proof = attestPublishedPreviewMarker(good(), E);
  assert.equal(proof.status, "PREVIEW_MARKER_IDENTITY_MATCH");
  assert.equal(proof.sourceCommit, E.commit);
  assert.equal(Object.isFrozen(proof), true);
});
test("an old preview commit fails closed (PR #238 class of failure)", () => {
  const marker = good(); marker.sourceCommit = "2".repeat(40);
  assert.throws(() => attestPublishedPreviewMarker(marker, E),
    /BLOCKED_AUTH_FIXTURE: Deploy Preview was built from a different commit/);
});
test("missing marker or unverified fixture is rejected", () => {
  fail(null);
  fail([]);
  fail({...good(), verified: false});
  fail({...good(), verified: "true"});
});
test("a different PR or branch is rejected even when SHA matches", () => {
  fail({...good(), reviewId: E.reviewId + 1});
  fail({...good(), reviewId: String(E.reviewId)});
  fail({...good(), sourceBranch: "ci/other-test"});
});
test("expected source identity must be provided explicitly", () => {
  fail(good(), null);
  fail(good(), {...E, commit: ""});
  fail(good(), {...E, commit: "ABC".repeat(13) + "A"});
  fail(good(), {...E, branch: ""});
  fail(good(), {...E, reviewId: 0});
  fail(good(), {...E, reviewId: "238"});
});
test("marker source SHA must be a canonical 40-byte hex reference", () => {
  fail({...good(), sourceCommit: ""});
  fail({...good(), sourceCommit: "g".repeat(40)});
  fail({...good(), sourceCommit: "1".repeat(39)});
});
test("incorrect schema, failed verification and invalid digest cannot pass", () => {
  fail({...good(), schema: "M2DPreviewPublishedFixtureStatus/0"});
  fail({...good(), v5Schema: "ConfiguratorAdministration2D 4.0"});
  fail({...good(), sha256: "bad"});
  fail({...good(), sha256: "A".repeat(64)});
});
test("errors never interpolate caller-provided secret material", () => {
  const marker = {...good(), sourceCommit: "secret-credential"};
  try {
    attestPublishedPreviewMarker(marker, E);
    assert.fail("expected refusal");
  } catch (error) {
    assert.match(error.message, /^BLOCKED_AUTH_FIXTURE:/);
    assert.equal(error.message.includes("secret-credential"), false);
  }
});
test("no fetch/DB/Netlify interaction is required by this pure unit gate", () => {
  const before = globalThis.fetch;
  globalThis.fetch = () => {throw new Error("NETWORK_FORBIDDEN");};
  try {assert.equal(attestPublishedPreviewMarker(good(), E).status,
    "PREVIEW_MARKER_IDENTITY_MATCH");}
  finally {globalThis.fetch = before;}
});
