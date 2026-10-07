# CP-SD-02A2e1 — generated Summary semantic shell — 2026-10-07

Status: **READY / NEXT**.

Parent:
- CP-SD-02A2e0 Summary discovery — PASS.

Goal:
- make normalized flow the semantic owner of Summary group/section/component binding while preserving the accepted Summary stage shell and all domain summary/pricing behavior.

## Allowed implementation

### Static stage shell

Keep:
- `#summaryPanel` as the stable stage root;
- `.summary-panel` visual styling;
- the visible “Sua composição” header and explanatory paragraph;
- `#summaryContent` as the domain-renderer host.

Remove from `#summaryPanel`:
- static `data-render-component="action-list"` semantic ownership.

### Generic flow host

Inside `#summaryPanel`, introduce:
- `data-flow-group-grid="summary"`;
- `data-flow-group-class="flow-group-shell"`;
- a neutral `action-list` slot with `data-flow-slot-item="summary"`;
- a bounded inner host containing `#summaryContent`.

Use the existing `mountStageGroups("summary", summaryPanel)`.

### Generic semantic-heading hook

Extend `createSectionShell()` only enough to accept an optional class from the matched slot, e.g.:

`data-flow-section-heading-class="sr-only"`.

If absent, behavior is unchanged for every existing section.

For Summary, use `sr-only` so the normalized section label remains accessible without adding a duplicate visible “Resumo” heading.

### Cleanup

After Summary uses the generic mount path:
- remove `validateSingleSectionStageBinding()` if it has no remaining callers;
- do not change `stagePanels` yet;
- do not introduce a generic core stage-root factory.

## Proof

Source:
- Summary stage root no longer carries `data-render-component="action-list"`;
- neutral Summary slot exists;
- `#summaryContent` remains exactly once;
- generic heading hook is present and not Summary-name-specific in JS.

Flow-layout unit:
- assert Summary layout is `summary-main -> summary -> action-list`;
- complete Summary binding validates;
- missing group fails with `missing-group-binding`;
- missing section fails with `missing-section-binding`;
- missing component fails with `missing-component-binding`;
- wrong component fails with `component-binding-mismatch`.

Browser:
- generated `[data-keyboard-section="summary"]` has `data-flow-generated-section="true"`;
- component is `action-list`;
- semantic heading text is `Resumo` and is `sr-only`;
- `#summaryContent` belongs to the generated section;
- visible stage header remains “Sua composição”;
- no duplicate Summary content host;
- flow-layout errors empty.

Regression:
- Summary/Pricing browser remains byte-for-semantics equivalent: totals, module rows, skirting charge, stone charge and current-value synchronization unchanged;
- all eight current workflows + Netlify preview green.

## Negative semantics

Do **not** remove/disable Summary in a configuration fixture; that is invalid domain data.

Fail-closed proof belongs to renderer binding invariants as defined above.

## Stop rules

Stop and split if this requires:
- changing `renderSummary()`;
- changing pricing;
- changing `.flow-actions`;
- changing the Summary mandatory-stage invariant;
- changing Modules/PiP/dock behavior;
- adding a broad generic stage-root factory;
- changing production configuration.

No production configuration write.
