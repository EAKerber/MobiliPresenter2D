# CP-SD-03A3 — Modules companion visual projection discovery — 2026-10-07

Status: **READY / NEXT — discovery only**.

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
