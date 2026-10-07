# CP-SD-02A2d2 — generated Handles section shell — 2026-10-07

Status: **READY / NEXT**.

Parent:
- `docs/architecture/schema-driven-ui-cp-sd-02a2d0-finishes-family-discovery-result-2026-10-07.md`;
- CP-SD-02A2d1 Fronts shell + absence proof.

Goal:
- remove the remaining static semantic ownership of the `handles` / `choice-grid` section without changing handle-card rendering, selection state, pricing or keyboard behavior.

## Initial boundary

Preserve:
- `#handleHelp`;
- `#handleOptions` and current handle-card renderer;
- global `handleId` state semantics;
- active-section restoration after handle redraw;
- pricing/rateio behavior;
- current responsive readability and card geometry.

Expected shell seam:
- neutral `choice-grid` slot with item affinity `handles-all`;
- normalized flow supplies section id, label, behavior and component;
- any content-layout wrapper stays **inside** the neutral slot so `hidden` remains authoritative on the slot itself.

## First gate

Before implementation, confirm that:
- current handle redraw/selection code depends only on stable content hosts, not the static section identity;
- the existing `activateSection("handles", ...)` bridge remains valid when the section is generated;
- preserving the 9px handle-fieldset content rhythm does not require presentation styles on the neutral slot;
- a fixture omitting only `handles-all` can keep Fronts and Stone independently rendered.

Stop and split discovery if any handle state/pricing behavior must move to make the shell generation work.

No production configuration write.
