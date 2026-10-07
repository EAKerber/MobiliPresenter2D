# CP-SD-02A2f0 — Acabamentos group-shell discovery result — 2026-10-07

Status: **COMPLETE / PASS**.

Baseline:
- `main` = `faa52a0d115409de36ac07f96b74b9bc93683d06`;
- all Acabamentos section shells are normalized-flow-owned;
- Summary semantic shell is normalized-flow-owned;
- `cabinet-finishes` and `stone` are the remaining static Acabamentos group bindings.

## Finding

The remaining duplication is not domain behavior. It is a renderer-binding boundary.

Normalized flow already owns:
- group existence;
- id;
- label;
- order;
- span;
- section membership/order.

Static HTML still supplies:
- the known group shell element;
- visible group header;
- explanatory presentation copy/icon;
- stable DOM ids;
- for Stone only, a legacy item-availability hook.

The normalized labels exactly equal the current group titles:
- `cabinet-finishes -> Acabamentos do conjunto`;
- `stone -> Pedra do conjunto`.

## Target seam

Use a generic hidden neutral group slot:

`data-flow-group-slot="<group-id>"`.

The slot is a **renderer binding affinity**, not semantic existence authority. It is invisible until normalized flow claims it.

When claimed:
- the adapter itself becomes `data-flow-group-shell="<group-id>"`;
- `data-flow-generated-group="true"` records runtime ownership;
- `data-flow-group` and `data-flow-span` continue to come from the normalized plan;
- a `data-flow-group-label` target receives `group.label`;
- existing static explanatory copy/icon and stable ids remain visual adapters;
- existing section slots continue through the proven section-shell generator.

No extra wrapper is introduced, preserving panel geometry exactly.

If no affinity slot exists, the existing generic class-based group creation path remains available. No domain-name branch is allowed.

## Migration order

Do not migrate both groups at once.

1. **A2f1 — Cabinet group**
   - lowest-risk group;
   - no material/availability hook;
   - introduces/proves generic group-slot infrastructure;
   - valid absence = remove Fronts + Handles, retain Stone.

2. **A2f2 — Stone group**
   - reuses proven infrastructure;
   - separately retires the redundant `stone-all` group visibility hook;
   - valid absence = remove both Stone items and the active initial skirting service.

## Focus invariant

A hidden neutral group adapter may precede the first modeled group in DOM order.

The current stage-entry code uses the first `h2` regardless of hidden ancestors. A2f1 must make heading selection visibility-aware without any group-specific condition.

This preserves:
- current normal focus on `frontFinishHeading`;
- valid cabinet-absent focus on `stoneHeading`;
- existing programmatic-focus visual semantics.

## Stone material boundary

The earlier product decision remains unchanged:

> Stone Skirting is independently toggleable as service state, not independently authorable as material.

Group-shell migration must not introduce or imply separate Stone/Skirting material authority.

## Decision

Proceed to A2f1 as generic group-slot infrastructure + `cabinet-finishes` only.

No runtime, schema, pricing, state, material or production change belongs to A2f0.
