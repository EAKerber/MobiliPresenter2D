"use strict";

// Server-side storage boundary: retain the exact raw blob and its opaque ETag.
// Normalized GET output and fallback defaults must never be migration evidence.
async function readRawPublished(store) {
  const entry = await store.getWithMetadata("published", { type: "text", consistency: "strong" });
  if (entry === null) return { kind: "missing" };
  if (typeof entry?.data !== "string" || typeof entry.etag !== "string" || !entry.etag) {
    return { kind: "invalid", code: "invalid_blob_metadata" };
  }
  try {
    const value = JSON.parse(entry.data);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { kind: "invalid", code: "invalid_stored_json", etag: entry.etag };
    }
    return { kind: "stored", value, etag: entry.etag };
  } catch {
    return { kind: "invalid", code: "invalid_stored_json", etag: entry.etag };
  }
}

function inspectPublishedRaw(raw, { configuration, administrationV5, catalog, priceBook, scene }) {
  if (raw.kind !== "stored") return raw;
  const schema = raw.value.schemaVersion;
  if (schema !== configuration.SCHEMA && schema !== administrationV5.SCHEMA) {
    return { kind: "invalid", code: "unsupported_stored_schema", etag: raw.etag };
  }
  try {
    if (schema === configuration.SCHEMA) {
      return {
        kind: "valid", schema, value: configuration.normalizeConfiguratorSettings(raw.value, catalog, priceBook),
        rawValue: raw.value, etag: raw.etag
      };
    }
    const errors = administrationV5.validate(raw.value, configuration, catalog, priceBook, scene);
    if (errors.length) return { kind: "invalid", code: "invalid_v5", etag: raw.etag };
    return {
      kind: "valid", schema, value: administrationV5.normalize(raw.value),
      rawValue: raw.value, etag: raw.etag
    };
  } catch {
    return { kind: "invalid", code: schema === configuration.SCHEMA ? "invalid_v3" : "invalid_v5", etag: raw.etag };
  }
}

module.exports = Object.freeze({ readRawPublished, inspectPublishedRaw });
