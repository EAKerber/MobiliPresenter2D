# CP-SD-03A5 — stacked PiP discovery result — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- `docs/backlog/schema-driven-ui-cp-sd-03a5-stacked-pip-discovery-2026-10-07.md`.

## Conclusion

No new PiP component, schema field, overlay framework or persistent state model is required.

The existing buyer runtime already has one reusable scene/PiP DOM and enough transient state to express stacked manual PiP. The executable gap is narrower:

1. runtime availability/activation is still hard-gated to `compact`;
2. fixed-PiP CSS and the manual launcher are still scoped to the historical <=700 breakpoint;
3. the existing manual launcher only re-enables pinning; it does not explicitly open the PiP in a manual-activation profile.

The next slice can therefore remain small and policy-driven.

## Frozen policy authority

`app/data/presentation-policy-defaults.js` already declares:

- `scene.pip.availableProfiles = ["stacked", "compact"]`;
- `activationByProfile.stacked = "manual"`;
- `activationByProfile.compact = "auto-after-anchor"`.

`app/core/presentation-contract.js` already validates:
- PiP profile names;
- availability/activation consistency;
- supported activation values;
- an activation entry for every available profile.

No presentation-schema change is justified.

## Current runtime owners

### State

`app/app.js` already separates the concerns needed by A6:

- `mobileScenePinEnabled` — whether the user permits/pins the mini-scene;
- `mobileSceneIsMini` — whether the viewer is currently projected as PiP;
- `mobileSceneTransparent`;
- `mobilePipSizeIndex`;
- `mobilePipPosition`;
- `mobilePipWidth`.

Despite historical `mobile*` naming, these values are transient runtime presentation state and can be reused by stacked PiP. Renaming them is not required for the execution slice.

### DOM

One stable DOM already exists and should remain the only PiP renderer:

- `#viewerCard`;
- `.viewer-pip-controls`;
- `#mobileScenePin`;
- `#mobileSceneTransparency`;
- `#mobileSceneResize`;
- `#mobileSceneResizeHandle`;
- `#mobileSceneRepin`.

No cloning/reparenting is required.

### Runtime functions

The current gap is concentrated in:
- `isMobileViewport()` = compact only;
- `syncPinnedSceneUi()` -> `shouldDock` requires compact;
- `refreshMobileSceneDock()` -> anchor auto-activation requires compact;
- the IntersectionObserver -> same compact gate;
- `#mobileSceneRepin` click -> only calls `setMobileScenePinEnabled(true)`.

This is an authority leak: the policy already owns availability/activation, but runtime still reconstructs compact-only behavior.

## CSS / presentation seam

`app/styles.css` already uses canonical `data-layout-profile` selectors for workspace topology.

However PiP presentation still lives inside `@media (max-width: 700px)`:
- fixed `.viewer-card`;
- PiP controls;
- resize handle;
- hotspot pointer behavior;
- transparency behavior.

The manual launcher `.flow-nav__scene-pin` is also hidden globally and only made visible in the compact responsive block.

`app/index.html` contains one additional <=700 inline transparency override for pinned PiP.

A6 should migrate only these PiP-specific rules to profile selectors for the policy-authorized profiles (`stacked`, `compact`). Numeric thresholds must not become a second PiP authority.

## Manual activation affordance

Reuse `#mobileSceneRepin` as the stacked manual launcher.

Why:
- it already lives in the stage navigation shell;
- it already communicates “Fixar cena”;
- it already participates in the existing pin/unpin flow;
- adding a second launcher would duplicate one semantic action.

Required behavioral refinement:
- in stacked/manual while PiP is closed, launcher is visible;
- activating it sets pin enabled and opens the existing PiP;
- once open, launcher becomes hidden and focus moves to the visible PiP release control;
- closing from PiP restores focus to the launcher when stacked remains active.

Compact keeps its existing auto-after-anchor semantics.

## Transition matrix

A6 should implement and prove this matrix:

| From | To | Expected |
| --- | --- | --- |
| side-rail | stacked | PiP closed; manual launcher available |
| stacked closed | compact | compact auto-after-anchor resolves from current anchor position |
| stacked open | compact | preserve open PiP across supported-profile transition; compact auto behavior governs later scroll changes |
| compact closed | stacked | remain closed; manual launcher available |
| compact open | stacked | preserve open PiP; no new activation event |
| stacked/compact | side-rail | close PiP because profile is unavailable |
| side-rail | compact | existing auto-after-anchor behavior |

Manual means “do not auto-open merely because stacked is active”; it does not require destroying an already-open PiP when moving from another supported profile.

## Focus / keyboard contract

- compact auto-open must not steal focus;
- stacked manual open: focus moves from the launcher to `#mobileScenePin`;
- stacked close through `#mobileScenePin`: focus returns to `#mobileSceneRepin`;
- transition to unavailable side-rail must not leave focus inside hidden PiP controls; use current stage navigation as safe fallback;
- transparency/resize controls retain their existing semantics;
- module hotspot -> detail continues using the A4 focus behavior.

## Minimal execution files

Expected:
- `app/app.js`;
- `app/styles.css`;
- `app/index.html` only for the existing inline compact-only transparency selector;
- browser/source tests needed to pin the authority and transitions.

No expected changes:
- configuration schema;
- normalized flow hierarchy;
- module state/pricing;
- scene data;
- presentation policy defaults;
- persistent admin configuration.

## Execution proof

A6 must prove at minimum:

### Stacked / 1050
- policy says available + manual;
- scrolling past the viewer does **not** auto-open PiP;
- manual launcher is visible while closed;
- launcher opens the existing fixed PiP;
- same transparency/resize/hotspot controls work;
- focus enters the visible PiP control;
- close returns focus to the launcher.

### Compact / 390
- existing auto-after-anchor still works;
- unpin/repin behavior remains;
- A4 Modules replace behavior from a pinned hotspot remains intact.

### Profile transitions
- stacked open -> compact preserves open PiP;
- compact open -> stacked preserves open PiP;
- any supported profile -> side-rail closes PiP and repairs focus if necessary;
- side-rail -> stacked does not auto-open.

### Regression
- one PiP DOM/state owner;
- no numeric breakpoint becomes runtime policy;
- all existing repository workflows + Netlify preview green.

## Stop / split

Split rather than expand if execution requires:
- a second PiP state machine;
- new presentation schema;
- bottom-dock geometry;
- module semantics changes;
- a new generic overlay framework;
- production configuration writes.

## Next

Execute the seam in:
- `docs/backlog/schema-driven-ui-cp-sd-03a6-stacked-pip-execution-2026-10-07.md`.
