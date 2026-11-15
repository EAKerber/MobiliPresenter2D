# ARC-13 inventory reconciliation after Product main `46a52e76` — 2026-11-14

## Current identity

- Product base: `EAKerber/MobiliPresenter2D main@46a52e76a0eeae4bed4b567b12da5311ed90b475`.
- Current generated inventory: `architecture/arc13/ui-text-candidates.json`, SHA-256 `b3739e5ff57005600665cc6c1a04fbe986649b8f8e8e9b80a6fb09b2d3adf178`, 1,021 sink occurrences and 359 JavaScript source records.
- Current page manifest: `architecture/generated/primary-pages.manifest.json`, SHA-256 `73413efe609ad240a4c52e21752ad85fe31ddf997a04e82cbc1db77e1e62fc3e`.
- Earlier review receipts cite inventory SHA-256 `904c49a3…fe391`; that complete report is not available as a Git blob here. The committed schema-3 report at SHA-256 `8765873a096fe95167e4fba74838258e47428fab0e12d16af9b6c92a3e34a51e` is its semantic identity counterpart. The dated source-map receipts state that the additive update from `8765873a` to `904c49a3` preserved all 1,012 sink IDs and 359 source IDs and did not change dispositions.

## Sink disposition continuity

- 977 sink IDs remain unchanged. Another 34 exact-content records have position-derived IDs: 28 remaps are unique fingerprints and six records belong to three repeated-fingerprint groups. The prior disposition is uniform inside each ambiguous group, so it can be carried at group level without inventing individual pairings. See [`inventory-crosswalk-2026-11-14.json`](inventory-crosswalk-2026-11-14.json).
- One Home image alternative changed from “Ambiente planejado com a interface Casa em Módulos” to “Ambiente planejado com uma apresentação da Casa em Módulos no celular”. The independent judgment recommends `catalog_candidate` only if it accurately describes the revised artwork. Owner confirmation remains pending.
- Nine new occurrences have first-pass common-sense recommendations in the crosswalk. Eight look like fixed interface or accessibility text; “Mais informações” labels a generic `div` and needs an accessibility-semantics check before classifying it as catalog copy. “Saiba mais” is the phrase the owner requested; its exact wording is settled, while extraction and key decisions remain open.
- Prior sink decisions carry to 1,011 exact-fingerprint records. The changed alt and nine new occurrences remain pending. No canonical key or runtime extraction is authorized here.

## JavaScript source disposition continuity

- 343 source IDs are unchanged; 15 source records have exact position-only ID remaps. All 358 dispositions remain traceable through the fingerprint crosswalk.
- The Error literal “Imagem indisponível” moved from `app/landing/landing.js:54` to `:135`; current row `6083475eb5f05e96` no longer includes the previous diagnostic/fallback link. The rejection callback discards that Error and displays the fixed fallback “Imagem temporariamente indisponível.” at sink `5fc74ea3cdccd345`. Independent review revalidates the source as `diagnostic` and records the manually traced fallback. The scanner still requires manual flow review for this relation.

## Page authoring provenance

- Current schema-4 inventory maps 419 retained HTML sinks: 386 to page sources and 33 to the shared header fragment; zero unresolved. Route counts are `/` 60, `/about/` 56, and `/how-it-works/` 303. See [`authoring-provenance-source-map-post-273-2026-11-14.md`](authoring-provenance-source-map-post-273-2026-11-14.md).
- The generated report still marks 1,021 occurrences unreviewed. This reconciliation keeps dispositions in separate overlays and preserves the earlier dated receipts as historical snapshots.

## Remaining owner choice

- Confirm whether the revised Home alt accurately describes the hero artwork. The full-screen strings have distinct accessibility roles; whether to align “Abrir vídeo em tela cheia”, “Tela cheia”, and “Expandir em tela cheia” is a P2 consistency choice, not an established defect.

## Verification and scope

- `node scripts/compile-primary-pages.mjs --check`: PASS.
- `npm run inventory --prefix tools/arc13`: PASS; 1,021 sinks, 359 source records, 419 mapped, zero unresolved.
- Application test suite, preview, and deploy were not run for this provenance update. Product runtime release is the separate PR #273 squash at `main@46a52e76`.
- This is a provenance/review overlay update. It does not activate localization, change public copy, or merge/release the Design System handover.
