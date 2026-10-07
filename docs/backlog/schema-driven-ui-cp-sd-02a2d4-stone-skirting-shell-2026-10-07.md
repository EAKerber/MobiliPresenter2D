# CP-SD-02A2d4 — Stone Skirting section shell — 2026-10-07

Status: **IN PROGRESS — A2d4.0 PASS; A2d4.1 NEXT**.

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


## A2d4.0 discovery result — PASS

Observed on `main` at `136511e4af43342401db60fcdb521c18d6688f10`.

### Product decision — presence/state is separate; material is not

Stone Packages and Stone Skirting remain separate semantic sections because they represent different buyer interactions:
- Stone Packages selects the global stone material/package;
- Stone Skirting toggles whether the plinth uses Stone behavior/material.

That separation **does not** imply separate material authoring.

Current material authority remains intentionally unified:
- one material group: `stone-all`;
- label: `Pedra e rodapé`;
- `linkedItemIds: ["stone-skirting"]`;
- no separate Stone Skirting material group;
- no admin option for linked vs independent stone/skirting materials.

Runtime behavior already matches this decision:
- Stone Skirting ON -> plinth follows the selected Stone material;
- Stone Skirting OFF -> plinth follows the MDF/front-finish path;
- changing Stone while OFF does not recolor the plinth;
- changing Stone while ON does recolor the plinth.

A previously considered future capability — independent stone/skirting colors with linking controlled by administration — is **explicitly deferred** because it adds unnecessary schema/admin/material complexity for the current product.

### Renderer boundary

The semantic shell can migrate independently:
- `#stoneSkirtingToggle` is a stable control host;
- `renderStonePackages()` only synchronizes its checked/disabled/title state and does not require a static section wrapper;
- the change handler calls `setGlobalService(state, "stone-skirting", ...)` directly and does not require static section ownership;
- keyboard ownership is modeled by semantic section id `stone-skirting`;
- hierarchy defaults already model `stone-skirting` as `toggle-list`;
- canonical validation keeps `stone-skirting requires stone-all`;
- the v3 compatibility repair remains a separate migration concern.

Decision: proceed to A2d4.1 with **shell generation only**.

A2d4.1 must not:
- introduce a new material group;
- introduce admin linking/unlinking;
- change `linkedItemIds`;
- change Stone/Skirting color behavior;
- change service state;
- change `repairSkirtingStageContract()`;
- change `stone-skirting requires stone-all`;
- write production configuration.
