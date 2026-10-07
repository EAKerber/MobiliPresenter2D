# CP-SD-02A2d3 — Stone Packages section shell — 2026-10-07

Status: **READY / NEXT — A2d3.0 discovery first**.

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
