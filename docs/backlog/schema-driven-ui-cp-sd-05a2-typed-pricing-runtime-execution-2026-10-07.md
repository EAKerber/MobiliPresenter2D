# CP-SD-05A2 — typed pricing runtime execution — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- CP-SD-05A0 typed pricing discovery — COMPLETE / PASS.
- CP-SD-05A1 typed pricing contract — COMPLETE / PASS.

Discovery result:
- `docs/architecture/schema-driven-ui-cp-sd-05a0-typed-pricing-contract-discovery-result-2026-10-07.md`.

## Goal

Make the buyer pricing calculator consume normalized `CommercialPricingRules 1.0` while preserving every current commercial result and keeping legacy v3 pricing only as an explicit compatibility input.

A2 changes runtime calculation authority, not admin authoring or production persistence.

## Boundary

### Legacy compatibility input remains

Current static `CommercialEstimatePriceBook 1.1` and current normalized `ConfiguratorAdministration2D 3.0` pricing remain legacy bucket-shaped during A2.

The buyer may still keep that legacy object for:

- configuration v3 validation/migration;
- estimate label/disclaimer metadata;
- later legacy publication compatibility.

It must no longer be the numeric calculation authority once A2 completes.

### Typed runtime authority

At buyer startup:

1. create the existing default administration through the legacy configuration core;
2. migrate its `pricing` object through `pricingContract.upgradeLegacy()`;
3. store that typed result as the calculator pricing authority.

When published administration is loaded:

1. normalize it through the existing legacy configuration boundary;
2. migrate `normalized.pricing` through `pricingContract.upgradeLegacy()`;
3. replace the typed runtime pricing authority;
4. keep the existing legacy overlay only where legacy configuration compatibility still needs it.

No manual second mapping of bucket semantics should be introduced in `app.js`; reuse the existing normalized `pricing` object as the migration input.

## Calculator migration

`app/core/pricing.js` must read:

- `roles.itemBase`;
- `roles.handleChoiceTotal`;
- `roles.frontFinishAdjustment`;
- `roles.localAdjustment`;
- `roles.globalAdjustment`;
- `allocation.handleFrontTotal`.

It must stop reading numeric meaning from:

- `entries`;
- `handleEntries`;
- `frontFinishRatesBps`;
- `localEntries`;
- `globalEntries`.

Those names may remain only in the explicit legacy migration/configuration boundary.

## Front-finish evaluation

Support both frozen typed forms:

### Amount

```js
{ type: "amount", cents: N }
```

For a finish-eligible module, add `N` cents to that module.

### Percentage

```js
{
  type: "percentage",
  bps: N,
  basis: "eligible-module-base"
}
```

For a finish-eligible module:

```js
Math.round((moduleBaseCents * N) / 10000)
```

Round each module independently **before** summing.

Do not introduce percentage-of-subtotal or chained adjustment logic.

## Other roles

- `itemBase`: amount only;
- `handleChoiceTotal`: amount only, then existing `distributeCents()`;
- `localAdjustment`: amount only;
- `globalAdjustment`: amount only.

Handle front ordering/remainder distribution must remain byte-for-byte equivalent in output cents.

## Preserve calculator/public behavior

For all current legacy-derived data preserve:

- unavailable-price behavior;
- base/module cents;
- finish cents;
- handle cents;
- local cents;
- global cents;
- total cents;
- summary rows;
- persistent current value;
- label/disclaimer copy;
- service/stone one-time ownership;
- lighting pricing;
- handle allocation order;
- current visible/hidden module effects.

If diagnostic fields need to evolve to represent amount-based finish rules, do so additively and do not change current rendered output.

## Required gates

### Contract/runtime unit gates

- current legacy price book -> typed rules -> calculator yields the same current baseline;
- repository default total remains **874000 cents**;
- cocoa 15% across all current modules adds **99000 cents**;
- handle totals remain exact;
- existing tango 17985-cent distribution remains:
  - module-01 2570;
  - module-03 7710;
  - module-05 2569;
  - module-06 2568;
  - module-07 2568;
- module-02 mandatory local charge remains 56600;
- each current global amount remains unchanged;
- lighting remains 60000 when active;
- synthetic two-module 10-cent / 15% case proves per-module rounding gives 4 cents, not subtotal-rounding 3 cents;
- a typed front-finish amount rule is applied once per finish-eligible visible module.

### Browser gates

At minimum:

- Summary/Pricing browser green;
- Current variant fidelity green;
- Mobile/Stone/Keyboard green where path filters trigger or a direct dependency changed;
- no browser console regressions;
- Netlify preview green.

## Files expected

Likely:

- `app/index.html` — load pricing contract before calculator/app;
- `app/core/pricing.js` — typed calculation;
- `app/app.js` — one typed pricing authority derived from normalized legacy pricing;
- `app/tools/test-core.js` — exact calculation/differential gates;
- affected browser cache revisions/tests only where required.

Avoid touching admin pricing rendering in A2.

## Non-goals

No:

- admin amount/percentage selector;
- v5 typed pricing persistence;
- production configuration write;
- static `CommercialEstimatePriceBook 2.0` publication;
- new percentage bases;
- commercial value changes;
- hierarchy/presentation changes;
- cost/margin/supplier concepts.

## Stop / split

If buyer typed migration requires changing the admin persistence model, stop and leave that work for A3.

If a legacy value cannot migrate exactly, stop rather than compensating in calculator code.

If a current total changes, treat it as a regression unless the old result is proven incorrect by an existing product rule; no such correction is authorized in A2.


## Result

Implemented on PR #147:

- buyer now loads `CommercialPricingRules 1.0` before the calculator;
- initial and published legacy v3 pricing are migrated once through `pricingContract.upgradeLegacy()`;
- `app/core/pricing.js` consumes only typed roles + allocation metadata for numeric calculation;
- legacy bucket names no longer encode numeric meaning inside the calculator;
- estimate label/disclaimer remain metadata outside the typed numeric contract;
- front-finish amount rules and percentage rules are both executable;
- percentage keeps `eligible-module-base` and per-module `Math.round` before summation;
- current handle remainder allocation is preserved exactly;
- shared buyer runtime cache advanced coherently to `runtime-v37`.

Gate corrections were compatibility-test maintenance, not commercial behavior changes:

- the shared runtime cache gate required all buyer runtime assets to advance together to v37;
- the bootstrap-order gate was updated to declare `pricing-contract.js` before `pricing.js`;
- one residual source assertion was updated from runtime-v36 to runtime-v37.

Final head `22516cd3f4d5e8e3ace93c08eede780598ad3a65` passed all eight repository workflows plus Netlify deploy preview #147.

Pinned compatibility includes the 874000-cent default, 99000-cent cocoa finish total, exact 17985-cent Tango distribution, local/global charges, summary/current-value synchronization, synthetic per-module percentage rounding (4 cents rather than subtotal 3) and fixed finish amount once per eligible visible module.

No admin authoring shape, persisted production configuration or publication policy changed in A2.

Next: `docs/backlog/schema-driven-ui-cp-sd-05a3a-v5-typed-pricing-ownership-execution-2026-10-07.md`.
