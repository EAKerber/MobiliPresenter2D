# CP-SD-06A2A3b — authenticated raw v3 inspection / publication evidence — 2026-10-07

Status: IMPLEMENTED IN DRAFT PR / TEST GATE PENDING. This checkpoint builds a read-only inspection capability but does not call it against live production data.

## Purpose

Normal GET /api/configuration is publicly readable and returns normalized/fallback content; it cannot prove the exact persisted source, current ETag or canonical digest. The one-time live migration needs fresh source evidence. Provide an *explicit* separate authenticated admin-only GET query, without leaking evidence to anonymous buyers and without enabling migration.

## Contract

- GET /api/configuration?inspection=v5-preflight is separate from the unchanged public normal GET path.
- Authentication via the existing Netlify Identity getUser() and admin role is mandatory before any raw/blob inspection is performed. Unauthorized requests return 401; authenticated non-admin requests return 403. Unknown inspections are rejected.
- The same current production/deploy store selection and strong-consistency getWithMetadata({ type: 'text', consistency: 'strong' }) yield exact raw stored v3 and opaque ETag.
- The server computes rawCanonicalDigest with the existing deterministic canonical JSON SHA-256 algorithm. This is NOT a byte-stream hash and ETag is a separate opaque storage token.
- The A0 createPreflight must prove raw v3 source is canonical, contains assigned stone-skirting/Puxadores, projects losslessly to v5, and supplies an exact deterministic v5 candidate. No auto-repair, no default substitutions.
- For canonical ready v3, return source schema/revision/etag/rawCanonicalDigest, preflight source/candidate/readback facts and candidatePayload. All data is visible ONLY to an authenticated admin and responses are Cache-Control: no-store.
- Invalid/unexpected/missing source reports explicit refusal with no candidate payload; no server write, migration activation or session repair. An already-v5 store is rejected by this v3-only inspection mode.
- No new permanent public raw JSON GET route. The exact v3 source bytes are not returned; the admin can audit the canonical digest and ETag without copying source blobs into the public buyer.

## Mock gates

- app/tools/test-v5-publication-inspection.js tests valid source facts/ETag/preflight/expected readback, missing blob, malformed JSON, already-v5 source, missing Handles repair requirement, read-only fake storage and authentication-before-read source structure.
- Existing A1a/A1b, A2A1 buyer, A2A2 native-save and A2A3a chain tests remain in app npm test; run path-triggered GitHub and Netlify preview gates.

## Remaining readiness

- A2A3c: review actual Netlify provider behavior under conditional write, malformed/no-ETag provider responses, edge consistency, timeout/readback races, and authenticated preview smoke without production blob reads.
- A2 live: user explicitly authorizes a fresh production authenticated inspection, separate isolated repairs if indicated, and a reviewed temporary migration activation. Reinspect immediately before write; require matching digest/revision/ETag and exact conditional readback; disable migration again.
- Never interpret creation of this read-only endpoint as permission for an agent to fetch production configuration autonomously.

## Explicit scope exclusions

No v3->v5 production migration, Netlify site write, raw production inspection call, browser product changes, viewer integration, theme work or branch hygiene.
