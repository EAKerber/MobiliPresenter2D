# R2 — Variant fidelity before photographic completion

Status: candidate

## Goal

Make non-default scene states reproducible and reviewable before authoring new photographic assets. R2 must not alter any canonical v3.3.0 file under `app/`.

## Boundary

The runtime remains authoritative for state and effective visibility. `tools/variant_fidelity_manifest.js` loads the real frozen Scene2D data/core through Node VM, applies declarative test actions, validates expected visibility reasons and records the resulting fingerprints/assets.

`tools/render_variant_fidelity.py` only composites those resolved assets at the canonical origin. It does not infer visibility, move layers, repair pixels, rescale assets or fabricate hidden surfaces.

Generated PNGs are CI artifacts only. They are evidence, not source assets.

## Cases

- `default` — hard gate: must remain exactly equal to the golden, currently `scene2d-89ce17bc` and 0 differing pixels.
- `module-02-hidden` — activates the existing `range-freestanding` substitution and records `replacement-placeholder` + `raw-neighbor-cut`; fingerprint `scene2d-636d5edf`.
- `module-03-hidden` — records `raw-neighbor-cut`; fingerprint `scene2d-e3482ce9`.

The placeholder debt is partially machine-checkable: while a case declares `replacement-placeholder`, the visible placeholder asset must remain fully transparent. Once a photographic range exists, that assertion intentionally forces the case/debt record to be revised instead of silently becoming stale.

`raw-neighbor-cut` remains a human visual gate because its defect is semantic/photographic, not a reliable scalar pixel threshold.

## CI gates

1. validate the frozen R0 manifest and its pixel recomposition;
2. run the canonical app core/assets tests;
3. derive variant manifests from real Scene2D state;
4. render full-canvas variants;
5. require the default render to be 0 pixels different from the golden;
6. upload manifest, summary and review PNGs as one artifact.

## Next asset slice

R2 deliberately stops before pixel authoring. The next photographic work should use these cases as acceptance targets, prioritizing the conventional range for the `module-02-hidden` state and explicit side-completion variants for adjacency cuts. Any approved generated/edited image becomes a static full-canvas asset and must pass outside-ROI/default-regression review before becoming runtime authority.
