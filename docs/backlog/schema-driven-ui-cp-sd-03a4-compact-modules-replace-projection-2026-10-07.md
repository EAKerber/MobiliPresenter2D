# CP-SD-03A4 — compact Modules replace projection execution — 2026-10-07

Status: **IN PROGRESS — IMPLEMENTATION CANDIDATE**.

Parent:
- CP-SD-03A3 Modules companion projection discovery — PASS.

Goal:
- make the existing policy-owned compact `replace` projection visibly executable while preserving current side-rail/stacked behavior, module inclusion semantics, pane scroll state and compact PiP.

## Allowed implementation

### One projection synchronizer

Add a small runtime synchronizer for the existing stable Modules pane adapters.

Inputs:
- current `moduleViewLayout(...).views` / adapter `data-view-projection`;
- current detail-open state (`selectedEntityId` / `body.has-module-detail`).

Rules:
- non-`replace`: list visible + detail visible;
- `replace` with detail closed: list visible + detail hidden;
- `replace` with detail open: list hidden + detail visible.

Do not reparent, reorder, recreate or clone panes.

### Integration points

Synchronize visibility:
- after Modules projection markers are applied;
- after detail inspection opens/closes/redraws;
- after profile changes.

Keep one helper as the visibility authority; do not duplicate the state machine across handlers.

### Focus correction

If visibility synchronization newly hides the pane containing `document.activeElement`:
- if detail is visible, focus the existing detail close action;
- if list is visible, restore the stored/fallback origin or Modules heading.

No focus move when the active element remains in a visible pane.

### Preserve scroll

Do not write pane `scrollTop` during projection changes.

Prove list and detail scroll positions survive:
- stacked -> compact -> stacked;
- open/close compact replace.

### Keep existing domain behavior

Unchanged:
- module checkbox/inclusion semantics;
- `selectedEntityId` inspection semantics;
- detail navigation arrows;
- Escape close path;
- detail-origin storage/restoration;
- hidden/excluded module may remain inspected and can be re-enabled;
- pricing/material/state/scene.

### PiP

Unchanged:
- compact auto-after-anchor;
- pin/transparency/resize controls;
- opening from pinned scene keeps PiP pinned.

## Browser proof

### Compact baseline

At 390:
- projection marker = `replace`;
- no detail -> list visible, detail pane hidden;
- opening from list -> list hidden, detail visible, close focused;
- closing/Escape -> detail hidden, list visible, origin focus restored.

### Scene/PiP open

From pinned compact scene:
- open module from hotspot;
- PiP remains pinned;
- list is hidden, detail visible;
- close restores a safe list fallback without unpinning PiP.

### Profile transitions

With detail open:
- 1050 stacked -> 390 compact: list hides, detail remains visible;
- 390 -> 1050: both panes visible;
- selection and pane scroll positions survive.

With detail closed:
- stacked -> compact: list visible, detail hidden;
- compact -> stacked: both visible.

### Focus hazard

Place focus in list with detail still open, then transition to compact:
- active element must move to visible detail close;
- no focus remains in hidden pane.

### Regression

- side-rail/stacked geometry unchanged;
- Keyboard browser remains deterministic;
- Flow layout invariants empty;
- Mobile PiP behavior unchanged;
- all eight workflows + Netlify preview green.

## Stop / split rule

Stop and split if this requires:
- changing module-card inspect vs checkbox semantics;
- a new drawer/overlay component;
- moving pane DOM nodes;
- stacked PiP;
- bottom dock;
- presentation schema changes.

No production configuration write.


## Implementation candidate

Candidate boundary:
- added one `syncModuleViewVisibility(plan, adapters)` helper;
- `replace` comes only from the policy-authored companion view projection;
- detail-open state remains existing inspection state / `has-module-detail`;
- stable pane adapters are hidden/shown in place; no DOM movement;
- side-rail/stacked keep both panes visible;
- compact closed = list visible/detail hidden;
- compact open = list hidden/detail visible;
- if a newly hidden pane contains focus, focus moves to the visible counterpart using existing detail close/origin helpers;
- first Flow gate falsified the assumption that stable DOM alone preserves pane `scrollTop`: compact removes the stacked pane scroller and the browser can clamp its offset;
- revised boundary snapshots pane scroll offsets only when leaving `stacked` and restores them only when `stacked` returns; compact itself is not forced to retain an artificial pane scroll offset;
- no keyboard-core, state, pricing, scene, PiP or schema changes;
- runtime cache v32 -> v33.

Proof added:
- source gates pin the single visibility synchronizer and reject reparenting;
- Flow verifies stacked -> compact focus repair, pane scroll preservation, compact Escape/return and round-trip;
- Mobile PiP verifies a hotspot-opened detail keeps PiP pinned while compact replace hides the list and focuses close.

Gate pending: all eight repository workflows + Netlify preview.


### Gate-driven correction

First candidate head `da2b761539161eae7cab418178d47032fbef1d24`:
- Mobile browser — PASS;
- Keyboard browser — PASS;
- Flow reached the new replace/focus assertions but failed the initial assumption that the visible detail pane's stacked `scrollTop` must remain numerically identical while compact is active.

Observed:
- stacked detail `scrollTop = 72`;
- compact detail `scrollTop = 0`.

Reason:
compact topology removes the bounded independent pane scroller, so the browser may clamp the element's scroll offset even though the pane node is stable.

Correction:
- remember pane offsets when leaving stacked;
- restore them when stacked returns;
- test the round-trip contract, not an invalid compact intermediate offset.

This remains inside the A4 scroll-preservation goal and does not alter compact scrolling ownership.
