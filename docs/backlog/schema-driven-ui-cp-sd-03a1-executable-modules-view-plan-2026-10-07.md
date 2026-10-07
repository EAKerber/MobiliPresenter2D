# CP-SD-03A1 — executable Modules view plan/binding — 2026-10-07

Status: **IN PROGRESS — IMPLEMENTATION CANDIDATE**.

Parent:
- CP-SD-03A0 responsive presentation discovery — PASS.

Goal:
- make the frozen Modules primary/companion relation and per-profile projection executable in runtime data/DOM **without changing current visual geometry**.

## Scope

### Policy-derived Modules plan

Refactor the current Modules view planner so it consumes:
- normalized flow;
- `presentationPolicy.stageViews.modules`;
- current canonical layout profile.

It should project the frozen presentation records, including:
- view id;
- source section id;
- component;
- role;
- relation;
- current-profile projection when authored.

Do not invent a generic window manager.

A Modules-specific wrapper is acceptable for this first case as long as the view records themselves come from presentation policy rather than hardcoded detail/list definitions.

### Stable pane adapters

Keep current stable panes and their legacy hooks used by keyboard/scroll tests.

Add renderer binding identity to the existing adapters:
- detail pane -> `data-stage-view-id="modules-detail"`;
- list pane -> `data-stage-view-id="modules-list"`.

Keep `data-stage-pane="detail|list"` for current interaction/scroll code until a later slice proves it obsolete.

Exactly one adapter must bind each policy view. Missing/duplicate bindings fail closed.

### Projection marker

Expose the resolved current-profile projection on the companion adapter/container, naming flexible.

Expected detail marker:
- side-rail -> `side-panel`;
- stacked -> `side-panel`;
- compact -> `replace`.

The marker must update when the canonical layout profile changes.

Do **not** hide, move, overlay or resize panes in A1.

### Physical order

Preserve current accepted DOM/CSS order and geometry.

Policy view-array order is not a pixel-order instruction.

No reappend/reorder operation should reset pane scroll state merely to mirror policy array order.

## Proof

### Unit

For all three profiles:
- policy-derived plan resolves `modules-list` and `modules-detail`;
- both reference the single semantic Modules section;
- primary/companion roles and relation are preserved;
- detail projection equals the policy for the requested profile;
- invalid/missing view source still fails via existing policy/flow validation boundary.

### Source / binding

- `moduleViewLayout()` no longer constructs hardcoded detail/list view records independently of policy;
- DOM exposes exactly one adapter for each policy view id;
- current `data-stage-pane` hooks remain.

### Browser

At existing widths:
- 1366 -> side-rail marker `side-panel`;
- 1050 -> stacked marker `side-panel`;
- 390 -> compact marker `replace`.

Existing geometry must remain unchanged:
- current side-rail detail/list vertical geometry;
- stacked two peer columns + independent scroll;
- compact vertical baseline.

Existing selected module remains selected across profile marker updates.

No semantic hierarchy or item ownership changes.

## Explicitly unchanged

- Modules visual side-panel/replace behavior;
- CSS application topology;
- compact PiP behavior;
- stacked PiP;
- bottom dock;
- keyboard scrolling;
- module-card interactions;
- pricing/state/scene;
- production configuration.

## Stop rule

Stop and split if A1 requires:
- visual pane hiding/reordering;
- drawer/overlay geometry;
- new schema fields;
- PiP/dock changes;
- interaction changes.

A1 is an execution/binding seam only.


## Implementation candidate

Candidate is intentionally marker/binding-only:
- `moduleViewLayout(flow, presentationPolicy, profile)` now projects the authored Modules view records instead of constructing independent detail/list records;
- policy view ids, source section, component, role, relation and current-profile projection are copied into the executable plan;
- the existing detail/list panes remain in their accepted physical DOM order and retain `data-stage-pane="detail|list"`;
- stable adapters now expose `data-stage-view-id="modules-detail|modules-list"` plus their authored view component;
- runtime fails closed on missing/duplicate/unexpected view adapters and component mismatch;
- bound adapters expose source, role, relation and projection markers;
- resize updates only the policy-derived projection marker through the canonical layout profile;
- no pane is appended/reordered during binding, so pane scroll state is not reset by policy array order;
- no CSS/topology/PiP/dock/state/pricing/scene change;
- shared runtime cache revision advances v30 -> v31.

Proof added:
- unit plan assertions for side-rail / stacked / compact;
- presentation validation proof for a missing Modules view source;
- source assertions for exactly one adapter per policy view id and preservation of legacy pane hooks;
- browser assertions for side-rail/stacked `side-panel`, compact `replace`, unchanged geometry and selected-module persistence across profile marker updates.

Gate pending: all eight repository workflows + Netlify preview.
