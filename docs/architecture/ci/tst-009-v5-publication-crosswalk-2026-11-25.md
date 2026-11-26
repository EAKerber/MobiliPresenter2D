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


## Live reconciliation — 2026-11-26

The original snapshot above remains a valid historical read of `development@d0f63d0c`; it is not the current branch snapshot. This supplemental read is pinned to:

- Product `main@7ebacc86018c60e54df4d0e15c95ecd3eed46a77`
- Product `development@4bcfa26911498a9bf5c3c94c517e9931746b437b`
- merge base `221b54b2a41ecc8c338d1bf2cf67280cf165ce95`

### Current source comparison

| Role | main blob | development blob | Result |
|---|---|---|---|
| Published configuration reader | `7b5d13dfb43983a0efa622c1ad4a4531820a8ad0` | same | identical |
| V5 inspection | `0da4510829237478927792350fcc459b12517f63` | same | identical |
| V5 conditional save/CAS | `e9da3059ec2bbb566a0ac4c087553d383451e2e7` | same | identical |
| Configuration endpoint | `2bd8ec2fe0adb6b861b819d40f5b4285450f1051` | `344a9cd7fdc2dc22abf7afb5e3ce7193ac06c8e3` | differs |
| Admin consumer | `79925345e43096df77bef54fe257e483f922edd8` | `4702ad57579fa6649ca6b7b08cd0a3fec97df93f` | differs |
| Buyer endpoint and public projection | `aaace7bc2187aca4b1c484962f239ae00b20de80`; `c1f8e099f2dce29bd003577e8c0a724d7b6475fa` | same | identical |
| Buyer endpoint tests | `3c342cfbbc2c479d84f60978ccef2e35928e60ad` | `f61eb8d670f76b65f44967781dbde5f26e50efc2` | main lacks missing/invalid-V5 assertions |
| Endpoint safety tests | `fe16a7d94c254f1f8b7d860ef897816d6a04e399` | `f580e2d27302d63c4fb3d724b9db08758206a8b1` | differs |
| App-build purity workflow | `39a2511dd02a10a2f85afb289bc487e9a867d2f7` | `3debb0f87335921d6ba0997471433488d07ccdfc` | differs |

The Admin endpoint files differ structurally but have equivalent read/write behavior for the checked legacy/V5 states. Both preserve the read-only Admin fallback for missing or invalid legacy V3; malformed JSON, unsupported schema, metadata-invalid state, and V5 remain fail-closed, and fallback is never accepted as a write source. Development contains one later `currentRead.kind === 'missing'` check after `readPublished()` already maps missing to `fallback`; that branch is unreachable and does not change runtime behavior.

The Buyer endpoint and public projection are byte-identical across the refs (`buyer-configuration.mjs` `aaace7bc`; `published-buyer-projection.js` `c1f8e099`). The Buyer endpoint returns 503 for missing or invalid published data on both refs. The evidence gap is in main's test file: `tests/buyer-configuration-endpoint.test.mjs` at `3c342cfb` omits missing-storage and invalid-V5 cases that development's `f61eb8d6` asserts as 503 with no defaults. Keep DOM-003/TST-009 `main=partial` until those two tests are ported and the main authorization-boundary gate passes.

### Main gate receipts

- PR #522 head `46e8a21a18526ff5ccfd2be6dcb3691483f89f64`: all 9 PR checks passed, including App build purity and Configuration endpoint authorization boundaries. The change adds exact tests for missing/invalid V3 fallback and malformed, unsupported-schema, and metadata-invalid stored states.
- PR #523 head `7d44f9bb0d9ccfe82aaa2c9dc9e7747a5f9f08e9`: App build purity run #45898340031 passed after `netlify/functions/configuration.mjs` was added to its path filters. This closes the handler-only trigger gap on main.

The current development `buyer-configuration-boundary.yml` blob is `b5668220e3e6799542fbfd93e4cd1d7595435d2d`; it does list `netlify/functions/configuration.mjs` in its trigger paths. This remains an exact source observation; whether a check is required by branch protection is still UNKNOWN.

### Status boundary

The V5 reader, inspection, and CAS/save core are already shared byte-for-byte. Main has current passing endpoint tests and the handler trigger route; development has its own endpoint contract workflow and test set. Do not port whole files solely to equalize blobs. Complete the endpoint/test semantic diff and current TST-001 inventory before marking the cross-branch slice reconciled. Hosted Identity, live Admin behavior, and provider-level Blob atomicity remain UNKNOWN.


### TST-001 gate reachability and status correction

The workflow previously omitted `docs/architecture/ci/**` and `docs/architecture/plan-v0.9-execution-register.json`; this PR added both to push and pull_request path filters. Run #45902210791 confirms the plan and inventory jobs are now reachable and successful for the exact refs recorded above. Run #45902210791 completed successfully on PR #526 predecessor head a13cd23af0483b3a8426bb494df757538d21542f; both the plan and inventory jobs passed. The exact JSON readback was preserved as [docs/architecture/ci/tst-001-workflow-inventory-live-2026-11-26-run-45902210791.json](docs/architecture/ci/tst-001-workflow-inventory-live-2026-11-26-run-45902210791.json) and as workflow artifact 15155409887 (SHA-256 zip digest 97afb78d6f105a9a62224936ae86c55af50da58d5414fd2eca1bc8a7f57572d9). It pins main@7ebacc86018c60e54df4d0e15c95ecd3eed46a77, development@4bcfa26911498a9bf5c3c94c517e9931746b437b, and candidate tree 99f96a282444443b22c2f38330fbf1ac503a0330. Summary: 28 main workflow files, 65 development workflow files, 26 shared paths, 86 unique definitions, zero parse warnings, and one candidate workflow change with no write signals. The counts describe workflows and trigger declarations; they are not Git branch counts. The artifact's candidate layer is specifically the predecessor head above; this PR's later evidence commits trigger a new exact-head run and do not retroactively change that snapshot.

DOM-004 is `main=done` for the code-level CAS/revision/readback contract and mocked tests because the shared V5 core matches and main gates pass. Hosted Netlify Blob atomicity remains UNKNOWN. DOM-003 and TST-009 remain `main=partial` only for the missing two Buyer negative assertions above.
