# CP-SD-02A2d2.0 — Handles shell discovery result — 2026-10-07

Status: **COMPLETE / PASS**.

Baseline:
- `main` = `d362ab34d2750524e89bf07d8f67bb27c35f6ce6`;
- CP-SD-02A2d1 Fronts shell merged through PR #116;
- production configuration unchanged.

## Finding

Handles can use the same generated-section seam as Fronts without moving domain behavior.

The current handle adapter is already concentrated behind stable hosts:
- `#handleHelp`;
- `#handleOptions`;
- `renderHandleControlsFromData()`;
- global `handleId` selection state;
- existing pricing lookup/rateio.

The redraw path does not require a static Handles section wrapper. After a click, the keyboard bridge reactivates `handles` by semantic id through `activateSection("handles", ...)`.

## Layout boundary

The neutral slot must remain presentation-free so its `hidden` attribute is authoritative.

The existing `.handle-fieldset` class already supplies the 9px internal content rhythm and can move to an inner item-adapter wrapper. The generated semantic shell can therefore keep the standard `config-section finish-section` geometry.

## Decision

Proceed with **CP-SD-02A2d2.1 — generated Handles shell**.

Allowed:
- remove static Handles section id/heading/behavior/component;
- add neutral `choice-grid` slot with `handles-all` affinity;
- keep `#handleHelp` and `#handleOptions` unchanged inside an inner owned adapter;
- update source/browser proofs and shared runtime cache revision if required.

Not allowed:
- change handle catalog/options;
- change `handleId` state;
- change pricing/rateio;
- change scene/masks;
- change keyboard traversal algorithms;
- touch Fronts or Stone semantics;
- write production configuration.

Stop and split if implementation requires any prohibited change.
