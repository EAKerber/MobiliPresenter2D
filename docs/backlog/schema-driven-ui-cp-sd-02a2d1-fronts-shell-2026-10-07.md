# CP-SD-02A2d1 — generated Fronts section shell — 2026-10-07

Status: **IN PROGRESS — A2d1.1 PASS; A2d1.2 NEXT**.

Parent discovery:
- `docs/architecture/schema-driven-ui-cp-sd-02a2d0-finishes-family-discovery-result-2026-10-07.md`.

Goal:
- remove Fronts' static semantic section shell while preserving the existing swatch/material adapter and accepted PR #97 buyer behavior.

## Mini-checkpoints

### A2d1.1 — shell generation only

Only:
- replace the static `fronts` section wrapper/heading with a hidden neutral slot;
- slot visual class remains `config-section finish-section`;
- slot component is `choice-swatches`;
- slot item affinity is `fronts-all`;
- keep `#finishSwatches` and `#selectedFinishDescription`;
- keep `data-flow-item-id="fronts-all"` on a bounded item-adapter wrapper;
- normalized flow supplies section id `fronts`, label, keyboard behavior and component;
- add focused source + Flow layout proof.

Gate:
- generated Fronts shell exists exactly once;
- heading is `Cor das frentes` from normalized flow;
- behavior/component equal the normalized contract;
- existing swatches and selected-description host remain under the generated section;
- Handles/Stone unchanged;
- no renderer errors.

#### A2d1.1 candidate

Implemented as a deliberately narrow shell migration:
- static Fronts section id/heading/behavior/component ownership removed from HTML;
- one neutral `choice-swatches` slot now carries only item affinity `fronts-all`;
- the existing swatch and selected-description hosts remain intact inside a bounded `data-flow-item-id="fronts-all"` adapter;
- a generic `flow-item-stack` presentation class preserves the previous internal 8px stack spacing;
- normalized flow is expected to materialize the semantic Fronts shell;
- source and Flow-layout positive proof were added;
- shared runtime cache revision advanced from v19 to v20.

Focused gate progress:
- App build purity, Current variant fidelity, Current asset gates, Flow layout, Mobile, Stone and Summary/Pricing passed on the A2d1.1 candidate;
- the first Netlify preview failed operationally, then a no-tree-change retry succeeded;
- Keyboard exposed a test-only stale assumption: its negative ownership mutation removed `data-flow-item-id` from the semantic section, but A2d1.1 intentionally moved ownership to the bounded Fronts item adapter;
- the Keyboard fixture now removes/restores ownership on that actual adapter. Production code is unchanged by this correction.

#### A2d1.1 result

PASS on PR #116 head `6e88be670f5cd8abced2d2bd951d9a78e34cd42d`.

Proven:
- Fronts section id/label/behavior/component are materialized from normalized flow;
- the `fronts-all` swatch and selected-description adapter remains inside the generated semantic section;
- static HTML no longer owns Fronts section semantics;
- existing responsive Acabamentos geometry remains valid;
- the Keyboard invariant test now mutates the actual item owner rather than the removed static shell;
- material/state/pricing/mask/scene behavior was not changed.

Gate:
- App build purity — PASS;
- Current variant fidelity — PASS;
- Current asset gates — PASS;
- Flow layout browser — PASS;
- Keyboard browser — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Netlify deploy preview #116 — PASS after one no-tree-change retry of an operational build failure.

A2d1.2 remains a separate negative-fixture commit.

### A2d1.2 — negative Fronts absence proof — CANDIDATE

Fixture keeps Acabamentos but omits `fronts-all`.

Candidate proof is intentionally test-only: production/runtime code remains identical to the A2d1.1 PASS head.

Prove:
- no normalized `fronts` section;
- no semantic Fronts shell;
- neutral Fronts slot hidden/unclaimed;
- unaffected Acabamentos sections remain present as declared;
- no fabricated fallback/invariant/page error.

No new functionality beyond a correction directly exposed by this proof.

### A2d1.3 — regression only

Run current repository gates. No new functionality.

Expected gates:
- App build purity;
- Current variant fidelity;
- Current asset gates;
- Flow layout browser;
- Keyboard browser;
- Mobile browser;
- Stone browser;
- Summary/Pricing browser;
- deploy preview.

### A2d1.4 — closure only

Docs + merge. No new functionality.

## Invariants

- material catalog and material-group semantics unchanged;
- state representation unchanged;
- pricing unchanged;
- mask/scene rendering unchanged;
- Puxadores and stone sections unchanged;
- Acabamentos group shell remains outside this checkpoint;
- production configuration unchanged.

## Stop rule

If A2d1 requires material/state/pricing/mask semantics or group-shell redesign, stop and split a separate checkpoint instead of expanding A2d1.
