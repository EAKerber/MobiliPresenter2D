# CP-SD-02A2d3 — Stone Packages section shell — 2026-10-07

Status: **IN PROGRESS — A2d3.0 REVISED PASS; A2d3.1 FALSIFIED/REVERTED; A2d3.2 NEXT**.

Parent:
- CP-SD-02A2d0 Acabamentos family discovery;
- CP-SD-02A2d1 Fronts shell;
- CP-SD-02A2d2 Handles shell.

Goal:
- move `stone-packages` / `choice-cards` semantic section ownership to normalized flow without changing stone selection, rendering, pricing, masks/materials or the current `stone-skirting` dependency contract.

## A2d3.0 — boundary discovery — PASS / REVISED

Observed on `main` at `208980ac0a7a4c941549d41ce1ebc4a8ed92a6a9`.

Confirmed:
- `#stonePackageOptions` is the bounded package adapter;
- package state is `stonePackageId`;
- package pricing/material behavior is independent from static section identity;
- keyboard navigation addresses semantic section id `stone-packages`;
- `renderStonePackages()` also synchronizes the separate `#stoneSkirtingToggle`, but that shared render function does not require the two section shells to migrate together.

## A2d3.1 — group-independence prerequisite — FALSIFIED / REVERTED

Hypothesis:
- remove `data-configurable-item="stone-all"` from `#stonePanel`;
- allow a normalized Stone group containing only `stone-skirting`.

The gate falsified this hypothesis for the current schema.

Canonical configuration validation contains the invariant:

> `stone-skirting` requires `stone-all`.

The first fixture also intersected the legacy v3 repair shim, but even after explicitly assigning `stone-skirting`, the target input remained invalid under the canonical configuration contract. Therefore “Stone group with only skirting” is not a supported semantic state and must not be used as a CP-SD-02 proof.

Decision:
- restore `data-configurable-item="stone-all"` on `#stonePanel`;
- remove the invalid group-independence fixtures;
- do not alter configuration validation or the legacy skirting repair in this track;
- retain the current Stone-group dependency exactly as-is.

## A2d3.2 — generated Stone Packages shell — NEXT

Allowed:
- replace only the static `stone-packages` semantic section wrapper/heading with a neutral `choice-cards` slot;
- slot affinity remains `stone-all`;
- preserve `#stonePackageOptions` in a bounded `data-flow-item-id="stone-all"` adapter;
- normalized flow supplies section id, label, behavior and component;
- keep `#stonePanel[data-configurable-item="stone-all"]` unchanged;
- keep the static `stone-skirting` section unchanged;
- keep `renderStonePackages()`, state, pricing, materials/masks and compatibility repair unchanged;
- add positive source/Flow-layout proof.

## A2d3.3 — valid absence proof

The negative fixture must remain schema-valid.

Use Acabamentos with both:
- `stone-all` omitted;
- `stone-skirting` omitted.

Prove:
- normalized flow contains no Stone group;
- zero generated `stone-packages` semantic shells exist;
- neutral Stone Packages slot remains hidden;
- `#stonePanel` is hidden;
- Fronts and Handles remain independently rendered;
- no renderer invariant/fallback/page errors.

Do **not** use a skirting-only configuration unless the schema contract is changed in a separate, explicitly approved checkpoint.

## Stop rule

Stop and split if Stone Packages shell generation requires:
- changing the `stone-skirting requires stone-all` invariant;
- changing the legacy repair algorithm;
- changing stone state/pricing/material/mask behavior;
- migrating the skirting shell in the same checkpoint;
- changing production configuration.

No production configuration write.
