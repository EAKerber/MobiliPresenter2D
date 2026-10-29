# OIDC, authentication, and migration history archival — 29 October 2026

## Scope

This batch archives three divergent branches with exact direct tags and removes only their active refs. Their code is not merged, executed, or declared adopted. The archival does not modify authentication, sessions, configuration, database schema/data, Netlify, or deployed previews.

| Exact branch identity | Direct archive tag |
|---|---|
| security/oidc-ci-preview235-v0-20261023@833f36a524567354240a272eaced8840bf296753 | archive/m2d/security-oidc-ci-preview235-833f36a5 |
| feat/cp-sd-06a1-server-v5-read-migration-support@ee4ffe153ffa732ae5775089ba6876a707088498 | archive/m2d/cp-sd-06a1-migration-support-ee4ffe15 |
| fix/auth-first-login-session-reconciliation-20261021@70ed9ce49694db770c58f1e6953ab21da4593aa3 | archive/m2d/auth-first-login-session-70ed9ce4 |

## Preflight

- Historical inventory scan passed on `development@cb75ef8a895a2356af76e204a0cbcf1e9fb0f78d`: [Actions #40809142504](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40809142504).
- The live roster had 14 branches. All target SHAs matched the original inventory. None is referenced by any of 71 active workflow YAML files or by an open PR.
- Eight open PRs remain `[34,182,184,185,186,196,231,238]`; no PR will be closed by this batch. The original DS02 assets branch remains retained.
- `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` is unchanged. Protected audit/apply must tag and read back each exact SHA before branch removal; any drift must stop without apply.
