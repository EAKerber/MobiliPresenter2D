# CP-SD-05A3b — admin pricing type authoring execution — 2026-10-07

Status: **IN PROGRESS / FUNCTIONAL PATCH COMPLETE; BROWSER GATE RETRY REQUIRED**.

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


## Implementation checkpoint

Functional patch on PR #149, head `9f02ea46f2d50b1ca810fc21aae2c3bfb8d86a68`:

- only `frontFinishAdjustment` rows expose a type selector;
- selector options come from `pricingContract.ROLE_CAPABILITIES[role]`;
- percentage rows expose the explicit `eligible-module-base` explanation;
- switching type creates a new zero-valued rule rather than reinterpreting the old number;
- amount finish pricing remains valid v5 state but Publish stops before any v3 PUT with a pricing-specific message;
- current amount-only roles remain unchanged;
- admin CSS/bundle cache advanced to `admin-pricing-v2`;
- buyer calculator, pricing contract schema, commercial defaults, endpoint acceptance and Puxadores repair code were not changed.

Initial gate round:

- PASS: App build purity;
- PASS: Current variant fidelity;
- PASS: Mobile browser;
- PASS: Stone browser;
- PASS: Current asset gates;
- PASS: Netlify deploy preview #149;
- Admin hierarchy browser: **CANCELLED before tests**, while installing Playwright under the workflow's 10-minute timeout;
- Summary pricing browser: static gate passed; deployed buyer test timed out waiting for the total to change after toggling stone skirting. This buyer path is unchanged by A3b and passed on the immediately preceding PR #148, so the first response is a clean rerun rather than a speculative runtime patch.

The connector rerun endpoints returned internal errors. This documentation checkpoint intentionally creates a fresh PR head so the same functional patch receives a clean workflow round. Do not mark A3b COMPLETE until Admin hierarchy, isolated Puxadores and Summary pricing all execute successfully.
