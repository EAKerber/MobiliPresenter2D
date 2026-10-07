# CP-SD-03A0 — responsive presentation discovery result — 2026-10-07

Status: **COMPLETE / PASS**.

Baseline:
- `main = 8dc7c2d5485f8e8ab03a030ac95b72ecfb2dd961`.

No runtime or production configuration change.

## Executive finding

The responsive vocabulary is frozen and valid, but execution is split between:
- presentation policy;
- canonical JS profile resolver;
- legacy CSS/media topology;
- Modules-specific hardcoded view planning;
- compact-only PiP runtime;
- ordinary-flow action footer;
- dynamic scroll-container discovery.

The safest next step is **not** a visual rewrite.

First make the Modules view relation/projection an executable plan and bind the existing panes to policy view IDs while preserving current geometry.

## Current authority map

### Already correct

- profile names + thresholds: `layout-profiles.js`;
- normalized semantic Modules source;
- compact PiP auto-after-anchor behavior;
- PiP transient position/size/transparency/open state stays runtime-only;
- stacked Modules independent pane scrolling;
- local component container queries remain local CSS.

### Frozen but not executable

- Modules primary/companion relation;
- per-profile companion projection;
- stacked manual PiP;
- persistent bottom dock.

### Duplicated

Application-level 1050/700 topology still exists as CSS media-query decisions while the canonical profile resolver independently owns those thresholds.

Do not remove local content container queries.

## Modules companion

Policy:
- `modules-list` primary;
- `modules-detail` companion of `modules-list`;
- detail projection:
  - side-rail -> side-panel;
  - stacked -> side-panel;
  - compact -> replace.

Runtime:
- `moduleViewLayout()` hardcodes detail/list records;
- static pane DOM is keyed by `data-stage-pane=detail/list`;
- no runtime view-id/relation/projection binding exists.

The accepted current geometry is still controlled by CSS and must remain unchanged in A1.

## PiP

Compact:
- policy and runtime match.

Stacked:
- policy says available/manual;
- runtime has no path;
- CSS fixed-PiP presentation is scoped to <=700;
- visible start affordance for manual stacked activation does not exist.

This needs a dedicated later UX/runtime slice.

## Dock / scroll

Policy says persistent estimate + primary action.

Runtime footer is not persistent.

A future persistent dock will cover content unless keyboard/focus viewport calculations gain explicit bottom clearance. Implement these together.

## First slice

**CP-SD-03A1 — executable Modules view plan/binding**, no geometry change.

Later geometry and profile execution consume A1 output rather than re-reading CSS assumptions.

## Guardrail

Do not interpret policy array order as pixel order.

The view relation defines primary/companion semantics. Renderer/CSS owns physical placement for the selected projection mode.
