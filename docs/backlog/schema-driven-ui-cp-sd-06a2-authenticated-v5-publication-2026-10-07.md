# CP-SD-06A2 — authenticated v5 activation and publication — 2026-10-07

Status: **REPOSITORY AND PREVIEW READINESS COMPLETE / LIVE EXECUTION NOT AUTHORIZED**.

Offline consumer/server readiness and integrated proof are COMPLETE/PASS through PRs #155–#162 (buyer v5, native admin v5, fake-store rehearsal, authenticated read-only inspection and endpoint-isolation gate). This does **not** prove the current production blob is canonical v3 or authorize inspection/activation. Netlify Blobs is not a general transaction database; a one-time cutover requires a short administrative edit freeze and independently checked raw backup.

**Mandatory future operator runbook:** `docs/backlog/schema-driven-ui-cp-sd-06a2a3c2-production-cutover-runbook-2026-10-07.md`. This document describes a live execution gate, not permission to perform it.

Prerequisites:
- CP-SD-06A0 offline canonical preflight COMPLETE/PASS.
- CP-SD-06A1a safe v3/v5 server read COMPLETE/PASS.
- CP-SD-06A1b guarded CAS publication service COMPLETE/PASS.
- Active Netlify production remains with `V5_MIGRATION_ENABLED = false` until a separate deliberately reviewed activation.
- No production raw read or write is part of A1a/A1b.

## Purpose

Publish one canonical production `ConfiguratorAdministration2D 5.0` document from the current, freshly read canonical v3 source. Do not combine migration with product/admin edits or hidden repairs.

## Required authenticated preflight

1. Confirm an interactive authenticated admin session and explicit authorization to operate on production configuration.
2. Confirm A1a server reading v5 is deployed, and A1b migration operation is present but activation still off.
3. Record the live production function deploy ID, main commit, store name/region and current source schema.
4. Capture a **fresh raw** `published` read with exact ETag, revision and canonical source digest; do not use normal GET or defaults as evidence.
5. Run the exact A0 preflight against this source. If it reports skirting consistency or Puxadores ownership as incomplete, **STOP**.
6. Execute any necessary skirting/Puxadores correction as its own reviewed v3 transaction with readback, then restart from a new fresh raw read.
7. Record expected v5 candidate digest, publication signature, source-equivalence projection and expected postwrite revision = source + 1.
8. Verify price and presentation smoke baselines and confirm no unintended product/catalog/material/hierarchy mutation.

## Activation and write boundary

9. Obtain explicit approval for a one-time production migration. Review a narrowly scoped activation change from `V5_MIGRATION_ENABLED = false` to `true` and deploy it deliberately. Never reuse a preview as a production execution gate.
10. Immediately before the actual write, recheck admin identity and freshness of source revision/digest/ETag; any difference aborts the operation.
11. Submit the exact server-derived candidate with `x-configuration-operation: publish-v5-migration` and `x-configuration-source-digest`.
12. Require source ETag compare-and-swap success with a nonempty returned write ETag. Treat a malformed provider success response as a failure.
13. Require strong raw readback: correct v5 schema, exact revision/digest, expected publication signature and matching write ETag. Do not claim success based only on a write acknowledgement.
14. Disable the migration activation again, verify the deployed endpoint refuses repeats, and preserve complete evidence.
15. Run production smoke of buyer flow, admin read, scene/PiP/summary, Puxadores, stone-skirting, and price totals/rounding. Confirm no v3 downgrade writes can occur.

## Abort and recovery

- Any mismatch between read and write, CAS failure, missing ETag, invalid schema, signature or readback discrepancy: stop and investigate from a new raw read.
- Do not retry the write blindly, downgrade stored v5 to v3, fabricate ownership assignments or auto-repair data.
- If the write landed but acknowledgement failed, the raw verified persisted document — not the HTTP return code — determines next action.
- Historical v3 remains import/migration compatibility only after verified v5 publication; retire normal production legacy readers/writers in a separate reviewed slice if still needed.

## Completion gate

Document exact production revision, source and published digests, ETags, deploy IDs, merge SHAs, activation-deactivation evidence, production smoke and any deliberate remaining compatibility. CP-SD-06 closes only after all gates pass.

**This plan is documentation, not permission to read or mutate production data.**
