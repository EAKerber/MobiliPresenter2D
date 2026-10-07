# CP-SD-05A1 — typed pricing contract execution — 2026-10-07

Status: **READY / NEXT**.

Parent:
- CP-SD-05A0 typed pricing contract discovery — COMPLETE / PASS.

Discovery result:
- `docs/architecture/schema-driven-ui-cp-sd-05a0-typed-pricing-contract-discovery-result-2026-10-07.md`.

## Goal

Introduce the pure, independently versioned `CommercialPricingRules 1.0` contract and prove exact legacy migration/projection without changing buyer pricing behavior, admin authoring behavior or persisted production configuration.

## In scope

Create a small pricing-contract core that owns:

- schema/version constant;
- closed role registry;
- allowed rule types by role;
- the one allowed percentage basis;
- rule and contract validation;
- deterministic legacy bucket -> typed migration;
- exact typed -> legacy projection when representable.

Frozen typed roles:

- `itemBase`;
- `handleChoiceTotal`;
- `frontFinishAdjustment`;
- `localAdjustment`;
- `globalAdjustment`.

Frozen percentage basis:

- `eligible-module-base`.

## Rule shapes

Amount:

```js
{ type: "amount", cents: 18500 }
```

Percentage:

```js
{
  type: "percentage",
  bps: 1500,
  basis: "eligible-module-base"
}
```

Validation must fail closed on mixed/stale fields, unknown types, unknown bases, unsafe integers and percentage rules in unsupported roles.

## Legacy mapping

A1 must prove exact mapping for all current `CommercialEstimatePriceBook 1.1` buckets and `handleFrontTotal`.

Typed -> legacy projection must return a structured failure for a non-representable rule, specifically a front-finish amount rule, rather than coercing it into basis points.

## Required gates

At minimum:

- current price book migrates to a valid typed contract;
- typed contract projects back to deep-equal legacy buckets;
- all current integers and identifiers survive exactly;
- zero-valued entries survive;
- 0..10000 BPS legacy range is preserved;
- 0..100000000 cents range is preserved;
- amount rules reject `bps` / `basis`;
- percentage rules reject `cents`;
- percentage requires `eligible-module-base`;
- unsupported role + percentage fails;
- front-finish amount is valid typed state but cannot project to legacy;
- handle allocation metadata round-trips unchanged;
- no browser-visible/runtime changes.

## Preserve

Do not change in A1:

- `app/core/pricing.js` calculation inputs/outputs;
- buyer totals;
- `priceSections` admin rendering;
- current `ConfiguratorAdministration2D 3.0` persisted shape;
- hierarchy v4/v5 runtime/admin model;
- static public price-book schema/version;
- commercial values;
- rounding behavior;
- handle distribution behavior;
- Netlify publication policy.

## Stop / split

If adding the contract requires changing current buyer/admin behavior, stop and defer that integration to A2/A3.

If a rule cannot be represented losslessly in legacy buckets, keep the structured projection failure; do not invent a compatibility encoding.

No production configuration writes.
