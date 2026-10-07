# CP-SD-02A2e0 — Summary boundary discovery — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- CP-SD-02A0 renderer inventory;
- CP-SD-02A2d4 completes the Acabamentos section-family migrations.

Goal:
- identify the smallest safe removal of static Summary semantic-shell ownership while preserving `renderSummary()`, pricing, the persistent current-value footer and accepted buyer behavior.

## Why discovery is required

Summary differs from the completed Acabamentos/Services slices.

Today:
- `#summaryPanel` is a static stage root;
- the same element carries `data-render-component="action-list"`;
- `applyBuyerFlowLayout()` uses `validateSingleSectionStageBinding("summary", summaryPanel)` instead of `mountStageGroups()`;
- the static header owns “Sua composição” copy;
- `#summaryContent` is the stable domain-renderer host;
- `renderSummary()` dynamically creates legitimate product-specific summary/pricing content and should **not** be generalized away;
- `stagePanels` still hardcodes the core Summary root;
- the bottom `.flow-actions` estimate/CTA region is intentionally deferred to CP-SD-03 and must not be mixed into this slice.

## Discovery questions

Confirm:
- exact normalized Summary stage -> group -> section ids and `action-list` component;
- whether the current Summary stage root can remain a generic visual stage shell while semantic group/section ownership moves inside it;
- whether a neutral `action-list` slot can preserve `#summaryContent` without moving `renderSummary()`;
- whether `validateSingleSectionStageBinding()` can be retired in favor of the existing generic `mountStageGroups()` seam for Summary, or whether a smaller stage-shell adapter is required first;
- what owns the Summary heading after migration: stage/group visual header vs generated semantic section label;
- how an absent/disabled Summary stage should fail closed without fabricating UI;
- which tests must adapt without touching Summary pricing semantics.

## Stop rules

Do not in A2e0:
- change `renderSummary()`;
- change estimate/pricing calculations;
- change `.flow-actions` persistence/geometry;
- change Modules views;
- implement PiP/dock behavior;
- change production configuration.

If making Summary generic requires a new generic **core stage root** factory affecting Modules/Finishes/Services, stop and split infrastructure from Summary instead of broadening one checkpoint.

## Expected next slice if discovery passes

Likely A2e1:
- preserve a stable Summary stage host;
- move Summary semantic group/section/component ownership to normalized flow;
- retain `#summaryContent` as bounded domain-renderer adapter;
- add positive binding proof and valid absence/fail-closed proof;
- keep Summary/Pricing browser totals unchanged.

Modules companion, PiP and bottom dock remain CP-SD-03.


## Discovery result — PASS

Observed on `main` at `13cc1e16e81243a34360110561904fd48562b191`.

### Normalized authority

Summary is already fully represented by the normalized model:
- stage: `summary`;
- group: `summary-main`, span 2;
- section: `summary`;
- item: `summary`;
- behavior: `action`;
- presentation: `list`;
- executable component: `action-list`;
- keyboard: false.

The current semantic duplication is therefore entirely in the buyer binding:
- `#summaryPanel` is both the stage root and the `action-list` component binding;
- `applyBuyerFlowLayout()` uses the special-case `validateSingleSectionStageBinding("summary", summaryPanel)`.

### Stable domain renderer boundary

`renderSummary()` is legitimate product-specific rendering and must remain unchanged. It owns the dynamic commercial summary content written into `#summaryContent`:
- visible modules;
- finish facts;
- global charge rows;
- current estimate/breakdown;
- disclaimer.

This content renderer is not hierarchy authority.

### Generic shell path is sufficient

No new core stage-root factory is required.

A2e1 can:
- keep `#summaryPanel` as the stable stage/visual root;
- keep the visible stage-level header “Sua composição” and its explanatory copy;
- add a nested `data-flow-group-grid="summary"`;
- let `mountStageGroups("summary", summaryPanel)` materialize `summary-main` and the semantic `summary` section;
- keep `#summaryContent` inside a neutral `action-list` slot;
- retire `validateSingleSectionStageBinding()` after Summary no longer uses it.

The generated semantic section heading would duplicate the visible stage copy if shown. Reuse the existing `.sr-only` utility through a small **generic optional heading-class hook on the neutral slot**. This remains presentation plumbing, not Summary-specific semantic authority.

### Geometry

The existing generic classes are sufficient:
- `.flow-group-grid` provides the grid;
- `summary-main` already has span 2, so its `.flow-group-shell` spans the full grid;
- plain `.flow-group-shell` adds no new visual box;
- a minimal section host class may own only structural `min-width: 0` if needed;
- `.summary-panel` continues to own the accepted 14 px stage-level vertical spacing.

Do not use the embedded two-column group class for Summary.

### Negative gate

Summary cannot be removed or disabled by valid administration:
- configuration validation requires a Summary stage;
- Summary must remain enabled;
- enabled stages cannot be empty.

Therefore A2e1 must **not** fabricate an invalid “Summary absent” fixture.

Use binding fail-closed proof instead:
- `app/tools/test-flow-layout.js` already exercises `validateBindings()`;
- add Summary-specific checks that missing `summary-main`, missing `summary`, or a mismatched/missing `action-list` binding yields deterministic invariant errors;
- positive browser proof confirms the real generated binding;
- Summary/Pricing browser proves all domain totals/content remain unchanged.

### Explicit non-goals

A2e1 must not:
- change `renderSummary()`;
- change pricing/estimate semantics;
- move or redesign `.flow-actions`;
- change the persistent value/CTA policy;
- change Modules;
- implement PiP or bottom dock behavior;
- change production configuration.

Conclusion: proceed directly to A2e1 as a small shell/binding migration.
