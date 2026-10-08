# CP-SD-06A2A3c1 — endpoint and provider-isolation safety — 2026-10-07

Status: IMPLEMENTED IN PR / CI PENDING. NO LIVE PRODUCTION ACCESS.

## Scope

Rehearse the **actual** Netlify configuration function body under injected Identity, site-wide and deploy-scoped fake Blob stores. The browser-based A2A1b and A2A2b suites remain separate and already passed; this test exercises routing, authorization and store selection together.

## Required gates

- Normal anonymous GET still returns v3 (or valid v5) without raw ETag, migration candidate or admin inspection fields.
- Raw-source `?inspection=v5-preflight` requires real route-level authorization: unauthenticated => 401 and zero raw reads, authenticated non-admin => 403 and zero raw reads; authenticated admin => canonical preflight evidence, including source ETag and expected readback, with zero writes.
- Unknown inspections fail closed, no public GET uses the admin inspection operation, and HTTP responses are no-store.
- Deploy-preview and nonproduction code select **deploy-scoped** `getDeployStore` (strong consistency); production code selects site-wide `getStore`. Test these with independent in-memory stores only. Never run the test against real production.
- `publish-v5-migration` returns 403 while the explicit `V5_MIGRATION_ENABLED=false` gate is in place, even for an authorized admin.
- Normal PUT cannot introduce v5 over stored v3; after simulated store is already v5, authenticated native v5 PUT changes exactly one revision and confirms readback; legacy v3 downgrade is rejected.
- All CI plus Netlify preview must be green before marking COMPLETE/PASS.

## Provider semantics and limit of assurance

Netlify Blobs `setJSON` returns `{ modified, etag }` (with etag omitted for no replacement); `onlyIfMatch` accepts the **exact opaque source ETag**. `getWithMetadata` returns `{ data, metadata, etag }`. Strong reads can be requested with `{ consistency: 'strong' }`; the repository already does this for raw reads.

Netlify's Blobs guidance also warns that this is object storage, not a transactional database, with last-write-wins behavior for ordinary concurrent writes. The conditional write plus exact strong readback prevents many accidental conflicts, but does **not** establish general multi-writer transaction isolation. Never promote this into a broadly concurrent editing model on the strength of this checkpoint alone.

Before a one-time production migration, require an explicit short-lived administrative edit freeze, a fresh raw source recheck, a single guarded write and immediate matching readback. If the organization needs sustained simultaneous administrative writes or stronger guarantees, move the authoritative configuration to a transactional store before publication or obtain a documented provider guarantee suitable for this use.

More details: https://docs.netlify.com/build/data-and-storage/netlify-blobs/

## Remaining activation gate

CP-SD-06A2A3c2: final preview browser acceptance, explicit preflight evidence capture procedure, activation/deactivation sequencing, stop/recovery gates and user approval handoff. DO NOT activate migration or call the new inspection against production. No viewer, landing or style changes in this checkpoint.
