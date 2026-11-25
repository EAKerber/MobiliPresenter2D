# TST-009 crosswalk — published V5 configuration — 2026-11-25

## Scope and evidence boundary

This crosswalk maps the Product `development` V5 published-configuration read/save path to its current assertions, contracts, risks, consumers, and workflow route. It covers the bounded publication slice; it does not claim the full DOM-001 schema/consumer inventory.

Source snapshot: Product `development@d0f63d0c62ed25a78067bb8b2e98d88fded5a1a7`. The relevant runtime, consumer, test, and workflow blobs listed below were read from that ref. The local checkout at `683a1b980281b652ae23bbd5c2effcebc489bdcd` has matching Git blob IDs for the five executed tests, relevant endpoints/core modules, and workflow.

Evidence distinction:
- **Exact-source local execution:** five existing commands passed locally with source blobs matching the Product development snapshot.
- **Workflow reachability:** the current workflow declares PR and push triggers for `main` and `development` on the mapped paths.
- **Hosted/provider validation:** not established. Identity and Blob storage are injected or mocked; no live write or contention experiment was performed.

## Runtime and consumer pins

| Role | Path | Blob at development |
|---|---|---|
| Raw read and schema inspection | `app/core/published-configuration.js` | `7b5d13dfb43983a0efa622c1ad4a4531820a8ad0` |
| V5 preflight/read inspection | `app/core/v5-publication-inspection.js` | `0da4510829237478927792350fcc459b12517f63` |
| Conditional V5 save | `app/core/v5-normal-save.js` | `e9da3059ec2bbb566a0ac4c087553d383451e2e7` |
| Admin endpoint | `netlify/functions/configuration.mjs` | `d5aac8c4a015bde329272c61571d86c6c2e24a40` |
| Admin save/readback consumer | `app/admin/admin.js` | `f63044eab4f65e9fb1d7d84a263e6afaf7fdb829` |
| Buyer endpoint and projection | `netlify/functions/buyer-configuration.mjs`; `app/core/published-buyer-projection.js` | `aaace7bc2187aca4b1c484962f239ae00b20de80`; `c1f8e099f2dce29bd003577e8c0a724d7b6475fa` |
| Public modules endpoint and Viewer consumer | `netlify/functions/public-modules.mjs`; `app/viewer/public-data.js` | separate public allowlist path; it does not consume the raw Admin endpoint |
| Buyer app consumer | `app/app.js` | `c77a18a40702d18b7f14446a5649b202b928d2ed` |

## Assertion-to-risk map

| Assertion group | Source | Contract and risk | Existing evidence |
|---|---|---|---|
| Strong raw read retains ETag; malformed data or metadata is invalid | `published-configuration.js`; `test-published-configuration.js` lines 22–23, 32–45, 59–76 | Missing, malformed JSON, missing ETag, unsupported schema, and invalid V3/V5 remain distinguishable; invalid V5 cannot masquerade as defaults | Exact-source local command passed |
| Admin authorization precedes storage; Preview uses deploy store and production uses site store | `configuration.mjs`; `test-v5-endpoint-safety.js` lines 87–160, 204–207 | Anonymous, non-admin, and failed Identity requests do not open storage; Preview cannot open production storage | Exact-source local command passed |
| Raw ETag is not returned through the Admin API; cache is disabled | `configuration.mjs`; `test-v5-endpoint-safety.js` lines 120, 156–160 | Internal storage concurrency token and cached configuration are not exposed | Exact-source local command passed |
| Buyer projection keeps V3/V5 compatibility and omits Admin-only fields | `published-buyer-projection.js`; `test-published-buyer-projection.js` lines 31–63; `buyer-configuration-endpoint.test.mjs` lines 97–107 | Buyer receives only the allowlisted DTO, not raw source, Admin revision, or stored pricing | Exact-source local commands passed |
| Missing or invalid published config fails closed without defaults | `buyer-configuration-endpoint.test.mjs` lines 198–210; `test-v5-endpoint-safety.js` lines 279–311 | Missing/invalid state does not create a plausible but unpublished configuration and produces no write | Exact-source local commands passed |
| Normal save requires V5 source and candidate, matching revision, validation, normalization, incremented revision, and exact ETag CAS | `v5-normal-save.js`; `test-v5-normal-save.js` lines 22–63, 138–168 | Stale edit, downgrade, invalid candidate, or conflicting writer cannot silently replace published state | Exact-source local command passed |
| Concurrent editors produce one winner and one 409 without retry | `test-v5-normal-save.js` lines 67–135 | At most one write using the original opaque ETag succeeds; losing edit is surfaced | Exact-source local command passed; storage race is simulated |
| Write confirmation and readback require matching ETag, digest, valid V5 schema, revision, and semantic signature | `v5-normal-save.js`; `test-v5-normal-save.js` modes and assertions; `test-v5-endpoint-safety.js` lines 235–256 | Missing or divergent confirmation is not reported as success; rejected legacy operations cannot mutate the V5 document | Exact-source local commands passed |
| Retired migration and unsupported legacy repair remain blocked; payload size is bounded | `test-v5-endpoint-safety.js` lines 163–206, 235–256, 356–357 | Old migration, downgrade, and oversized payload cannot mutate the stored V5 document | Exact-source local command passed |

## Commands and result

- `node app/tools/test-published-configuration.js` — PASS
- `node app/tools/test-published-buyer-projection.js` — PASS
- `node app/tools/test-v5-normal-save.js` — PASS
- `node app/tools/test-v5-endpoint-safety.js` — PASS
- `node --test tests/buyer-configuration-endpoint.test.mjs` — 1/1 PASS

These were run locally at checkout `683a1b980281b652ae23bbd5c2effcebc489bdcd`; the relevant Git blob IDs were compared with the exact `development` snapshot above before execution. They are not represented as a GitHub Actions run on that commit.

## Trigger reachability

Workflow: `.github/workflows/buyer-configuration-boundary.yml`, blob `b5668220e3e6799542fbfd93e4cd1d7595435d2d`. It declares `pull_request` and `push` routes for both `main` and `development`, including `netlify/functions/configuration.mjs`, the mapped core modules, their tests, and the Buyer endpoint test. It invokes the five mapped tests and the ephemeral-fixture contract directly.

This closes the specific endpoint-trigger gap for `configuration.mjs` without duplicating the same suite in `app-build-purity.yml`. Branch protection and whether these workflows are required checks remain **UNKNOWN** because the connected GitHub API returns 403 for protection details.

## Remaining limits and status

- The Blob mock accepts the conditional-write contract supplied by the application. It does not prove provider-level atomicity across independent Netlify instances.
- Identity and storage failures are fixture outcomes, not live service behavior.
- No real published configuration was modified.
- DOM-003 and DOM-004 behavior is present and locally validated in the development snapshot. TST-009's V5 test map is complete for this bounded publication slice; DOM-001 remains broader and open for other schema, DTO, commercial-price, and consumer families.
- `main` has the core reader/inspection/save modules at the same blobs, while the Admin endpoint, test files, workflow, and some consumers differ. No promotion to `main` is performed by this crosswalk.
