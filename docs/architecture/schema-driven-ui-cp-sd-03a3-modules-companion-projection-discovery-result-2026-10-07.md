# CP-SD-03A3 — Modules companion visual projection discovery result — 2026-10-07

Status: **COMPLETE / PASS**.

Baseline: `main` at `c4921816c9afd13b89bcb37b96a70ef7fe4a54b7`.

## Executive result

The current side-rail and stacked UI already provide acceptable realizations of the policy's `side-panel` projection. No new drawer, overlay or reparenting layer is needed.

The one real contract/runtime mismatch is compact:
- policy projection = `replace`;
- runtime marker = `replace`;
- visual baseline still shows detail then list vertically.

A4 should make only compact replace visually executable.

## Existing state is sufficient

Inspection and inclusion are distinct:
- `selectedEntityId` = inspected module;
- `visibilityByEntity` = included module.

Opening a detail stores `detailOrigin` and focuses close. Closing clears only inspection, redraws, then restores origin/fallback focus. Escape uses that same close path.

No new domain state is required.

## Projection semantics

### side-rail / side-panel
Preserve the accepted widened controls rail and current detail/list availability.

### stacked / side-panel
Preserve the accepted peer columns and independent pane scrollers.

### compact / replace
- no detail open -> list visible, detail hidden;
- detail open -> detail visible, list hidden;
- both pane nodes remain stable in DOM.

## Transition invariant

Profile switching never clears inspection.

When a profile transition newly hides the pane containing focus, move focus to the newly visible counterpart. Otherwise preserve focus.

Pane scroll positions must survive because panes are never reparented/recreated.

## PiP boundary

Pinned compact PiP remains pinned when a scene hotspot opens module detail. A4 must not change PiP activation or geometry.

## Next

`CP-SD-03A4 — compact Modules replace projection execution`.

No production configuration write.
