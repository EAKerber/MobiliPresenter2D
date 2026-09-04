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
- closed Git-data mutation path exercised without `gh`: PASS
- exact v3.3.0 source bytes located: BLOCKED — `BASELINE_SOURCE_MISSING`
- source inventory tooling: PASS / READY TO RUN
- golden materialized: NOT RUN
- asset hashes/bounds materialized: NOT RUN
- default recomposition vs golden: NOT RUN
- R0 contract CI: ACTIVE; reports the missing source as an expected blocker and does not claim baseline PASS
- baseline validation CI: ARMED; it becomes the active validation path automatically when manifest status is `READY`
- Netlify project/deploy: DEFERRED until baseline validation passes

## Tooling semantics

`tools/inventory-baseline-source.py` is read-only. Given an extracted checkpoint directory, it produces a deterministic inventory of every file with relative path, byte size and SHA-256. PNG files additionally record width, height, mode and alpha bounds. It does not rename, normalize, optimize or rewrite source bytes.

`tools/check-r0-contract.py` distinguishes two valid R0 states:

- `UNMATERIALIZED`: the exact v3.3.0 bytes are absent and the declared blocker must be `BASELINE_SOURCE_MISSING`;
- `READY`: the baseline validator must pass, including exact default recomposition versus the golden.

A green `R0 contract` workflow while the manifest is `UNMATERIALIZED` means only that the blocker is represented coherently. It is not evidence that the baseline exists or passes fidelity.

## Explicit non-goals

No new scene model, finish, stone variant, replacement appliance, handle, lighting, decor, guided UI, technical view, dimension overlay, lease system or scheduler belongs to R0.

## Netlify isolation

The existing Netlify project `mobilipresenter` belongs to the original product and must not be changed, reused or repointed by MobiliPresenter2D. After R0 baseline validation passes, create a separate Netlify project for MobiliPresenter2D and publish the validated baseline there first as an isolated preview/deploy.

## Next transition

When the exact checkpoint bytes become available:

1. extract them without modifying contents;
2. run the source inventory tool against the extracted tree;
3. inspect the inventory to identify the exact golden and canonical composition layers;
4. import the exact bytes without refactoring;
5. populate file hashes, dimensions and alpha bounds in `baseline-manifest.json`;
6. declare the explicit default composition order;
7. switch manifest status to `READY` only in the same closed candidate change that contains all required bytes/metadata;
8. run independent hash/image/recomposition validation;
9. create a separate MobiliPresenter2D Netlify project only after that gate passes.
