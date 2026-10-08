"use strict";

const publishedReader = require("./published-configuration.js");
const canonicalGate = require("../tools/v5-publication-preflight.js");

async function inspectV5Preflight({ store, runtime }) {
  // This service is read-only: no setJSON, delete or implicit repair.
  const raw = await publishedReader.readRawPublished(store);
  if (raw.kind === "missing") {
    return { ok: false, status: 409, code: "published_blob_missing" };
  }
  if (raw.kind !== "stored") {
    return { ok: false, status: 422, code: raw.code || "invalid_stored_blob" };
  }
  if (raw.value.schemaVersion !== runtime.configuration.SCHEMA) {
    return {
      ok: false,
      status: 409,
      code: "source_not_v3",
      source: { schemaVersion: raw.value.schemaVersion || null }
    };
  }

  const preflight = canonicalGate.createPreflight(raw.value, runtime);
  const source = {
    schemaVersion: raw.value.schemaVersion,
    revision: raw.value.revision,
    etag: raw.etag,
    rawCanonicalDigest: canonicalGate.digestJson(raw.value)
  };
  if (!preflight.ok) {
    // Diagnostic evidence includes the A0 refusal, never an auto-repair or
    // synthetic candidate generated from defaults.
    const { candidatePayload: _discard, ...report } = preflight;
    return { ok: false, status: 422, code: "v5_preflight_blocked", source, preflight: report };
  }

  if (source.rawCanonicalDigest !== preflight.source.digest) {
    return { ok: false, status: 422, code: "source_canonical_digest_mismatch", source };
  }

  // This result is only exposed by the authenticated admin inspection branch
  // in the Netlify configuration function, never by the normal public GET.
  return {
    ok: true,
    status: 200,
    code: "v5_preflight_ready",
    source,
    preflight: {
      schemaVersion: preflight.schemaVersion,
      code: preflight.code,
      source: preflight.source,
      candidate: preflight.candidate,
      expectedReadback: preflight.expectedReadback
    },
    candidatePayload: preflight.candidatePayload
  };
}

module.exports = Object.freeze({ inspectV5Preflight });
