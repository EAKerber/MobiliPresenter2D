# CP-SD-03A6 — stacked PiP execution — 2026-10-07

Status: **READY / NEXT**.

Parent:
- CP-SD-03A5 stacked PiP discovery — COMPLETE / PASS.

Discovery result:
- `docs/architecture/schema-driven-ui-cp-sd-03a5-stacked-pip-discovery-result-2026-10-07.md`.

## Goal

Make the existing policy-owned stacked PiP executable with the current single viewer/PiP DOM and transient state, while preserving compact auto-after-anchor behavior and side-rail unavailability.

## Allowed implementation

- consume `presentationPolicy.scene.pip.availableProfiles` and `activationByProfile` at runtime;
- keep one PiP visibility/state synchronizer;
- reuse `#mobileSceneRepin` as the stacked manual launcher;
- reuse the existing viewer, PiP controls, transparency, resize and hotspot paths;
- migrate PiP CSS from numeric <=700 ownership to canonical profile selectors for `stacked` + `compact`;
- preserve current state variable semantics even if historical identifiers still say `mobile`;
- add only the focus repair required by manual open/close and profile unavailability.

## Runtime rules

- unavailable profile -> PiP closed;
- stacked/manual -> no anchor-driven auto-open;
- compact/auto-after-anchor -> existing anchor behavior;
- supported-profile transition with PiP already open may preserve it;
- closed stacked always requires explicit launcher activation;
- side-rail -> stacked starts closed;
- stacked manual open focuses the visible release control;
- stacked close returns focus to the launcher;
- compact auto-open never steals focus.

## Non-goals

Do not:
- rename all historical `mobile*` symbols;
- change PiP policy/schema;
- add a second viewer/PiP tree;
- implement bottom dock;
- alter Modules inspection/inclusion semantics;
- write production configuration.

## Gates

- source/unit authority checks;
- stacked 1050 manual-open/close/focus proof;
- no stacked auto-open after anchor;
- compact 390 auto-after-anchor regression;
- stacked <-> compact open-state transition proof;
- transition to side-rail closes PiP with safe focus;
- transparency, resize and scene hotspot behavior remain functional;
- A4 compact Modules replace from pinned scene remains green;
- all repository workflows + Netlify preview green.

Stop and split if the implementation crosses a non-goal above.
