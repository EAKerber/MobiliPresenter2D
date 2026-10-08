# CP-SD-06A2A3c2 — production v5 cutover runbook and GO/NO-GO — 2026-10-07

Status: **PREPARATORY DOCUMENTATION; LIVE ACTIVATION NOT AUTHORIZED**.

## Purpose and scope

This runbook is the final operator checklist before the separate CP-SD-06A2 live operation. It does NOT authorize, schedule or execute a production raw read, admin edit, deployment toggle or migration. The active function retains `V5_MIGRATION_ENABLED = false` and the current published blob must be treated as unknown until a deliberately authorized fresh inspection.

Validated implementation evidence:

- CP-SD-06A0 canonical v3→v5 preflight (repository) COMPLETE/PASS.
- CP-SD-06A1a / A1b v3/v5 read and one-time disabled migration service, PRs #153/#154 COMPLETE/PASS.
- CP-SD-06A2A1a/b public buyer v5 consumption and browser parity, PRs #156/#157 COMPLETE/PASS.
- CP-SD-06A2A2a/b post-migration native admin v5 write plus authenticated server CAS/readback, PRs #158/#159 COMPLETE/PASS.
- CP-SD-06A2A3a end-to-end fake-store migration and native edit rehearsal, PR #160 COMPLETE/PASS.
- CP-SD-06A2A3b admin-only read-only preflight endpoint, PR #161 COMPLETE/PASS. **Never called against production in these checkpoints**.
- CP-SD-06A2A3c1 full Netlify handler/Identity/deploy-store isolation fake test, PR #162 COMPLETE/PASS.

## GO/NO-GO authority

Live cutover may proceed **only after explicit separate user authorization**, an interactive authenticated admin session and a currently verified production preflight. All outstanding fields below must be filled from fresh evidence. Unverified historical values and mock values are NOT sufficient.

**NO-GO** if any gate is missing, if two admins might edit concurrently, if a production backup is unavailable, if the storage region/deploy context is not verified, or if the provider's conditional-write guarantees are insufficient for the actual operational concurrency. Netlify Blobs is not a transactional database: use a short, coordinated administrative write freeze for this one-time migration, and do not extrapolate it into a multi-writer authoring architecture.

## Evidence record — leave blank until an authorized live inspection

| Evidence item | Value |
|---|---|
| Explicit approval (who / date / scope) | PENDING |
| Authenticated operator / production site | PENDING |
| Main SHA / production deploy ID | PENDING |
| Production Blobs store / region / key | PENDING |
| Confirmed administrative edit freeze | PENDING |
| Trusted raw v3 backup location + secure access | PENDING |
| Raw schema / revision / opaque ETag | PENDING |
| Raw canonical SHA-256 digest | PENDING |
| A0 preflight PASS and Puxadores / skirting ownership | PENDING |
| Exact candidate v5 digest / publication signature | PENDING |
| Expected postwrite revision and digest | PENDING |
| Activation deploy ID / operator action | PENDING |
| Conditional write result and write ETag | PENDING |
| Exact strong readback digest / revision / signature / ETag | PENDING |
| Disablement deploy ID and repeat-operation 403 proof | PENDING |
| Buyer/admin/price smoke results | PENDING |
| Final decision / incident notes | PENDING |

Never commit raw production data, credentials, opaque production ETags or full admin-only preflight payload into a public repository or public CI artifact. Persist sensitive evidence in an access-controlled location and link only its permitted identifier or redacted proof.

## Cutover procedure (operations are *future*, not instructions to execute now)

### 0. Authorization and independent safety review

1. Require explicit approval for a single v3→v5 cutover and a separate approval for the production raw inspection; establish the operator's admin Identity session. Confirm the current production site, deploy ID and `main` match the approved candidate, and verify the function remains hard OFF.
2. Confirm no pending production deploy, admin save or repair transaction. Coordinate a temporary administrative edit freeze with other operators; if concurrent writers cannot be stopped or provider CAS assumptions cannot be accepted, **NO-GO**.
3. Arrange a trusted complete raw v3 backup and verified recovery access *before* activation. The authenticated preflight GET exposes the digest/candidate and ETag but **not** the exact raw v3 bytes, so it is not by itself a rollback backup.

### 1. Authenticated fresh inspection (read-only, only after approval)

4. Use the production admin Identity session for `GET /api/configuration?inspection=v5-preflight`, never the anonymous normal GET. Confirm status 200 and `v5_preflight_ready`. Record live schema, revision, ETag, canonical digest, candidate digest, publication signature and expected revision/digest. Treat all fields as a single coherent snapshot.
5. Compare canonical raw source digest to the trusted backup; confirm that source facts show expected Puxadores and stone-skirting ownership. If preflight reports `handles_repair_required`, `skirting_repair_required`, invalid source, missing blob or already-v5 state: **STOP**, do not fabricate fixes or migrate. Any repair must be isolated and separately authorized under v3 with readback, followed by a *new* inspection and backup.
6. Confirm buyer behavior, admin read, commercial estimates, Summary, layout/PiP/dock and visible choices against the accepted baseline in an isolated preview or already-approved production read-only smoke. Preserve established pricing rules; avoid writing test prices to production.

### 2. Deliberate, narrowly scoped activation

7. Review and deploy a separately approved, short-lived `V5_MIGRATION_ENABLED = true` activation. Confirm the resulting production deploy ID, and prevent any other code/data changes from being batched into the activation. A preview deploy is NOT proof of production store state.
8. Immediately before writing, repeat the **authenticated preflight** on the actual production store and compare raw revision/digest/ETag to the approved snapshot. If any mismatch, **ABORT** and begin a fresh review rather than reusing the stale candidate.
9. Submit exactly the server-derived candidate through the authenticated admin-only `PUT /api/configuration` with `x-configuration-operation: publish-v5-migration` and matching `x-configuration-source-digest`. Execute only once; never loop/retry automatically.
10. Require `modified === true`, a nonempty write ETag, expected revision+1, exact stored SHA-256 digest and publication-signature readback, and a matching strong-read ETag. A response code or conditional-write acknowledgement alone is NOT proof of a committed migration.

### 3. Disable, smoke and record

11. Immediately restore `V5_MIGRATION_ENABLED = false` in a separate reviewed deploy; verify that another `publish-v5-migration` request returns `403 v5_migration_disabled` and cannot write. Avoid sending the production candidate unnecessarily when checking disablement.
12. Confirm normal buyer GET and authenticated admin read show v5; smoke all enabled stages, modules, Puxadores, stone/sirting ownership, independent scroll, PiP, dock, Summary totals/rounding, authored presentation policy and mobile breakpoints. Avoid nonessential production writes.
13. Confirm native admin v5 Save can be operated in isolated preview, and that a legacy v3 PUT against stored v5 is rejected. Production test writes, if any, require their **own** scoped approval and exact readback; do not silently mutate live catalog or prices for smoke testing.
14. Record all redacted evidence, deploy IDs, merged commit SHA, pass/fail outcomes and any deferred legacy retirement. Mark CP-SD-06 COMPLETE only when the durable production proof exists, not when the repository/test readiness is green.

## Abort and recovery gates

- **Prewrite mismatch:** do not write. A stale revision, changed ETag or altered digest cancels that cutover; obtain new evidence.
- **Conditional write failed:** stop. Do not retry blindly; investigate whether a concurrent author modified the source.
- **Lost response/timeout/missing write ETag:** treat status as unknown, perform an independently authorized fresh strong raw read to determine whether v3 or v5 actually landed. Never assume write failure means source still v3.
- **Postwrite digest/signature/ETag mismatch:** stop all writes and preserve evidence. Do not claim success or run a second migration.
- **Application smoke failure after v5 landed:** do not roll the code back to a v3-only version, which may hide v5 data. Roll back only via a separately reviewed recovery plan that preserves a v5-capable reader and uses the secure backup. Never auto-downgrade v5 in production.
- **No concurrent safety guarantee:** if business requirements require multiple concurrent admin authors, reassess authoritative storage (e.g., transactional database) before moving to sustained v5 editing.

## Explicit deferred work

Only after verified live publication: close CP-SD-06 legacy-retirement gate without deleting historical v3/v4 import/migration support; then proceed to public landing/commercial viewer integration, branch housekeeping, nominal-size/admin flexibility and visual token/light-dark-mode work in their own checkpoints.

**This document is a runbook, not authorization for any live operation.**
