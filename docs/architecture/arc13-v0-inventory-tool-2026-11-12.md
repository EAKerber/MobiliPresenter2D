# ARC-13 / V0 — first reviewable UI inventory tool

Date: 2026-11-13

Product base observed: main at 221b54b2a41ecc8c338d1bf2cf67280cf165ce95
Status: local candidate on work/arc13-ui-inventory-20261112; full bounded inventory generated; runtime and default branch unchanged.

## Why this slice exists

The current product has no consumed UI message catalog, locale directory, or AST-backed inventory tool. The older count of 826 candidates across 26 sources is explicitly partial. ARC-13 therefore needs a source-derived inventory before a translation runtime or a large migration can be reviewed safely.

This slice adds a read-only generator for HTML text and selected accessibility attributes, plus JavaScript AST sites that can write text or status messages. It records source hashes, line locations, sink, expression, suggested review hints, and route consumers where static HTML and import edges make them knowable. It now recognizes compound text-property assignments and text-bearing properties passed through `Object.assign`.

The refreshed report contains 600 HTML occurrences and 412 JavaScript sink sites across 57 JavaScript files and three inline blocks. Of the JavaScript sites, 167 have static values and 245 have dynamic or mixed values. A separate exclusion ledger records 11 HTML and 11 JavaScript exclusions. Symbol-only HTML or JavaScript values remain candidates with context-review hints; + and — can be meaningful parts of a metric or counter. The parser reported zero syntax errors, zero owner gaps, and zero route gaps; every retained sink maps to at least one route and owner. The source manifest has 66 inputs, including the root build manifest.

These are **occurrence counts**, not the number of distinct messages or translation keys. Across 1,012 retained sink records, 767 have a static value; exact-value grouping yields 592 distinct values, with 175 repeated occurrences beyond the first copy. The repeated-value groups still include brand text, symbols, references, and other values that may not belong in a message catalog. Another 48 records are HTML ID references. The generated entries still say `unreviewed`; a separate human-review overlay now covers all 1,012 sink IDs. A separate list contains 359 JavaScript sources: 285 active, seven passed-but-unused, two unconsumed, and 65 diagnostic/system entries. All 55 previously pending built-in Error/TypeError flow records have a manual disposition. Ninety-four sources have 96 text-sink links, including six selected custom-error message links, plus 45 sources with 47 separate error-to-fallback references. Do not interpret either the occurrence count or the exact-value count as translation workload.

## Boundaries

- HTML text and selected alt, title, placeholder, ARIA text, and metadata values are inventoried.
- aria-labelledby, aria-describedby, and related ID references are recorded as references, not translatable message text.
- JavaScript data written to a recognized sink is recorded even when dynamic. Selected helper arguments, direct text insertions, strings from simple local constants/maps, and `Object.assign` text properties are included as source clues without copying V5 labels or catalog copy into a fixed UI catalog.
- Empty alternative text, empty or whitespace-only sink values, markup without text, and CSS assigned to recognized style elements are kept in an explicit exclusion ledger with source location and reason. Symbol-only text remains in the candidate list because its meaning can depend on the surrounding label or counter.
- The generated artifact still marks sink records unreviewed. A separate human-review overlay now gives all 1,012 occurrence IDs a semantic disposition; see [the source review receipt](arc13-source-review-2026-11-12.md) and the dated per-owner receipts. A second overlay now covers all 359 `sourceEntries` IDs in [`arc13/source-reviews/2026-11-13/`](arc13/source-reviews/2026-11-13/), with 110 `ui_copy`, 27 `editorial_copy`, 143 `domain_content`, four `commercial_content`, 65 `diagnostic`, one `system_message`, seven `passed_but_unused`, and two `unconsumed`. The independent source/sink judgment reconciles both overlays and their proposed-key reuse in [`source-consistency-judge.json`](arc13/source-reviews/2026-11-13/source-consistency-judge.json). Scanner hints alone are not classifications.
- app/data/catalog-data.js, configurator settings, stage/group/section labels, and commercial copy remain data contracts. Their consumers need a human owner decision before any value moves into ARC-13.
- Error and TypeError message sources are classified by their actual flow. When exception text is discarded and a fixed UI fallback is shown, the source is diagnostic and gets a separate failureFallbackRefs relation; this does not make the exception literal UI text. A message passed through to Admin status text remains a candidate for user-visible classification.

## Deliberate coverage limits

The candidate does not scan CSS generated content, JSON values, external scripts, dynamically loaded script references, arbitrary text-writing helpers, or interprocedural runtime data flow. Twenty-two test sources, generated bundles, and minified sources are omitted. Parse failures and unresolved route ownership are reported rather than silently represented as complete coverage. Constant recovery is intentionally shallow: it does not resolve runtime map lookups or prove the origin of dynamic values.

Accordingly, the generated report status remains candidate-unreviewed and its completeness label remains bounded-html-js-sinks-and-selected-text-sources. This is not a translation catalog, a complete V0 inventory, or authorization to change runtime behavior. Human dispositions are stored as an external overlay; they do not mutate generated entries or establish canonical keys. Repeated and missed text sources mean the occurrence count remains a traceability measure, not an estimate of unique translation strings.

The checked-in artifact carries status candidate-unreviewed and completeness bounded-html-js-sinks-and-selected-text-sources. The isolated tool pins Acorn and records the lockfile and generator hashes. The 1,012 sink occurrences and 359 source records now have human dispositions in separate overlays; lexical/runtime coverage gaps and several owner decisions remain open; `displayAxes` is now inventoried as technical catalog data, while its locale notation policy remains open. Zero parse errors and zero route gaps do not prove that every dynamic loading path or text-writing sink was captured.

## Next gates

1. Use [the source review receipt](arc13-source-review-2026-11-12.md) and [the independent consistency judgment](arc13/source-reviews/2026-11-13/source-consistency-judge.json), which reconcile the historical cohorts, 1,012 sink and 359 source ID overlays, source/sink overlaps, unresolved owner decisions, key-equivalence findings, and the seven Admin checkbox/state-control families with their unresolved decisions.
2. Decide the remaining source/sink policy questions listed in the review receipt. Keep source literals, display sinks, diagnostic errors, and fixed fallbacks as separate evidence.
3. Group exact values for review but retain every source occurrence; preserve distinctions among UI, accessibility, editorial, authored V5/content, commercial catalog, diagnostic, system, reference, and decorative records.
4. Reconcile remaining lexical/source-coverage gaps, duplicate groups, and exceptions with the Design System architecture handover. The current bounded report has 1,012 sink occurrences; this is still not a translation-coverage denominator.
5. Once owner decisions and source/sink review are stable, plan a small reversible migration slice. Do not introduce a framework or activate locale switching as part of this inventory step.
