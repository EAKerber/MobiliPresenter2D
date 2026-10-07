# CP-SD-02A2e0 — Summary boundary discovery — 2026-10-07

Status: **READY / NEXT — discovery only**.

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
