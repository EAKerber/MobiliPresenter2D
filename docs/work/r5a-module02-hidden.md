# R5A — module-02-hidden photographic completion

Status: in progress

## Goal

Complete the deterministic `module-02-hidden` variant without changing the canonical default. The target variant fingerprint at R5A start is `scene2d-e990f538`.

R5A splits the visual repair into two independent photographic roles:

1. `module-02-bay-completion` — repairs raw architectural/stone/cabinet terminations exposed when module 02 is hidden;
2. `range-freestanding` — supplies only the conventional freestanding range.

The two candidates are reviewed individually and again as the ordered set `module-02-hidden-complete`.

## Canonical authoring frame

The authoring source is not a prompt-created approximation of a kitchen. It is the exact 1536×1024 frame generated from the repository scene:

- canonical empty room: `app/assets/kitchen/base.png`;
- target variant: `module-02-hidden`;
- target fingerprint: `scene2d-e990f538`;
- fixed origin: `(0,0)`.

Known geometric anchors in the current assets:

- module-02 layer alpha bbox: `[498,590,757,856]`;
- stone-02 alpha bbox: `[484,491,764,912]`;
- module-03 begins at approximately `x=736`.

The image model may be used only as an offline localized editor of this full frame. A newly composed scene with merely semantic similarity is not a valid candidate source.

## Measured ROI

The exact post-R4 variant was rendered by `Candidate asset gates` on PR #8 before the role was frozen.

- bay-completion authorized ROI: `[470, 480, 780, 930]`;
- range authorized ROI: `[460, 430, 790, 950]`;
- canvas: `1536 × 1024`, origin `(0,0)`.

The ROI is a maximum authoring boundary, not an instruction to fill the whole rectangle. The final candidate alpha is derived from the actual changed pixels.

## Delta extraction contract

`review-assets/authoring-contracts.json` binds the bay and range roles to `edit-existing-canonical-frame`. After an image edit returns a full frame, `tools/extract_candidate_delta.py` compares it against its exact source frame.

Hard gates:

- source and edited frames must both be 1536×1024;
- visible RGB diff must be non-empty;
- visible diff outside the role ROI must be exactly 0 pixels;
- the candidate is a transparent 1536×1024 layer containing only changed replacement pixels;
- recomposing `source + candidate` must reproduce the edited frame with exactly 0 RGB mismatch pixels;
- candidate metadata records source-frame SHA, edited-frame SHA, extraction report and required source references.

For bay completion the required references are the canonical `base.png` and `variant:module-02-hidden@scene2d-e990f538`. The later range pass additionally requires the selected bay-completion context.

## Candidate set

`review-assets/candidate-sets.json` declares the order:

```text
module-02-hidden
  + module-02-bay-completion
  + range-freestanding
```

Selection is fail-closed:

- zero structurally valid candidates for a required role → `INCOMPLETE`, not approval;
- more than one structurally valid candidate for a required role → `FAIL / SET_ROLE_AMBIGUOUS`;
- exactly one per role → deterministic composition in declared order.

The set gate independently verifies that visible change is confined to the union of the selected candidates' authorized ROIs. Set approval is bound to the exact candidate SHA-256 values and requires the complete set-level visual checklist in addition to each candidate's own approval.

## Hard invariants

- default composition remains pixel-identical through candidate authoring;
- no candidate is repositioned, scaled or reframed at runtime;
- candidate files are full-canvas RGBA at final coordinates;
- generation/editing may author pixels only offline;
- no promotion occurs merely because metadata says `APPROVED`;
- `module-03-hidden` remains out of R5A and is handled by the later right-endcap slice.

## Authoring sequence

1. render exact `module-02-hidden` from the current scene core;
2. use that exact full frame as the primary image-edit target;
3. author bay completion without a range and without changing any remote pixel;
4. run deterministic delta extraction and require 0 outside-ROI change + 0 round-trip mismatch;
5. pass authoring provenance, structural and individual visual gates;
6. visually inspect the bay candidate before continuing;
7. compose the selected bay candidate on the variant;
8. use that exact corrected full frame as the source for the range edit;
9. extract and gate the range candidate in the same way;
10. run stacked set gate and inspect combined artifact;
11. only after exact-hash approval, promote both runtime assets and update scene substitutions.
