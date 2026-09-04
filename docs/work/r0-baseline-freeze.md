# R0 — Canonical baseline freeze

Status: IN PROGRESS / BLOCKED ON SOURCE BYTES
Branch: `work/r0-baseline-freeze`
Base commit: `ec24283c289b9cd19ae643405e6a00d825503ea0`

## Objective

Freeze the exact approved 2D checkpoint before any architectural migration or feature work.

## Current gates

- repository bootstrap: PASS
- work branch: PASS
- fixed 1536 × 1024 visual contract: RECORDED
- provider-neutral Git mutation contract: RECORDED
- exact v3.3.0 source bytes located: BLOCKED — `BASELINE_SOURCE_MISSING`
- golden materialized: NOT RUN
- asset hashes/bounds materialized: NOT RUN
- default recomposition vs golden: NOT RUN
- CI baseline gate: DEFERRED until the exact baseline is materialized
- Netlify project/deploy: DEFERRED until baseline validation passes

## Explicit non-goals

No new scene model, finish, stone variant, replacement appliance, handle, lighting, decor, guided UI, technical view, dimension overlay, lease system or scheduler belongs to R0.

## Next transition

When the exact checkpoint bytes become available:

1. import them without refactoring;
2. inventory every canonical asset;
3. calculate hashes and alpha bounds;
4. identify the exact golden;
5. update `baseline-manifest.json` to `READY` only after independent validation;
6. add the CI gate;
7. publish an isolated Netlify preview only after the gate passes.
