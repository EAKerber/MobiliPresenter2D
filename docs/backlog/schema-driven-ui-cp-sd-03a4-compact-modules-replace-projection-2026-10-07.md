# CP-SD-03A4 — compact Modules replace projection execution — 2026-10-07

Status: **READY / NEXT**.

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
