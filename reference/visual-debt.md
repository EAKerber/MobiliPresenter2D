# Baseline visual debt

Status: observed against current checkpoint `cozinha-01-module02-fidelity-fix1`

The original v3.3.0 materialization remains the historical parent. R4 changes only the bounded module-02 cleanup ROI and introduces a real finish mask for module 02.

## Default canonical composition

Current default fingerprint: `scene2d-e7c8dba7`.

- **Module 02 column contamination:** resolved in R4 by clearing only the alpha strip `[484, 590, 498, 856]`. The current golden differs from the parent golden in 3,579 pixels and zero pixels outside that ROI.
- **Module 02 finish coverage:** resolved at the scene-contract level. Module 02 now belongs to `fronts-all` and uses `assets/kitchen/masks/02.png`; the external cabinet/frame changes finish while the complete oven appliance remains protected.
- **Column definition / tile phase:** no active default defect reproduced.
- **Module 03 → module 04 contact:** no incoherent overlap or open seam in the default; keep under regression observation.
- **Stone split 02/03:** no new seam introduced; current default recomposition remains 0 px against its current golden.
- **Cooktop/pans stone artifact:** not reproduced in the current default.

## Confirmed non-default debt

### `raw-neighbor-cut`

When `module-02` or `module-03` is hidden, neighboring photographic layers still expose incomplete side/stone terminations. R4 intentionally does not repair these states.

Resolution direction: explicit photographic completion/endcap assets validated through the R3 candidate pipeline.

### `replacement-placeholder`

When `module-02` is hidden, scene semantics activate `range-freestanding`, but its current asset remains intentionally transparent.

Resolution direction: replace only the approved substitution asset with a fixed-camera photographic layer; do not alter visibility semantics to conceal the missing asset.

## Reproducible cases

`reference/variant-cases.json` remains the authority for review actions. With the R4 scene manifest:

- `default` → `scene2d-e7c8dba7`
- `module-02-hidden` → `scene2d-e990f538`
- `module-03-hidden` → `scene2d-ea7073bc`

The default case remains a hard pixel gate. Hidden-state cases remain human-review debt until their photographic completion assets are authored and promoted.
