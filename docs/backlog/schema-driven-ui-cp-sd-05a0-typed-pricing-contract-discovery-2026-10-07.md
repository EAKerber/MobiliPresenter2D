# CP-SD-05A0 — typed pricing contract discovery — 2026-10-07

Status: **READY / NEXT — DISCOVERY ONLY**.

Parent:
- CP-SD-04 interaction affordance cleanup — COMPLETE / PASS.
- CP-SD-05 typed pricing authoring — IN PROGRESS, discovery first.

## Goal

Freeze the typed pricing contract, migration boundary and supported percentage bases before changing persisted pricing, buyer calculation or admin authoring.

This checkpoint is intentionally documentation/discovery only. It must not change commercial values, price calculations, persisted production configuration or publication behavior.

## Current proven pricing model

The current public price book is `CommercialEstimatePriceBook 1.1` and encodes meaning through storage buckets:

- `entries`: fixed module base amounts in cents;
- `handleEntries`: fixed handle totals in cents;
- `frontFinishRatesBps`: front-finish percentage adjustments in basis points;
- `localEntries`: fixed local/mandatory charges in cents;
- `globalEntries`: fixed global/service charges in cents;
- `handleFrontTotal`: handle allocation metadata, not a percentage basis.

The only proven percentage semantic today is front finish. It is applied independently to each eligible module base amount as `round(baseCents * bps / 10000)`; that per-module basis and rounding order are part of the compatibility contract.

## Current authority duplication / coupling to resolve

Discovery must trace and freeze the boundary across:

- `app/data/mock-price-book.js` — current bucket-shaped public price book;
- `app/core/pricing.js` — calculation semantics and rounding;
- `app/core/configuration.js` — persisted admin pricing, bucket validation and legacy migration;
- `app/admin/admin.js` — duplicated bucket -> display/type convention through `priceSections`;
- buyer configuration overlay — normalized published `pricing` replaces price-book buckets at runtime;
- unpublished administration v4/v5 candidates — pricing is carried through compatibility layers but is not yet a separately typed contract;
- Netlify publication boundary — current production writes remain v3-guarded; direct v4/v5 hierarchy publication remains blocked.

## Required contract decisions

### 1. Explicit rule shape

A price adjustment must declare its meaning in the value itself rather than rely on the bucket name. A candidate shape may resemble:

```js
{ type: "amount", cents: 18500 }
{ type: "percentage", bps: 1500, basis: "eligible-module-base" }
```

Those field names are illustrative only until this discovery closes.

### 2. Closed percentage-basis registry

The only basis currently proven by product behavior is the semantic equivalent of `eligible-module-base`: apply the percentage independently to each eligible module base and preserve the current per-module rounding order.

Do not invent speculative percentage bases for module base prices, handles, local charges, global services or other categories merely to make the type generic.

### 3. Supported type matrix

Classify each pricing role by the rule types it actually supports. “Admin can choose amount or percentage” does not imply every price row can meaningfully switch to percentage.

The discovery output must identify where:
- amount only is currently valid;
- percentage is currently valid;
- both are justified by a real product use case;
- a future type remains unsupported and must fail validation.

### 4. Allocation is not percentage basis

`handleFrontTotal` and `distributeCents()` describe allocation of a fixed total across fronts. They must not be reinterpreted as a percentage basis.

### 5. Deterministic exact migration

Freeze an exact migration from:
- static `CommercialEstimatePriceBook 1.1`;
- current persisted admin pricing buckets;
- supported v1/v2/v3 administration imports;
- unpublished v4/v5 compatibility imports where pricing is carried forward.

Migration must preserve every existing integer exactly, including zeros, all current cents and all current basis-point values.

### 6. Explicit version boundary

Decide deliberately:
- whether the price book advances to a new minor/major schema version;
- whether pricing receives its own nested/versioned contract;
- whether the unpublished `ConfiguratorAdministration2D 5.0` candidate can adopt the typed pricing representation before its first production publication.

Do not silently change the meaning of an existing schema version.

### 7. Runtime compatibility strategy

Typed rules should become the normalized runtime authority. Bucket-name special cases may exist only at named migration/import seams, not as the long-term pricing renderer/calculator contract.

### 8. Admin authoring semantics

The admin must edit the rule type itself, with percentage basis visible/explicit whenever percentage is supported. It must not keep a parallel hidden convention where one bucket means percent and another means cents.

## Exact compatibility invariants

The implementation plan produced by this discovery must prove unchanged behavior for:

- every current module base amount;
- every current front-finish percentage;
- per-module finish rounding and summation order;
- current handle fixed-total pricing and front allocation;
- mandatory local cooktop-stone charge;
- all current global stone/service charges;
- all zero-valued entries;
- current estimate totals, summary rows and current-value synchronization.

## Expected implementation split after discovery

Prefer small independently gated slices:

- **CP-SD-05A1** — typed pricing contract + exact legacy migration, no buyer-visible change;
- **CP-SD-05A2** — buyer calculation consumes typed normalized rules with exact-estimate equivalence;
- **CP-SD-05A3** — admin typed authoring for only the supported type/basis combinations;
- **CP-SD-05A4** — retire residual duplicate bucket/type authority and close the pricing gate, if still needed.

The discovery may refine these names/boundaries, but should not combine contract migration, calculator rewrite and admin UI in one slice.

## Gates for this discovery

Before CP-SD-05A1 starts, persist:

- current pricing authority map and exact calculation semantics;
- proposed typed rule schema;
- closed percentage-basis registry;
- role -> supported-type matrix;
- exact migration matrix and schema-version decision;
- compatibility fixtures/expected totals to pin;
- named runtime/admin seams to change;
- explicit non-goals and stop/split conditions.

## Stop / split conditions

Do not:

- move monetary formula ownership into hierarchy/presentation schema;
- invent speculative percentage bases;
- change commercial values;
- change rounding order;
- reinterpret handle allocation as percentage;
- add cost, margin, supplier or profitability concepts;
- publish v4/v5 hierarchy/configuration to production;
- write production configuration;
- mix this work with the independent authenticated Puxadores or stone-skirting production transactions.

If discovery finds that a proposed percentage type lacks a concrete calculation basis, keep that role amount-only and record the limitation rather than generalizing by guess.
