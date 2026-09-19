# BMC-01 — Minimal deterministic completion v0.1

Status: research candidate / no promotion

This is the first appearance candidate based on the provenance-tightened local
geometry.

It intentionally does less than the historical overlay.

## Edit entitlement used in this experiment

Inside the local carcass polygon, preserve every pixel position where any of
these current owner assets contributes nonzero alpha:

- Module 02 body layer;
- exposed Stone 02 variant;
- approved Stone 02 overlay.

Only local-geometry pixels with **no current owner contribution** enter the
research edit mask.

This is conservative and remains experimental because legacy layer alpha is a
compositing contribution, not physical occupancy.

## Donor

No image generation.

For each authorized missing pixel, copy the nearest final composited pixel that:
- is inside the same local carcass geometry;
- is owned by Module 02;
- lies to the right of measured front seam x=742.

Thus the first benchmark is same-object deterministic appearance completion,
not M01 transfer and not generation.

## Gates

Required before even considering review:
- inside authorized ROI;
- zero overlap with pre-existing owner support;
- deterministic output;
- bounded donor distance;
- record exact changed pixel count;
- compare against historical 1,910-pixel overlay.

The candidate stays under `review-assets/research`.
