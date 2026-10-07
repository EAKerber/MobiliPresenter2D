# CP-SD-02A2d3.0 — Stone Packages boundary discovery result — 2026-10-07

Status: **COMPLETE / PASS WITH PREREQUISITE**.

Baseline:
- `main` = `208980ac0a7a4c941549d41ce1ebc4a8ed92a6a9`;
- Fronts and Handles section shells are flow-generated;
- production configuration unchanged.

## Finding

Stone Packages can eventually use the same neutral-slot seam, but a legacy group-level visibility owner must be removed first.

`#stonePanel` currently combines:
- semantic group hook: `data-flow-group-shell="stone"`;
- item visibility hook: `data-configurable-item="stone-all"`.

The configuration reconciliation loop hides every `[data-configurable-item]` whose item is absent. Therefore a configuration that omits only `stone-all` hides the entire Stone group and with it the independently modeled `stone-skirting` section.

This conflicts with normalized flow ownership.

## Existing canonical authority

`mountStageGroups()` already:
- derives expected group ids from normalized flow;
- hides static group shells that are not expected;
- unhides/reorders expected group shells;
- independently reconciles expected semantic sections.

Therefore group existence does not need to be inferred from `stone-all`.

## Required prerequisite — A2d3.1

Remove only `data-configurable-item="stone-all"` from `#stonePanel`.

Prove with a focused negative fixture:
- Acabamentos remains enabled;
- `stone-all` is omitted;
- `stone-skirting` remains assigned;
- normalized flow contains Stone group with only `stone-skirting`;
- `#stonePanel` remains visible;
- `stone-packages` is absent/hidden;
- `stone-skirting` remains visible;
- no renderer invariant/fallback/page error.

Also prove that when both Stone items are absent, normalized flow removes the Stone group and `#stonePanel` is hidden by flow layout.

## Not part of A2d3.1

- no Stone Packages neutral slot yet;
- no `renderStonePackages()` change;
- no state/pricing/material/mask change;
- no skirting compatibility/publication change;
- no production configuration write.

If A2d3.1 passes, proceed to A2d3.2 generated Stone Packages shell.
