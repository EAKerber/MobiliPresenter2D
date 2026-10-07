# CP-SD-06A1b — guarded v5 migration operation — 2026-10-07

Status: **IMPLEMENTED IN DRAFT PR #154 / GATE PENDING — ACTIVATION OFF**.

Parent: CP-SD-06A1a COMPLETE/PASS, merged PR #153.

## Purpose

Make the one-time v3 -> v5 publication operation available for authenticated offline/review testing without enabling it in deployed production.

## Boundaries

- `V5_MIGRATION_ENABLED = false` in `netlify/functions/configuration.mjs` is the explicit repository-controlled execution gate. A1b must **not** turn it on.
- Normal GET and legacy v3 PUT/`persist-handles-all` remain unchanged outside A1b.
- Requests require existing admin identity + role, body size limit and exact operation header before reaching the migration service.
- Production raw configuration must not be accessed, repaired, migrated or written during this checkpoint.
- No v5 catalog, scene, pricing, hierarchy or presentation semantics are changed.
- A0 `createPreflight()`, `canonicalJson()`, `digestJson()` and `verifyReadback()` are reused rather than duplicated.

## Transaction contract

1. Raw-read the stored document and ETag using strong consistency; reject missing, malformed or non-v3.
2. Require request schema v5 and request revision equal the raw v3 source revision.
3. Require a 64-character source digest header.
4. Run A0 canonical source and skirting/Puxadores preflight; reject source repairs.
5. Compare digest to raw preflight digest, then compare entire submitted candidate to the server-derived candidate.
6. Derive exact v5 output revision = source revision + 1.
7. Conditional `setJSON("published", v5, { onlyIfMatch: sourceEtag })` exactly once.
8. Require `modified === true` **and** a nonempty written ETag.
9. Strong raw-read after write; require stored ETag equal returned ETag, exact raw digest equal expected digest and A0 verifier PASS (including publication signature).
10. Only then acknowledge publication with digest, revision, signature and ETag evidence.

Provider concern: a conditional-write acknowledgement may be unreliable under transport failures; success is never inferred from `modified` alone. Any partial or mismatched result is a failure, and future live activation requires a fresh audit of provider behavior.

## Test matrix

- Valid simulated migration: v3 -> v5, revision +1 exactly, single conditional write, matching digest/signature/readback.
- Missing/non-v3 source, wrong/stale revision, invalid/wrong digest.
- Tampered candidate, unrepaired skirting and Puxadores.
- ETag mismatch / CAS lost race, acknowledgement missing ETag, no-write phantom acknowledgement, modified readback.
- Explicit OFF activation and prior admin/role checks (source-level gate).
- Existing A1a and v3 `persist-handles-all` tests remain green.
- Netlify preview and path-triggered GitHub workflows green.
- Documentation synchronized before merge.

## Gates

Mark COMPLETE/PASS only after mocked-store unit tests, browser regression suites and deployment preview pass. **Do not activate or execute migration in A1b.**

## After A1b

Separate authenticated activation/execution checkpoint, requiring fresh production raw source, verified ETag/revision/digest, isolated repair transactions if needed, deliberate gate activation, and immediate readback/production smoke. Stop on any discrepancy.
