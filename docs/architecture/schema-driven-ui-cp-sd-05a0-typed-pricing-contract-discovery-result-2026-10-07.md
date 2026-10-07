# CP-SD-05A0 — typed pricing contract discovery result — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- CP-SD-05 typed pricing authoring.

Discovery checkpoint:
- `docs/backlog/schema-driven-ui-cp-sd-05a0-typed-pricing-contract-discovery-2026-10-07.md`.

## Executive result

The current pricing behavior is small enough to type explicitly without inventing a generic formula engine.

The contract should introduce one independently versioned pricing-rules object. Legacy bucket names become migration/project compatibility only. The only supported percentage basis in the first typed contract is the current, proven front-finish basis: each finish-eligible module's own base amount, rounded independently before totals are summed.

The requested amount/percentage choice belongs initially to **front-finish adjustment rules only**:

- amount: fixed cents added to each finish-eligible module;
- percentage: basis points of that same eligible module's base amount.

All other current roles remain amount-only until a concrete product rule proves another percentage basis. Handle allocation remains a separate allocation rule and must never be treated as percentage semantics.

## Current authority map

### Public data

`app/data/mock-price-book.js` currently publishes `CommercialEstimatePriceBook 1.1`.

Its numeric buckets encode both role and type:

- `entries` — fixed item/module/accessory base amount in cents;
- `handleEntries` — fixed total for a handle choice in cents;
- `frontFinishRatesBps` — front-finish adjustment in basis points;
- `localEntries` — fixed item-local adjustment in cents;
- `globalEntries` — fixed one-time composition adjustment in cents;
- `handleFrontTotal` — allocation metadata.

### Calculator

`app/core/pricing.js` is the calculation authority.

Current front finish is:

```js
Math.round((baseCents * finishRateBps) / 10000)
```

and this executes **per eligible module**, before the module estimates are summed.

Current handles are different: `distributeCents(totalCents, handleFrontTotal)` divides one fixed handle total across the ordered front inventory. This is allocation/explanation, not percentage calculation.

### Legacy administration

`app/core/configuration.js` currently owns `ConfiguratorAdministration2D 3.0` and validates pricing by bucket name:

- `frontFinishRatesBps` permits integers 0..10000;
- all amount buckets permit integers 0..100000000;
- `handleFrontTotal` must equal the price-book value.

Legacy v1/v2 migration also merges those same five buckets.

### Admin UI

`app/admin/admin.js` duplicates type semantics in `priceSections`:

- one entry is tagged `rate`;
- all others are treated as currency;
- the change handler always stores `Math.round(displayValue * 100)`.

Therefore the numeric field has no self-describing type; its meaning is inferred from the surrounding bucket.

### Buyer configuration overlay

`app/app.js` normalizes the published administration and then overlays:

```js
priceBook = { ...priceBook, ...normalized.pricing };
```

So typed migration must cover persisted administration and buyer runtime together; changing only the static mock price book would leave a second legacy authority.

### Unpublished v4/v5 administration

Hierarchy v4 carries legacy pricing opaquely through the normalized legacy administration and ultimately reuses v3 validation on projection.

The unpublished `ConfiguratorAdministration2D 5.0` candidate currently focuses on hierarchy/presentation and likewise inherits pricing through the compatibility layer. It is therefore the appropriate unpublished administration boundary to adopt the independently versioned typed pricing object before first production publication.

## Frozen typed pricing contract

Introduce a dedicated pricing contract with schema:

`CommercialPricingRules 1.0`

Canonical shape:

```js
{
  schemaVersion: "CommercialPricingRules 1.0",
  roles: {
    itemBase: {
      "module-01": { type: "amount", cents: 90000 }
    },
    handleChoiceTotal: {
      "tango-chrome": { type: "amount", cents: 17985 }
    },
    frontFinishAdjustment: {
      cocoa: {
        type: "percentage",
        bps: 1500,
        basis: "eligible-module-base"
      }
    },
    localAdjustment: {
      "module-02:mandatory-cooktop-stone": {
        type: "amount",
        cents: 56600
      }
    },
    globalAdjustment: {
      "stone-skirting": { type: "amount", cents: 18500 }
    }
  },
  allocation: {
    handleFrontTotal: 14
  }
}
```

The rule shapes are closed:

### Amount

```js
{ type: "amount", cents: <safe integer> }
```

- `cents` range: 0..100000000;
- `bps` and `basis` are not permitted.

### Percentage

```js
{
  type: "percentage",
  bps: <safe integer>,
  basis: "eligible-module-base"
}
```

- `bps` range: 0..10000, preserving the current legacy maximum;
- `cents` is not permitted;
- missing or unknown basis fails validation.

No `isPercentage` boolean is allowed.

## Role/type matrix

| Typed role | Legacy source | Amount | Percentage | Application semantics |
| --- | --- | --- | --- | --- |
| `itemBase` | `entries` | yes | no | base amount for that priced item |
| `handleChoiceTotal` | `handleEntries` | yes | no | one fixed handle-choice total, then existing front allocation |
| `frontFinishAdjustment` | `frontFinishRatesBps` | **yes** | **yes** | evaluated independently for each finish-eligible module |
| `localAdjustment` | `localEntries` | yes | no | fixed charge owned by its current item-local key |
| `globalAdjustment` | `globalEntries` | yes | no | fixed charge applied once to the composition |

For `frontFinishAdjustment`:

- amount means add the authored cents to **each** finish-eligible module;
- percentage means `round(moduleBaseCents * bps / 10000)` for each eligible module;
- the amount form has no percentage basis field;
- the percentage form must declare `eligible-module-base`.

This is the smallest concrete dual-type rule that satisfies the authoring requirement without fabricating a new global/subtotal percentage basis.

## Closed percentage-basis registry

Version 1 contains exactly one basis:

`eligible-module-base`

Meaning:

1. resolve the current base amount for the finish-eligible module;
2. multiply by basis points;
3. divide by 10000;
4. round that module result with the current `Math.round` behavior;
5. then sum module finish adjustments.

Do **not** replace this with a percentage of the module subtotal. A synthetic gate should prove the difference; for example two eligible 10-cent bases at 15% yield two independently rounded 2-cent adjustments (4 cents total), whereas percentage-after-subtotal would yield 3 cents.

## Handle allocation invariant

`allocation.handleFrontTotal` remains explicit allocation metadata.

For the current `tango-chrome` total of 17985 cents across 14 fronts, the existing deterministic distribution is preserved. With all modules present, current ordered allocations are:

- module-01: 2570;
- module-03: 7710;
- module-05: 2569;
- module-06: 2568;
- module-07: 2568.

Total: 17985 cents.

This gate protects remainder ordering and prevents a future pricing rewrite from converting the handle model into a percentage.

## Exact legacy migration

Legacy -> typed mapping is deterministic:

- `entries[id] = n` -> `roles.itemBase[id] = { type: "amount", cents: n }`;
- `handleEntries[id] = n` -> `roles.handleChoiceTotal[id] = { type: "amount", cents: n }`;
- `frontFinishRatesBps[id] = n` -> `roles.frontFinishAdjustment[id] = { type: "percentage", bps: n, basis: "eligible-module-base" }`;
- `localEntries[id] = n` -> `roles.localAdjustment[id] = { type: "amount", cents: n }`;
- `globalEntries[id] = n` -> `roles.globalAdjustment[id] = { type: "amount", cents: n }`;
- `handleFrontTotal` -> `allocation.handleFrontTotal`.

All identifiers and all integers, including zero, must survive exactly.

Typed -> legacy projection is permitted only when every rule is representable by the old buckets:

- all non-finish roles are amount rules;
- every finish rule is percentage with basis `eligible-module-base`;
- allocation metadata is valid.

A typed front-finish **amount** rule is intentionally not representable by v3/v4. Projection must fail closed with a pricing-publication-required result rather than reinterpreting the number.

## Version decision

### Pricing rules

New nested contract:

- `CommercialPricingRules 1.0`.

This is the semantic pricing authority introduced by CP-SD-05.

### Static public price book

Keep `CommercialEstimatePriceBook 1.1` as the legacy input during the first migration/runtime slices.

When the static source itself is rewritten to publish the typed contract as canonical data, bump it to:

- `CommercialEstimatePriceBook 2.0`.

The shape change is structural and should not be hidden behind 1.1 or a silent minor reinterpretation.

### Administration v5

The existing v5 candidate is still unpublished. It may adopt nested `CommercialPricingRules 1.0` before first production publication, but that change must be explicit in CP-SD-05 documentation/tests.

v3 and v4 remain legacy pricing compatibility schemas. Their projection boundary must receive only exact legacy-compatible buckets.

## Compatibility fixtures to pin

The contract/migration gates should include:

1. deep legacy -> typed -> legacy equality for every current price-book bucket and `handleFrontTotal`;
2. zero preservation for `none`, `base-light` and `stone-existing`;
3. current default price-book values unchanged;
4. current finish BPS values unchanged;
5. synthetic per-module rounding proof, not subtotal rounding;
6. exact current handle remainder allocation;
7. buyer differential fixtures for:
   - baseline/default state;
   - nonzero front finish;
   - nonzero handle;
   - mandatory module-02 local charge;
   - priced stone choice;
   - each current global service;
   - lighting on/off;
   - partial module visibility;
8. summary and persistent-current-value equality after the runtime switch.

For the repository defaults, the current amount-only base/global/local arithmetic yields an 874000-cent default total before any nonzero finish or handle selection; this can be retained as an explicit regression fixture together with the differential tests.

## Implementation seam

### CP-SD-05A1 — contract + pure migration

Add the typed pricing core and pure unit/source gates.

No buyer calculator switch.
No admin UI change.
No current persisted schema write.
No production publication.

### CP-SD-05A2 — buyer calculation

Normalize the legacy price book/configuration into typed rules and make the calculator consume typed rules.

Preserve exact outputs and summary synchronization.

Do not yet add typed admin authoring.

### CP-SD-05A3 — v5/admin typed authoring

Make unpublished v5 carry the typed nested pricing contract and make admin rendering/editing derive allowed types from the contract rather than `priceSections` type tags.

Only `frontFinishAdjustment` receives an amount/percentage selector initially.

Percentage UI must expose the explicit basis. Type switching must not perform an implicit numeric unit conversion.

Legacy-equivalent typed state may down-project exactly. A front-finish amount rule must block v3/v4 publication until the later consolidated production schema publication.

### CP-SD-05A4 — canonical source + duplicate-authority retirement

If still necessary after A3:

- move the static public price source to `CommercialEstimatePriceBook 2.0`;
- keep old bucket conversion only in named migration/projection seams;
- remove residual runtime/admin bucket-type authority;
- close CP-SD-05 with all calculation/browser gates green.

## Non-goals

CP-SD-05 does not introduce:

- percentage of composition subtotal;
- percentage of global services;
- percentage handles;
- percentage module base prices;
- tax/discount stacks;
- chained percentage adjustments;
- cost, margin, supplier or profitability data;
- arbitrary formula expressions;
- hierarchy/presentation ownership of commercial formulas;
- production v4/v5 publication;
- authenticated production configuration writes.

## Gate decision

**PASS.**

The next slice is CP-SD-05A1: implement only the independent typed pricing contract and exact legacy migration/projection tests. Runtime, buyer totals, admin authoring and production remain unchanged in A1.
