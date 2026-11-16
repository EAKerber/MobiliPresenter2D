# ARC-13 inventory after the video-control update — 2026-11-16

## Snapshot and lineage

- Product snapshot: `EAKerber/MobiliPresenter2D main@efc40584c3f3ca940cf6cbca408f8fda31e3e1c9`, tree `439fb0fc9a3295f9e45486198e9de83fca8376ee`.
- The inventory was regenerated from that Product source together with the ARC-13 scanner in this Draft. The report is `architecture/arc13/ui-text-candidates.json`, SHA-256 `abce38889ad6d78c634fadad5d6f0c63fd9706ac3e0c13bcdf13f78010caeb9e`.
- The ARC-03C manifest was regenerated from `architecture/pages`, with SHA-256 `f313c87db4bf4dafc69d8264ae36e2e60bd37017f7fe87571a1acc185595c9af`.
- The prior comparison point is the exact source tree at PR #274's previous head `68441080f1ba29f546e6f97926e487a945f7fa2f` (based on Product `main@46a52e76`). Its committed inventory blob is not usable as JSON: SHA-256 `3513487ff970876215540b2fb8c8318e81e3b7b9058d9cc5a9191daf67473d77` contains a literal truncation marker inside a candidate value and fails strict JSON parsing. The earlier crosswalk declares `b3739e5ff57005600665cc6c1a04fbe986649b8f8e8e9b80a6fb09b2d3adf178`, which does not match that Git blob. To avoid using the damaged artifact as a comparison source, the exact old tree was rescanned with the same scanner files and pinned `acorn@8.19.0`, with LF checkout and no source changes. That valid regenerated baseline is SHA-256 `4e5c81e286cbab81b3b6a69ad7fe899d4e10c940df629aed34a090ed6e38a819`.
- `inventory-crosswalk-post-277-2026-11-16.json` records both report identities, sink and source ID continuity, changed entries, and the manual runtime-text supplement. The 2026-11-14 reconciliation and review receipts remain point-in-time records.

## Inventory delta

| Measure | Regenerated baseline | Current Product main | Change |
|---|---:|---:|---:|
| Sink occurrences | 1,021 | 1,026 | +5 |
| HTML sink occurrences | 608 | 609 | +1 |
| JavaScript sink sites | 413 | 417 | +4 |
| JavaScript source records | 359 | 360 | +1 |
| Mapped primary-page authoring occurrences | 419 | 420 | +1 |
| Unresolved authoring occurrences | 0 | 0 | 0 |

Of the 1,026 current sink occurrences, 982 retain their IDs and 36 have position-only ID changes across 33 exact-content groups. Three groups contain repeated identical text, so their continuity is recorded as groups rather than invented one-to-one pairings. Eight sink records are semantically new and three old records no longer exist; the net inventory change is five. The full grouped mapping is in the JSON crosswalk.

For JavaScript source records, 343 IDs remain unchanged, 16 records have position-only ID changes, one new diagnostic source is recorded, and none were removed. The new error text is not shown to users; the catch handler removes the failed player iframe and restores the poster.

## Video controls and poster

- `app/how-it-works/index.html` no longer has visible text “Expandir em tela cheia”. Its icon button now has `aria-label` and `title` “Abrir vídeo em tela cheia” (current IDs `1fb12e3eb303d497` and `fbd8581d0d6f8053`). This is fixed control copy and a reasonable catalog candidate; key and extraction remain undecided.
- Home's fullscreen `title` changed from “Tela cheia” (`e84c51cae0cd9c6e`) to “Abrir vídeo em tela cheia” (`d6d455c085c0c21f`). The existing Home `aria-label` remains “Abrir vídeo em tela cheia” and is now `c2c6bd2c037ca454` after positional remapping. The Home and Como funciona controls now use the same default wording; no shared catalog key is created by this reconciliation.
- On both pages, entering fullscreen changes the control's `aria-label` and `title` to “Sair da tela cheia”. The scanner records four JavaScript sink sites for those attribute writes (`49ccb254d443d4ab`, `35eff8c8551d4683`, `f106ae7ba0829c5b`, and `ad71d3fcca0702ed`), but its `sourceEntries` do not expose the two conditional string values. The JSON crosswalk therefore records the exact source lines and values as a manual supplement, without counting them as extra sinks. Treat both labels as fixed control copy; catalog keys and runtime extraction remain open.
- The Home poster alternative changed from “Ambiente planejado com uma apresentação da Casa em Módulos no celular” (`fef001dc224c5527`) to “Cozinha planejada com uma mão segurando um celular” (`dcd455a9fecf63aa`). The new wording is a plausible description of the revised artwork, but the earlier alt disposition does not carry across changed content. Owner confirmation of its accuracy remains pending.
- The current Home iframe title remains “Casa em Módulos — apresentação institucional” at `app/landing/landing.js:126` (current sink `244f37c8af92a834`). The existing poster group and play labels remain present; the play-label ID is now `c014317c6b745a6e` due to source-position changes.

## Existing decisions and diagnostic sources

- The owner-approved Home wording “Saiba mais” and destination `/about/` remain unchanged at sink `e185d906c6f85858`. This does not approve a catalog key or runtime extraction.
- “Mais informações” remains at `bda52494adf51488`, now on an element with `role="group"` after the integrated markup correction. The earlier generic-element concern is resolved in current source; catalog disposition and assistive-technology review remain separate.
- The old hero image Error “Imagem indisponível” moved from line 135 to line 229 (source ID `6083475eb5f05e96` → `32cad218d633d924`). Its rejection callback still discards the Error and displays the fixed fallback “Imagem temporariamente indisponível.” (`app/index.html:67`); retain its diagnostic classification.
- The new source “Não foi possível carregar o player do YouTube.” (`fac95c91f9fb8815`, `app/landing/landing.js:92`) is also diagnostic: the rejection is caught, the failed iframe is removed, and the poster is restored. It is not visible UI copy and should not be added to the translation catalog.
- In the #277 review on 2026-11-16, the owner confirmed that the final video treatment pleased the decision-maker. This records acceptance of the visual presentation and controls on Home and Como funciona. It does not approve the Home alt wording, translation keys, catalog membership, extraction, or assistive-technology behavior. Prior review dispositions carry only across exact semantic matches; changed values remain pending.

## Validation and limits

- `node scripts/compile-primary-pages.mjs --sync`: PASS; three generated pages use `architecture/pages` as authority.
- `npm run inventory --prefix tools/arc13`: PASS; current JSON parses, 1,026 sink occurrences, 360 source records, zero JS parse errors, 420 mapped authoring occurrences, zero unresolved.
- Product runtime code did not change in this inventory update. The application test suite, screen-reader review, browser preview, and deploy were not run here.
- This is a bounded candidate inventory, not a translation catalog. Exact content/source continuity is recorded separately from owner decisions about copy, keys, and extraction.
