# R5A — module-02-hidden photographic completion

Status: in progress

## Goal

Complete the deterministic `module-02-hidden` variant without changing the canonical default. The target variant fingerprint at R5A start is `scene2d-e990f538`.

R5A now splits the repair into two narrowly-scoped photographic roles:

1. `module-03-left-termination` — finishes only the physically visible left termination of module 03 when module 02 is absent;
2. `range-freestanding` — supplies only the conventional freestanding range.

The two candidates are reviewed individually and again as the ordered set `module-02-hidden-complete`.

## Corrected physical interpretation

The first R5A prototypes A/B were rejected because they invented a full-height divider/side panel. That geometry is not supported by the fixed camera view.

The canonical post-R4 frame gives a narrower, measurable interpretation:

- existing left edge of module 03 stone/cabinet: `x=736`;
- backsplash visible edge: approximately `y=520..568`;
- countertop/front transition: approximately `y=568..589`;
- cabinet face remains aligned at `x=736` below the stone.

Therefore the repair is **not** a bay-filling panel. It is a short stone termination: preserve the vertical backsplash edge, then expose only the small rounded/chamfered countertop return/overhang that the camera can physically see. The cabinet front below must remain untouched unless later evidence proves a small side reveal is visible.

## Canonical authoring frame

The authoring source is the exact 1536×1024 frame generated from the repository scene, never a semantically similar reconstruction:

- canonical empty room: `app/assets/kitchen/base.png`;
- target variant: `module-02-hidden`;
- target fingerprint: `scene2d-e990f538`;
- fixed origin: `(0,0)`.

Known anchors retained from the current assets:

- module-02 layer alpha bbox: `[498,590,757,856]`;
- stone-02 alpha bbox: `[484,491,764,912]`;
- module-03 measured left edge: `x=736`.

## Measured ROI

- termination authorized ROI: `[720, 510, 755, 600]`;
- range authorized ROI: `[460, 430, 790, 950]`;
- canvas: `1536 × 1024`, origin `(0,0)`.

The termination ROI is a maximum authoring envelope, not permission to fill the whole rectangle. The expected candidate alpha bounds are much smaller.

## Delta extraction contract

`review-assets/authoring-contracts.json` binds the termination and range roles to `edit-existing-canonical-frame`. After an image edit returns a full frame, `tools/extract_candidate_delta.py` compares it against its exact source frame.

Hard gates:

- source and edited frames must both be 1536×1024;
- visible RGB diff must be non-empty;
- visible diff outside the role ROI must be exactly 0 pixels;
- the candidate is a transparent 1536×1024 layer containing only changed replacement pixels;
- recomposing `source + candidate` must reproduce the edited frame with exactly 0 RGB mismatch pixels;
- candidate metadata records source-frame SHA, edited-frame SHA, extraction report and required source references.

The range pass additionally requires the selected `module-03-left-termination` context.

## Candidate set

`review-assets/candidate-sets.json` declares the order:

```text
module-02-hidden
  + module-03-left-termination
  + range-freestanding
```

Selection is fail-closed:

- zero structurally valid candidates for a required role → `INCOMPLETE`, not approval;
- more than one structurally valid candidate for a required role → `FAIL / SET_ROLE_AMBIGUOUS`;
- exactly one per role → deterministic composition in declared order.

The set gate independently verifies that visible change is confined to the union of the selected candidate ROIs. Set approval is bound to the exact candidate SHA-256 values and requires the complete set-level visual checklist in addition to each candidate's own approval.

## Visual gate for the termination

The termination candidate must satisfy all of the following:

- backsplash edge remains natural;
- countertop corner/return follows the fixed-camera perspective;
- stone overhang is physically plausible and small;
- no full-height divider or forced side panel is introduced;
- module 03 cabinet face is unchanged;
- neighboring modules are unchanged;
- lighting/material continuity is preserved;
- no seam or background leak is visible.

## Hard invariants

- default composition remains pixel-identical through candidate authoring;
- no candidate is repositioned, scaled or reframed at runtime;
- candidate files are full-canvas RGBA at final coordinates;
- generation/editing may author pixels only offline;
- no promotion occurs merely because metadata says `APPROVED`;
- `module-03-hidden` remains out of R5A and is handled by the later right-endcap slice.

## Authoring sequence

1. render exact `module-02-hidden` from the current scene core;
2. author only `module-03-left-termination`;
3. extract changed pixels inside the narrow termination ROI;
4. pass structural + provenance + individual visual gates;
5. visually inspect the termination before continuing;
6. compose the selected termination candidate on the variant;
7. author the freestanding range against that corrected context;
8. extract the range candidate inside its authorized ROI;
9. pass structural + individual visual gates;
10. run stacked set gate and inspect the combined artifact;
11. only after exact-hash approval, promote both runtime assets and update scene substitutions.
