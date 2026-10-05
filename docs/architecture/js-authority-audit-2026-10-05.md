# JavaScript and tooling authority audit — 2026-10-05

Status: housekeeping evidence for the near-official candidate.

## Question

Determine whether the repository still contains duplicate JavaScript runtimes or obvious legacy copies after the branch/schema cleanup, without deleting historical evidence merely because it is old.

## Result

No second product runtime was found outside `app/`.

The current repository separates code by authority:

- `app/app.js`, `app/core/*`, `app/data/*`, `app/admin/*`: buyer runtime and administration runtime;
- `app/tools/*`: app-local build, materialization and validation used by `app/package.json` or retained with the app replay lineage;
- root `tools/*`: repository-level authoring, calibration, current CI operations and explicit historical replay;
- `tests/*`: browser/unit/gate consumers;
- `netlify/functions/*`: serverless persistence/API boundary.

Similar names across these areas do not currently represent two competing production implementations.

## In-file shadowed legacy found

The authority pass did find one genuine duplicate inside the production runtime itself: `app/app.js` contained two declarations of both `renderCurrentValue()` and `renderSummary()` in the same function scope.

- the earlier pair expected the superseded pricing contract `estimate.status === "legacy"`;
- the later pair expected the current `estimate.status === "estimate"` contract;
- normal JavaScript function-declaration semantics made the later pair authoritative, so the earlier pair was unreachable/shadowed rather than a second active behavior.

The shadowed pair was removed in the summary/pricing housekeeping slice. Static gates now require exactly one declaration of each function and reject the old `legacy` status branch. A browser gate independently checks total/summary synchronization and single ownership of global charges.

## Build/replay seam still worth reviewing

`app/package.json` still makes the historical R5A materialization part of the ordinary app build/test path:

- build calls `tools/apply-r5a-pixelperfect-edits.py`;
- test calls `tools/validate-r5a-pixelperfect.py`.

This is not dead code: both are explicit consumers today. It is therefore unsafe to delete them as housekeeping.

However, the CI authority contract now distinguishes historical replay from current-product authority. A later cleanup may test whether the current materialized assets can become the normal build input while R5A replay moves behind an explicit historical command. Promotion requires byte/render equivalence for the current product and preserved deliberate replay for the historical lineage.

## Intentional historical evidence

`reference/*`, selected `docs/work/*`, authoring tools and review assets can contain frozen historical hashes or intermediate evidence. The CI authority contract explicitly preserves these as replay/evidence even when they are no longer automatic blockers.

Repeated Git blob SHAs inside review evidence are not repository-storage duplication: Git stores one blob and multiple paths may intentionally reference it for provenance.

## Branch conclusion

`audit/top-level-js-duplicates` pointed exactly to the observed `main` SHA `7ebc17b734467d3029703555dcf73ee66a33803d`, contained no audit-only diff and was deleted after this report was merged.

`feat/exposed-sides-and-glass` / PR #34 remains explicitly preserved and is outside this audit.

## Follow-up classification

- **Removed:** zero-diff audit branch and the shadowed legacy summary/pricing implementation.
- **Keep current:** runtime/admin/serverless code and all scripts explicitly consumed by current build/test/CI.
- **Keep historical:** replay/evidence called out by the CI authority contract.
- **Backlog:** prove whether R5A materialization can be removed from the default build/test path without changing current output; do not delete replay capability.
