# CP-SD-06A2A0 — production v5 consumer readiness audit — 2026-10-07

Status: DISCOVERY COMPLETE / PUBLICATION BLOCKED. Repository-only evidence; no live store access.

## Decision

Do not activate the v3-to-v5 migration yet. A1a supports server-side v5 GET, and A1b supports guarded one-time migration with V5_MIGRATION_ENABLED=false, but normal buyer and admin consumers are not yet safe after publication.

## Verified blockers on main e869dc6

1. Buyer: app/app.js applyConfiguratorSettings(value) calls the legacy v3 configurationCore.normalizeConfiguratorSettings unconditionally. The remote fetch ends in catch(() => {}), which can silently retain static defaults when v5 is rejected. app/index.html does not load core/administration-v5.js. Several UI consumers require legacy stage.items; v5 stores items in stage.groups/sections. The buyer also ignores authored v5 presentationPolicy and typed pricing, replacing these with defaults or legacy conversion. A successful server GET therefore cannot prove buyer readiness.

2. Admin: app/admin/admin.js loadSettings() can read and upgrade v5, but Save always uses hierarchyCore.projectToLegacy(model), submits a v3 PUT and expects a v3 response. The server deliberately replies 409 to all normal PUT requests if the stored source is v5. This avoids downgrades but leaves ordinary admin edits unavailable after migration. The v3-only persist-handles-all repair flow must not run under v5.

3. Evidence: the A1a raw reader with source ETag is internal. The public GET returns normalized data or defaults and cannot be used for A2 raw source revision/digest/ETag evidence. Use a separately reviewed admin-authenticated read-only inspection mechanism, or an approved trusted direct store read. Do not expose raw store ETags to anonymous buyers.

## Small implementation sequence

- CP-SD-06A2A1: v5 buyer consumption. Explicit v3/v5 dispatch and validation; flowCore.normalizeFlow must receive authoritative v5 hierarchy, not a flattened replacement. Existing flat display projections, when required, are derived views only. Consume typed pricing and authored presentationPolicy. Test invalid v5 fail-closed and valid v3/v5 browser parity.
- CP-SD-06A2A2: v5 admin + normal server editing. Once stored schema is v5, allow authenticated validated v5 writes with revision, ETag CAS and exact readback; prior to migration, normal v5 PUT stays forbidden. Keep v3 behavior and isolated handles repair compatible only with v3.
- CP-SD-06A2A3: offline integrated rehearsal, provider failure controls and review of authenticated raw snapshot mechanism. Keep migration activation OFF. Verify all browser, pricing, admin and accessibility gates against the deterministic A0 v5 candidate.
- CP-SD-06A2 live execution: separate explicit user authorization, fresh authenticated raw production evidence, repairs as isolated v3 transactions if required, temporary reviewed migration activation, exact conditional write and readback, immediate deactivation and production smoke.

## Required gates

- Deterministic canonical v3 and v5 show equal accepted scene, flow, navigation, module visibility, Summary, PiP/dock and price totals for unchanged data.
- Missing semantic v5 sections remain absent, unsupported presentation/components fail closed, and no renderer fallback fabricates semantic UI.
- Typed absolute/percentage adjustments work without projecting v5 through v3 pricing buckets. Browser errors do not silently become default data.
- Admin can read and save v5 when stored v5; stale revision, changed ETag, invalid v5, missing auth and non-admin identity are rejected.
- Normal v3 publication and persist-handles-all retain their behavior while the store remains v3, and cannot downgrade v5.
- Never access or mutate the live production configuration during A1–A3; documentation and CI evidence are mandatory before live approval.

## Retirement boundary

CP-SD-06 cannot close merely because a one-time migration is available. Post-migration buyer/admin runtime behavior must be proven; v3/v4 may remain only as explicit import and migration compatibility. No live operation is authorized by this document.
