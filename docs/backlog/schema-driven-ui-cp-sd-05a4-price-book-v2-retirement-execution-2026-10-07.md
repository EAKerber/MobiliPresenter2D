# CP-SD-05A4 — PriceBook 2.0 + residual legacy pricing retirement — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- CP-SD-05A0 discovery — COMPLETE / PASS.
- CP-SD-05A1 typed pricing contract/migration — COMPLETE / PASS.
- CP-SD-05A2 typed buyer calculation — COMPLETE / PASS.
- CP-SD-05A3a v5/admin typed pricing ownership — COMPLETE / PASS.
- CP-SD-05A3b explicit admin type authoring — COMPLETE / PASS.

## Goal

Make the shipped public price source typed by default and retire remaining runtime dependence on legacy pricing bucket names outside explicit v3 compatibility seams.

The current public source is still:

`CommercialEstimatePriceBook 1.1`

with `entries`, `handleEntries`, `frontFinishRatesBps`, `localEntries`, `globalEntries` and `handleFrontTotal`.

Those buckets are now compatibility shape, not the target price authority.

## Target PriceBook 2.0

The public price book should become:

```js
{
  schemaVersion: "CommercialEstimatePriceBook 2.0",
  mode: "estimate",
  currency: "BRL",
  label: "Estimativa da composição",
  disclaimer: "...",
  pricing: {
    schemaVersion: "CommercialPricingRules 1.0",
    roles: { ... },
    allocation: { handleFrontTotal: 14 }
  }
}
```

The current commercial values must migrate exactly. PriceBook 2.0 must not carry parallel legacy buckets.

## Explicit compatibility seams that may still project legacy buckets

Legacy pricing shape is still legitimate only where the current production schema requires it:

1. `ConfiguratorAdministration2D 3.0` create/default/normalize/validate/project compatibility;
2. authenticated Netlify configuration endpoint while production remains v3;
3. v3/v4 import fixtures and migration tests;
4. named `pricingContract.upgradeLegacy()` / `projectToLegacy()` tests.

Outside those seams, runtime code should consume `CommercialPricingRules 1.0` directly.

## Buyer residuals discovered before A4

A3b read-only audit found buyer display/runtime leftovers:

- `renderHandleOptions()` reads `priceBook.handleEntries` and `priceBook.handleFrontTotal`;
- Stone package cards read `priceBook.globalEntries`;
- service cards read `priceBook.globalEntries`;
- material reconciliation creates missing `priceBook.handleEntries` entries;
- `applyConfiguratorSettings()` overlays legacy `normalized.pricing` back into `priceBook`;
- module-detail fallback calls `pricing.itemEstimate(product, catalog, state, priceBook)` even though `itemEstimate()` now expects typed rules.

The last point is a latent fallback bug: it is normally masked because the composition estimate already contains the selected module estimate, but the fallback itself no longer satisfies the calculator contract.

## Required buyer boundary

Maintain two distinct values:

- immutable/metadata price-book envelope:
  - mode;
  - currency;
  - label;
  - disclaimer;
- mutable normalized `pricingRules`:
  - initialized directly from `priceBook.pricing`;
  - replaced from published v3 configuration only through `pricingContract.upgradeLegacy(normalized.pricing)`.

Buyer UI price labels/cards must read typed roles through small helpers, not through legacy bucket names.

Examples:

- handle total -> `roles.handleChoiceTotal[id].cents`;
- handle front count -> `allocation.handleFrontTotal`;
- global stone/service amount -> `roles.globalAdjustment[id].cents`;
- item fallback -> pass `pricingRules` to `pricing.itemEstimate()`.

Do not rebuild a second legacy-shaped mutable price book in the browser.

## v3 configuration compatibility

`app/core/configuration.js` remains the current v3 compatibility core until CP-SD-06.

A4 must adapt it to accept PriceBook 2.0 as its source without changing the v3 persisted schema.

Preferred boundary:

- configuration core explicitly obtains the typed contract from `priceBook.pricing`;
- when it needs v3 defaults/allowed-id inventory, it uses a local exact `pricingContract.projectToLegacy()` compatibility projection;
- if the shipped PriceBook 2.0 is not representable by v3, current v3 configuration operations fail closed.

This projection is allowed because `configuration.js` is itself the named v3 compatibility owner.

Do not add legacy bucket aliases back onto the PriceBook 2.0 object.

## Admin boundary

Admin defaults/catalog comparison should use `priceBook.pricing` directly.

The current A3a/A3b typed model must not downgrade the public PriceBook 2.0 to legacy and then immediately upgrade it again merely to initialize the admin.

Legacy v3 published payloads may still migrate through the named compatibility seam.

## Netlify endpoint

The endpoint still persists/serves v3.

It may continue to use the v3 configuration core, now backed by PriceBook 2.0 through that core's explicit projection seam.

No production v5 publication is authorized in A4.

## Required gates

### Price source

- PriceBook schema is exactly `CommercialEstimatePriceBook 2.0`;
- its only monetary-rule field is `pricing: CommercialPricingRules 1.0`;
- no top-level legacy pricing buckets remain;
- all current cents, BPS, zero values and `handleFrontTotal=14` are exact.

### Contract equivalence

Projecting the default PriceBook 2.0 pricing to legacy must equal the historical 1.1 fixture byte-for-value at the object/value level.

The default estimate remains exactly 874000 cents and Cocoa finish total remains 99000 cents.

### Buyer

- no `priceBook.handleEntries`, `priceBook.frontFinishRatesBps`, `priceBook.localEntries` or `priceBook.globalEntries` references remain in `app/app.js`;
- no legacy pricing overlay into `priceBook`;
- module-detail fallback calls `pricing.itemEstimate(..., pricingRules)`;
- handle/stone/service price copy reads typed rule helpers;
- Summary/current-value browser stays synchronized.

### v3/admin compatibility

- default v3 administration generated from PriceBook 2.0 is identical to the current historical default pricing payload;
- normalized existing v3 documents round-trip exactly;
- v5/admin starts from typed PriceBook pricing without a legacy downgrade/upgrade loop;
- isolated Puxadores persistence remains exact.

### Fail-closed

- a synthetic non-v3-representable PriceBook 2.0 finish amount causes the v3 configuration compatibility projection to fail, not silently reinterpret amount cents as BPS.

## Likely files

- `app/data/mock-price-book.js`;
- `app/core/configuration.js`;
- `app/admin/admin.js`;
- `app/app.js`;
- `app/tools/test-core.js`;
- configuration/admin/browser fixtures as required;
- cache revisions only where shipped source/runtime files change.

## Preserve

Do not change:

- commercial default values;
- calculator formulas;
- per-module percentage rounding;
- handle allocation;
- PriceBook metadata copy;
- admin A3b type-switch behavior;
- hierarchy/presentation semantics;
- production endpoint schema acceptance;
- production configuration data.

## Stop/split conditions

Split A4 if changing `configuration.js` would require publishing v5 or rewriting unrelated configuration semantics.

Do not use A4 to generalize price roles beyond the already frozen contract.

Do not introduce new percentage bases.

Do not write production configuration.

## Completion / next

When PriceBook 2.0 is canonical, buyer/admin runtime no longer uses legacy buckets outside v3 compatibility seams, and all gates pass, CP-SD-05 can be closed. CP-SD-06 remains the later authenticated production v5 publication/legacy-retirement checkpoint.


## Implementation checkpoint

Functional A4 patch on PR #150, head `bd7846f0adb55dfcc90c67961a7bdbe18334ccb9`:

- public source is now `CommercialEstimatePriceBook 2.0` with nested `CommercialPricingRules 1.0`;
- no top-level PriceBook 1.1 pricing buckets are published;
- current values and `handleFrontTotal=14` are preserved exactly and the typed source projects to the historical v3 pricing object without value changes;
- `configuration.js` owns the explicit typed -> legacy projection seam required by `ConfiguratorAdministration2D 3.0`, and fails closed if the typed source cannot be represented;
- buyer initial pricing comes directly from `priceBook.pricing`; published v3 pricing still migrates once through the named compatibility seam;
- buyer handle/stone/service display prices now read typed roles;
- the module-detail fallback now passes `pricingRules` to `pricing.itemEstimate()`;
- the buyer no longer overlays legacy pricing buckets back into a mutable PriceBook;
- admin initializes catalog pricing directly from `priceBook.pricing`;
- shared buyer runtime cache advanced to `runtime-v38`, v3 configuration cache to `admin-config-v8`, PriceBook admin cache to `admin-data-v4`, and admin bundle cache to `admin-pricing-v3`.

The first functional head exposed only stale runtime-v37 static gate expectations; those snapshots were advanced to v38 without runtime compensation.

On corrected head `bd7846f0adb55dfcc90c67961a7bdbe18334ccb9`:

- PASS: Current variant fidelity;
- PASS: App build purity, including the complete current app test suite;
- PASS: Flow layout browser;
- PASS: Keyboard browser;
- PASS: Mobile browser;
- PASS: Summary pricing browser;
- PASS: Stone browser;
- PASS: Current asset gates;
- PASS: Netlify deploy preview #150;
- Admin hierarchy browser remained blocked in Playwright installation and had not executed either hierarchy administration or isolated Puxadores tests.

This checkpoint intentionally creates a fresh PR head for a clean Admin browser attempt. Do not mark A4 or CP-SD-05 COMPLETE until Admin hierarchy and isolated Puxadores execute successfully.


## Final result

CP-SD-05A4 is COMPLETE / PASS.

Canonical pricing authority after A4:

- public price source: `CommercialEstimatePriceBook 2.0`;
- numeric rule contract: `CommercialPricingRules 1.0`;
- buyer runtime: typed roles + allocation only;
- unpublished v5/admin model: typed pricing only;
- current v3 pricing buckets: explicit compatibility payload inside `configuration.js`, published-v3 migration/projection seams and compatibility tests only.

Implementation result:

- PriceBook 2.0 carries the exact historical commercial values under typed roles and no parallel top-level legacy buckets;
- projecting its typed pricing produces the historical PriceBook 1.1/v3 pricing object exactly;
- current v3 defaults generated from PriceBook 2.0 are value-identical to the previous defaults;
- a non-v3-representable typed price source fails closed in the v3 compatibility core;
- buyer handle, stone and service price copy reads typed roles;
- module-detail fallback now calls `pricing.itemEstimate(..., pricingRules)`;
- buyer no longer overlays published legacy pricing back into a mutable PriceBook;
- admin initializes catalog pricing directly from `priceBook.pricing`;
- current published v3 documents still migrate exactly through the named compatibility seam;
- no calculator formula, rounding rule, commercial default, handle allocation, hierarchy or presentation behavior changed.

Cache revisions:

- buyer runtime: `runtime-v38`;
- v3 configuration core: `admin-config-v8`;
- admin PriceBook source: `admin-data-v4`;
- admin bundle: `admin-pricing-v3`.

Gate history:

- the first functional head exposed stale static `runtime-v37` expectations in runtime/test gates; only those expectations were advanced to v38;
- corrected functional head `bd7846f0adb55dfcc90c67961a7bdbe18334ccb9` passed eight of nine workflows plus Netlify; Admin remained blocked before tests during Playwright installation;
- documentation retry head `104d3c6893223383602736ccf882cd0e09816fac` changed no runtime and passed all nine workflows plus Netlify deploy preview #150, including Admin hierarchy and isolated Puxadores persistence.

No production configuration write and no v5 publication occurred.

With A4 complete, **CP-SD-05 typed pricing is COMPLETE / PASS**. Next: CP-SD-06A0 repository/authentication preflight only.
