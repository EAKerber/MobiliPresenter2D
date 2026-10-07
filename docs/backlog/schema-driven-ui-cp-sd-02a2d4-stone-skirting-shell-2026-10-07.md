# CP-SD-02A2d4 — Stone Skirting section shell — 2026-10-07

Status: **READY / NEXT — A2d4.0 discovery first**.

Parent:
- CP-SD-02A2d0 Acabamentos family discovery;
- CP-SD-02A2d3 Stone Packages shell + schema-valid absence proof.

Goal:
- move `stone-skirting` / `toggle-list` semantic section ownership to normalized flow without changing its service state, Stone dependency, legacy compatibility repair, material behavior or production configuration.

## A2d4.0 — boundary discovery

Inspect only the Stone Skirting section boundary.

Confirm:
- `#stoneSkirtingToggle` and its label can remain a bounded item adapter;
- `renderStonePackages()` may continue to synchronize checked/disabled/title state without requiring a static skirting section wrapper;
- the change handler continues to call `setGlobalService(..., "stone-skirting", ...)` unchanged;
- keyboard behavior continues to address semantic section id `stone-skirting`;
- `stone-skirting requires stone-all` remains an availability invariant, not renderer ownership;
- the published-v3 repair shim remains untouched;
- a valid absence fixture can keep `stone-all` while removing `stone-skirting` from both stage assignment and `initialState.services`.

Stop and split if shell migration requires:
- changing `repairSkirtingStageContract()`;
- changing the `stone-skirting requires stone-all` invariant;
- changing service state or Stone material logic;
- changing pricing;
- publishing/migrating production configuration.

## Expected A2d4.1 if discovery passes

Only:
- neutral `toggle-list` slot with item affinity `stone-skirting`;
- bounded inner adapter retaining `data-configurable-item="stone-skirting"`, `data-flow-item-id="stone-skirting"` and `#stoneSkirtingToggle`;
- normalized flow supplies section id/label/behavior/component;
- positive source/Flow-layout proof;
- no change to Stone Packages.

## Expected A2d4.2 absence proof

Fixture:
- keep `stone-all`;
- remove `stone-skirting` from Acabamentos stage items;
- remove `stone-skirting` from `initialState.services`.

Prove:
- Stone group and generated Stone Packages remain present;
- no semantic Stone Skirting shell exists;
- neutral skirting slot remains hidden;
- no compatibility repair re-adds the intentionally absent service;
- renderer/page errors remain empty.

No production configuration write.
