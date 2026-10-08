"use strict";

const publishedReader = require("./published-configuration.js");
const { digestJson } = require("../tools/v5-publication-preflight.js");

const reject = (code, status = 422) => ({ ok: false, status, code });

// Normal v5 editing is possible ONLY after storage is already v5.
// This is independent of the one-time v3->v5 migration activation flag.
async function savePublishedV5({ store, payload, runtime }) {
  const { configuration, v5Core, catalog, priceBook, scene } = runtime;
  const raw = await publishedReader.readRawPublished(store);
  if (raw.kind === "missing") return reject("published_blob_missing", 409);
  if (raw.kind !== "stored") return reject(raw.code || "invalid_stored_blob", 409);
  if (raw.value.schemaVersion !== v5Core.SCHEMA) return reject("hierarchy_publication_required", 409);

  const current = publishedReader.inspectPublishedRaw(raw, {
    configuration, administrationV5: v5Core, catalog, priceBook, scene
  });
  if (current.kind !== "valid") return reject(current.code || "invalid_stored_v5", 409);

  // Explicit schema match prevents silent downgrade or v4 publication.
  if (payload?.schemaVersion !== v5Core.SCHEMA) return reject("schema_downgrade_forbidden", 409);
  if (!Number.isSafeInteger(payload.revision) || payload.revision !== current.value.revision) {
    return reject("revision_conflict", 409);
  }

  let candidate;
  try {
    const errors = v5Core.validate(payload, configuration, catalog, priceBook, scene);
    if (errors.length) return reject("invalid_v5_configuration");
    candidate = v5Core.normalize(payload);
    candidate.revision = current.value.revision + 1;
  } catch {
    return reject("invalid_v5_configuration");
  }
  if (!Number.isSafeInteger(candidate.revision)) return reject("revision_overflow", 409);

  // Check-and-write uses exact stored ETag and must not silently retry.
  const write = await store.setJSON("published", candidate, { onlyIfMatch: raw.etag });
  if (write?.modified !== true) return reject("source_etag_conflict", 409);
  if (typeof write.etag !== "string" || !write.etag) return reject("write_etag_missing", 502);

  const readback = await publishedReader.readRawPublished(store);
  if (readback.kind !== "stored") return reject("readback_missing_or_invalid", 502);
  if (readback.etag !== write.etag) return reject("readback_etag_mismatch", 409);
  if (digestJson(readback.value) !== digestJson(candidate)) return reject("readback_digest_mismatch", 502);
  const verified = publishedReader.inspectPublishedRaw(readback, {
    configuration, administrationV5: v5Core, catalog, priceBook, scene
  });
  if (verified.kind !== "valid" || verified.schema !== v5Core.SCHEMA) {
    return reject("readback_invalid_v5", 502);
  }
  if (verified.value.revision !== candidate.revision ||
      digestJson(verified.value) !== digestJson(candidate) ||
      v5Core.publicationSignature(verified.value) !== v5Core.publicationSignature(candidate)) {
    return reject("readback_semantic_mismatch", 502);
  }

  return { ok: true, status: 200, code: "saved_v5_verified", value: verified.value };
}

module.exports = Object.freeze({ savePublishedV5 });
