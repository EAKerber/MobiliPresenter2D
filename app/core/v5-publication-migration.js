"use strict";

const publishedReader = require("./published-configuration.js");
// Reuse the frozen A0 canonical digest, deterministic preflight and readback
// verifier. Do not implement a second migration authority in the endpoint.
const publicationGate = require("../tools/v5-publication-preflight.js");

function reject(code, status = 422) {
  return { ok: false, status, code };
}

async function publishV5Migration({ store, payload, sourceDigest, runtime }) {
  // This pure service is tested against an injected fake store. The deployed
  // endpoint must guard invocation with admin auth and an OFF-by-default
  // repository flag before calling it.
  const raw = await publishedReader.readRawPublished(store);
  if (raw.kind === "missing") return reject("published_blob_missing", 409);
  if (raw.kind !== "stored") return reject(raw.code || "invalid_stored_blob", 422);
  if (raw.value.schemaVersion !== runtime.configuration.SCHEMA) return reject("source_not_v3", 409);

  if (payload?.schemaVersion !== runtime.v5Core.SCHEMA) return reject("candidate_not_v5");
  if (!Number.isSafeInteger(payload.revision) || payload.revision !== raw.value.revision) {
    return reject("source_revision_conflict", 409);
  }
  if (typeof sourceDigest !== "string" || !/^[0-9a-f]{64}$/.test(sourceDigest)) {
    return reject("invalid_source_digest");
  }

  const preflight = publicationGate.createPreflight(raw.value, runtime);
  if (!preflight.ok) return reject(preflight.code);

  if (preflight.source.digest !== sourceDigest) return reject("source_digest_conflict", 409);
  // This is a pure schema migration, not an opportunity to persist admin
  // draft changes or repair missing section ownership along the way.
  if (publicationGate.canonicalJson(payload) !== publicationGate.canonicalJson(preflight.candidatePayload)) {
    return reject("candidate_mismatch");
  }

  const readbackCandidate = runtime.v5Core.normalize({
    ...structuredClone(preflight.candidatePayload),
    revision: preflight.source.revision + 1
  });
  if (publicationGate.digestJson(readbackCandidate) !== preflight.expectedReadback.digest) {
    return reject("expected_candidate_mismatch");
  }

  const write = await store.setJSON("published", readbackCandidate, { onlyIfMatch: raw.etag });
  if (write?.modified !== true) return reject("source_etag_conflict", 409);
  // A conditional write acknowledgement without an ETag is not publication
  // evidence. A provider transport failure must not be reported as success.
  if (typeof write.etag !== "string" || !write.etag) return reject("write_etag_missing", 502);

  const readbackRaw = await publishedReader.readRawPublished(store);
  if (readbackRaw.kind !== "stored") return reject("readback_missing_or_invalid", 502);
  if (readbackRaw.etag !== write.etag) return reject("readback_etag_mismatch", 409);
  if (publicationGate.digestJson(readbackRaw.value) !== preflight.expectedReadback.digest) {
    return reject("readback_digest_mismatch", 502);
  }
  const verified = publicationGate.verifyReadback(preflight, readbackRaw.value, runtime);
  if (!verified.ok) return reject(verified.code, 502);

  return {
    ok: true,
    status: 200,
    code: "published_v5_verified",
    schemaVersion: readbackRaw.value.schemaVersion,
    revision: readbackRaw.value.revision,
    sourceDigest: preflight.source.digest,
    publishedDigest: verified.digest,
    publicationSignatureDigest: verified.signatureDigest,
    etag: readbackRaw.etag
  };
}

module.exports = Object.freeze({ publishV5Migration });
