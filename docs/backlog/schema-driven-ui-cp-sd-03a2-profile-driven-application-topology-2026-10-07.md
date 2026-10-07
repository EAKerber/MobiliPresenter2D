# CP-SD-03A2 — profile-driven application topology — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- CP-SD-03A0 responsive presentation discovery — PASS;
- CP-SD-03A1 executable Modules view plan/binding — PASS.

Goal:
- make the canonical layout profile marker the sole application-level responsive topology authority for the existing side-rail / stacked / compact geometry, without changing accepted pixels or absorbing PiP/dock/component-fit behavior into this slice.

## Why this slice exists

`layout-profiles.js` already owns the application breakpoints:
- side-rail: > 1050 px;
- stacked: 701–1050 px;
- compact: <= 700 px.

Runtime exposes the resolved name on:

`document.documentElement.dataset.layoutProfile`.

However `styles.css` still repeats the same numeric thresholds in application-topology media queries. This means JS and CSS independently decide which workspace topology is active.

A2 should remove that duplicated application authority by expressing profile-owned topology through selectors such as:

`html[data-layout-profile="side-rail"] ...`
`html[data-layout-profile="stacked"] ...`
`html[data-layout-profile="compact"] ...`

The profile resolver remains the only numeric threshold owner.

## In scope

Migrate only rules whose meaning is the application profile itself.

### side-rail

Current >1050 behavior to preserve:
- two-column workspace: scene + controls rail;
- widened controls rail when module detail is open;
- viewer-card viewport-derived width;
- controls owns vertical overflow / stable scrollbar;
- Modules panes are one internal column in the narrow rail;
- Services sections are one internal column.

### stacked

Current 701–1050 behavior to preserve:
- workspace is one outer column;
- controls becomes a two-column grid;
- flow nav, actions and stage roots span both control columns;
- Acabamentos group grid uses two columns;
- viewer card remains sticky with current viewport-derived width;
- Modules panes are two peer columns;
- Modules panes retain independent vertical scrolling, overscroll containment and stable scrollbar gutter.

### compact

Current <=700 application topology to preserve:
- workspace and controls collapse to one column;
- Acabamentos is one column;
- existing topbar/workspace compact spacing;
- compact viewer baseline remains non-sticky before PiP activation;
- flow navigation retains its compact application placement;
- existing compact content clearance variables continue to work.

## Explicitly out of scope

### PiP

Do not migrate or generalize:
- `body.is-mobile-scene-pinned ...`;
- fixed PiP geometry;
- PiP controls/resize handle;
- compact auto-after-anchor behavior;
- future stacked manual PiP.

PiP policy execution gets its own later slice because stacked PiP needs an affordance and state transition, not merely selectors.

### Bottom dock

Do not make `.flow-actions` persistent in A2.

The future dock must be implemented together with bottom scroll/focus clearance.

### Local component fit rules

Keep local/localized rules independent from the global profile:
- `@container modules-stage (max-width: 520px)`;
- `@container cabinet-finishes (max-width: 430px)`;
- `@container flow-stage (max-width: 300px)`;
- `@container flow-steps (max-width: 500px)`;
- the <=360 module-detail header fit rule unless a separate component-level refactor proves otherwise.

These are content-fit rules, not application topology.

### Domain / semantic behavior

No changes to:
- flow hierarchy;
- presentation policy schema;
- Modules view relation/projection records;
- selection/state/pricing/scene;
- module-card interactions;
- production configuration.

## Implementation guidance

Prefer additive profile selectors first, then remove only the application-topology declarations made redundant by them.

Do not mechanically translate every media query.

If a media block mixes application topology with PiP/local component behavior:
- extract only the profile-owned declarations;
- leave the remaining media query in place for the deferred concern.

A2 should not create new numeric breakpoint copies.

## Proof

### Source authority

- no application-topology CSS selector depends on 1050/700 media thresholds after migration;
- profile selectors consume `data-layout-profile`;
- `layout-profiles.js` remains the only owner of 1050/700 application thresholds;
- protected local container queries remain unchanged;
- compact PiP fixed-state media rules may remain only where they are specifically PiP/local behavior, not generic workspace topology.

### Browser geometry

At the existing test widths:
- 1366 resolves side-rail and preserves accepted outer workspace/control geometry;
- 1050 resolves stacked and preserves:
  - scene above controls;
  - two control columns;
  - two Modules panes;
  - independent pane scrollers;
- 390 resolves compact and preserves:
  - single control column;
  - vertical Modules baseline;
  - no horizontal overflow.

Geometry assertions should compare behavior/relationships rather than brittle exact pixels unless exact pixels encode an existing contract.

### Transition behavior

Resize through:
- 1366 -> 1050 -> 390 -> 1366.

Expected:
- root profile marker changes deterministically;
- no semantic selection is lost;
- A1 Modules projection markers keep matching policy;
- no duplicate/hidden stage roots appear;
- pane scroll ownership remains correct for the active profile.

## Gate

- App build purity;
- Current variant fidelity;
- Current asset gates;
- Flow layout browser;
- Keyboard browser;
- Mobile browser;
- Stone browser;
- Summary/Pricing browser;
- Netlify preview.

## Stop / split rule

Stop and split if preserving geometry requires:
- implementing stacked PiP;
- making the bottom dock persistent;
- changing Modules companion visible behavior;
- changing interaction/state;
- adding a presentation schema field;
- replacing local component container queries.

No production configuration write.


## Implementation candidate

The candidate keeps the A2 boundary narrow:
- the canonical `layout-profiles.js` is loaded exactly once, synchronously before public CSS;
- the initial root `data-layout-profile` marker is resolved from `profileForWidth(window.innerWidth)` before the stylesheet, avoiding a stacked/compact first-paint flash without copying thresholds;
- the late duplicate layout-profile script load is removed;
- application-level side-rail / stacked / compact workspace, control-grid, stage-grid, viewer baseline and Modules pane topology now use root profile selectors;
- all `@media` ownership of 1050 / 1051 / 701–1050 application thresholds is removed;
- compact 700px media blocks remain only for local component readability and compact PiP-specific behavior;
- protected container queries are unchanged;
- existing compact PiP activation/fixed geometry and bottom-dock behavior are unchanged;
- A1 view relation/projection markers remain policy-driven;
- runtime cache revision advances v31 -> v32.

Additional proof:
- source gates require the profile resolver to load exactly once and before CSS;
- source gates reject the old 1050/1051/701–1050 application media queries;
- source gates preserve all named local container-fit queries;
- browser profile round trip now explicitly covers 1366 -> 1050 -> 1366 and 1050 -> 390 -> 1366 while preserving module selection and A1 projection markers.

No production configuration write.

Gate result:
- App build purity — PASS;
- Current variant fidelity — PASS;
- Current asset gates — PASS;
- Flow layout browser — PASS;
- Keyboard browser — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Netlify deploy preview #133 — PASS.

Functional head: `538860e1b0a3f6905c48ffbe950284746ff28c72`.

Decision: A2 passes. The canonical layout-profile marker is now the sole owner of application-level side-rail / stacked / compact topology decisions. PiP fixed-state behavior, persistent dock behavior and local component-fit queries remain deliberately separate. No production configuration write.
