# UX04 retirement guard branch archive — 2026-11-01

Repository: `EAKerber/MobiliPresenter2D`  
Control branch: `development`  
Candidate ref: `maintenance/ux04-retirement-guard-20261101@be4f4748ec5c9aece18ca6ba005cd13eccc7819a`  
Archive tag: `archive/m2d/ux04-retirement-guard-be4f4748`  
Archive record key: `ux04-retirement-guard`

## Provenance

This is the exact head branch of merged PR [#265](https://github.com/EAKerber/MobiliPresenter2D/pull/265). The PR was squash-merged into `development@af04c21ae397ef42e5e9a61dc24afd885bb52f03`, so its original two-commit head is not an ancestor of the squash result. The branch head carries the retirement-executor changes and the corrected auth-order regression assertion. The exact tag preserves that commit and its ancestry before the ref is removed.

## Protected operation

The executor allowlists this exact supplemental pin and requires this record, a closed PR, an unprotected branch, a successful audit on the exact parent SHA, tag-before-delete, a SHA lease, and remote readback. Status: complete; the archive tag and branch deletion were confirmed by the protected apply receipt.

## Final archive readback

Protected apply: [GitHub Actions run 41359334010](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/41359334010) — `PASS` at `development@46837de746018273bbf80d17bbd7c920d5ea0632`. The executor created the tag before deletion, used exact SHA leases, and confirmed both branch refs absent. Final roster: `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` and `development@46837de746018273bbf80d17bbd7c920d5ea0632` (2 branches). Readback tags: `archive/m2d/ux04-focus-restore-20261101-61e49ff4` → `61e49ff44e21c4ba02f116f749a68d72d58faf61`; `archive/m2d/ux04-retirement-guard-be4f4748` → `be4f4748ec5c9aece18ca6ba005cd13eccc7819a`.

