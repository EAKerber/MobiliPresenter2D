# TST-002 crosswalk slice — Admin and session authorization — 2026-11-25

## Scope and evidence limits

This slice maps the access-surface assertions added for DOM-013/TST-010 to their backend contracts and exact CI consumers. It does not claim complete TST-002 coverage. The fixtures inject Identity, session, and Blob behavior; they are local/synthetic and do not prove a hosted Netlify Identity session.

Source snapshot: Product `development@8de7fa6e29f06c988be07a56dba16b585e5cf021` (the base of the candidate PR).

Key source pins at that snapshot:

| Role | Path | Blob |
|---|---|---|
| Authorization and session contract tests | `tests/ci/access-surface-boundaries.test.mjs` | `4407b6bc8d7576f95a5b5e2bed1385f7a88a69ac` |
| Browser invitation test | `tests/access-session-browser.cjs` | `8a21266c608fa2d632309e645910e47a77c12e08` |
| Access workflow | `.github/workflows/development-access-dto-boundary.yml` | `6a213c4ad9b3c83d4dcb52287e83662e9787d502` |
| Access policy | `netlify/access/identity-policy.mjs` | `fc529362c8b611b9f4e1b566a3b4b52f00bd7ca5` |
| Edge route gate | `netlify/edge-functions/access-gate.mjs` | `d01aaf1f5bec03ee33e40dc43d208c7c72f95288` |
| Private navigation | `app/core/private-navigation.js` | `81e53c2526e8d23570c138c3a30c09f38155d675` |
| Admin bootstrap handler | `netlify/functions/admin-bootstrap.mjs` | `a25427a0832207b1e070749f33b975e5437ca417` |
| Access grants handler | `netlify/functions/access-grants.mjs` | `06c910428b9da0801681f36d395b6f730811e0d8` |

## Assertion crosswalk

| Assertion group | Source assertion | Contract and risk | Consumer / fixture | Reachable workflow |
|---|---|---|---|---|
| Admin configuration and bootstrap | `administrative configuration and bootstrap require admin before protected reads` | Backend rejects anonymous, Buyer, and staff requests; Identity failure is closed; protected Blob reads happen only after admin authorization. | Configuration and Admin bootstrap handlers; injected Identity/Blob. | `authorization-contract` → `node --test tests/ci/access-surface-boundaries.test.mjs` |
| Grant roles and log safety | `grant administration enforces roles before storage and does not log email or bearer tokens` | Role matrix is enforced before storage; recipient email and bearer token are not written to logs, including storage-error paths. | Access-grants handler; injected users and store. | Same authorization contract command. |
| Temporary-session lifecycle | `temporary-session handlers enforce origin, expiry, logout revocation and internal secret` | Same-origin, expiry, logout revocation, internal-secret validation, and session-store failures are checked; logout clears its cookie. | Redeem, status, logout, and access-check handlers; synthetic session store. | Same authorization contract command. |
| Private route boundary | `private route gate distinguishes admin, staff, buyer, temporary session and public Viewer` | Private configuration rejects unauthorized roles and invalid/expired temporary sessions; public Viewer stays outside that private boundary. | Edge route gate; injected Identity/session/store. | Same authorization contract command. |
| Menu representation | `private menu renders authoritative roles and ignores stale asynchronous session results` | The menu reflects returned roles, and a delayed stale anonymous result cannot override a newer authorized state; logout remains same-origin. | Private-navigation module; fake DOM and deferred promises. | Same authorization contract command. |
| Invitation-token exposure | `invitation token leaves the URL before UI interaction and never appears in rendered text`; browser test additionally captures the token-free page before same-origin redemption. | Token is removed from the hash before confirmation UI, absent from text/form controls, and sent only to the same-origin redemption endpoint. | Synthetic token in local HTTP + Playwright; screenshot remains in memory. | `access-session-browser` → `node tests/access-session-browser.cjs` |

## Execution evidence

The exact PR #426 candidate head `bd75b0baf79b799418452379247e9d9f55d9dd1f` passed authorization/browser run [#45613294609](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45613294609). The merged development commit `4506fe5860b55a7ad482f55dd0fbf15072ada145` passed push-only run [#45613520369](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45613520369), including both jobs. That proves the synthetic local contract and browser path; it does not prove a real hosted Identity session.

For actual-provider validation, use only a designated non-production preview with an authorized test account and synthetic grant. The real login/cookie lifecycle and hosted edge/function composition require that fixture; Identity, Blob, and session-store failure cases stay simulated.

The impact selector now maps these changed source/test paths to the dedicated access-surface bundle. It deliberately returns both the access contract and an existing independent bundle for Admin UI or shared Identity-policy paths; these bundles exercise different assertions. The broad fallback for unknown paths remains unchanged.
