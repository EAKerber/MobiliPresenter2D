# TST-002 crosswalk slice — Buyer configuration authorization boundary — 2026-11-24

## Scope and evidence limits

This is a second, bounded TST-002 slice for the Buyer configuration endpoint. It maps the current test source to its contract, risk, consumer, fixture, negative assertions and workflow trigger. It is not a claim that all authentication, DTO, V5, or workflow assertions have been inventoried.

Readback base: Product `development@eee44926e5aa5ce90cf61fc13b0b02a7eef1b1a7`.

The test is a Node fixture that imports the production endpoint source after replacing its imports with injected test dependencies. Identity, Blob stores and temporary sessions are mocked; it does not contact Netlify or validate a live deployment.

Evidence level: **E0/source-inspected** means the named assertion and its path to the workflow were confirmed in current source. No exact-head workflow run for this test is claimed here. Do not treat E0 as execution evidence. The owner is `UNKNOWN` where repository ownership is not declared.

## Source and trigger pins

| Role | Path | Blob at base |
|---|---|---|
| Test and assertions | `tests/buyer-configuration-endpoint.test.mjs` | `3c342cfbbc2c479d84f60978ccef2e35928e60ad` |
| Endpoint consumer | `netlify/functions/buyer-configuration.mjs` | `aaace7bc2187aca4b1c484962f239ae00b20de80` |
| DTO projection | `app/core/published-buyer-projection.js` | `c1f8e099f2dce29bd003577e8c0a724d7b6475fa` |
| Identity policy | `netlify/access/identity-policy.mjs` | `fc529362c8b611b9f4e1b566a3b4b52f00bd7ca5` |
| Workflow | `.github/workflows/buyer-configuration-boundary.yml` | `85cc3248848970112051bdadb63f2bc28a07516e` |

The workflow runs `node --test tests/buyer-configuration-endpoint.test.mjs`. Its `pull_request` and `push` events target `main` and `development`; the explicit path filters include this test, its endpoint, access policy, projection dependencies and the workflow itself. The test therefore has a declared route to execution when these paths change. A docs-only change does not trigger it.

## Assertion crosswalk

| Assertion ID | Source assertion group | Contract | Risk | Consumer | State | Fixture / environment | Evidence | Trigger | Negative assertion | Owner |
|---|---|---|---|---|---|---|---|---|---|---|
| BUYER-AUTH-01 | Anonymous request returns 401 | Anonymous callers cannot read Buyer configuration | Private configuration becomes public | `GET /api/buyer-configuration` | No Identity actor, no access cookie | Imported endpoint with injected Identity and Blob doubles; deploy-preview context | E0; source only | Buyer configuration boundary workflow, matching test or implementation paths | Denial precedes preview Blob open and read | UNKNOWN |
| BUYER-AUTH-02 | Buyer without active grant returns 403 | A signed-in Buyer requires a valid grant | Any authenticated user can read configuration | Same endpoint | User role, no temporary token/session | Same injected fixture | E0; source only | Same | Denial precedes preview Blob open and read | UNKNOWN |
| BUYER-AUTH-03 | Missing temporary session returns 403 | Temporary access token must resolve to an active session | Stale or unissued token is accepted | Same endpoint | Buyer plus token, session lookup returns empty | Same injected fixture | E0; source only | Same | No preview Blob open after missing session | UNKNOWN |
| BUYER-AUTH-04 | Temporary-session store failure returns 503 | Authorization infrastructure failure is fail-closed | Storage outage becomes implicit access | Same endpoint | Buyer token present; session store throws | Same injected fixture | E0; source only | Same | No preview Blob open or configuration read | UNKNOWN |
| BUYER-AUTH-05 | Identity failure returns 503 | Identity lookup failure is fail-closed | Identity outage is treated as anonymous success or bypass | Same endpoint | Identity provider throws | Same injected fixture | E0; source only | Same | No preview Blob open or configuration read | UNKNOWN |
| BUYER-AUTH-06 | Valid temporary session returns Buyer projection | A valid grant may read only the Buyer-facing projection | Buyer receives raw administrative state or a production-store read | Same endpoint and `published-buyer-projection.js` | Buyer token resolves to unexpired session; deploy-preview context | In-memory published V5 data; mocked strong-consistency deploy store | E0; source only | No raw `source`, admin `revision`, or admin `pricing`; response is `no-store`; site-wide store remains unopened | UNKNOWN |
| BUYER-AUTH-07 | Admin and staff reads bypass temporary-session lookup | Internal authorized roles can read the Buyer projection without Buyer grant lookup | Internal route depends on Buyer session or opens production storage in preview | Same endpoint | Admin, then staff; no Buyer token | Same injected fixture and preview context | E0; source only | No temporary-session lookup for internal roles; no production site store open | UNKNOWN |
| BUYER-DTO-01 | Buyer payload exact-key allowlists | Buyer response exposes only the approved DTO schema and display-settings fields | New administrative field leaks through serialization | Buyer DTO projection and endpoint response | Valid Buyer grant, admin, and staff response cases | Fixture V5 configuration projected through production projection code | E0; source only | Exact top-level and nested keys; forbidden raw/admin fields absent | UNKNOWN |

## Reachability and open questions

- The test is directly invoked by one workflow step and is explicitly named in both PR and push path filters.
- The test's dynamic import removes static imports and injects dependencies; it exercises endpoint logic against controlled doubles, not the deployed Identity or Blob service.
- Source-level reachability is established. Execution evidence at the exact base SHA is not established by this slice.
- The table covers the named Buyer endpoint test groups, not every assertion in the V5 endpoint safety, normal-save, or projection tests. Those remain separate crosswalk work.
- No new guarantee is inferred from the DTO field list; this slice records what the current test asserts.

## Continuation — endpoint failure boundaries and context selection — 2026-11-25

Product PR #422 extends the test with method/query rejection before Identity lookup, expired temporary-session denial, production-versus-preview store selection, and fail-closed missing/invalid published V5 states. The focused local tests passed; the endpoint boundary and impact-selector Actions runs #45601575331 and #45601575165 passed on PR head `08669ae5f726b978582dbef519ed5773dfc311a1`. The squash is integrated in development at `5f8c3161f3177ae28e30adf5236dbe822db7b590`. These are injected-dependency/local fixture checks, not live Identity or Blob proof.

| Added assertion group | Contract and negative boundary | Evidence limit |
|---|---|---|
| BUYER-DISPATCH-01 | Non-GET and unsupported query return 405/400 before Identity or Blob access | Source plus local test run; no hosted request |
| BUYER-AUTH-08 | Expired/unresolvable temporary session returns 403 before configuration access | Session service is injected and returns no active session; does not prove hosted expiry timing |
| BUYER-STORE-01 | Production context selects the site store; deploy-preview context selects only the deploy store | Store selection is exercised through injected doubles |
| BUYER-PUB-01 | Missing publication returns 503 without defaults fallback | In-memory missing source |
| BUYER-PUB-02 | Invalid V5 returns 503 without defaults fallback | In-memory invalid V5 document |

These additions do not complete the broader TST-002 inventory or TST-010's full access-surface coverage.
