# ARC-13 owner decisions — 2026-11-14

## Home-link accessible name

**Owner choice:** retain the comma in the current Portuguese-Brazilian wording **“Casa em Módulos, início”**.

This resolves the punctuation choice raised by the source review. It does not authorize runtime extraction, catalog-key consolidation, or a UI code change. The six current sink occurrences remain individually traceable and keep their existing classifications:

| Sink ID | Published source | Route |
|---|---|---|
| `2f0337ef2f5c5e9a` | `app/about/index.html` | `/about/` |
| `b48d3866e85996bd` | `app/access/index.html` | `/access/` |
| `81a6d89bbdea70bc` | `app/access/manage.html` | `/access/manage` |
| `7b0753494b736d68` | `app/admin.html` | `/admin` |
| `a4f19243c147b4fb` | `app/how-it-works/index.html` | `/how-it-works/` |
| `6c06f82283064a24` | `app/index.html` | `/` |

The three public-page occurrences generated from ARC-03C point to the shared header fragment in the current source map. The other three are separate published records. Identical wording does not by itself make their source owners or future catalog keys identical.

Decision recorded against inventory SHA-256 `904c49a3b32722ece528a468e030b10800def07a61cbcf5811f01bfd00cfe391` and Product source branch `work/arc13-ui-inventory-20261112@db908e5cdd0c88c9732e8769b23e474b5790c064`.

## Revalidated on Product main after PR #273 — 2026-11-14

The six `Casa em Módulos, início` sink records remain present in the current inventory `b3739e5ff57005600665cc6c1a04fbe986649b8f8e8e9b80a6fb09b2d3adf178`, with the owner-approved comma preserved. Their current IDs are unchanged: `2f0337ef2f5c5e9a`, `b48d3866e85996bd`, `81a6d89bbdea70bc`, `7b0753494b736d68`, `a4f19243c147b4fb`, and `6c06f82283064a24`. The home and public-page instances continue to trace to the shared header fragment where applicable. The original owner choice above remains limited to punctuation; it does not authorize shared keys or extraction.

## Home hero navigation link — “Saiba mais”

**Owner choice (2026-11-14):** use the visible wording **“Saiba mais”** for the text link on the Home hero and navigate to `/about/`. This records the user's explicit request for a text link to the About page.

- Current sink: `e185d906c6f85858` in `app/index.html:34`, inventory SHA-256 `b3739e5ff57005600665cc6c1a04fbe986649b8f8e8e9b80a6fb09b2d3adf178`.
- The wording and destination are settled. This does not choose a canonical catalog key, authorize runtime extraction, or change the generated inventory; those remain separate decisions.


## Inventory identity erratum — 2026-11-17

The 2026-11-14 sections above preserve the owner choices and inventory statements as recorded at that time. The cited report hash `b3739e5ff57005600665cc6c1a04fbe986649b8f8e8e9b80a6fb09b2d3adf178` was later found not to match the committed inventory blob. The actual old blob hash was `3513487ff970876215540b2fb8c8318e81e3b7b9058d9cc5a9191daf67473d77`; that report contained a literal truncation marker and failed strict JSON parsing. It must not be treated as valid byte-level evidence for the statements above.

The current strict-valid report was regenerated from Product `main@efc40584c3f3ca940cf6cbca408f8fda31e3e1c9` and has SHA-256 `abce38889ad6d78c634fadad5d6f0c63fd9706ac3e0c13bcdf13f78010caeb9e`. The post-#277 [reconciliation](inventory-reconciliation-post-277-2026-11-16.md) and [crosswalk](inventory-crosswalk-post-277-2026-11-16.json) carry the current artifact identity and continuity evidence. The comma choice for “Casa em Módulos, início” and the “Saiba mais” destination remain content decisions; this erratum does not approve alt accuracy, semantic classification, catalog keys, or extraction.
