// Contract extracted and generalized from PR #238's preview-fixture preflight.
// No network, credentials, permissions or mutable backend access.
// A matching marker is NECESSARY, not sufficient, for authenticated CI.
const SHA40 = /^[0-9a-f]{40}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const V5 = "ConfiguratorAdministration2D 5.0";
const MARKER = "M2DPreviewPublishedFixtureStatus/1";
const deny = reason => { throw new Error("BLOCKED_AUTH_FIXTURE: " + reason); };
const check = (ok, reason) => { if (!ok) deny(reason); };

export function attestPublishedPreviewMarker(marker, expected) {
  check(expected !== null && typeof expected === "object" && !Array.isArray(expected),
    "expected identity absent");
  check(Number.isSafeInteger(expected.reviewId) && expected.reviewId > 0,
    "expected review ID invalid");
  check(typeof expected.branch === "string"
    && /^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(expected.branch),
    "expected branch invalid");
  check(typeof expected.commit === "string" && SHA40.test(expected.commit),
    "expected GitHub commit missing or invalid");
  check(marker !== null && typeof marker === "object" && !Array.isArray(marker),
    "preview V5 marker missing");
  check(marker.schema === MARKER, "marker schema mismatch");
  check(marker.verified === true, "marker not verified");
  check(marker.reviewId === expected.reviewId, "preview review ID mismatch");
  check(marker.sourceBranch === expected.branch, "preview source branch mismatch");
  check(typeof marker.sourceCommit === "string" && SHA40.test(marker.sourceCommit),
    "preview source commit invalid");
  check(marker.sourceCommit === expected.commit, "Deploy Preview was built from a different commit");
  check(marker.v5Schema === V5, "published V5 schema mismatch");
  check(typeof marker.sha256 === "string" && DIGEST.test(marker.sha256),
    "published fixture digest missing or invalid");
  return Object.freeze({
    status: "PREVIEW_MARKER_IDENTITY_MATCH",
    reviewId: expected.reviewId,
    sourceCommit: expected.commit,
    markerSchema: MARKER,
    v5Schema: V5
  });
}
