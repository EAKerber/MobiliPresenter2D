# CP-SD-06A2A2a — native server v5 saving — 2026-10-07

Status: IMPLEMENTED / TEST GATE PENDING. Repository-only, in PR #158.

## Objective

Prevent a successful one-time v3 to v5 publication from stranding the admin without a native validated save path. This checkpoint adds only the ordinary server v5 PUT support; the admin button stays unchanged until A2A2b.

## Invariants

- A normal PUT can create or overwrite v5 ONLY when stored raw schema is already ConfiguratorAdministration2D 5.0; an existing v3 cannot be changed into v5 via this path.
- The existing identity and admin-role checks and 64 KiB body-size limit run before the v5 operation.
- A v3 or v4 payload cannot downgrade or replace stored v5. A separate operation (including persist-handles-all) cannot run on stored v5.
- Reject malformed/unknown persisted content, invalid v5 payload, nonpositive/stale revisions and revision overflow; never save default fallback values as evidence.
- Validate and normalize submitted v5 with current source catalog, scene, pricing and presentation contracts. Compute exactly one new revision from stored v5.
- Write only with strong-read source ETag + onlyIfMatch. Require modified true and a returned write ETag, then strong-read the stored object and require matching ETag, byte-content canonical digest, v5 validation, revision and publication signature.
- No blind retries, no silent price conversion, no custom hierarchy flattening.
- The one-time v3->v5 activation gate remains V5_MIGRATION_ENABLED=false.

## Tests

app/tools/test-v5-normal-save.js injects a fake Netlify Blob store and verifies success, typed amount rule retention, revision +1, stale revision, still-v3 source, missing/invalid source, downgrade, invalid pricing/policy, ETag conflict, missing write ETag, phantom write and tampered readback.

Source-level checks prove admin authentication, role and payload checks precede the new v5 save path. Existing v3 compatibility and isolated handles persistence must remain green.

## Not in scope

- No admin UI Save change (next CP-SD-06A2A2b).
- No live production read/write, migration activation or viewer/landing changes.
- No product design schema changes.

## Next

CP-SD-06A2A2b: admin Save selects native v5 payload only if its loaded publishedSource was v5; re-reads and verifies readback, updates publishedSource and revision, and hides v3-only handles repair under v5. Keep v3 source using existing legacy projection, with browser and authorization regression tests.

Only after A2A2b and integrated offline A2A3 may the separate authorized live A2 gate begin.
