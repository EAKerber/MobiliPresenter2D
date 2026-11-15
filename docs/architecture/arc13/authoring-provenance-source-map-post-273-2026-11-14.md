# ARC-03C authoring provenance after Product main `46a52e76` — 2026-11-14

This is the current successor to [`authoring-provenance-source-map-2026-11-14.md`](authoring-provenance-source-map-2026-11-14.md). The earlier document is a pre-#273 snapshot at inventory SHA `904c49a3…fe391`, not the current count.

## Current scope

- Product source base: `main@46a52e76a0eeae4bed4b567b12da5311ed90b475`.
- Current inventory: `architecture/arc13/ui-text-candidates.json` schema 4, SHA-256 `b3739e5ff57005600665cc6c1a04fbe986649b8f8e8e9b80a6fb09b2d3adf178`.
- Current page manifest: `architecture/generated/primary-pages.manifest.json` schema `/2`, SHA-256 `73413efe609ad240a4c52e21752ad85fe31ddf997a04e82cbc1db77e1e62fc3e`.
- The positional map covers **419 retained HTML sink occurrences**. All 419 map successfully; zero are unresolved.

| Published output | Route | Mapped occurrences |
|---|---|---:|
| `app/index.html` | `/` | 60 |
| `app/about/index.html` | `/about/` | 56 |
| `app/how-it-works/index.html` | `/how-it-works/` | 303 |

Origin rollup: 386 occurrences point to authored page files and 33 to the shared header fragment. The map continues to validate compiler/source/fragment/route/output hashes, gap-free coverage, and content at each mapped range using Unicode code-point offsets. ID-reference records remain traceable but non-translatable. The HTML exclusion ledger and JavaScript sinks are outside this positional map.

## Change from the earlier snapshot

The pre-#273 report described 411 mapped occurrences (`53/56/302`) from 1,012 total sinks. Product main `46a52e76` changes the Home and How It Works pages; the current authoring sources now map 419 occurrences (`60/56/303`) from 1,021 total sinks. This provenance update describes the already released main output. It does not change runtime behavior or establish browser/accessibility evidence.

## Local validation

- `node scripts/compile-primary-pages.mjs --check`: PASS.
- `npm run inventory --prefix tools/arc13`: PASS; mapped 419, unresolved 0.
- The application suite and browser review were not run for this provenance update.
