# ARC-13 generated-page authoring provenance — 2026-11-14
> **Snapshot status:** historical pre-#273 evidence at inventory `904c49a3…fe391`. Current Product `main@46a52e76` is documented in [the post-#273 successor](authoring-provenance-source-map-post-273-2026-11-14.md).


## Scope and result

Product checkout: `work/arc13-ui-inventory-20261112@db908e5cdd0c88c9732e8769b23e474b5790c064`.
Current inventory SHA-256: `904c49a3b32722ece528a468e030b10800def07a61cbcf5811f01bfd00cfe391`.
Current manifest SHA-256: `efd62baac8fd9f2002a18c8b508a85a46ccf734a21e020745005067f2bed0dc7`.

The ARC-03C compiler now emits a positional source map in `architecture/generated/primary-pages.manifest.json` schema `/2`. The map uses Unicode code-point offsets and is built while each page is composed from its authoring page, the shared header fragment, route configuration, and explicit compiler rules. The scanner validates the compiler, fragment, route-config, source-page, and generated-output Git blob hashes; verifies gap-free, non-overlapping output coverage; and checks each mapped output range against the declared positional source or transformation.

The ARC-13 inventory schema is now `4`. Its `authoring` field is additive: `source`, published line/column, `sourceSha256`, `id`, `owner`, and `routeConsumers` retain their existing meaning. The raw start-tag tokenizer finds complete attribute-value ranges without comparing decoded values to choose origins. Text ranges are checked against the raw output after HTML entity decoding. A span that crosses a map boundary or fails a hash/content check stays in the candidate list with `authoring.status: unresolved`.

The source-map scope is exactly the 411 retained HTML sink entries in these generated outputs:

| Published output | Route | Entries |
|---|---|---:|
| `app/index.html` | `/` | 53 |
| `app/about/index.html` | `/about/` | 56 |
| `app/how-it-works/index.html` | `/how-it-works/` | 302 |

All 411 map successfully: 378 to their page authoring source and 33 to the shared header fragment. This set includes 31 `html-reference` entries that are intentionally non-translatable; their provenance is useful for traceability, not localization. The separate 11-entry HTML exclusion ledger is outside this 411-entry scope and still does not carry `authoring`.

## Preserved inventory identity

The regeneration retained all 1,012 sink IDs and order. For every ID, the existing `source`, `line`, `column`, `kind`, `sink`, `expression`, `sourceSha256`, `owner`, and `routeConsumers` remain identical to the previous inventory at `8765873a096fe95167e4fba74838258e47428fab0e12d16af9b6c92a3e34a51e`. Counts remain 600 HTML occurrences, 412 JavaScript sink sites, and 359 separate JavaScript source records. Classification and source/sink relationship overlays are not recalculated by the new authoring field.

The 412 JavaScript sinks and 359 source records are separate cohorts; the source map does not attribute them. The three generated HTML files remain byte-for-byte unchanged. Only the compiler, scanner, generated manifest, generated inventory, and documentation changed in this provenance increment.

## Generation and validation evidence

- `node scripts/compile-primary-pages.mjs --sync` regenerated the manifest and verified gap-free map coverage while composing the outputs.
- The inventory generator completed with 411 mapped primary-page HTML occurrences and zero unresolved occurrences; totals remained 1,012 sinks and 359 source records with zero parser errors.
- An ID comparison against the previous inventory found zero added/missing IDs and zero changes to the preserved identity, owner, or route-consumer fields.
- No application test suite or browser/assistive-technology review was run for this documentation/provenance increment. This is not runtime accessibility evidence.

## Review overlay handoff

The 2026-11-13 sink and source receipts remain historical snapshots tied to their original inventory hash. Successor receipts must record the current inventory hash above and confirm that their existing IDs/dispositions are unchanged. The Admin state-control review remains at inventory `8765873a…a51e` as dated source evidence; add a revalidation link rather than rewriting that earlier claim. No application-copy classification, canonical key, locale policy, or runtime behavior is decided here.
