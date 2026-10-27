# Auxiliaries A2 — historical refs untouched, exactly three more ancestors

Following [A1 GitHub Actions #40544066545](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40544066545), the first 3 auxiliary refs were removed with full remote readback (69→66 branches, receipt artifact ID `12752625724`); their original commits are still ancestors of development.

A2 **never replays A1**. It uses separate `ops/development-aux-retirement-batch-a2.json`, new wave ID and a pinned baseline `665729876e6536c96f1c5cde9a9023bedeb1369d`, following the CSS label-500 stability correction (136/136 PASS [#40544646000](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40544646000)). It requires **absence of A1's three retired refs**, preservation of all sixty original historical refs, all twelve exact original PR numbers, full six-commit ancestry in development, no branch rulesets/protection change, no active workflow branch mentions, exact remote SHA lease and readback per deletion. It also reads GitHub Actions to attest A1 PASS on exact head `071c9ed266c060aa55b2c646ebc3552d3e29ed33`.

A2's three and **only three** refs: `integration/01-ci-auth-identity-20261027`, `integration/01-ci-r9-container-20261027`, `integration/01-ci-label500-invariant-20261027`. Pre-apply remote inventory must be 66 refs, post-apply 63. Source HEADs remain reachable from development; no historical/donor branch is affected. The operational `integration/01-aux-retire-gate-20261027` stays until a separate terminal branch gate retires it.

Workflow is read-only audit on operational branch and can apply only on a matching exact-SHA fast-forward push to development. Never run the A1 manifest again or expose a generic delete mode. No user-facing product or Netlify change.
