# CP-SD-06A2A3a — offline end-to-end migration rehearsal — 2026-10-07

Status: COMPLETE / PASS in PR #160. Functional head `eb2cc72fc94b12c75bbd397a6657458aa2a90820` passed 6/6 triggered GitHub workflows (including full mock-provider chain in App build purity) and Netlify preview #160. No production access; one-time migration flag remains OFF.

## Scope

An isolated full-chain test uses the real production core code with an injected fake Blob provider. It exercises:

1. A freshly created canonical v3 publication as exact raw source, source digest, ETag and canonical A0 preflight.
2. The A1b conditional one-time v3 -> v5 publication, including revision increment, strong raw readback, digest and signature.
3. The A2A1 buyer schema-v5 normalization/flow/typed-pricing/policy projection, compared to the canonical v3 buyer behavior for unchanged data.
4. A2A2 native v5 admin Save with structural stage-group reorder, edited module title and non-v3-projectable fixed finish pricing.
5. Another v5 buyer projection that sees the authored changes and preserves typed pricing and hierarchy.
6. Replay protection (second v3 -> v5 migration rejected), stale admin revision rejection and intervening ETag concurrency conflict.
7. Malformed v5 rejection by the buyer. Source-code assertion verifies V5_MIGRATION_ENABLED=false.

## Gates

- Test: app/tools/test-v5-offline-rehearsal.js, run with app npm test under the existing app-build CI workflow.
- Independent previously green browser gates: PR #157 buyer v3/v5 parity; PR #159 native admin v5 Save, hierarchy and pricing.
- No live Blobs reads/writes, no admin credentials, no Netlify site mutation.
- Document pass evidence and synchronize handoff/roadmap only when repository CI and preview pass.

## Remaining A2A3 work

- A2A3b: trusted authenticated raw v3 snapshot/evidence design and provider conditional-write failure-mode review; avoid exposing raw ETag through anonymous normal GET.
- A2A3c: integrated preview browser smoke and production activation/deactivation checklist; stop if contract discrepancy.
- CP-SD-06A2 live execution requires separate explicit approval, current production authenticated source evidence, any isolated repairs, conditional write/readback and buyer/admin smoke. Never infer real v3 state from historical sources.

## No scope expansion

The public landing/viewer integration, nominal dimensions, theme/style-system and branch hygiene remain future work. Production schema activation and legacy retirement are not part of this checkpoint.
