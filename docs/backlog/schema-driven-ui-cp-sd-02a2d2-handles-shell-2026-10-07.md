# CP-SD-02A2d2 — generated Handles section shell — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- `docs/architecture/schema-driven-ui-cp-sd-02a2d0-finishes-family-discovery-result-2026-10-07.md`;
- CP-SD-02A2d1 Fronts shell + absence proof.

Goal:
- remove the remaining static semantic ownership of the `handles` / `choice-grid` section without changing handle-card rendering, selection state, pricing or keyboard behavior.

## Initial boundary

Preserve:
- `#handleHelp`;
- `#handleOptions` and current handle-card renderer;
- global `handleId` state semantics;
- active-section restoration after handle redraw;
- pricing/rateio behavior;
- current responsive readability and card geometry.

Expected shell seam:
- neutral `choice-grid` slot with item affinity `handles-all`;
- normalized flow supplies section id, label, behavior and component;
- any content-layout wrapper stays **inside** the neutral slot so `hidden` remains authoritative on the slot itself.

## First gate

Before implementation, confirm that:
- current handle redraw/selection code depends only on stable content hosts, not the static section identity;
- the existing `activateSection("handles", ...)` bridge remains valid when the section is generated;
- preserving the 9px handle-fieldset content rhythm does not require presentation styles on the neutral slot;
- a fixture omitting only `handles-all` can keep Fronts and Stone independently rendered.

Stop and split discovery if any handle state/pricing behavior must move to make the shell generation work.

No production configuration write.


## A2d2.0 discovery result — PASS

Observed on `main` at `d362ab34d2750524e89bf07d8f67bb27c35f6ce6`:

- `renderHandleControlsFromData()` reads/writes only `#handleOptions`, `#handleHelp`, catalog handles, `handleId` state and pricing data;
- the click bridge calls `CASA_KEYBOARD_SHORTCUTS.activateSection("handles", handleIndex, false)`, so semantic reactivation is keyed by section id rather than a pre-authored DOM wrapper;
- keyboard discovery resolves the modeled `handles` section against the runtime-rendered semantic section and item ownership; this remains valid for a generated shell;
- `.handle-fieldset` already provides an internal grid with 9px rhythm and can move to the inner item adapter, leaving the neutral slot presentation-free so `hidden` remains authoritative;
- `#handleOptions` card geometry and responsive rules are independent from static section identity.

Decision: proceed with A2d2.1 without changing handle state, pricing, catalog, scene, masks or keyboard algorithms.

A2d2.1 exact boundary:
- outer neutral slot: `data-flow-section-slot`, component `choice-grid`, item affinity `handles-all`, `hidden`;
- inner bounded adapter: `.handle-fieldset[data-configurable-item="handles-all"][data-flow-item-id="handles-all"]`;
- preserve `#handleHelp` and `#handleOptions`;
- normalized flow owns section id, heading, behavior and component;
- add positive source/Flow-layout proof only; absence fixture remains A2d2.2.


## A2d2.1 implementation candidate

Applied only the shell seam:
- static Handles section id/heading/behavior/component removed from HTML;
- outer neutral slot carries `choice-grid` + `handles-all` affinity and remains presentation-free/hidden until claimed;
- inner `.handle-fieldset[data-flow-item-id="handles-all"]` preserves the 9px content rhythm, `#handleHelp` and `#handleOptions`;
- normalized flow is expected to materialize the semantic Handles shell;
- source and Flow-layout positive proof added;
- obsolete `.finish-section.handle-fieldset` shell-specific gap rule removed because the rhythm now belongs to the inner adapter;
- shared runtime cache revision advanced from v20 to v21.

No changes to `app.js`, handle catalog, `handleId` state, pricing/rateio, scene, masks, Fronts or Stone semantics.

A2d2.2 absence proof remains a separate checkpoint after A2d2.1 gates pass.


## A2d2.1 result — PASS

PASS on PR #117 head `9981f8856c9aa2309b96d47da23199daeeee3cd0`.

Proven:
- normalized flow materializes Handles section id/label/behavior/component;
- static HTML no longer owns Handles section semantics;
- `#handleHelp` and `#handleOptions` remain inside the generated section through the bounded `handles-all` adapter;
- handle redraw still restores the semantic Handles section by id;
- keyboard row-major traversal remains intact;
- current responsive handle geometry remains intact;
- `app.js`, handle catalog, `handleId` state, pricing/rateio, scene and masks were unchanged.

Gate:
- App build purity — PASS;
- Current variant fidelity — PASS;
- Current asset gates — PASS;
- Flow layout browser — PASS;
- Keyboard browser — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Netlify deploy preview #117 — PASS.

A2d2.2 remains a separate test-only absence proof.


## A2d2.2 absence-proof candidate

Test-only fixture:
- clone the live/default configuration fixture;
- remove only `handles-all` from Acabamentos;
- require normalized flow to keep `fronts`, `stone-packages` and `stone-skirting` while omitting `handles`;
- require zero semantic Handles shells;
- require the unclaimed Handles neutral slot to stay hidden;
- require Fronts to remain visible;
- require Stone sibling sections to remain materialized;
- require zero renderer fallback/invariant/page errors.

No production/runtime implementation change belongs to this checkpoint unless the proof exposes a directly related shell defect.


## A2d2.2 result — PASS

PASS on PR #117 functional head `43a9c9fd7393d35866df2384d22a79caedd74601`.

Proven with Acabamentos enabled but `handles-all` omitted:
- normalized flow contains no `handles` section;
- zero semantic Handles shells exist;
- the unclaimed Handles item-affinity slot remains hidden;
- Fronts remains generated and visible;
- stone packages and stone skirting remain materialized;
- renderer invariant errors remain empty;
- no page/console errors occur.

No production/runtime implementation change was required by the absence proof.

## A2d2.3 regression — PASS

The same functional head ran the complete repository gate set:
- App build purity — PASS;
- Current variant fidelity — PASS;
- Current asset gates — PASS;
- Flow layout browser — PASS;
- Keyboard browser — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Netlify deploy preview #117 — PASS.

A separate no-tree-change regression commit would add no evidence.

## A2d2.4 closure — PASS

Closure only. No new functionality.

Final result:
- normalized flow is the sole semantic owner of Handles section id/label/behavior/component;
- static HTML retains only a neutral `choice-grid` affinity slot and bounded `handles-all` adapter;
- missing Handles data creates no semantic Handles UI;
- Fronts and Stone remain independent;
- handle catalog/state/pricing/scene semantics remain unchanged;
- no production configuration write.

Merge PR #117 only if this closure head remains green/mergeable.
