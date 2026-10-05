# CI authority contract — 2026-10-05

Status: housekeeping decision record for the near-official product candidate.

## Principle

An exact historical checkpoint and the current product are different authorities.

- Historical R0/R4/R5A manifests and replay tooling preserve evidence about a specific materialized revision.
- Current pull-request and `main` gates must answer whether the current product is internally valid, composable and faithful to its current approved runtime contracts.
- A later product revision is not a regression merely because its bytes differ from an old exact checkpoint.
- Historical hashes must never be silently refreshed solely to make CI green.
- A historical materializer must never run implicitly as the default build if it rewrites later approved current-product pixels.

## Current automatic gates

### Current variant fidelity

Automatic PR/main validation derives the configured cases from the current `Scene2D`, validates the current app runtime and renders the current variant fixtures.

It deliberately does **not** require all current app bytes to match `reference/baseline-manifest.json`. That manifest remains an exact historical artifact.

### Current asset gates

Automatic PR/main validation keeps the contracts that still describe current product authority:

- candidate intake/schema checks;
- candidate authoring provenance checks;
- perspective/gap contract unit tests;
- current app asset/runtime validation;
- current variant rendering;
- approved stone, faucet and range runtime integration.

Historical stone-authoring replay tests whose source SHA contracts predate the accepted hot-swap and subsequent stone cleanup are no longer automatic blockers. Their source records and tools remain in Git history/repository evidence and can be replayed deliberately when investigating that lineage.

The same boundary applies to `render_candidate_review.py` and the stacked candidate-set compositor for the retained pre-hot-swap review candidates: those tools intentionally verify a frozen historical source-frame hash. Their structural intake and provenance contracts still run automatically, but exact historical candidate compositing is not a current-product blocker after the source frame was intentionally replaced.

### App build purity

The ordinary app build must start from the approved current `app/assets` state and may regenerate only current derived artifacts.

`App build purity` therefore requires:

1. `cd app && npm run build` succeeds;
2. the build leaves all tracked files under `app/` unchanged;
3. `cd app && npm test` succeeds directly on that current state;
4. tests also leave tracked app files unchanged;
5. explicit historical R5A replay commands remain available but are not part of the ordinary build.

The audit that established this contract found that the previous ordinary app build changed 98,478 PNG pixels, including 26,726 alpha values, because it rematerialized an older R5A stone state. The current-assets build was clean and current tests passed without that rematerialization.

## Historical replay gates

### R0

`Historical R0 contract replay` is manual (`workflow_dispatch`) and requires an explicit historical `target_ref`. It replays the R0 contract against the selected revision instead of comparing the modern product to R0.

### R4 module 02

`Historical R4 module 02 replay` is manual and requires an explicit historical `target_ref`. It retains the fixed parent evidence and bounded R4 transition validator.

The historical R4 transition runs only when the selected manifest identifies an R4 checkpoint; otherwise the workflow records that the transition is not applicable.

### R5A app materialization

Historical R5A materialization remains available explicitly from `app/package.json`:

- `npm run replay:r5a` reconstructs the historical stone layers and applies the R5A pixel-perfect materializer;
- `npm run build:historical-r5a` performs that replay and then runs the downstream app build.

The ordinary `npm run build` delegates to `build:current` and does **not** invoke R5A rematerialization.

This distinction is intentional: replay answers how an earlier state was produced; current build packages the approved current state.

### Retained authoring evidence

Exact R5A/stone/candidate authoring replays remain recoverable from their historical refs and tooling. They are evidence about how an earlier accepted state was produced, not an assertion that every later approved source frame must retain the same hash.

## Retired write automations

The following workflows were removed from the live workflow set because their only purpose was to write to branches already intentionally pruned:

- `r0-baseline-import.yml` -> `work/r0-baseline-freeze`;
- `r4-materialize.yml` -> `work/r4-module02-fidelity`.

Their commits, tools and historical output remain recoverable in Git. Removing the workflow prevents obsolete automation from implying that those deleted work branches are still current authority.

## Baseline manifest status

`reference/baseline-manifest.json` remains a `BaselineManifest 0.1` exact historical snapshot. `tools/validate-baseline.py` remains its exact validator.

Do not repurpose that manifest into a continuously moving checksum of `main`.

If an official release snapshot is needed, create a new explicitly named release/candidate authority with provenance to the approved `main` commit rather than overwriting the historical R0/R5A lineage.

## Deployment boundary

Netlify's `netlify.toml` publishes `app/`, but the configured build command is root `npm run build`, which builds the admin bundle. It does not run the app-local historical/current build scripts.

The R5A build-authority defect therefore did not silently alter the deployed product. The cleanup prevents local/manual app builds from becoming a path back to old pixels.

## Promotion gate for CI/build authority changes

Before merge:

1. current app tests pass;
2. app current build leaves tracked app files clean;
3. current variant fidelity completes successfully;
4. current asset gates pass current runtime, current variants, approved stone/faucet/range, candidate intake and candidate provenance;
5. Stone, Mobile and Summary/Pricing browser gates remain green;
6. no automatic gate fails solely because a historical source-frame hash differs from the intentionally evolved product;
7. no production asset bytes are changed in the build-authority slice;
8. historical R5A replay remains explicit and recoverable.

## Non-goals

- no visual baseline is refreshed in this change;
- no historical manifest or approval receipt is rewritten;
- no current stone/glass geometry is changed;
- no PR #34 product decision is made;
- no schema generalization is bundled with CI housekeeping.
