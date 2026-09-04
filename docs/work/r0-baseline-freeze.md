# R0 — Canonical baseline freeze

Status: IN PROGRESS / SOURCE VALIDATED / IMPORT CARRIER PENDING
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
- exact v3.3.0 source ZIP located: PASS
- source ZIP SHA-256: `ab419606d02a3e785810aa32ca9a31e576c09d8619abd59acfe47a4fda9bd189`
- source ZIP size: `7,741,469` bytes
- source file inventory: PASS — 57 files
- internal baseline ID: `cozinha-01-phase3-stone-split1`
- canonical core test: PASS — `scene2d-89ce17bc`, 11 entities, 8 controllable
- canonical fidelity test: PASS — 23 assets, zero pixel divergence
- technical-data cross-check: PASS — zero SHA/alpha/canvas mismatches
- repository binary materialization: BLOCKED — `BASELINE_BYTES_TRANSPORT_PENDING`
- hosted import carrier: READY TO USE
- R0 contract CI: ACTIVE; `SOURCE_VALIDATED` remains an expected blocker until the exact bytes are committed
- Netlify project/deploy: DEFERRED until repository materialization and fidelity validation pass

## Source authority

The attached archive supplied on 2026-09-03 is now the concrete R0 source authority. Its logical checkpoint is v3.3.0. The archive itself is not inferred from chat history: its size, SHA-256, complete file inventory, PNG metadata and canonical test outputs are recorded under `reference/`.

The observed archive contains 57 files. Earlier historical summaries mentioned a larger file count/size; those summaries are not used as authority because they do not match the bytes actually supplied and validated here.

## Hosted import carrier

The conversational GitHub connector can create binary blobs only by embedding their complete base64 payload. That is technically possible but unsuitable for this archive. Local `git` in the execution sandbox has no GitHub credentials.

`tools/import-baseline-archive.py` plus `.github/workflows/r0-baseline-import.yml` provide a bounded alternative. The incoming archive is first matched to the committed size/SHA and full inventory before any code from it runs. Canonical source tests run on a disposable copy; the untouched verified extraction is copied to `app/`. The candidate target commit is built on the re-observed `work/r0-baseline-freeze` head, validated against the golden, pushed without force and read back.

The carrier branch is `incoming/r0-v3.3.0`. It is temporary and is not the product branch.

## Explicit non-goals

No new scene model, finish, stone variant, replacement appliance, handle, lighting, decor, guided UI, technical view, dimension overlay, lease system or scheduler belongs to R0.

## Netlify isolation

The existing Netlify project `mobilipresenter` belongs to the original product and must not be changed, reused or repointed by MobiliPresenter2D. After R0 validation passes, create a separate Netlify project for MobiliPresenter2D.

## Next transition

1. place the exact validated ZIP on `incoming/r0-v3.3.0`;
2. hosted importer verifies SHA/inventory/tests and materializes the candidate `app/` tree;
3. target branch is re-observed and updated without force;
4. root baseline validator proves hashes, dimensions, alpha bounds and default composition versus golden;
5. record the resulting target commit and CI/import receipt;
6. only then create the isolated MobiliPresenter2D Netlify project and deploy the validated baseline.
