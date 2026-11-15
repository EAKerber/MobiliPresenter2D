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
