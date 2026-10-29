# CI preview and auth history archival — 29 October 2026

## Scope

This batch archives three divergent historical CI/preview/auth branches as complete Git DAGs. It removes only the active branch refs after the protected executor verifies and reads back exact tags. It does not run the old workflows, merge code, change authentication behavior, access a database, or deploy a preview.

| Exact branch identity | Immutable archive tag |
|---|---|
| ci/ci-baseline-01-published-preview-fixture-20261023@60773a62cd6d162662213cb711ce55dfe1f88c1c | archive/m2d/ci-published-preview-fixture-60773a62 |
| ci/ci-baseline-01-shared-db-preview-20261023@1e164dc55cc1f744cdacf63e675d08716dccd032 | archive/m2d/ci-shared-db-preview-1e164dc5 |
| ci/ci-global-auth-boundary-repair-20261023@cacd0e9160437285c41302d0dd13d9664001186e | archive/m2d/ci-global-auth-boundary-cacd0e91 |

The historical branch inventory marks these as divergent and security-touched. The retirement is archival only and makes no statement that their authentication or preview code was adopted. The open PR #238 and protected CP-PUBLIC heads remain unchanged.

## Exact preflight

- Read-only historical inventory scan passed at `development@299145a695c5498930c43cd129913d9928047e4d`: [Actions #40808897405](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40808897405).
- The live repository contained 17 branches and eight open PRs `[34,182,184,185,186,196,231,238]`. Each target SHA matched the inventory. No target was an open PR head/base, and none of the 71 active workflow YAML files referenced a target branch name.
- `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` remains intact. The original DS02 assets branch remains retained.
- The executor must create and read back the exact direct tags before removing branches. Any changed SHA, active dependency, PR, protection/ruleset, ancestry, or tag collision must stop the batch without apply.
