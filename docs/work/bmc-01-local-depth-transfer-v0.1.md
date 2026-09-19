# BMC-01 — Local Lower-Region Depth Transfer v0.1

Status: research candidate / no runtime promotion

## Why this exists

The historical Module 02 target quad used a long line that is now known to be mostly `stone-02-joint-bridge` support. That bridge is hidden in the current correct `module-03-hidden` state.

A stronger current lower-zone reference exists on the opposite conditional state:

- Module 03 exposed-left stone variant;
- current pixels match the historical calibrated reference exactly;
- all sampled reference-edge pixels belong to the visible stone03 variant;
- the 02↔03 bridge contributes zero sampled pixels and is host-hidden;
- Scene Core defines the stone03 slab as a confirmed, unrotated `550 mm`-deep box.

The diagonal segment of `STONE03_LEFT_EDGE_POINTS` from approximately
`[751,551]` (rear/upstand base) to `[740,574]` (front/top-to-thickness transition)
is therefore used as a **local conditional depth projection**.

It is not promoted to a global camera.

## Reference correction after current-edge probe

A later threshold-sweep measured the current exposed stone variants inside the
existing semantic top-surface band y=552..574.

Stone 03 is the useful reference:

- alpha 32/64/128/192 produce the same fitted edge;
- front approximately `[740.565,574]`;
- back approximately `[749.696,552]`;
- front→back vector approximately `[+9.130,-22]`;
- fit RMS approximately `0.60 px`.

Stone 02 is **not** used as a camera/depth reference. Its current exposed-right
termination is intentionally clipped by the authored termination recipe and the
measured edge is approximately `[+1.65,-22]`, inconsistent with treating it as
an untouched physical Y-direction edge.

The local transfer input is therefore updated to the stable Stone 03 measured
edge instead of the earlier hand-selected `[+11,-23]` segment.

## Module 02 front seam

A new RGB/alpha interior-boundary probe on `02_inferior_fogao.png` independently re-finds:

`x = 742`

as the strongest full-height interior front/side seam candidate.

Diagnostics:
- coverage: `1.0` across the sampled vertical range;
- mean channel gradient: about `150.9`;
- next candidate x=741 is much weaker;
- the outer transparent silhouette is excluded by requiring opaque pixels on both sides.

This reproduces the historical x=742 anchor through a different method.

The attempt to recover a complete side by `layer alpha - finish mask` correctly BLOCKED: the Module 02 finish mask itself occupies the same module alpha envelope and is not a semantic front-only mask.

## Physical transfer

Reference stone depth:

`550 mm -> measured vector front→back approximately [+9.130,-22] px`

Confirmed target depths:
- Module 02 carcass side: `530 mm`;
- Module 02 plinth: `348.83 mm`.

The local-affine transfer therefore scales the reference vector independently for each physical depth.

This immediately corrects one weakness in the historical quad: the plinth no longer inherits the full cabinet depth.

## Interpretation

This is intentionally an **elastic legacy-scene method**:

- it uses current canonical pixels;
- it is local to adjacent lower modules;
- physical lengths come from Scene Core;
- it does not force the Promob camera onto the image;
- it does not force Module 01's laundry-region projection onto the lower kitchen region.

For a future geometry-first scene, this fallback should not be needed because the exact camera projection would be available.

## Next gate

The resulting quads should be materialized first as geometry guides / neutral faces, not as generated imagery.

Compare:
1. historical BMC-01 quad;
2. local-depth-transfer quad;
3. current protected pixels and contact boundaries.

Only after the geometry comparison should appearance donor/generation work resume.
