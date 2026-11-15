# ARC-13 sink triage after Product PR #273 — 2026-11-14

## Source and boundary

- Product snapshot reviewed: `main@46a52e76a0eeae4bed4b567b12da5311ed90b475`.
- Inventory: SHA-256 `b3739e5ff57005600665cc6c1a04fbe986649b8f8e8e9b80a6fb09b2d3adf178`.
- Crosswalk: `inventory-crosswalk-2026-11-14.json`, reviewed on Product PR #274 before this receipt.
- PR #273 visual work changed the Home hero and added a video surface. This triage separates exact copy evidence from decisions about catalog keys, shared ownership, or runtime extraction.

## Changed and new sinks

| Current ID | Source and value | Evidence-based triage | Still open |
|---|---|---|---|
| `fef001dc224c5527` | `app/index.html:40` — alt “Ambiente planejado com uma apresentação da Casa em Módulos no celular” | The old sink `931d2fdd94d6cced` had different content, so its old disposition/key cannot be mechanically transferred. | Owner/content review that the new alt accurately describes the revised artwork; then decide catalog key separately. |
| `fbd72115b1e559f2` | `app/how-it-works/index.html:40` — visible button “Expandir em tela cheia” | Fixed interface text; `catalog_candidate` is supported. | Key/extraction are undecided. |
| `bda52494adf51488` | `app/index.html:33` — `aria-label="Mais informações"` on a generic `div` | Do not treat as catalog copy before checking whether the label has valid, exposed semantics. | Accessibility/markup semantics first. |
| `e185d906c6f85858` | `app/index.html:34` — “Saiba mais” | Fixed link text; `catalog_candidate` is supported. The owner explicitly chose this wording and the `/about/` destination. | Catalog key and runtime extraction remain separate decisions. |
| `0c5db734ff22f8ae` | `app/index.html:35` — “Assistir no YouTube ↗” | The same broad candidate category is supported by the earlier “Assistir no YouTube” record `22e1d16b89003128` on Como funciona. | Do not reuse its route-specific key. Decide whether the arrow is localized text or a decorative convention. |
| `1deb819af5cc5953` | `app/index.html:41` — group name “Vídeo de apresentação no celular” | Fixed accessible group name; `catalog_candidate` is supported. | Key/extraction are undecided. |
| `3abe647cf8ac759d` | `app/index.html:43` — button name “Reproduzir o vídeo de apresentação” | Fixed accessible button name; `catalog_candidate` is supported. | Key/extraction are undecided. |
| `e84c51cae0cd9c6e` | `app/index.html:47` — tooltip `title="Tela cheia"` | Fixed tooltip; `catalog_candidate` is supported. | Review together with the same control's `aria-label`, not as an unrelated phrase. |
| `fd28c05616bfb437` | `app/index.html:47` — accessible name “Abrir vídeo em tela cheia” | Fixed accessible button name; `catalog_candidate` is supported. | Check consistency with visible text “Expandir em tela cheia” and tooltip “Tela cheia”. |
| `93f686ffaaeffa8e` | `app/landing/landing.js:73` — iframe title “Casa em Módulos — apresentação institucional” | The earlier iframe title with the same text, sink `e019bfe82b9d8ad4` on Como funciona, supports the same broad candidate category. | Do not reuse the Como funciona route key for Home. |

## Disposition

The changed alt and nine new sinks remain unreviewed in the generated inventory, and all ten still have `ownerDisposition: pending` in the crosswalk. The triage resolves only evidence-based classification recommendations and the already owner-approved “Saiba mais” wording/destination; it does not create or approve a canonical key, catalog membership, or runtime migration.

No Product runtime or generated inventory changed. No tests, preview, or deploy were run for this triage.


## Follow-up after opening PR #275 — Draft

The row `bda52494adf51488` remains pending against the reviewed `main@46a52e76` snapshot: its source is still a generic `div` named with `aria-label`. A separate Draft, [Product PR #275](https://github.com/EAKerber/MobiliPresenter2D/pull/275), proposes `role="group"` for “Mais informações” and keeps the canonical page, generated HTML, and source/output hashes synchronized. The change is not in `main` yet and has not been validated with a screen reader. Keep the inventory disposition pending until review and integration; this follow-up does not create a catalog key or approve runtime extraction.
