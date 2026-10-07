# CP-SD-02A2e0 — Summary boundary discovery result — 2026-10-07

Status: **COMPLETE / PASS**.

Baseline:
- `main` = `13cc1e16e81243a34360110561904fd48562b191`;
- Services and all Acabamentos semantic sections are normalized-flow-owned;
- Summary still uses a static single-section component binding;
- production configuration unchanged.

## Normalized Summary contract

Normalized flow already owns the Summary semantics:

```text
stage summary
  group summary-main [span=2]
    section summary
      item summary
      behavior action
      component action-list
      keyboard false
```

The source hierarchy comes from `hierarchy-defaults.js`; executable presentation resolves through the existing presentation contract. No new schema concept is required.

## Current duplicate authority

`#summaryPanel` currently combines two responsibilities:
1. stable stage/visual shell;
2. semantic `action-list` binding via `data-render-component="action-list"`.

`applyBuyerFlowLayout()` preserves that special case through:

`validateSingleSectionStageBinding("summary", summaryPanel)`.

That path validates normalized semantics but still requires the static stage root itself to act as the semantic section renderer.

## Stable content-renderer boundary

`renderSummary()` is not the duplication to remove.

It is a legitimate domain renderer that writes the current configuration result into `#summaryContent`, including modules, material/finish facts, global charge rows, totals and disclaimer. It must remain intact.

The target is only the shell/binding around that host.

## Smallest safe migration

A2e1 can reuse the existing generic group/section mount path:

- keep `#summaryPanel` as the stage root;
- keep the accepted visible stage header “Sua composição”;
- add `data-flow-group-grid="summary"` inside the panel;
- use plain `flow-group-shell` as the generated group visual host;
- add one neutral `action-list` slot with item affinity `summary`;
- retain `#summaryContent` inside that slot;
- call `mountStageGroups("summary", summaryPanel)`;
- remove the now-unused `validateSingleSectionStageBinding()` helper.

No generic core-stage factory is needed.

## Heading treatment

The generic section builder creates a semantic heading from normalized section label. Showing that heading would duplicate the existing visible stage-level Summary copy.

Use the existing `.sr-only` utility through a small optional slot presentation hook such as:

`data-flow-section-heading-class="sr-only"`.

The section label remains normalized-flow-owned and accessible; the visible “Sua composição” header remains stage presentation copy.

This hook is generic presentation plumbing and must not encode `summary` in renderer logic.

## Negative proof

Summary is a mandatory core stage:
- it must exist;
- it must remain enabled;
- enabled stages cannot be empty.

Therefore “remove Summary from a valid configuration” is not a legal negative fixture.

The correct fail-closed proof is renderer binding validation:
- missing Summary group binding -> `missing-group-binding`;
- missing Summary section binding -> `missing-section-binding`;
- missing component -> `missing-component-binding`;
- wrong component -> `component-binding-mismatch`.

Extend the existing `app/tools/test-flow-layout.js` invariant coverage for Summary and keep the browser test as positive materialization proof.

## Regression authority

A2e1 must preserve:
- `renderSummary()`;
- Summary/Pricing browser totals and rows;
- persistent `#configurationValue`;
- `.flow-actions`;
- stage navigation;
- all current responsive behavior.

Modules companion, PiP and bottom dock remain CP-SD-03.

## Decision

Proceed to CP-SD-02A2e1 as a shell/binding-only migration. No pricing, domain-content, interaction, responsive-policy or production-configuration changes.
