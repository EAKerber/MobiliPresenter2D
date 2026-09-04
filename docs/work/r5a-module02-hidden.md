# R5A — module-02-hidden photographic completion

Status: in progress

## Goal

Complete the deterministic `module-02-hidden` variant without changing the canonical default. The target variant fingerprint at R5A start is `scene2d-e990f538`.

R5A splits the visual repair into two independent photographic roles:

1. `module-02-bay-completion` — repairs raw architectural/stone/cabinet terminations exposed when module 02 is hidden;
2. `range-freestanding` — supplies only the conventional freestanding range.

The two candidates are reviewed individually and again as the ordered set `module-02-hidden-complete`.

## Measured ROI

The exact post-R4 variant was rendered by `Candidate asset gates` on PR #8 before the role was frozen.

- bay-completion authorized ROI: `[470, 480, 780, 930]`
- range authorized ROI: `[460, 430, 790, 950]`
- canvas: `1536 × 1024`, origin `(0,0)`

The bay ROI is deliberately wider than the expected opaque repair pixels so the authoring pass can finish both exposed terminations and their contact surfaces without touching remote modules.

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
2. author bay completion without a range;
3. extract only changed pixels inside the bay ROI into a transparent full-canvas candidate;
4. pass structural + individual visual gates;
5. compose the approved/selected bay candidate on the variant;
6. author the freestanding range against that corrected context;
7. extract the range candidate inside its authorized ROI;
8. pass structural + individual visual gates;
9. run stacked set gate and inspect combined artifact;
10. only after exact-hash approval, promote both runtime assets and update scene substitutions.
