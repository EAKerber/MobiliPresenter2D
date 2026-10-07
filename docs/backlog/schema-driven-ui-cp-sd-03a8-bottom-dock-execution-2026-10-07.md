# CP-SD-03A8 — persistent bottom dock execution — 2026-10-07

Status: **READY / NEXT**.

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
