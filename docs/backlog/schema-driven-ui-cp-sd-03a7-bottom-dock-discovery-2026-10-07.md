# CP-SD-03A7 — persistent bottom dock discovery — 2026-10-07

Status: **READY / NEXT — DISCOVERY ONLY**.

Parent:
- CP-SD-03A6 stacked PiP execution — COMPLETE / PASS.

Authority:
- `docs/backlog/schema-driven-ui-consolidation-roadmap-2026-10-06.md`;
- `docs/architecture/schema-driven-ui-cp-sd-03a0-responsive-presentation-discovery-result-2026-10-07.md`;
- `app/data/presentation-policy-defaults.js`;
- live `main` at execution time.

## Goal

Specify the smallest executable boundary for the frozen persistent bottom dock before changing layout or keyboard/focus scrolling.

The policy already declares:

- `shell.bottomDock.enabled = true`;
- slots = `["estimate", "primary-action"]`.

The A0 audit proved the policy is not executable yet:
- `.flow-actions` remains ordinary scroll-flow content;
- a persistent dock would cover content unless viewport/focus calculations gain explicit bottom clearance;
- keyboard section scrolling currently discovers different scroll owners by profile and has no dock-aware clearance.

This checkpoint is discovery only. Do not make the dock sticky/fixed yet.

## Questions to resolve

1. **Existing shell adapter**
   - identify the exact current DOM owner of estimate + primary CTA;
   - determine whether `.flow-actions` can remain the stable dock adapter without cloning or reparenting.

2. **Policy authority**
   - determine how `shell.bottomDock.enabled` and its ordered slots become executable;
   - do not invent per-breakpoint dock policy unless the frozen contract requires it.

3. **Dock geometry**
   - identify whether one sticky shell region can work across side-rail, stacked and compact;
   - define safe-area handling and maximum occupied height;
   - keep accepted stage/view geometry unchanged outside required clearance.

4. **Content clearance**
   - identify every scroll owner that can place focused/target content behind the dock:
     - side-rail controls scroller;
     - stacked Modules pane scrollers;
     - window/document scrolling used by stacked/compact stage navigation;
     - any other explicit keyboard section scroller found by audit.
   - define one way to expose the live dock clearance without duplicating pixel constants.

5. **Keyboard/focus contract**
   - inspect `keyboard-shortcuts.js` scroll-container discovery and section focus paths;
   - define how keyboard navigation guarantees the target remains above the dock;
   - preserve deterministic section/item navigation.

6. **Estimate / CTA semantics**
   - preserve existing pricing state and CTA behavior;
   - distinguish shell presentation from pricing/domain ownership;
   - no duplicate estimate calculation or alternate CTA state.

7. **PiP interaction**
   - stacked/compact PiP from A6 and the bottom dock must coexist;
   - neither should derive geometry from the other unless a shared viewport-clearance variable is genuinely required;
   - avoid a coupled “floating chrome framework”.

## Required discovery output

Produce one architecture result with:

- current DOM/runtime/CSS owners for estimate and CTA;
- all effective scroll containers by layout profile;
- keyboard/focus paths that can be obscured;
- policy -> shell execution seam;
- proposed clearance authority;
- profile-by-profile geometry expectations;
- minimal implementation files;
- browser/source proofs for the execution checkpoint;
- explicit non-goals and stop/split triggers.

The discovery result must name the next execution checkpoint.

## Stop / split rules

Stop and split rather than expand if the smallest coherent solution requires:

- pricing-domain changes;
- CTA semantics changes;
- presentation schema changes;
- a new generic overlay/floating-shell framework;
- PiP redesign;
- Modules presentation redesign;
- production configuration writes.

No production configuration write.
