# CI authority contract — 2026-10-05

Status: housekeeping decision record for the near-official product candidate.

## Principle

An exact historical checkpoint and the current product are different authorities.

- Historical R0/R4/R5A manifests and replay tooling preserve evidence about a specific materialized revision.
- Current pull-request and `main` gates must answer whether the current product is internally valid, composable and faithful to its current approved runtime contracts.
- A later product revision is not a regression merely because its bytes differ from an old exact checkpoint.
- Historical hashes must never be silently refreshed solely to make CI green.

## Current automatic gates

### Current variant fidelity

Automatic PR/main validation derives the configured cases from the current `Scene2D`, validates the current app runtime and renders the current variant fixtures.

It deliberately does **not** require all current app bytes to match `reference/baseline-manifest.json`. That manifest remains an exact historical artifact.

### Current asset gates

Automatic PR/main validation keeps the contracts that still describe current product authority:

- candidate intake/schema checks;
- authoring provenance checks;
- perspective/gap editorial contracts;
- current app asset/runtime validation;
- current variant rendering;
- approved stone, faucet and range runtime integration;
- current visual candidate/set review.

Historical stone-authoring replay tests whose source SHA contracts predate the accepted hot-swap and subsequent stone cleanup are no longer automatic blockers. Their source records and tools remain in Git history/repository evidence and can be replayed deliberately when investigating that lineage.

## Historical replay gates

### R0

`Historical R0 contract replay` is manual (`workflow_dispatch`) and requires an explicit historical `target_ref`. It replays the R0 contract against the selected revision instead of comparing the modern product to R0.

### R4 module 02

`Historical R4 module 02 replay` is manual and requires an explicit historical `target_ref`. It retains the fixed parent evidence and bounded R4 transition validator.

The historical R4 transition runs only when the selected manifest identifies an R4 checkpoint; otherwise the workflow records that the transition is not applicable.

## Retired write automations

The following workflows were removed from the live workflow set because their only purpose was to write to branches already intentionally pruned:

- `r0-baseline-import.yml` -> `work/r0-baseline-freeze`;
- `r4-materialize.yml` -> `work/r4-module02-fidelity`.

Their commits, tools and historical output remain recoverable in Git. Removing the workflow prevents obsolete automation from implying that those deleted work branches are still current authority.

## Baseline manifest status

`reference/baseline-manifest.json` remains a `BaselineManifest 0.1` exact historical snapshot. `tools/validate-baseline.py` remains its exact validator.

Do not repurpose that manifest into a continuously moving checksum of `main`.

If an official release snapshot is needed, create a new explicitly named release/candidate authority with provenance to the approved `main` commit rather than overwriting the historical R0/R5A lineage.

## Promotion gate for this CI change

Before merge:

1. current app tests pass;
2. current variant fidelity reaches and completes variant rendering;
3. current asset gates reach current runtime/approved-component validation instead of stopping on historical source hashes;
4. Stone browser and Keyboard browser remain green when triggered;
5. no production asset, schema, renderer or UX file changes in this slice.

## Non-goals

- no visual baseline is refreshed in this change;
- no historical manifest or approval receipt is rewritten;
- no current stone/glass geometry is changed;
- no PR #34 product decision is made;
- no schema generalization is bundled with CI housekeeping.
