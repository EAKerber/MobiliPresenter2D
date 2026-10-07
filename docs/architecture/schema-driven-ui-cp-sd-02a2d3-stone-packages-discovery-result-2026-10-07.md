# CP-SD-02A2d3.0 — Stone Packages boundary discovery result — 2026-10-07

Status: **COMPLETE / PASS — REVISED AFTER FALSIFICATION**.

Baseline:
- `main` = `208980ac0a7a4c941549d41ce1ebc4a8ed92a6a9`;
- Fronts and Handles section shells are flow-generated;
- production configuration unchanged.

## Stable finding

Stone Packages can use the neutral-slot seam without moving domain behavior:
- `#stonePackageOptions` is the bounded item adapter;
- package selection is represented by `stonePackageId`;
- current pricing/material behavior does not depend on the static semantic wrapper;
- keyboard navigation uses semantic id `stone-packages`;
- `renderStonePackages()` may continue to synchronize the separate skirting toggle unchanged.

## Falsified sub-hypothesis

The initial discovery treated `stone-skirting` as independently available from `stone-all` and proposed removing `data-configurable-item="stone-all"` from `#stonePanel`.

That was wrong for the current canonical schema.

`app/core/configuration.js` validates that an active stage assignment containing `stone-skirting` without `stone-all` is invalid:

`stone skirting requires the stone item`.

The Flow-layout gate correctly refused the attempted skirting-only fixture. The legacy v3 repair shim added an additional complication because it uses `stone-all` as the placement anchor for historical contradictory records, but the canonical validation invariant alone is sufficient to reject the proposed state.

## Consequence

The A2d3.1 group-independence prerequisite is **falsified and reverted**.

Keep:
- `#stonePanel[data-configurable-item="stone-all"]`;
- the current `stone-skirting requires stone-all` contract;
- the current legacy compatibility shim;
- the static skirting section for now.

Proceed instead to A2d3.2:
- generate only the Stone Packages semantic shell from normalized flow;
- preserve `stone-all` group availability semantics;
- use a valid absence proof that removes both Stone items.

## Governance lesson

A semantic section can be separately rendered without being independently available.

Do not infer availability independence from separate section ids. Availability relations come from the configuration contract; renderer migration must preserve them unless a separate product/schema decision changes that contract.
