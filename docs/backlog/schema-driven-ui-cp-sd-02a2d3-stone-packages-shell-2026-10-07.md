# CP-SD-02A2d3 — Stone Packages section shell — 2026-10-07

Status: **COMPLETE / PASS**.

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


## A2d3.2 implementation candidate

Applied only the Stone Packages shell seam:
- static `stone-packages` section id/heading/behavior/component removed from HTML;
- outer neutral slot carries `choice-cards` + `stone-all` affinity and stays hidden until normalized flow claims it;
- inner `data-flow-item-id="stone-all"` adapter preserves `#stonePackageOptions`;
- `#stonePanel[data-configurable-item="stone-all"]` remains unchanged;
- static `stone-skirting` section remains unchanged;
- `renderStonePackages()` and all stone state/pricing/material/mask logic remain unchanged;
- source and Flow-layout positive proof added;
- shared runtime cache revision advanced from v21 to v22.

A2d3.3 remains a separate schema-valid absence proof.


## A2d3.2 result — PASS

PASS on PR #119 head `6bd26a83ba9497f666f7a0ed7a4c67fd268efd7c`.

Proven:
- normalized flow materializes Stone Packages section id/label/behavior/component;
- static HTML no longer owns `stone-packages` section semantics;
- `#stonePackageOptions` remains inside the generated section through the bounded `stone-all` adapter;
- static `stone-skirting` remains unchanged;
- `#stonePanel[data-configurable-item="stone-all"]` remains unchanged;
- `renderStonePackages()`, state, pricing, materials/masks and compatibility repair remain unchanged.

Gate:
- App build purity — PASS;
- Current variant fidelity — PASS;
- Current asset gates — PASS;
- Flow layout browser — PASS;
- Keyboard browser — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Netlify deploy preview #119 — PASS.

A2d3.3 remains a separate schema-valid absence proof.


## A2d3.3 schema-valid absence-proof candidate

Test-only fixture:
- remove `stone-all` and `stone-skirting` from Acabamentos stage items;
- remove `stone-skirting` from `initialState.services` so the legacy repair shim has no contradictory active service to repair;
- keep material groups/catalog/pricing unchanged.

Prove:
- normalized flow has no Stone group;
- no semantic `stone-packages` shell exists;
- the unclaimed `stone-all` neutral slot stays hidden;
- `#stonePanel` is hidden;
- Fronts and Handles remain visible;
- renderer invariant errors and page/console errors remain empty.

Production/runtime implementation is unchanged from the A2d3.2 PASS head.


## A2d3.3 result — PASS

PASS on PR #119 head `be7526d035d5ebceb64bfe1aadbc8cd8e678e8c4`.

Proven with a schema-valid Stone-absence fixture:
- `stone-all` and `stone-skirting` are removed from Acabamentos stage items;
- `stone-skirting` is also removed from `initialState.services`, so the legacy repair shim has no contradictory active service to restore;
- normalized flow contains no Stone group;
- no semantic `stone-packages` shell exists;
- the unclaimed `stone-all` neutral slot remains hidden;
- `#stonePanel` is hidden;
- Fronts and Handles remain visible;
- renderer invariant errors and page/console errors remain empty.

No production/runtime implementation change was required by A2d3.3.

## A2d3.4 regression + closure — PASS

The same final functional head ran:
- App build purity — PASS;
- Current variant fidelity — PASS;
- Current asset gates — PASS;
- Flow layout browser — PASS;
- Keyboard browser — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Netlify deploy preview #119 — PASS.

Final result:
- normalized flow is the sole semantic owner of Stone Packages section id/label/behavior/component;
- static HTML retains only a neutral `choice-cards` affinity slot with a bounded `stone-all` adapter;
- current Stone-group availability semantics remain unchanged;
- static `stone-skirting` remains for the next checkpoint;
- no state/pricing/material/mask/compatibility or production-configuration semantics changed.
