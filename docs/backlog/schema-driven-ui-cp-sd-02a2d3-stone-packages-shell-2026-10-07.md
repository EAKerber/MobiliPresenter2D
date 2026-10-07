# CP-SD-02A2d3 — Stone Packages section shell — 2026-10-07

Status: **IN PROGRESS — A2d3.0 PASS; A2d3.1 CANDIDATE**.

Parent:
- CP-SD-02A2d0 Acabamentos family discovery;
- CP-SD-02A2d1 Fronts shell;
- CP-SD-02A2d2 Handles shell.

Goal:
- move `stone-packages` / `choice-cards` semantic section ownership to normalized flow without changing stone selection, rendering, pricing or the independent `stone-skirting` service.

## A2d3.0 — boundary discovery

This discovery is required before implementation because `renderStonePackages()` currently serves two sibling concerns:
- populates `#stonePackageOptions` from stone package catalog/state/pricing;
- synchronizes `#stoneSkirtingToggle`, override/disabled state and title.

Confirm:
- Stone Packages shell can migrate while preserving the shared function unchanged;
- `#stonePackageOptions` is a sufficient bounded item adapter for `stone-all`;
- `stone-skirting` remains a separate semantic owner and does not need to migrate in the same checkpoint;
- keyboard/selection behavior addresses `stone-packages` by semantic id rather than requiring a static wrapper;
- neutral-slot `hidden` remains presentation-authoritative;
- absence of only `stone-all` can be tested without fabricating removal of `stone-skirting`.

Stop and split if removing the static Stone Packages wrapper requires:
- changing stone state representation;
- changing pricing;
- changing mask/material rendering;
- changing the stone-skirting compatibility/publication boundary;
- moving both stone sibling sections together.

## Expected A2d3.1 if discovery passes

Only:
- neutral `choice-cards` slot with item affinity `stone-all`;
- inner bounded adapter owning `stone-all` and preserving `#stonePackageOptions`;
- normalized flow supplies section id/label/behavior/component;
- positive source/Flow-layout proof.

A2d3.2 remains a separate absence proof.

No production configuration write.


## A2d3.0 discovery result — PASS WITH PREREQUISITE

Observed on `main` at `208980ac0a7a4c941549d41ce1ebc4a8ed92a6a9`.

The Stone Packages section itself remains a good candidate for a generated `choice-cards` shell:
- package controls are concentrated in `#stonePackageOptions`;
- package selection uses `stonePackageId` and existing catalog/pricing data;
- keyboard navigation addresses the semantic `stone-packages` section;
- the separate `stone-skirting` control has its own item id, section id and toggle handler.

However, one legacy ownership hook blocks a correct absence proof:

```html
<section id="stonePanel"
         data-flow-group-shell="stone"
         data-configurable-item="stone-all">
```

During configuration reconciliation, the generic `[data-configurable-item]` pass hides that whole group whenever `stone-all` is absent. This suppresses `stone-skirting` even when normalized flow still models it.

That group-level item ownership is not needed:
- `mountStageGroups()` already computes expected group ids from normalized flow;
- it sets each `[data-flow-group-shell]` hidden state from whether the group exists;
- therefore the Stone group can remain when only skirting exists and disappear when the normalized Stone group is empty.

Decision:
- do **not** migrate the Stone Packages shell yet;
- first execute A2d3.1 as a smaller prerequisite cleanup;
- remove only `data-configurable-item="stone-all"` from `#stonePanel`;
- prove normalized flow, not `stone-all`, owns Stone-group existence.

No change to `renderStonePackages()`, stone state, pricing, materials/masks, skirting compatibility repair or production configuration in A2d3.1.


## A2d3.1 prerequisite candidate

Only:
- remove `data-configurable-item="stone-all"` from `#stonePanel`;
- keep `data-flow-group-shell="stone"` unchanged;
- do not change either Stone section shell.

Proof:
- with only `stone-all` omitted, normalized Stone group remains with `stone-skirting`, `#stonePanel` stays visible, Stone Packages is hidden and skirting remains visible;
- with both Stone items omitted, normalized Stone group is absent and flow layout hides `#stonePanel`;
- no renderer fallback/invariant/page error.

No `renderStonePackages()`, state, pricing, material/mask, compatibility or production write changes.
