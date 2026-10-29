# Historical branch archival — 29 October 2026

## Scope and decision

These two branches have no open PR and are not referenced by any active workflow at the reviewed development head. Both diverge substantially from current development. This operation archives their exact commit DAGs with immutable tags and removes only the active branch refs. It does not merge, cherry-pick, or claim functional absorption. Future code reuse requires a separate review.

| Branch | Exact head | Compare against development | Changed paths at compare | Archive tag |
|---|---|---|---:|---|
| experiment/ui-declarative-landing-benefits-20261020@176cd0931056ad6814317f3aa580a624f6f2e871 | 176cd0931056ad6814317f3aa580a624f6f2e871 | 22 unique commits; 595 development-only commits; merge base 1878ae1057ce7c6190e0c8cb08a1f3baadd49463 | 10 | archive/m2d/experiment-ui-declarative-landing-176cd093 |
| experiment/viewer-overview-editorial-20261021@8ad1405f176e5c2263689450c361c3ae617a94db | 8ad1405f176e5c2263689450c361c3ae617a94db | 7 unique commits; 595 development-only commits; merge base 1878ae1057ce7c6190e0c8cb08a1f3baadd49463 | 4 | archive/m2d/experiment-viewer-overview-editorial-8ad1405f |

Changed paths for the landing experiment: `.github/workflows/declarative-landing-benefits-pilot.yml`, `app/core/page-composition.js`, `app/index.html`, `app/landing/benefit-strip.js`, `app/landing/data.js`, `app/landing/landing.js`, `tests/landing-benefit-browser-gate.mjs`, `tests/landing-benefit-composition.test.cjs`, `tests/landing-interaction-gate.mjs`, and `tests/public-cutover-contract.cjs`.

Changed paths for the viewer experiment: `.github/workflows/viewer-overview-editorial-isolated.yml`, `app/viewer/viewer.css`, `app/viewer/viewer.js`, and `tests/viewer-overview-editorial-browser-gate.mjs`.

## Gates and preserved state

- The read-only semantic and blob provenance scan passed on `development@e72502655fa1461c46cfed05e36660d2c9dc43b4`: [Actions #40808251105](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40808251105). That head is an ancestor of the proposed retirement commit.
- Preflight confirmed 22 remote branches, both exact source heads, eight open PRs `[34,182,184,185,186,196,231,238]`, zero active-workflow references to these two branch names, and no target PR dependency.
- `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` remains the strong authority. The DS02 original-assets branch remains retained. Open PRs, security/auth/config histories, and runtime behavior are outside this batch.
- The protected bounded executor must create/read back both archive tags before deleting the exact branch refs. If any live roster, tag, protection, workflow, or ancestry check changes, the batch must fail without apply.
