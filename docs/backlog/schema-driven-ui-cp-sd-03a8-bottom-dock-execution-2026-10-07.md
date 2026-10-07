# CP-SD-03A8 — persistent bottom dock execution — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- CP-SD-03A7 persistent bottom dock discovery — COMPLETE / PASS.

Discovery result:
- `docs/architecture/schema-driven-ui-cp-sd-03a7-bottom-dock-discovery-result-2026-10-07.md`.

## Goal

Make the frozen `shell.bottomDock` policy executable through the existing `.flow-actions` footer, while adding one live bottom-clearance contract shared by shell scrolling, keyboard navigation and the A6 draggable PiP.

## Allowed implementation

- consume `presentationPolicy.shell.bottomDock.enabled` and ordered `slots`;
- reuse the existing `.flow-actions`, `#configurationValue` and `#nextStepButton`;
- reorder/hide only those existing slot nodes as required by policy;
- make the enabled footer persistent with sticky positioning;
- measure its live block-size instead of inventing a fixed dock height;
- expose live bottom clearance through one root CSS custom property;
- cap keyboard usable viewport bottom against the actual visible dock top;
- cap/re-clamp stacked/compact PiP vertical position against the actual dock top;
- preserve all pricing and stage-navigation behavior.

## Runtime rules

- disabled policy -> no persistent dock projection;
- enabled policy -> only declared slots appear, in policy order;
- estimate content remains owned by `renderCurrentValue()`;
- CTA text/action remain owned by `syncStep()` + existing click handler;
- dock geometry updates when its rendered height changes;
- keyboard target visibility uses the current scroller plus live dock boundary;
- PiP may never overlap the enabled visible dock.

## Expected scroll contract

- side-rail ordinary stages -> `.controls` scroller;
- stacked ordinary stages -> window/document;
- stacked Modules panes -> independent pane scrollers;
- compact -> window/document.

Do not replace dynamic scroll-container discovery with profile conditionals.

## Non-goals

Do not:
- clone/reparent the whole footer outside `.controls`;
- create different dock DOM per profile;
- change pricing or CTA semantics;
- change presentation schema;
- redesign PiP;
- implement a generic floating-chrome manager;
- write production configuration.

## Gates

- source authority: bottom dock consumes policy and stable slot adapters;
- one dock / one estimate / one CTA in DOM;
- side-rail sticky controls-scroller proof;
- stacked document-scroll sticky proof;
- compact document-scroll + safe-area proof;
- keyboard last/first section visibility above dock across effective scrollers;
- stacked Modules pane-scroll regression;
- compact Modules `replace` regression;
- stacked/compact PiP drag and resize cannot overlap dock;
- estimate updates and CTA stage advance unchanged;
- all repository workflows + Netlify preview green.

Stop and split if the same stable footer cannot satisfy the three profile geometries without cloning or shell reparenting.


## Implementation result

The frozen `shell.bottomDock` policy is now executable through the single existing `.flow-actions` footer:

- `estimate` reuses `#configurationValue`;
- `primary-action` reuses `#nextStepButton`;
- the two existing nodes are projected in policy order without cloning;
- disabled/enabled state is reflected by one shell marker;
- live rendered dock height is published as `--bottom-dock-clearance`;
- keyboard viewport calculations cap their usable bottom against the actual visible dock rect;
- stacked/compact PiP drag/resize clamps against the same live dock boundary;
- runtime cache advances v34 -> v35.

### Gate-driven geometry correction

The discovery hypothesis assumed the same sticky positioning could serve every profile.

The first browser run falsified that assumption in compact document scrolling:
- side-rail `.controls` is a real scroll container, so the existing footer can be sticky inside it;
- stacked and compact use document/window scrolling, where a footer at the end of normal flow cannot be persistently visible merely by sharing the same sticky rule.

The final implementation keeps **one DOM/footer/state owner** but aligns positioning with the effective scroll owner:
- side-rail -> `position: sticky` inside `.controls`;
- stacked/compact -> `position: fixed` to the viewport;
- stacked/compact controls reserve the live measured dock clearance;
- no footer clone, shell reparenting or profile-specific DOM was introduced.

The first Mobile test also exposed only a synthetic-test issue: manually dispatched PointerEvents do not establish a real active pointer for `setPointerCapture`. The proof now uses real Playwright pointer input; runtime behavior was not weakened to satisfy the test.

Keyboard proof was refined from the impossible requirement that an arbitrarily tall section fit entirely above the dock to the actual accessibility contract: the **focused keyboard target** must remain inside the dock-aware usable viewport.

Final functional head `7cc304b65b89a36197358a61c5fea3e8b926c87f` passed all eight repository workflows plus Netlify deploy preview #141.

No pricing semantics, CTA behavior, presentation schema, Modules semantics or production configuration changed.

## CP-SD-03 gate

CP-SD-03 is complete / PASS:
- canonical layout profiles own application topology;
- Modules primary/companion projection is executable;
- compact `replace` preserves focus/scroll semantics;
- stacked manual + compact auto PiP share one runtime owner;
- persistent estimate + primary CTA dock is executable;
- pane/window keyboard scrolling respects live bottom clearance;
- PiP and dock coexist without overlap;
- semantic item ownership is unchanged.

## Next

Discovery-only interaction affordance cleanup:
- `docs/backlog/schema-driven-ui-cp-sd-04a0-interaction-affordance-discovery-2026-10-07.md`.
