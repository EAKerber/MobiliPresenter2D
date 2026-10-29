# CI baseline historical branch archival — 29 October 2026

## Scope

This is a tag-only archival of three unmerged CI baseline iterations. No branch code is integrated or claimed as absorbed. Exact commit DAGs are retained by direct archive tags; the bounded executor removes only the active refs after a fresh live audit. The authentication PR #238 remains open and unchanged.

| Exact branch identity | Disposition |
|---|---|
| ci/ci-baseline-01-auth235-only-20261023@17dac20ecef87477cf6e5858164fa155a8b610fb | archive/m2d/ci-auth235-only-17dac20e |
| ci/ci-baseline-01-isolated-session-fixture-20261023@cb0ae8b1e05bc9b5d96c51e2027732aff12577c3 | archive/m2d/ci-isolated-session-fixture-cb0ae8b1 |
| ci/ci-baseline-01-v5-local-diagnostics-20261023@5ce7327a9e4c8c11483163507d29af4bb8b1312a | archive/m2d/ci-v5-local-diagnostics-5ce7327a |

All three source refs diverge from current development. At the review baseline `development@a945446f45956c5cf294e09c3359cc60b6be1027`, their unique-ahead counts were 37, 15, and 30 commits. Comparisons with open PR #238 also showed divergence, not ancestry: #238 had 112 unique commits from the common base while the three source branches had 37, 15, and 30 unique commits. This report does not treat that as functional absorption.

## Preflight

- Read-only historical inventory scan: [Actions #40808630276 PASS](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40808630276), exact head `a945446f45956c5cf294e09c3359cc60b6be1027`.
- Live roster: 20 branches; all three exact branch SHAs match the inventory; none is referenced by any of the 71 active workflow YAML files; none is a head/base of an open PR.
- Eight open PRs remain `[34,182,184,185,186,196,231,238]`. The original DS02 asset branch remains retained. `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` remains untouched.
- Authentication, session, OIDC, database, migration, preview, and open-PR code remains unmerged. This batch makes no runtime, database, auth, Netlify, or deployment change.
- The retirement workflow must create and read back all three exact tags before deleting refs. Any roster, PR, workflow, ancestry, protection, or tag drift must fail closed.
