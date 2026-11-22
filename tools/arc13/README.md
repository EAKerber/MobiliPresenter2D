# ARC-13 UI inventory tool

This isolated development tool creates a deterministic, review-first inventory of candidate interface text in the product. It does not change application text, translations, routes, or runtime behavior.

Install its single pinned parser dependency and generate the candidate report from the repository root:

    npm install --prefix tools/arc13
    npm run inventory --prefix tools/arc13

The output is written to architecture/arc13/ui-text-candidates.json. Source-file SHA-256 values are recorded so reviewers can tell which exact inputs produced the report.

For the three ARC-03C generated primary pages, the compiler manifest carries positional source maps. Candidate entries gain an additive `authoring` field that points to the authoring page, shared header fragment, route configuration, or a semantic key in the shared UI copy catalog. Route and catalog substitutions identify their JSON pointer and compiler transform. Offsets use Unicode code points. The scanner verifies source/output/catalog hashes, full segment coverage, and positional content before resolving an origin. Attribute positions come from the raw start tag so HTML entities do not shift them, and a candidate whose raw span crosses a source-map boundary remains `unresolved`. The existing published `source`, line, column, ID, owner, and route consumers continue to describe the generated occurrence and remain unchanged.

For the three ARC-03C generated primary pages, the compiler manifest carries positional source maps. Each generated inventory reports its own mapped and unresolved occurrence counts, tied to that exact source snapshot. The map does not add provenance to the separate excluded-entry ledger, JavaScript sinks, or JavaScript `sourceEntries`.

If the package registry is unavailable, the HTML portion can be generated without Acorn:

    node tools/arc13/run-inventory.mjs --html-only

That output is marked candidate-html-only and explicitly reports the JavaScript sources it did not scan. It is not a substitute for the AST-backed inventory.

On Windows, set the PYTHON environment variable if the Python launcher is unavailable; the wrapper also tries the standard py and python commands.

## What it reads

- HTML text nodes, selected accessible text attributes, a short set of metadata descriptions, and ID-reference attributes.
- JavaScript AST sites that assign or append to DOM text properties, set selected text-bearing attributes, create text nodes, insert text or HTML, pass text properties through `Object.assign`, call configured status and announcement helpers, and use a small set of known label-building helpers. It also records the `data-compact-label` assignment whose value is rendered by CSS `attr()`.
- Simple strings reachable from local constants and object/array maps, retained as source clues rather than resolved runtime values.
- Static route consumers from HTML script references and relative JavaScript imports, plus page owners mapped from source paths.

Every entry starts as unreviewed. The hints help review; they are not a migration decision. A dynamic expression is recorded as a sink site even when its content comes from configuration, the V5 model, or the product catalog. Reviewers must keep those data sources outside the UI message catalog unless a separate schema decision says otherwise.

The report counts sink occurrences, not tests or unique messages. Its separate `sourceEntries` list records selected JavaScript literals/data fields that can feed those sinks; source rows are not added to the sink count. When a bounded local flow is known, a source record includes `consumerRefs` with the exact sink ID, expression, route, and flow type. A missing link remains explicit rather than inferred. Error and TypeError source records that are known to be discarded can carry separate failureFallbackRefs to a fixed UI sink; these are not consumerRefs and must not be counted as displayed source text. The summary groups exact source expressions and static values, but those group counts are review aids only: symbols, identifiers, references, brand text, and dynamic content are not automatically translatable strings. Keep occurrence-level provenance when grouping duplicates.

See `docs/architecture/arc13-source-review-2026-11-12.md` for the historical cohort review, `docs/architecture/arc13/inventory-reconciliation-2026-11-14.md` for the Product main snapshot at that date, and `docs/architecture/arc13/inventory-reconciliation-post-277-2026-11-16.md` for the latest reconciled snapshot and delta. Disposition overlays remain separate from generated candidate data. The bounded source policy includes Error/TypeError constructors and the selected `AdminBootstrapRequestError` message argument; it does not claim to discover every user-defined Error subclass. Cohort counts overlap on shared runtime modules.

## Coverage limits

This is a bounded first inventory, not complete localization coverage. It does not parse CSS; one explicit exception records the JavaScript assignment to `data-compact-label`, which CSS later renders with `attr()`. It does not inventory JSON data values, external scripts, runtime data flow, dynamically loaded script references, or arbitrary functions that write text through unconfigured helpers. It skips test sources and generated/minified bundles. Parse errors and script sites without a route owner are reported explicitly. Empty alternative text, empty or whitespace-only sink values, static markup-only assignments, and recognized style-element content appear in a separate exclusion ledger with source locations. Symbol-only text remains a candidate with a context-review hint because punctuation can be meaningful in a larger label or counter.

Do not activate localization or treat this candidate as a translation catalog until unknowns, omissions, route ownership, and data boundaries have been reviewed. Extend sink coverage with source examples and a separate review before calling the inventory comprehensive.
