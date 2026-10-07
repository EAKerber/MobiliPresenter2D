# CP-SD-02A2d4 — Stone Skirting section shell — 2026-10-07

Status: **COMPLETE / PASS**.

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


## A2d4.1 implementation candidate

Applied only the semantic shell seam:
- static `stone-skirting` section id/heading/behavior/component removed from HTML;
- outer neutral slot carries `toggle-list` + `stone-skirting` affinity and remains presentation-free/hidden until claimed;
- inner adapter retains `data-configurable-item="stone-skirting"`, `data-flow-item-id="stone-skirting"` and `#stoneSkirtingToggle`;
- normalized flow supplies section id, label, behavior and component;
- source and Flow-layout positive proof added;
- shared runtime cache revision advanced from v22 to v23.

Explicitly unchanged:
- `renderStonePackages()`;
- toggle change handler / `setGlobalService()`;
- `stone-all` material group and `linkedItemIds`;
- ON = selected Stone material, OFF = MDF/front-finish path;
- `stone-skirting requires stone-all`;
- pricing;
- material/mask rendering;
- `repairSkirtingStageContract()`;
- production configuration.

A2d4.2 remains a separate absence proof.


## A2d4.1 result — PASS

PASS on PR #121 head `64c516e1adae37dbaa71e96ce40b0ac6da522dae`.

Proven:
- normalized flow materializes Stone Skirting section id/label/behavior/component;
- static HTML no longer owns Stone Skirting section semantics;
- `#stoneSkirtingToggle` remains inside the generated section through the bounded `stone-skirting` adapter;
- keyboard toggle/section traversal remains intact;
- Stone browser confirms the existing material behavior is unchanged:
  - ON -> selected Stone material;
  - OFF -> MDF/front-finish path;
  - Stone changes do not recolor the plinth while OFF;
  - Stone changes do recolor the plinth while ON;
- no new material authority, admin linking/unlinking option or separate Skirting material was introduced.

Gate:
- App build purity — PASS;
- Current variant fidelity — PASS;
- Current asset gates — PASS;
- Flow layout browser — PASS;
- Keyboard browser — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Netlify deploy preview #121 — PASS.

A2d4.2 remains a separate schema-valid absence proof.


## A2d4.2 absence-proof candidate

Test-only fixture:
- keep `stone-all` in Acabamentos;
- remove `stone-skirting` from Acabamentos stage items;
- remove `stone-skirting` from `initialState.services`, making the absence intentional so `repairSkirtingStageContract()` must not restore it;
- leave Stone material authority/catalog/pricing unchanged.

Prove:
- normalized Stone group remains present;
- generated Stone Packages remains present and visible;
- normalized Stone group has no `stone-skirting` section;
- no semantic Stone Skirting shell exists;
- the unclaimed Stone Skirting neutral slot remains hidden;
- no renderer invariant/fallback/page errors occur.

This proves section/UI absence independently from Stone material availability without introducing material independence.


## A2d4.2 result — PASS

PASS on PR #121 head `5b669edf855886ce834acd65d465944b6f2ef32b`.

Proven with an intentional, schema-valid Stone Skirting absence fixture:
- `stone-all` remains assigned;
- `stone-skirting` is absent from stage assignment;
- `stone-skirting` is absent from `initialState.services`, so the legacy repair correctly treats the omission as intentional;
- normalized Stone group remains present;
- generated Stone Packages remains present and visible;
- normalized Stone group contains no Stone Skirting section;
- no semantic Stone Skirting shell exists;
- the unclaimed Stone Skirting neutral slot remains hidden;
- no renderer invariant/fallback/page errors occur.

No runtime implementation change was required by A2d4.2.

## A2d4.3 regression + closure — PASS

The final A2d4 head ran:
- App build purity — PASS;
- Current variant fidelity — PASS;
- Current asset gates — PASS;
- Flow layout browser — PASS;
- Keyboard browser — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Netlify deploy preview #121 — PASS.

Final authority:
- normalized flow owns Stone Skirting section id/label/behavior/component;
- static HTML retains only a neutral `toggle-list` affinity slot and bounded `stone-skirting` adapter;
- Stone Skirting remains separately toggleable as service state;
- Stone material remains shared through `stone-all`;
- independent Stone/Skirting materials and admin linking/unlinking remain intentionally deferred;
- no pricing/material/schema/compatibility/production write occurred.
