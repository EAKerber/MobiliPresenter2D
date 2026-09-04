# Baseline visual debt

Status: observed against canonical v3.3.0 bytes

The R0 source is now materialized and validated. This record distinguishes historical concerns from defects actually observable in the canonical default and in deterministic non-default variants.

## Default canonical composition

Observed against `scene2d-89ce17bc` and the exact v3.3.0 golden:

- **Column definition / tile phase:** the previously reported flat-reading column is not reproduced as an active defect in the imported default. The fridge lateral reads as a distinct vertical element through its material, edge and shadow. Keep as historical context, not an open repair item.
- **Module 03 → module 04 contact:** no incoherent overlap or open seam is visible in the default. Keep under regression observation because neighboring visibility changes can expose raw cuts.
- **Stone split 02/03:** the split itself introduces no new visual seam. The default full recomposition remains zero pixels different from the approved golden, so any visible texture transition belongs to the frozen source rather than to the 3.3.0 separation operation.
- **Cooktop/pans stone artifact:** the previously reported grid-like reconstructed cuts are not visible in the canonical default. This is treated as resolved before the 3.3.0 freeze.

No default asset is changed by this review.

## Confirmed non-default debt

The deterministic variant harness confirms two real debts:

### `raw-neighbor-cut`

When `module-02` or `module-03` is hidden, the remaining neighboring photographic layers expose raw vertical cut edges / incomplete side surfaces. The default composite hides these boundaries, so the issue cannot be repaired safely by widening masks or inventing pixels at runtime.

Resolution direction: author explicit photographic completion/side variants for the affected adjacency states, then validate them on the same fixed 1536 × 1024 canvas.

### `replacement-placeholder`

When `module-02` is hidden, scene semantics correctly activate `range-freestanding`, but its current asset is intentionally fully transparent. The resulting visual is therefore an empty bay rather than the intended conventional range.

Resolution direction: replace only the approved substitution asset with a fixed-camera photographic layer; do not change visibility semantics to hide the missing asset.

## Reproducible cases

`reference/variant-cases.json` is the authority for current review cases. The harness derives visible entities from the real Scene2D state/visibility implementation and emits full-canvas review PNGs as CI artifacts. Current fingerprints:

- `default` → `scene2d-89ce17bc`
- `module-02-hidden` → `scene2d-636d5edf`
- `module-03-hidden` → `scene2d-e3482ce9`

The default case is a hard pixel gate. Known-debt cases require human visual review until replacement/completion assets are authored.
