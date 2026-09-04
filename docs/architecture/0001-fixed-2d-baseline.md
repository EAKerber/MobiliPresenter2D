# ADR 0001 — Fixed photographic 2D baseline

Status: Accepted for R0
Date: 2026-09-03

## Decision

MobiliPresenter2D uses a fixed-camera photographic 2D compositor as its visual authority.

The canonical logical canvas is 1536 × 1024 px. Approved composition assets share a common origin and are overlaid at (0,0). Runtime code must not independently reposition, crop, reframe or rescale individual canonical layers. Responsive behavior scales the whole composition uniformly.

AI may be used offline to manufacture or repair assets, but generated output only enters the runtime after explicit approval and versioning. AI is never a runtime geometry, visibility or appearance authority.

## Authorities

- Scene/catalog data: IDs, ordering, relations, defaults and asset references.
- Approved assets: final photographic pixels.
- Viewer state: current user choices.
- UI/DOM/exported summaries: derived representations only.

## R0 constraint

R0 freezes an exact previously approved baseline before architectural refactoring. Documentation or chat history is insufficient to recreate that baseline. The exact source bytes are required.

The intended source checkpoint is the historical `casa-em-modulos-configurador` v3.3.0 checkpoint, reported to contain separated stone layers for modules 02/03 and a zero-pixel-difference default recomposition. Until those bytes are imported and independently validated, baseline status remains `UNMATERIALIZED`.

## Consequence

No R1 data-model migration, new finish, generated replacement, UI redesign, technical-view work or Netlify production publication may claim R0 completion while the baseline is unmaterialized.
