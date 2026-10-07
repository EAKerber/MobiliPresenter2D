# CP-SD-05A3b — admin pricing type authoring execution — 2026-10-07

Status: **READY / NEXT**.

Parent:
- CP-SD-05A0 discovery — COMPLETE / PASS.
- CP-SD-05A1 typed pricing contract — COMPLETE / PASS.
- CP-SD-05A2 typed buyer runtime — COMPLETE / PASS.
- CP-SD-05A3a v5/admin typed pricing ownership — COMPLETE / PASS.

## Goal

Expose explicit amount/percentage authoring only where the typed contract supports both: `frontFinishAdjustment`.

All other current pricing roles remain amount-only and keep their current UI.

## Authority

Allowed types must come from:

`pricingContract.ROLE_CAPABILITIES.frontFinishAdjustment.types`

The admin must not recreate a parallel hard-coded “this section is percent” convention.

The only percentage basis remains:

`eligible-module-base`

and it must be visible to the author whenever percentage is selected.

## UI behavior

For each front-finish adjustment row:

- show a type selector;
- options map to the contract-supported types:
  - `amount` -> “Valor fixo”;
  - `percentage` -> “Percentual”;
- the numeric unit follows the selected rule:
  - amount -> `R$`;
  - percentage -> `%`;
- percentage exposes a read-only basis explanation equivalent to:
  - “Base: valor base de cada módulo elegível”;
- amount does not show a percentage basis.

Other roles must not render a type selector.

## Type switching

Switching type must **not** reinterpret the existing numeric value.

Required deterministic behavior:

- percentage -> amount:
  ```js
  { type: "amount", cents: 0 }
  ```
- amount -> percentage:
  ```js
  {
    type: "percentage",
    bps: 0,
    basis: "eligible-module-base"
  }
  ```

After switching, rerender the row/panel so unit, basis copy and numeric field all match the new rule.

The UI should make clear that changing type resets the value to zero to avoid implicit unit conversion.

## Publication boundary

Current production still accepts only v3-compatible configuration.

Therefore:

- current percentage finish rules can still project/publish to v3;
- a local amount finish rule is valid v5 authoring state;
- pressing Publish with any amount finish rule must stop before network PUT;
- the user receives a pricing-specific message explaining that this typed pricing change requires the later consolidated publication checkpoint;
- do not flatten cents into BPS.

No v5 production PUT is authorized in A3b.

## Required browser gates

At minimum prove:

1. only front-finish rows expose the type selector;
2. current migrated rows start as percentage and show `%`;
3. the percentage basis explanation is visible;
4. switching Cocoa percentage -> amount:
   - rule becomes amount;
   - numeric value becomes 0.00;
   - unit becomes R$;
   - percentage basis disappears;
5. attempting to publish that amount rule:
   - produces the pricing-publication-required message;
   - performs zero PUTs;
6. switching back amount -> percentage:
   - rule becomes percentage;
   - value becomes 0.00;
   - basis is restored;
7. setting the percentage back to 15.00 can publish through v3 exactly as 1500 BPS;
8. amount-only roles expose no selector;
9. Puxadores isolated persistence remains green;
10. no console/page errors.

## Core/source gates

- selector options are derived from `ROLE_CAPABILITIES`;
- no legacy bucket/type convention is reintroduced;
- no `isPercentage` boolean;
- no new percentage basis;
- no buyer calculator change;
- no commercial default value change.

## Likely files

- `app/admin/admin.js`;
- `app/admin/admin.css` for compact type/basis controls;
- `app/admin.html` cache revisions only;
- `app/tools/test-core.js`;
- `tests/admin-hierarchy-browser.cjs`;
- sister admin harness cache revisions if the bundle revision changes.

## Preserve

Do not change:

- current buyer totals/calculator;
- typed pricing contract schema;
- v5 migration rules;
- handle allocation;
- materials/hierarchy/presentation semantics;
- production endpoint acceptance;
- isolated Puxadores transaction;
- commercial default values.

## Next

After A3b, inspect residual pricing authority. If static `CommercialEstimatePriceBook 1.1` remains the last canonical legacy-shaped source, execute CP-SD-05A4 to move that source to `CommercialEstimatePriceBook 2.0` typed data and retire remaining runtime bucket compatibility outside named migration seams.
