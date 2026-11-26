# DOM-001 — Admin V5 authoring and persistence subinventory

**Captured:** 2026-11-26  
**Repository:** `EAKerber/MobiliPresenter2D`  
**Purpose:** bounded source-to-persistence slice of DOM-001. This is an evidence subinventory, not closure of DOM-001 or CMP-001.

## Readback identity

The source review used Product `main@463327ce25687f29859a152a41f0915af51e9264` (tree `8114fd0beef69a98bac65e0f4115fb272c725f08`) and `development@6e6bf126870af9ce1489ea4dafad3b9b3b4fcb5c` (tree `4c81b117cf798f6f99d9d08084ba66adc0fd157c`). The current development ref is now `4bd91cf21f57ad1005d34a19f35492aeef83ff68` (tree `86d6780934b5313a11a7b96098ea7e964242731e`); changes since the reviewed code tree were register-only documentation commits. Design System `main@8686df1cf13f84f18f755cb7de2067fda4f7c66d` is a decision/reference authority, not the owner of these Product runtime files. The Design System has no `development` branch in the readback.

## Authoring and schema path

| Responsibility | Source | Evidence from source review |
|---|---|---|
| V5 administration schema and normalization | `app/core/administration-v5.js` | Defines `ConfiguratorAdministration2D 5.0`, supports V4 compatibility, validates stage/group/section hierarchy, explicit section behavior/component, presentation policy, typed pricing, and the optional exact-shape `viewerPricePublication.enabled` field. Normalization trims labels, copies nested data, and repairs an invalid revision to 1. Legacy section `presentation` is rejected. |
| Legacy configuration | `app/core/configuration.js` | Owns legacy schema/defaults/validation/normalization consumed by compatibility paths. |
| Hierarchy compatibility/projection | `app/core/hierarchy-administration.js` | Keeps hierarchy migration/projection rules outside the Admin controller. |
| Presentation and price contracts | `app/core/presentation-contract.js`; `app/core/pricing-contract.js` | Own typed validation, normalization, and legacy price projection. |
| Authored defaults and data | `app/data/configurator-settings.js`; `app/data/hierarchy-defaults.js`; `app/data/presentation-policy-defaults.js`; `app/data/catalog-data.js`; `app/data/mock-price-book.js` | Inputs for the authoring model; do not by themselves prove the persisted or published document. |

The Admin controller `app/admin/admin.js` loads `/api/configuration` into a published-source model and a separate editable model. Existing V5 saves as V5; legacy V3 follows `projectToLegacy`. The price-publication setting is disabled unless the loaded source is V5. The controller and shell differ between refs: main blobs `79925345…` / `28e57028…`; development blobs `4702ad57…` / `39073567…` for `admin.js` / `admin.html`. The browser-save harness expects its module bundle entry in the shell.

## Authorization, persistence, and readback

- `netlify/functions/configuration.mjs` authorizes GET and PUT through `getUser()` and `canManageAdministration()` before opening storage. The policy requires a principal ID and the `admin` role; shared policy source: `netlify/access/identity-policy.mjs`.
- The function chooses the strong-consistency `configurator-settings` store: production uses `getStore`; non-production uses `getDeployStore`. The endpoint differs across main/development because endpoint code is not byte-identical.
- `app/core/published-configuration.js` reads raw JSON plus an opaque ETag, then validates and normalizes V3 or V5. The endpoint returns the configuration body, not the ETag.
- `app/core/v5-normal-save.js` requires an already-stored valid V5 document with matching schema and revision. It validates and normalizes, increments revision, writes with `onlyIfMatch` against the source ETag, and checks stored ETag, digest, schema, revision, and semantic signature on readback.
- After PUT, `app/admin/admin.js` performs another GET and compares the returned document with the expected normalized payload before reporting success.
- `netlify/functions/admin-bootstrap.mjs` is a separate Admin-authorized bootstrap for the price book; client retry logic is `app/core/admin-bootstrap-retry.mjs`.

## Consumer and publication boundaries

- **Buyer:** `netlify/functions/buyer-configuration.mjs` reads and validates V3/V5, then calls `app/core/published-buyer-projection.js`. It emits `BuyerConfiguratorPayload 1.0`, selecting display, flow, policy, and pricing fields instead of exposing raw administration storage. The projection differs between refs (main `4a381818…`; development `c1f8e099…`); Buyer/internal access policy remains distinct from public Viewer access.
- **Public Viewer:** `netlify/functions/public-modules.mjs` calls `app/core/public-module-projection.js`, which requires validated V5 and emits an allowlisted DTO. Persisted `viewerPricePublication.enabled` controls price authorization; only valid positive base amounts for visible modules are exposed. Legacy Viewer requests receive an unpriced 0.1 DTO. Deploy Preview fallback accepts only a validated primary public 0.1 projection.
- Neither projection is an authoring authority. DTO output does not prove a real hosted Admin save or storage readback.

## Existing test map (inspected; not run as part of this source review)

| Test | Source-level contract it covers |
|---|---|
| `app/tools/test-administration-v5.js` | Schema, normalization, V3/V4 upgrade, typed pricing, compatibility projection, invalid-contract cases. |
| `app/tools/test-v5-normal-save.js` | Mock-store write/readback failures, stale revision, ETag conflict, simulated concurrent-edit race. |
| `app/tools/test-v5-endpoint-safety.js` | Mocked Identity/Blob role denial and endpoint safety; main/development files differ. |
| `tests/admin-v5-save-browser.cjs` | Local browser harness with stubbed auth/API, save flows, conflicts, and readback mismatch; main/development fixtures differ. |
| `app/tools/test-published-configuration.js` | Published V3/V5 parsing and normalization. |
| `tests/buyer-configuration-endpoint.test.mjs`; `tests/buyer-v5-browser.cjs` | Buyer endpoint and browser consumer boundary. |
| `tests/public-module-projection.test.cjs`; `app/tools/test-public-modules-endpoint.js`; `tests/ci/viewer-price-wire-contract.test.cjs` | Public DTO allowlist, endpoint behavior, and wire contract. |

The exact-head workflow evidence for Product PR #505 is recorded separately in the execution register; it is not evidence of a real authenticated save against hosted Identity/Blob.

## Classification and open proof

**Confirmed:** source ownership for the schema, validation, normalization, defaults, Admin edit/save path, role check, store selection, conditional write/readback logic, and the Buyer and Viewer projection boundaries. The source review confirmed the main/development differences listed above; it did not run these tests or make a hosted write.

**Still unknown:** deployed Identity claims for the intended account; actual hosted `onlyIfMatch` concurrency semantics; the V5 document/revision stored in any hosted environment; an authenticated hosted save followed by readback and Buyer/Viewer projection; complete Admin form-field-to-source mapping; full compatibility/default matrix; named human owner; and exhaustive consumer closure.

**Next bounded work:** finish the complete Admin field/default/compatibility map, then pair the persisted field with Buyer and Viewer DTOs and negative tests at current refs. Obtain hosted Identity/Blob save/readback only in an explicitly authorized non-production environment. Keep DOM-001 partial until its complete route/component/consumer/test DoD is met.
