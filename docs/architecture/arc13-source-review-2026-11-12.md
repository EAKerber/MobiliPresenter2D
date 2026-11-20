# ARC-13 / V0 — provisional source review
> **Snapshot status:** the counts and sink/source receipts below describe the pre-#273 inventory at `904c49a3…fe391`. Current Product `main@46a52e76` is reconciled in [the successor record](arc13/inventory-reconciliation-2026-11-14.md).


Initial review: 2026-11-12; latest report refresh: 2026-11-14
Product source base: `origin/main@bb3e3a34ee771db1efe6d8dcfe8cbde96c6a40c7`, plus local ARC-13 review branch through `db908e5cdd0c88c9732e8769b23e474b5790c064`
Review branch: local `work/arc13-ui-inventory-20261112`; no remote ref or Product PR
Status: partial manual review; no catalog or runtime migration

## How to read the current counts

The current working report contains 1,012 sink occurrences: 600 HTML records and 412 JavaScript sink sites. Of the JavaScript sites, 167 have static values and 245 have dynamic or mixed values. The scanner reports 22 explicit exclusions, 66 hashed source inputs, zero parse errors, zero unassigned owners, and zero unassigned JavaScript routes.

The earlier “988 candidates” figure was 600 HTML records plus 388 then-known JavaScript sinks. It is an inventory count, not a test count, a count of unique messages, or a translation-work estimate. Subsequent scanner coverage added 24 recognized sink sites relative to that snapshot; the product text itself did not change. The current report keeps 359 JavaScript text-source records separately from the 1,012 sink occurrences. They include 285 active records, seven passed-but-unused labels, two fields without an active consumer, and 65 diagnostic records; all 55 previously pending built-in Error/TypeError fragments now have a manual disposition. Ninety-four source records have 96 text-sink links, including the existing 26 same-try-catch Error links, two same-file awaited-call Error links, 18 fixed Admin labels linked to exact text sinks, six selected custom-error message links, and one conditional Admin diagnostic link. Forty-five source records have 47 separate failure-fallback links.

Across sink occurrences there are 767 static-value occurrences and 592 distinct exact values; 65 exact-value groups repeat, accounting for 175 occurrences beyond the first. Those groups include symbols, brand text, identifiers, and structural references. The report also contains 48 HTML ID references. Neither the static-value count nor a deduplicated count estimates translation workload. The full occurrence list is retained for provenance.

The generated artifact still marks sink occurrences `unreviewed`, but a separate human-review overlay now records a disposition for all 1,012 occurrence IDs. The four owner-scope receipts and independent consistency review are in [`arc13/reviews/2026-11-13/`](arc13/reviews/2026-11-13/). The dispositions are 749 catalog candidates, 85 structural identifiers, 64 symbols/decorations, 40 domain-data occurrences, 26 commercial-data occurrences, 35 non-localizable transport/data occurrences, and 13 mixed or policy-dependent cases. The receipts cover 1,012/1,012 IDs exactly once, with no duplicate, missing, or out-of-scope IDs.

A separate source-review overlay now covers all 359 `sourceEntries` IDs, with three owner receipts in [`arc13/source-reviews/2026-11-13/`](arc13/source-reviews/2026-11-13/): 110 `ui_copy`, 27 `editorial_copy`, 143 `domain_content`, four `commercial_content`, 65 `diagnostic`, one `system_message`, seven `passed_but_unused`, and two `unconsumed`. The IDs are covered once each against the same inventory SHA. These are source dispositions, not additional sink occurrences or canonical catalog keys. The independent cross-list consistency judgment is complete; see [`source-consistency-judge.json`](arc13/source-reviews/2026-11-13/source-consistency-judge.json) for exact ID evidence and owner decisions.

The judge reconciled the source and sink receipts against inventory SHA `8765873a096fe95167e4fba74838258e47428fab0e12d16af9b6c92a3e34a51e`: 359/359 source IDs and 1,012/1,012 sink IDs, with the disposition rollups matching both totals. It found 27 exact literal values across source and sink lists, covering 65 sink occurrences, but no repeated exact-value sink group with conflicting classification and no exact name intersection between proposed source and sink keys. Three reused source draft keys have identical text and function; they remain proposals. This comparison separates true shared UI copy from same-word domain values, unused source fields, and internal error strings.

| Priority | Decision still needed | What it blocks |
| --- | --- | --- |
| P1 | Finish the full pluralizable module-count message; decide stable-code mapping for Identity-provider, hierarchy-validation, and API save/publication errors. | Canonical key for the count; localized mappings for dynamic error cases. Keep raw diagnostics outside the catalog until a policy exists. |
| P1 | Confirm provenance and approval for 13 public claims on `/` and `/how-it-works/`, plus the separate five `/about/` sinks for the historical “200+” claim and its supporting copy. | Publication approval only; technical classification and extraction can proceed. |
| P1/P2 | Decide dimension and quota notation (axis order, units, separators, multiplication mark); `displayAxes` is now captured as technical product data, while locale and notation policy remain open. | Dimension key consolidation and future locales; this is not a blocker for the current locale. |
| P2 | Decide whether Admin status messages should expose version/schema/checkpoint terminology. The home-link punctuation is resolved: retain the comma in `Casa em Módulos, início`. | Final Admin wording before publication; carry the current home-link name forward unchanged. |
| P3 | Decide whether to retain seven unused Viewer labels and two unconsumed Landing fields. | Later contract cleanup only; do not delete them automatically. |
| P2 | Confirm intended accent, prominence, and focus treatment for distinct Admin state-control families. | Visual normalization only; preserve the separate contracts. See the detailed judgment in the consistency review. |

## Admin checkbox and state-control audit

The Common Sense Judge reviewed the related Admin controls against the inventory and traced their code behavior. All use native checkboxes and share the global focus rule, but a checked state does not make their contracts equivalent. The review separates seven high-level families; the source-level breakdown contains nine semantic groups across 12 checkbox construction sites in eight render/helper contexts: initial entity state, initial service selection, initial Viewer visibility, stage availability, customer availability, finish-to-module association, the no-color material property, material-to-target associations, and draft Viewer price publication. The initial-state controls and `.switch` controls may share their own visual families; the price-publication control has a separate treatment.

Open decisions recorded for the inventory are: **P1**, align accessible names with the actual effect for module/object state and decide whether an active stage should keep an action-oriented name; **P1**, decide whether “Disponível para clientes” needs to say the change applies only after publishing; **P2**, choose consistent feedback for the last-available finish/handle rule; **P2**, confirm whether initial-state controls should inherit the product accent or keep native browser color, including the unaccented “Sem cor/tinta base” option; and **P2**, confirm the price control's 3px focus outline against the global 2px rule. The full evidence, inventory IDs, and owner questions are in [`componentStateReview`](arc13/reviews/2026-11-13/consistency-judge.json).

Before any visual adjustment is approved, review the authenticated Admin in light/dark themes with keyboard focus, checked/unchecked and disabled states, screen-reader names, and computed contrast. This pass was static; it did not verify browser or assistive-technology behavior.

The review distinguishes semantically justified variants: “Cozinha” as a public navigation destination is not a room name; editable V5/commercial labels remain data even where a fixed UI label uses the same word; unused brand fields do not replace active wordmark sinks; and Viewer values passed but never read are not the same messages as the renderer's visible captions. Exact literal equality alone does not establish one key.

This is occurrence-level classification, not a canonical key count or completed localization. The receipts contain 749 catalog-candidate occurrences and 699 distinct *proposed* key names; 24 proposed keys are reused, and three reused groups join different text/expressions. The consistency review directs the visible-module count fragments into one pluralizable message, confirms that horizontal dimension labels share a template, and flags the home-link accessible name's comma-versus-dash variation for editorial choice. These are review findings, not runtime keys.

The 13 `unknown` sink occurrences fall into five groups: four generic transport helpers whose values belong at their callsites; two separate `window.prompt` fields (fixed title versus dynamic default); four Identity-provider errors; one hierarchy-validation diagnostic; and two API save/publication errors. For the seven mixed error cases, local fallbacks are catalog candidates while raw provider/API/schema diagnostics stay outside the catalog until a product owner defines whether stable error codes should map to friendly copy. The 359 source entries are now dispositioned separately: 285 active, seven passed-but-unused, two unconsumed, and 65 diagnostic records; none remains in the built-in Error/TypeError flow-review cohort. Six selected `AdminBootstrapRequestError` message arguments are linked to the exact visible Admin status sink; source-flow links are not final decisions about catalog inclusion. Zero parser or route gaps prove only that the bounded scanner parsed and associated its recognized sites; they do not prove lexical completeness.

## Admin control inventory follow-up — 2026-11-14

An independent Common Sense Judge pass re-read the Admin source at Product branch `work/arc13-ui-inventory-20261112@db908e5cdd0c88c9732e8769b23e474b5790c064` and reconfirmed its SHA against the `admin-access.json` review. It keeps the seven high-level families separate and expands them into nine semantic groups across 12 checkbox construction sites in eight render/helper contexts. The screenshot text “Iniciar ativo” remains ambiguous between object visibility and service selection; “Ativa” maps to stage availability in source, but its crop lacks the step/card context. CSS explains the blue/beige difference without proving intended hierarchy.

The six unresolved inventory decisions remain: (1) object/service/Viewer visible and accessible wording by actual effect; (2) whether the stage name should describe current availability or the “Ativar etapa” action; (3) whether customer availability explains draft-versus-next-publication timing; (4) intended accent for initial-state and `Sem cor/tinta base`; (5) whether last-option feedback should match for finish and handle; and (6) whether the price control's 3 px focus outline is intentional against the global 2 px rule. The full state-by-state table adds a product/domain subquestion under (5): finish-to-module and fronts/stone associations prevent empty selections, while handle-target association may be empty; some disabled-by-rule controls also lack an adjacent reason. These are not confirmed defects. The P1/P2 owners, sink IDs, and evidence are in [the dated review](arc13/reviews/2026-11-14/admin-control-common-sense-review.md).

This remains a static classification. Before visual approval, capture the authenticated Admin in both themes and validate checked/unchecked, disabled reason, keyboard focus, accessible names/state announcements, screen reader output, and computed contrast. No UI code or tests changed in this follow-up.

## Built-in Error/TypeError review — 55 of 55 classified

Manual review on 2026-11-13 traced all 55 pending built-in Error/TypeError source records against the current Product base and local scanner changes. Thirty-four source records have bounded routes to fixed failure output, one conditional Admin diagnostic has a direct message-sink link, and 20 records are classified as diagnostic/system input with no safe error-message sink link. The report now records zero `diagnostic-or-user-message-review` source entries.

| Source group | Records | Recorded path and disposition |
| --- | ---: | --- |
| `app/access/manage.js:41` | 1 | `api()` errors reach fixed status handlers in `manage.js:95`, `:86`, or the conditional status expression at `:124`. The `request_failed` code itself is not displayed. |
| `app/core/public-module-projection.js:18, 21, 27, 32, 39, 42, 45 (two literal fragments), 52, 78, 84, 93, 107, 116, 124, 130` | 16 | Netlify handler `netlify/functions/public-modules.mjs:110–113` catches projection failures and returns the fixed 503 JSON response at `:112`; Viewer startup then renders the fixed alert at `app/viewer/viewer.js:183`. The JSON-response provenance and source hash are retained in each fallback reference. |
| `app/core/published-buyer-projection.js:12, 16, 37` | 3 | `netlify/functions/buyer-configuration.mjs:71–73` catches server projection failures and returns the fixed 503 JSON response at `:72`; the failed client request reaches the fixed Configurator alert at `app/app.js:2535`. |
| `app/core/published-buyer-projection.js:100` | 1 | `app/app.js:1766` consumes the response inside the fetch promise fulfillment handler; rejection reaches `.catch` at `:2558` and the fixed alert at `:2535`. |
| `app/viewer/scene-adapters.js:174, 212, 218, 221, 231, 247, 249, 267, 273, 279, 288, 299, 310` | 13 | Adapter creation/mount runs inside Viewer startup; the promise `.catch` at `app/viewer/viewer.js:176–184` discards the exception and renders the fixed alert at `:183`. |
| `app/core/administration-v5.js:305` | 1 | Conditional direct link to `app/admin/admin.js:1560`: `loadSettings()` passes the response to `AdministrationV5.upgrade()` and `showUser()` displays `error.message` if a decoded null body reaches this guard. The link is marked `consumerConfidence: conditional`; the technical English diagnostic must not be treated as approved catalog copy. |
| Remaining internal/system cases | 20 | Classified and left unlinked: `app/app.js:47`; `admin-bootstrap-retry.mjs:18`; `administration-v5.js:23–28, 164`; `browser-compat.js:6`; `configuration.js:10–11`; `flow-layout.js:7`; `flow-model.js:7`; `hierarchy-administration.js:7, 68`; `layout-profiles.js:11`; `presentation-contract.js:81`; `private-navigation.js:184`; and `scene-adapters.js:101`. Reasons include startup guards, dormant or pre-guarded inputs, runtime-valid browser values, swallowed errors, or an unproven malformed-flow path. |

The 34 fallback-linked records add 36 references because the access-management error is caught at three distinct operations. Together with the earlier 11 references, the inventory now has 47 error-to-fixed-fallback references. The Admin line `305` message contributes one additional source-to-sink reference. The low-confidence cases remain unlinked: the Admin bootstrap TypeError guard receives functions from its only current caller; the scene adapter's missing-initial-finish guard is preceded by validation of the selected finish; and the private navigation error leaves the ordinary “Verificando acesso…” pending state unchanged. The scanner uses source-and-line allowlists for these flows, not a general function-name inference rule.

The error literals above are source-flow evidence, not new catalog entries. Most are internal contract/validation details; the fixed Viewer, Configurator, and access-status messages are the actual human-readable fallback copy. The separate `AdminBootstrapRequestError` Portuguese messages are operational UI text, while the TypeError precondition remains unlinked. No Product runtime source changed.

## Legacy manual cohorts and current sink partition

### Reported manual snapshot (membership not retained)

| Consumer cohort | Records inspected | Scope and limitation |
| --- | ---: | --- |
| Public pages and shared navigation | 546 | 465 HTML records and 81 JavaScript sinks; JavaScript sinks reviewed individually, HTML grouped by sink/type rather than editorially line-by-line. |
| Admin and access management | 280 | 258 direct records plus 22 shared-runtime records; review included source tracing and data/diagnostic distinctions. |
| Configurator | 230 | Records associated with `/config/`, including 62 HTML and 168 JavaScript sinks. |

These counts are historical review notes, not per-entry decisions. The notes point to Product commit `04945d6`, whose generated inventory had 996 sinks (600 HTML + 396 JavaScript), while the three cohort counts sum to 1,056, 60 more than that report. The notes mention shared-runtime overlap, but retain no occurrence IDs or membership lists; the exact intersections and any broader scope cannot be reconstructed. They are not a coverage denominator.

The earlier 988-sink report was at commit `c7262cf` (600 HTML + 388 JavaScript). The report snapshot at `ca897cb` has 1,012 sinks (600 HTML + 412 JavaScript); the regenerated report on the current worktree retains that sink count. The historical cohort sum is 44 above the current total, but this difference also is not a coverage calculation.

### Current report partition by scanner owner (not review coverage)

| Current owner bucket | Sink occurrences | HTML | JavaScript |
| --- | ---: | ---: | ---: |
| Public page owners (`about`, `how-it-works`, `landing`, `viewer`) | 486 | 429 | 57 |
| Admin and access owners | 288 | 109 | 179 |
| Configurator owner | 197 | 62 | 135 |
| Shared-runtime owner | 41 | 0 | 41 |
| **Total** | **1,012** | **600** | **412** |

These buckets partition the raw generated report by its single `owner` field. They do not reproduce the earlier manual cohorts or by themselves account for all route-level consumers. Human review now uses stable occurrence IDs, explicit dispositions, and route consumers for shared-runtime sources; see the overlay summary above. This closes review coverage for the 1,012 generated sink occurrences, not lexical source coverage or the full ARC-13 extraction requirement.

## Coverage gaps to close

- `app/how-it-works/how-it-works.js:4–9`, `app/core/private-navigation.js`, `app/core/ui-theme.js`, and fixed Admin pricing maps have separate source records and owner dispositions. They are not sink duplicates merely because their consumers also appear in the sink list.
- `app/landing/landing.js` inline benefit text and selected fields in `app/landing/data.js` have source records. Two fields (`title` and `tagline`) are recorded as unconsumed; owner review must decide whether to retain or retire them. Brand text and editorial text remain separate from active UI fields.
- `app/viewer/data.js` records seven `viewTypes[*].label` values as passed-but-unused and two `detailLayout[*].title` values as active headings. This is a concrete source/sink mismatch, not a reason to delete the source values automatically.
- Admin makeRuleSelect labels/options, makeField labels, material-availability headings, option-factory labels, tuple labels, dimension labels, and literal Error/TypeError messages now appear as source records. Their fixed helper arguments link to generic renderer sink IDs. A further 18 fixed Admin labels point to exact sinks, including pricing-role headings, axis labels, pricing-type/basis labels, and fixed option arrays. Six messages passed through `AdminBootstrapRequestError(code, message)` are captured from the message argument, not the code, and link across files to `admin.js:1560`. Its TypeError precondition is classified diagnostic and remains explicitly unlinked because the current caller supplies both functions.
- Of 100 built-in and selected custom error-message source fragments, 55 pending built-in Error/TypeError records have now been manually classified: 34 have fixed-fallback links, one conditional Admin diagnostic links to `admin.js:1560`, and 20 remain explicitly unlinked diagnostic/system cases. Together with the earlier references, 45 source records have 47 fixed-fallback links. A source-to-sink link does not decide whether wording belongs in a localization catalog.
- `window.prompt`/`window.confirm` calls and dynamic `img.alt` assignments are now recognized sink sites. This is source coverage, not a visual or runtime change.
- Selected Configurator defaults, catalog fields, scene labels, and PriceBook copy have domain-bound source records and owner dispositions. The four static compact labels written to `data-compact-label` are recorded and linked to the CSS-generated-content sink; the dynamic `custom: stage.label` value remains model/configuration data. Remaining gaps include mixed fixed/dynamic values in `app/app.js`, JSON data, and runtime/interprocedural sources. Data from the V5 model and commercial catalog must remain distinct from fixed UI copy.
- `app/access/manage.js:124` uses `access_service_not_configured` as a branch discriminator; the two human-readable messages emitted by the branch are interface text, not diagnostics.
- The scanner now captures text properties in `Object.assign(...)` and compound text-property assignments. This closes the reviewed omission in `app/viewer/technical-views.js` and adds previously missed sink sites, but does not solve source-table resolution or general interprocedural data flow. Awaited-call error links now fail closed when a function name is duplicated or has multiple awaited callsites; the two current `loadSettings()` links were checked against its unique callsite. Other runtime-flow patterns outside the 55-record review remain manual-review cases.

## ARC-03C authoring provenance addendum — 2026-11-14

The current generated inventory is schema 4 at SHA-256 `904c49a3b32722ece528a468e030b10800def07a61cbcf5811f01bfd00cfe391`; its ARC-03C manifest is schema `/2` at SHA-256 `efd62baac8fd9f2002a18c8b508a85a46ccf734a21e020745005067f2bed0dc7`. The compiler source map accounts for exactly 411 retained HTML sink occurrences in `/` (53), `/about/` (56), and `/how-it-works/` (302): 378 point to page sources and 33 to the shared header fragment. This includes 31 ID-reference records, which remain non-translatable references. The other 601 sink records are outside this bounded source map; they are not reported as unresolved.

The new `authoring` field is separate from semantic classification. All 1,012 sink IDs and 359 source-entry IDs remain unchanged; existing sink/source classifications and route-consumer relationships remain intact. The seven owner receipts and two aggregate judges have 2026-11-14 successors under [`arc13/reviews/2026-11-14/`](arc13/reviews/2026-11-14/) and [`arc13/source-reviews/2026-11-14/`](arc13/source-reviews/2026-11-14/). Their 2026-11-13 predecessors remain preserved as historical snapshots.

Implementation details and scope limits are in [`arc13/authoring-provenance-source-map-2026-11-14.md`](arc13/authoring-provenance-source-map-2026-11-14.md). The three generated HTML outputs are unchanged. This remains a source-provenance improvement, not localization coverage, a new semantic review, or browser evidence.

## Classification boundaries

The next review should distinguish at least:

- fixed UI messages and accessibility text;
- editorial and search metadata;
- authorable V5 labels and commercial catalog values;
- system messages versus diagnostic details;
- identifiers, ARIA/form references, symbols, and formatting fragments;
- account or user data and unresolved sources.

Review hints can overlap and are not final classifications. In particular, `alt` values can name a brand or describe an image; neither should automatically be treated as generic visible UI. Symbols such as arrows, check marks, and punctuation need nearby control context before disposition.

## Related Admin control review

The Common Sense Judge expanded the earlier two-example comparison to seven state-control families. The review separates initial entity state, initial service selection, initial Viewer visibility, stage availability, customer availability, contextual association/property selection, and draft price publication. They share native `input[type=checkbox]` controls and the global focus rule, but checked state alone does not make them equivalent. The current accent differences come from CSS; the intended visual hierarchy remains undecided.

The full evidence, ARC-13 IDs, owner questions, and required runtime review are recorded in [`componentStateReview`](arc13/reviews/2026-11-13/consistency-judge.json). Preserve each contract while those decisions remain open. Do not harmonize the controls based only on checkbox appearance.

## Next work

1. Resolve the P1/P2 choices in the independent judgment before canonicalizing affected keys or approving public/Admin copy; unused-field cleanup remains P3; Admin control hierarchy and focus decisions are P2.
2. Close locale/measurement-format policy for dimension and quota values, including the newly inventoried `displayAxes` field; locale and notation policy remain pending.
3. Keep the 20 explicitly unlinked built-in diagnostic cases under review if their callers, guards, or validation order change. The selected custom-error policy does not claim coverage of every class extending `Error`.
4. Once the owner decisions needed for the current locale are settled, plan the first reversible `pt-BR` migration lot. Keep CSS/token work and runtime localization as independent deliverables.

No Product application source or published configuration changed in the source-inventory work. Separately, branch-hygiene PR #272 merged; its exact batch and merged-PR cleanup completed successfully, leaving five remote refs. This refresh changed only the scanner, generated report, and source-review receipt; no application test suite was run locally.

## Test-count and workflow-overlap distinction

The 1,012 report rows are candidate text sinks, not tests. The Configurator package's default test chain contains 19 Node test scripts and two asset validators. The broader repository also has auxiliary test files and workflow-specific checks.

A read-only workflow audit on Product PR #273 head `016b33f9315620ee09b28c4e2c9ba5752b858471` confirmed three workflows each ran the same full `app` `npm test` command on that SHA: [App build purity](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/43140048931), [Current variant fidelity](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/43140048861), and [Current asset gates](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/43140048868). All three passed and each then ran additional domain-specific checks. The branch-hygiene PR #272 also triggered Current asset gates because that workflow watches all `tools/**` and `tests/**` changes; its run executed the same app suite plus visual asset checks despite the PR containing no `app/**` changes. This confirms repeated suite execution and one broad trigger; it does not prove duplicated assertions inside the tests or that any gate is unnecessary. The workflows run as separate jobs, so this adds CI work; the effect on end-to-end wait time depends on which job is slowest. No application test suite was run locally and no test was added, removed, or changed in this review.

## Owner decision — home-link accessible name — 2026-11-14

The owner chose to keep the current comma in **“Casa em Módulos, início”**. This resolves the punctuation choice only; no runtime string or canonical key was changed. The six current sink occurrences remain separate inventory records: `2f0337ef2f5c5e9a` (`/about/`), `b48d3866e85996bd` (`/access/`), `81a6d89bbdea70bc` (`/access/manage`), `7b0753494b736d68` (`/admin`), `a4f19243c147b4fb` (`/how-it-works/`), and `6c06f82283064a24` (`/`). The generated-page cases map to the shared header fragment; the other records retain their existing sources. Shared wording alone does not authorize merging keys across route owners.

The bounded decision record, inventory hash, and source-route table are in [`arc13/owner-decisions-2026-11-14.md`](arc13/owner-decisions-2026-11-14.md).
