# Retired consumed workflow receipts — 2026-11-24

These seven development-only workflow files contained read-only `echo` receipts for one-shot operations already consumed. Each declared only `workflow_dispatch`; because the files were absent from the default branch, that event was not a dependable entry point. They had no downstream workflow references at the exact development pin `93aa7808b5d92bd3f6f529c624e6a78b9b4a3562`.

The original blobs remain recoverable from Git history and are recorded below. Existing Actions run records remain in GitHub; the links identify historical outcomes, not current gate executions.

| Former workflow path | Original blob | Historical run | Record |
|---|---|---|---|
| `.github/workflows/development-access-dto-aux-retire.yml` | `a254ceadb572375e2a5cefaf97bebd485e385354` | [#40566796709](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40566796709) | CP-PUBLIC-03a auxiliary retirement receipt; no mutation. |
| `.github/workflows/development-aux-retirement.yml` | `b94c7561bc85285634268b12226b96a72a7c5d35` | No run pin in source. | A1/A2 consumed placeholder; explicitly says the workflow cannot delete refs. |
| `.github/workflows/development-nav-aux-retire.yml` | `68dec5e02243f9de35790ca6b078399687c8fd1d` | [#40553115848](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40553115848) | NAV-05 auxiliary cleanup receipt; no mutation. |
| `.github/workflows/development-public-dto-aux-retire.yml` | `c8131dbb7628140aaf758768f404f2fddac09896` | [#40563727219](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40563727219) | CP-PUBLIC-03 DTO auxiliary receipt; no mutation. |
| `.github/workflows/development-scene-asset-aux-retire.yml` | `ec527be624e0a1e2f2b6e43f68c54847dbe4f072` | [#40572051580](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40572051580) | asset-provenance auxiliary retirement receipt; no mutation. |
| `.github/workflows/development-viewer_price_aux-retire.yml` | `ebfc1f4fd04df96f04b203d36bdc034a5611e918` | [#40569779277](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40569779277) | Viewer price auxiliary retirement receipt; no mutation. |
| `.github/workflows/development-vis002-aux-retire.yml` | `98f6e0a67adc29fa954f57e183db51885f701895` | [#40557142349](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40557142349) | VIS002 one-shot hygiene receipt; no mutation. |

The separate `development-pr-archive.yml` remains in place and untouched. It has a write-capable apply job with an unreachable event condition and requires its own exact-manifest review.
