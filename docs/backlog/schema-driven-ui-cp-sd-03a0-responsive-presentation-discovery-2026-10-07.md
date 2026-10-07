# CP-SD-03A0 — responsive presentation discovery — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- CP-SD-01C frozen view/profile/shell presentation contract;
- CP-SD-02 renderer hierarchy closure — PASS.

Goal:
- compare the frozen presentation policy with the current buyer implementation and split CP-SD-03 into the smallest safe execution slices before changing responsive topology.

No runtime change in A0.

## Audit surfaces

### Modules companion

Inspect:
- `presentationPolicy.stageViews.modules`;
- `flowLayout.moduleViewLayout()`;
- static `data-stage-view-layout="modules"` panes;
- selection/detail state;
- independent pane scroll behavior.

Determine exactly which topology decisions still live in hardcoded JS/DOM instead of the frozen view relation + per-profile projection.

Do not change module-card interaction policy; that belongs to CP-SD-04.

### Layout profiles

Inspect the executable relationship between:
- `side-rail`;
- `stacked`;
- `compact`;
- `layout-profiles.js`;
- CSS/media/container rules;
- runtime profile markers.

Separate application topology from legitimate local component breakpoints.

### PiP

Compare current mobile/stacked scene behavior with:
- policy `scene.pip.availableProfiles`;
- `activationByProfile`;
- existing pin/mini/transparency/resize state.

Identify the smallest policy-execution gap. Preserve transient position/size/transparency outside published schema.

### Persistent bottom dock

Compare current `.flow-actions` behavior with:
- policy `shell.bottomDock.enabled`;
- slots `estimate` and `primary-action`;
- actual configurator scroll ownership and bottom clearance.

Do not implement geometry in discovery.

### Scroll ownership / window leakage

Audit:
- Modules list/detail independent scrollers;
- keyboard section scrolling;
- window-scroll fallback;
- panel/drawer behavior around profile transitions;
- last-content clearance relative to future persistent dock.

## Outputs

Produce:
- current-policy-to-runtime matrix;
- classification of each gap as topology / shell / transient state / local CSS / interaction;
- smallest recommended first implementation slice;
- stop/split gates for later PiP and dock work.

Likely candidates may be:
1. Modules companion projection from presentation policy;
2. profile-driven PiP availability/activation;
3. bottom dock + explicit scroll clearance.

Do not freeze this ordering until the discovery evidence supports it.

## Guardrails

- no semantic hierarchy ownership change;
- no production configuration write;
- no pricing/state/domain migration;
- no CP-SD-04 interaction changes;
- no new presentation schema field unless the frozen contract is demonstrably insufficient.

## Gate

A0 passes when:
- no critical responsive unknown remains;
- policy-vs-runtime gaps are mapped to exact code/DOM/CSS surfaces;
- the first implementation checkpoint is narrow enough to review and browser-test independently.


## Discovery result — PASS

Baseline:
- `main = 8dc7c2d5485f8e8ab03a030ac95b72ecfb2dd961`;
- CP-SD-02 closed;
- no runtime/production write in A0.

### Policy -> runtime matrix

| Contract surface | Frozen policy | Current runtime | Classification / gap |
| --- | --- | --- | --- |
| layout profile names | side-rail / stacked / compact | `layout-profiles.js` resolves exactly these names | executable authority exists |
| profile thresholds | implementation-only 1050 / 700 | centralized in `layout-profiles.js` **and duplicated** by application CSS media queries | application-topology duplication; local container queries remain protected |
| Modules semantic source | one `modules` section | one normalized semantic source | aligned |
| Modules primary/companion relation | `modules-list` primary + `modules-detail` companion-of list | `moduleViewLayout()` hardcodes `detail/list` panes and never reads policy | executable-view-plan gap |
| companion projection | side-rail side-panel; stacked side-panel; compact replace | geometry comes from static DOM + CSS/container/media rules | policy not executable |
| compact PiP | available; auto-after-anchor | current observer/scroll path auto-pins after scene anchor | aligned behavior, but runtime reads compact/mobile predicate rather than policy |
| stacked PiP | available; manual | no activation path; PiP fixed styles and visible controls are scoped to <=700 | clear policy-execution gap |
| PiP transient state | not persisted | position/size/transparency/open state local runtime variables | correct boundary; preserve |
| bottom dock | enabled; estimate + primary-action | `.flow-actions` remains ordinary end-of-flow content | policy not executable |
| side-rail scroll | application content scroller | `.controls` owns overflow at >1050 | explicit current scroller |
| stacked Modules scroll | list/detail independent | each module pane owns `overflow-y:auto` at 701–1050 | aligned current behavior |
| compact/general stage scroll | page/window | keyboard discovers no local scroller and falls back to window | intentional current fallback, but future dock needs explicit clearance |
| local readability queries | not global profile policy | 520/430/300 container queries | legitimate local CSS; keep local |

### Modules companion finding

The presentation contract is validated but not consumed by the buyer's Modules view planner.

Current `moduleViewLayout()`:
- hardcodes stage `modules`;
- requires one semantic section;
- creates `detail` then `list` pane records itself;
- never reads `stageViews.modules.views`;
- never reads relation, role or `projectionByProfile`.

Current DOM:
- pre-authors `data-stage-pane="detail"` and `"list"`;
- has no binding to presentation view IDs `modules-detail` / `modules-list`.

Current CSS geometry:
- base panes are two columns;
- side-rail (>1050) explicitly forces one internal column because the control rail is narrow;
- stacked (701–1050) uses two peer columns with independent scroll;
- compact is one column through the Modules container query.

This is accepted legacy geometry, not an implementation of the frozen projection policy.

Important: the policy's `views` array order is **not** treated as pixel order. The contract freezes primary/companion relation + per-profile mode; physical placement remains renderer/CSS responsibility.

### Named profiles versus CSS

The named profile resolver is already the one JS threshold authority:
- side-rail >1050;
- stacked 701–1050;
- compact <=700.

However application shell topology is still selected by independent CSS media queries using the same numeric thresholds.

This is duplicate application-topology authority and should be retired in CP-SD-03, but **local component container queries must remain local**, including:
- Modules <=520 content fit;
- Cabinet Finishes <=430;
- flow-stage <=300.

Do not convert every local query into schema/profile data.

### PiP finding

Final frozen decision from CP-SD-01C1 is:
- stacked: PiP available, activation manual;
- compact: PiP available, preserve current auto-after-anchor.

Compact implementation matches the decision:
- canonical profile resolves compact;
- anchor crossing makes the mini scene active when pin capability is enabled;
- existing mobile browser gates cover hit testing, selection, transparency, resize and persistence while opening detail.

Stacked is not implemented:
- `isMobileViewport()` means compact only;
- observer and scroll refresh reject stacked;
- fixed PiP geometry/controls are inside `@media (max-width:700px)`;
- no visible control initiates manual stacked PiP.

Implement stacked PiP only in its own later slice; it needs both profile policy execution and an explicit manual affordance.

### Bottom dock + scroll finding

The dock policy is currently descriptive only.

`.flow-actions`:
- is ordinary content at the end of `.controls`;
- scrolls away inside the side-rail `.controls` scroller;
- sits at the end of page flow in stacked/compact;
- is explicitly `position: static` in compact.

Keyboard scroll viewport currently reserves:
- top space for the sticky flow nav;
- only 16px at the bottom.

It does **not** reserve a future persistent dock height.

Therefore persistent dock implementation must include:
- explicit dock geometry/height observation or equivalent stable clearance;
- keyboard viewport bottom reduction;
- last-section visibility proof.

Do not ship sticky/fixed dock first and repair covered content later.

### Scroll ownership

Current explicit scrollers:
- side-rail: `.controls`;
- stacked Modules: each `[data-stage-pane]`.

Elsewhere keyboard section navigation may legitimately use page/window scrolling.

The CP-SD-03 gate should prevent pane navigation from leaking into window scroll, while allowing page scrolling in profiles where the page is intentionally the stage scroller.

### Recommended execution order

#### CP-SD-03A1 — executable Modules view plan/binding (next)

Make the frozen view policy executable **without changing pixels**.

Why first:
- smallest policy/runtime gap;
- creates a single relation/projection authority before CSS changes;
- does not require choosing exact side-panel geometry yet;
- gives later slices stable DOM markers for profile-driven rendering;
- keeps current accepted layout fully intact.

#### Later — application topology/profile execution

Move application-level 1050/700 topology away from duplicate CSS numeric authority toward canonical named-profile markers. Preserve local container queries.

#### Later — Modules visual projection

Use A1 markers to execute side-panel / replace behavior while preserving selection and scroll state.

Compact `replace` can reuse existing module-detail open/close state rather than creating duplicate domain state.

#### Later — PiP policy execution

Preserve compact auto-after-anchor; add stacked manual capability + affordance; keep drag/size/transparency transient.

#### Later — persistent bottom dock + scroll clearance

Make estimate/action persistent only together with explicit bottom clearance in keyboard/focus scrolling.

## A0 gate

PASS.

No schema change is required before implementation.

The first implementation slice can be independently reviewed/tested without changing accepted geometry.
