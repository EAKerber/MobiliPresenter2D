# Camera / Projection Compatibility Investigation v0.1

Status: exploratory / proposed

## Problem

MobiliPresenter contains a fixed perspective calibration derived from a Promob colored segmentation/calibration view:

- source image: `1865 × 967`;
- calibrated focal length: `1218.746 px`;
- principal point: approximately `[863.17,471.57]`;
- camera project position: approximately `[4195.35,3994.36,1126.24] mm`;
- center RMS: `2.51 px`;
- center max: `4.28 px`.

MobiliPresenter2D uses a different canonical photographic frame:

- `1536 × 1024`;
- different source hash;
- fixed editorial composition.

The calibration must therefore **not** be assumed transferable merely because both represent the same furniture project.

## Objective

Determine whether the Promob-derived fixed camera can strengthen projection authority for MobiliPresenter2D, and if so, at what level.

Possible conclusions:

1. `global-calibrated` — exact mapping established;
2. `planar-derived` — useful only through fitted plane relationships;
3. `local-derived` — useful only as directional/scale evidence;
4. `not-compatible` — should remain separate;
5. `blocked` — insufficient correspondences.

## Evidence required

A valid compatibility investigation needs named correspondences visible in both source spaces.

Preferred correspondences:
- Module 02 front corners;
- Module 03 front/stone corners;
- Module 06 outer corners;
- Module 04 side-panel boundaries;
- countertop front/back edges;
- known appliance openings.

Avoid:
- soft shadows;
- uncertain antialiased seams;
- decorative objects;
- generated/inferred surfaces.

Each correspondence should record:
- physical 3D point or edge source;
- Promob calibration-frame pixel;
- MobiliPresenter2D pixel;
- authority/status;
- uncertainty.

## Hypotheses

### H1 — same camera, different crop/scale

The two images may represent the same perspective with only:
- scaling;
- crop;
- possibly padding.

If true:
- a 2D similarity/affine transform between image coordinates may align predicted projections.

Required evidence:
multiple distributed correspondences with low residual.

### H2 — same physical scene, different camera

The composition may have been rendered from a different camera.

If true:
- the original calibration remains useful for Scene Core validation;
- it cannot be promoted to A3 global authority for MobiliPresenter2D.

### H3 — approximately related camera

The frames may differ slightly but preserve useful projective directions.

If true:
- individual planes or local edge families may support `planar-derived` or `local-derived` reconstruction;
- no global world-to-pixel claim should be made.

## Investigation sequence

## C0 — source identity

Verify exact hashes and dimensions for:
- Promob calibration source;
- MobiliPresenter2D canonical source.

No comparison proceeds if either source is ambiguous.

## C1 — correspondence inventory

Build a table of at least several distributed, high-confidence points/edges.

Do not choose only Module 02; a global-camera claim requires evidence across the scene.

## C2 — simple image-space mapping test

Fit:
- uniform scale + translation;
- similarity transform;
- affine transform.

Measure residuals.

If affine residuals remain large/systematic, H1 is rejected.

## C3 — camera re-projection test

Use Scene Core physical points and the existing camera calibration to predict Promob-frame coordinates.

Then determine whether a consistent transform maps those predictions into MobiliPresenter2D pixels.

Report:
- RMS;
- max error;
- residual direction by region;
- whether errors are systematic.

## C4 — local plane tests

Even if global compatibility fails, test:
- lower-cabinet front plane;
- upper-cabinet front plane;
- countertop plane;
- side/depth direction.

A plane may support its own homography without global camera equivalence.

## C5 — classification

Assign the strongest justified A3 level:
- global-calibrated;
- planar-derived;
- local-derived;
- bounded-inference;
- blocked.

## Relation to pixel/mm

Do not define one global `mmPerPixel`.

Allowed models:

### local orthographic/linear
For a nearly frontal plane over a bounded region:
- horizontal mm/px;
- vertical mm/px.

### planar projective
For side/tops:
- physical quad <-> pixel quad;
- homography.

### calibrated perspective
Only after camera compatibility is established.

## Module 02 relevance

For BMC-01, the physical Module 02 side is known:
- depth: `530 mm`;
- structural side height: `742 mm`;
- side thickness: `18 mm`.

The canonical 2D scene supplies:
- front side edge;
- floor contact;
- visible stone depth cue.

A compatibility result could therefore strengthen or refute the current rear-edge hypothesis.

However:
a physically correct 530 mm depth does not itself determine a 2D rear edge without a valid projection model.

## Relation to the existing perspective grid

The MobiliPresenter2D perspective grid already records:
- counter back/front Y;
- floor contact;
- vertical axis;
- signed local depth vector;
- editorial tolerances.

These are valid scene-local constraints.

They should be used as independent evidence when evaluating camera-transfer hypotheses, not rewritten to force agreement with the Promob camera.

## Relation to rejected R5A calibration

The R5A gap experiment establishes an important methodological rule:

- declared geometry is insufficient when actual candidate pixels disagree;
- a local PASS cannot establish global perspective;
- clipping/protection cannot rescue a geometry failure;
- threshold sensitivity must be reported.

The camera compatibility investigation inherits these rules.

## Deliverables

A later deterministic investigation should emit:
- correspondence manifest;
- transform fits;
- residual tables;
- visual overlay;
- per-plane compatibility;
- final A3 classification;
- no runtime asset changes.

## Stop conditions

Reject global-camera transfer if:
- correspondence residuals exceed declared tolerances in a structured way;
- different scene regions require incompatible mappings;
- target source is not the same composition;
- the fit depends on inferred/generated pixels.

A useful negative result is acceptable.

## Open questions

- exact availability of the original Promob calibration image bytes in the current toolchain;
- whether the MobiliPresenter2D base is a crop/retouch of the same underlying render;
- whether camera compatibility differs between upper and lower cabinet planes;
- whether lens/distortion or later image editing materially affects correspondence.
