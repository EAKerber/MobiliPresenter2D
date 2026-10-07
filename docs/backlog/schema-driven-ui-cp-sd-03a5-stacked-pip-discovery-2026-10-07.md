# CP-SD-03A5 — stacked PiP discovery — 2026-10-07

Status: **READY / NEXT — DISCOVERY ONLY**.

Parent:
- CP-SD-03A4 compact Modules `replace` projection — COMPLETE / PASS.

Authority:
- `docs/backlog/schema-driven-ui-consolidation-roadmap-2026-10-06.md`;
- `docs/architecture/schema-driven-ui-cp-sd-03a0-responsive-presentation-discovery-result-2026-10-07.md`;
- `app/data/presentation-policy-defaults.js`;
- live `main` at execution time.

## Goal

Specify the smallest executable boundary for the policy-owned **stacked PiP** behavior before changing runtime or CSS.

The frozen presentation policy already says:
- PiP is available in `stacked` and `compact`;
- `stacked` activation is `manual`;
- `compact` activation is `auto-after-anchor`.

The A0 audit proved only compact is currently executable. Stacked has no visible manual-start affordance and the fixed-PiP CSS is still compact-scoped.

This checkpoint is discovery only. Do not implement the PiP yet.

## Questions to resolve

1. **Manual activation affordance**
   - identify whether an existing scene/PiP control can become the stacked entry point;
   - avoid inventing a second scene-control model if the current one can express the policy.

2. **Single PiP runtime owner**
   - determine which existing state/DOM path should own open/closed, pinned, transparent, position and size behavior across both profiles;
   - compact and stacked must not fork into independent PiP implementations.

3. **Profile semantics**
   - stacked -> manual availability;
   - compact -> existing auto-after-anchor behavior;
   - side-rail -> unavailable unless the policy changes;
   - profile transitions must define whether an already-open PiP stays open, closes, or projects back into the normal scene shell.

4. **Geometry / CSS seam**
   - identify the minimal selector/runtime change needed to make fixed PiP legal in `stacked`;
   - preserve accepted side-rail, stacked and compact workspace geometry outside the PiP state;
   - keep local component/container queries local.

5. **Focus and keyboard**
   - define focus entry/return for manual open/close;
   - ensure no hidden control retains focus after profile transitions;
   - preserve current Keyboard browser determinism.

6. **Interaction with Modules and compact PiP**
   - opening Modules detail from PiP must retain the already-proven A4 pane projection behavior;
   - no change to module inspection vs inclusion semantics.

7. **Boundary with the bottom dock**
   - stacked PiP must not depend on the future persistent estimate/CTA dock;
   - if the implementation requires dock geometry or clearance, stop and split.

## Required discovery output

Produce one architecture result that records:
- current runtime/CSS/state owners;
- the exact policy -> runtime authority path;
- proposed manual affordance;
- transition matrix for side-rail / stacked / compact;
- focus/keyboard contract;
- minimal implementation files;
- browser proofs for the execution checkpoint;
- explicit non-goals.

The discovery result must name the next execution checkpoint. Do not pre-expand into the bottom-dock slice.

## Stop / split rules

Stop if the smallest coherent implementation requires:
- presentation schema changes;
- a second PiP state machine;
- a new generic overlay framework;
- bottom-dock implementation;
- module-card semantic changes;
- production configuration writes.

No production configuration write.
