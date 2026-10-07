# CP-SD-03A3 — Modules companion visual projection discovery — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- CP-SD-03A0 responsive presentation discovery — PASS;
- CP-SD-03A1 executable Modules policy-view binding — PASS;
- CP-SD-03A2 profile-driven application topology — PASS.

Goal:
- define the smallest safe runtime/visual semantics for executing the already-bound Modules companion projection before changing pane visibility or focus behavior.

No runtime or production configuration change in A3.

## Known contract

The presentation policy currently declares:
- `modules-list`: primary view;
- `modules-detail`: companion of `modules-list`;
- detail projection:
  - side-rail -> `side-panel`;
  - stacked -> `side-panel`;
  - compact -> `replace`.

A1 already exposes these records and projection markers on the stable panes.

A2 already makes the root layout profile the application-topology authority.

A3 must determine what those projection names mean **visibly and interactively** in the current buyer.

## Discovery questions

### side-panel — side-rail

Current accepted behavior:
- Modules detail and list live in one narrow controls rail;
- both are vertically available;
- opening a detail must not destroy list state/selection.

Determine:
- whether the current vertical detail+list composition already satisfies the intended `side-panel` semantics for the side-rail profile;
- whether a lateral/drawer visual treatment is actually required by the product requirement or should be deferred;
- whether any hide/show action would improve or regress accepted geometry.

Do not assume “side-panel” means a new overlay merely from the name.

### side-panel — stacked

Current accepted behavior:
- detail/list are peer columns;
- each pane has independent vertical scrolling;
- scroll positions survive profile changes.

Determine:
- whether this already satisfies the intended `side-panel` projection;
- what invariants must be frozen before any visual refinement.

### replace — compact

Current baseline still renders both panes vertically even though the executable policy marker says `replace`.

Define:
- list visibility when no module detail is open;
- detail visibility when a module is inspected/selected;
- how the user returns from detail to list;
- focus target after open/close;
- preservation of the originating list item and list scroll position;
- interaction with scene-origin detail opening;
- whether module **selection** and detail **inspection** must remain separable pending CP-SD-04;
- behavior when the selected entity becomes hidden/removed;
- behavior across compact -> stacked/side-rail -> compact profile transitions.

Prefer one explicit UI state over DOM relocation/reparenting.

### Keyboard / scrolling

Audit:
- current `focusDetailClose()`, `closeModuleDetail()`, stored `detailOrigin`;
- keyboard section navigation when one pane is intentionally hidden;
- scroll-container selection and whether hidden panes can accidentally remain targets;
- browser back/tab order expectations if relevant.

### PiP boundary

Compact auto-PiP exists independently.

A3 must establish whether compact replace changes any PiP trigger/anchor assumptions.

Do not implement stacked PiP here.

## Candidate implementation shape to evaluate

Preferred if evidence supports it:
- keep both stable pane adapters permanently in DOM;
- derive visible pane state from current profile projection + detail-open state;
- use `hidden` / an explicit projection-state marker rather than reparenting;
- preserve pane scroll positions;
- keep A1 policy view ids/relations/projection markers authoritative;
- preserve side-rail/stacked visible behavior unless discovery proves a change is required;
- compact `replace` shows primary list when no detail is open and detail companion when detail is open;
- closing detail restores list visibility and focus to the stored origin/fallback.

Do not commit to this if existing focus/selection semantics contradict it.

## Proof required from A3

Produce:
- current-state interaction trace for module open/close from list and scene;
- classification of side-rail and stacked `side-panel` as already-satisfied vs needing later visible refinement;
- explicit compact `replace` state machine;
- focus/scroll preservation rules;
- PiP interaction boundary;
- smallest A3 implementation successor, with tests and stop rules.

## Stop / split rule

Split implementation if discovery shows compact replace requires:
- changing selection semantics or module-card toggle semantics;
- a new drawer/overlay component;
- stacked PiP;
- persistent bottom dock;
- schema/presentation-contract changes.

Those concerns belong to CP-SD-04 or later CP-SD-03 slices.

No production configuration write.


## Discovery result — PASS

Baseline:
- `main` = `c4921816c9afd13b89bcb37b96a70ef7fe4a54b7`;
- A1 policy view adapters + projection markers are executable;
- A2 root layout profile is canonical.

### Inspection and inclusion are already separate

`state.selectedEntityId` owns **detail inspection**.

`state.visibilityByEntity` owns whether a module is included in the composition.

Therefore compact `replace` does not require changing selection/inclusion semantics.

A module may remain inspected while excluded; the detail's inclusion control can re-enable it. Do not auto-close detail merely because visibility becomes false.

### Existing open / close focus contract

Opening from list or scene:
- stores `detailOrigin` as the active element with a source-specific fallback;
- sets `selectedEntityId`;
- renders the detail;
- focuses the detail close control.

Detail navigation:
- keeps the companion open;
- updates origin fallback to the newly inspected module's list control.

Closing:
- captures `detailOrigin`;
- clears only `selectedEntityId`;
- synchronously redraws through `syncLayerVisibility()`;
- restores focus on the next animation frame to the original connected element, the module's list control, or the Modules heading.

Escape already dispatches through the visible close control when Modules is active.

This is sufficient for compact replace if pane visibility is synchronized before focus restoration.

### Current side-panel projections are already satisfied

#### side-rail

Accepted current behavior:
- one controls rail;
- opening detail widens the rail;
- detail and list remain available in a single vertical presentation;
- no pane reparenting;
- list/selection state remains intact.

No new drawer/overlay is justified by the current requirement. Treat current visual behavior as a valid `side-panel` projection for this checkpoint family.

#### stacked

Accepted current behavior:
- detail and list are peer columns;
- each pane owns its vertical scroller;
- ArrowUp/ArrowDown scroll the pane containing focus;
- scroll ownership is independent from window scroll.

This already satisfies the intended `side-panel` projection. Preserve it.

### Compact replace state machine

When profile projection for the companion is `replace`:

| detail inspection | primary list | companion detail |
| --- | --- | --- |
| closed (`selectedEntityId == null`) | visible | hidden |
| open (`selectedEntityId != null`) | hidden | visible |

The stable pane elements must remain in the DOM. Do not reparent or recreate them.

When projection is not `replace`:
- both panes remain visible exactly as today.

### Profile transitions

Profile changes already update policy projection markers without clearing `selectedEntityId`.

Required behavior:
- side-panel -> compact replace with detail open: detail stays visible, list hides;
- side-panel -> compact replace with detail closed: list stays visible, detail hides;
- compact -> stacked/side-rail: both panes become visible;
- pane `scrollTop` values survive all transitions.

### Focus hazard and rule

One new hazard exists:

If profile changes to compact while detail is open and focus is inside the list pane, hiding the list would leave the active element inside a hidden subtree.

Rule:
- after applying replace visibility, if the newly hidden pane contains `document.activeElement`, focus the visible counterpart:
  - detail opened -> detail close control;
  - detail closed -> stored/fallback list origin or Modules heading.

Do not steal focus merely because the profile changed when the active element remains visible.

### PiP boundary

Compact PiP is independent and already correct:
- opening detail from a pinned scene preserves `is-mobile-scene-pinned`;
- the scene control continues to own its own focus/hit-testing;
- detail navigation does not unpin the PiP.

A4 must not alter PiP activation, geometry, transparency or resize behavior.

## Decision

Proceed to A4 as a narrow compact replace execution:
- keep stable panes;
- compute visibility from A1 policy projection + detail-open state;
- use `hidden`/explicit projection state, no reparenting;
- preserve side-rail/stacked visuals;
- preserve scrollTop;
- repair focus only if a profile transition would hide the active pane;
- retain current detail open/close, Escape, selection/inclusion and PiP behavior.

No production configuration write.
