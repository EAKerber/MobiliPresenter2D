# JavaScript and tooling authority audit — 2026-10-05

Status: housekeeping evidence for the near-official candidate.

## Question

Determine whether the repository still contains duplicate JavaScript runtimes or obvious legacy copies after the branch/schema cleanup, without deleting historical evidence merely because it is old.

## Runtime result

No second product runtime was found outside `app/`.

The current repository separates code by authority:

- `app/app.js`, `app/core/*`, `app/data/*`, `app/admin/*`: buyer runtime and administration runtime;
- `app/tools/*`: app-local current build/validation plus retained historical materialization tooling;
- root `tools/*`: repository-level authoring, calibration, current CI operations and explicit historical replay;
- `tests/*`: browser/unit/gate consumers;
- `netlify/functions/*`: serverless persistence/API boundary.

Similar names across these areas do not currently represent two competing production implementations.

## In-file shadowed legacy removed

The authority pass found one genuine duplicate inside the production runtime itself: `app/app.js` contained two declarations of both `renderCurrentValue()` and `renderSummary()` in the same function scope.

- the earlier pair expected the superseded pricing contract `estimate.status === "legacy"`;
- the later pair expected the current `estimate.status === "estimate"` contract;
- normal JavaScript function-declaration semantics made the later pair authoritative, so the earlier pair was unreachable/shadowed rather than a second active behavior.

The shadowed pair was removed in the summary/pricing housekeeping slice. Static gates require exactly one declaration of each function and reject the old `legacy` status branch. A browser gate independently checks total/summary synchronization and single ownership of global charges.

## Build authority audit

A dedicated clean-worktree experiment compared three states at approved `main` commit `3f1166bcdb170cd85b12ad8f741c1e073c19a550`:

1. the untouched approved app running `npm test`;
2. the old `app/npm run build`, which rematerialized historical R5A stone sources;
3. a current-assets build that skipped only the historical `split-stone-layers` + `apply-r5a-pixelperfect-edits` steps and ran the downstream current derivations.

Results:

- current `npm test` passes without any historical rematerialization;
- the current-assets build leaves the tracked tree clean;
- the historical-materializing build changes tracked assets and reports;
- this is real pixel drift, not only PNG encoding drift: 98,478 differing PNG pixels in the compared dist outputs, including 26,726 alpha differences;
- affected current assets include stone 02/03 layers, exposed variants, both joint bridges and the full composition;
- downstream non-PNG dist output remained equivalent.

Therefore the historical R5A materializer is **not** current build authority. Running it as part of the ordinary app build can resurrect pixels from an earlier accepted state and overwrite later approved visual work.

## Build contract after housekeeping

The app build is split explicitly:

- `npm run build` delegates to `build:current` and starts from the approved, already-materialized current assets;
- `build:current` regenerates only current derived front masks, seam mask, inline masks, technical-data and static dist;
- `replay:r5a` deliberately runs the historical stone-layer split and R5A pixel-perfect materializer;
- `build:historical-r5a` runs that explicit replay followed by the downstream build.

Historical replay remains recoverable, but no longer runs implicitly when someone asks for the current product build.

A permanent `App build purity` gate runs current build + tests in a clean checkout and fails if either changes tracked app files. It also asserts that explicit R5A replay scripts remain available.

`validate-r5a-pixelperfect.py` remains in the ordinary test path for now. Despite its historical name, it currently validates useful live invariants (bridge reconstruction, module-02 finish-mask ownership and golden recomposition) and passes directly on the approved assets. Renaming/generalizing that validator can be considered later, but removing it is not justified by this audit.

## Deployment boundary

Netlify publishes `app/`, but its configured build command is the **root** `npm run build`, which rebuilds the admin bundle. It does not invoke `app/package.json`'s build. Production was therefore not being silently rematerialized through the historical R5A path.

The defect was a local/repository build-authority trap, not an active production deployment regression.

## Intentional historical evidence

`reference/*`, selected `docs/work/*`, authoring tools and review assets can contain frozen historical hashes or intermediate evidence. The CI authority contract explicitly preserves these as replay/evidence even when they are no longer automatic blockers.

Repeated Git blob SHAs inside review evidence are not repository-storage duplication: Git stores one blob and multiple paths may intentionally reference it for provenance.

## Branch conclusion

`audit/top-level-js-duplicates` was zero-diff and has already been removed.

`audit/r5a-default-build-equivalence` exists only to produce the build-authority evidence above and can be pruned after this report/build-contract change is merged.

`feat/exposed-sides-and-glass` / PR #34 remains explicitly preserved and is outside this audit.

## Follow-up classification

- **Removed:** zero-diff JS audit branch and shadowed legacy summary/pricing implementation.
- **Current authority:** approved `app/` assets + downstream current derivation/build steps.
- **Historical authority only:** R5A stone-layer rematerialization, available through explicit replay commands.
- **Keep current validator:** `validate-r5a-pixelperfect.py` until its useful live invariants are migrated/renamed deliberately.
- **Future cleanup:** consider renaming historical-named validators once their current invariant ownership is documented independently; do not weaken coverage merely to remove an old name.
