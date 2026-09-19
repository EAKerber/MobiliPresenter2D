# Canonical-Frame Projective Metrology v0.1

Status: exploratory / proposed next projection path

## Motivation

The fixed-camera calibration from the source MobiliPresenter/Promob frame does not transfer cleanly to the canonical MobiliPresenter2D frame.

The deterministic compatibility probe for Module 02 found:
- Promob-camera full-depth direction: about `-38.78°`;
- canonical 2D measured depth direction: about `-71.00°`;
- direction mismatch: `32.22°`.

Therefore hidden-face geometry should be calibrated primarily from the **canonical 2D frame itself**, while Promob remains the A1 authority for what physical parts exist and their dimensions.

## Core idea

Use single-view projective metrology on the canonical frame.

Known physical directions:
- X: module width / front horizontal;
- Y: cabinet depth;
- Z: vertical.

Visible image evidence provides line families for these directions.

The goal is not to recover a perfect general-purpose camera immediately. The goal is to derive the strongest local/projective model needed to place hidden parallel faces.

## Why Module 01 matters

Module 01 is unusually valuable because:

- its side face is visibly present in the canonical scene;
- its physical depth is confirmed: `350 mm`;
- its physical height is confirmed: `700 mm`;
- its front/side topology is known from Promob-derived geometry;
- a clean carcass-side donor region has already been used successfully for Module 02 appearance.

This makes Module 01 both:
1. an appearance donor;
2. a geometric validation object.

The current donor recipe uses only a clean rectangular material sample from Module 01. It does **not** yet use the full visible Module 01 side as projective geometry evidence.

## Canonical-frame direction families

### Z — vertical

Candidate evidence:
- module front side edges;
- fridge side panel;
- upper cabinet vertical edges.

Expected behavior:
- near-parallel vertical image lines or a far vertical vanishing point.

### X — front horizontal

Candidate evidence:
- cabinet top/bottom front edges;
- shelf/front seams where authoritative;
- countertop front edge.

Expected behavior:
- near-horizontal family or a distant horizontal vanishing point.

### Y — depth

Most important for hidden side faces.

Candidate evidence:
- Module 01 visible side top/bottom depth edges;
- Module 02 exposed stone depth edge;
- Module 03 exposed stone/termination edges where visible;
- other confirmed side/top planes.

These lines should be consistent with a shared depth vanishing direction if they represent parallel physical Y lines.

## Proposed deterministic stages

### M0 — evidence extraction

Materialize named line observations:
- source asset/frame hash;
- line endpoints;
- semantic direction X/Y/Z;
- physical host;
- confidence;
- extraction method.

Extraction methods may include:
- exact authored anchors;
- alpha contour;
- front-mask boundary;
- seam mask;
- robust pixel-edge fit;
- human-calibrated line.

Never merge these authorities silently.

### M1 — line fit

For raster-derived evidence:
- collect edge-support pixels;
- fit line;
- report RMS;
- preserve threshold sweep where segmentation depends on threshold.

Existing reusable core:
- line-fitting ideas from `gap_pixel_gate.py`.

### M2 — vanishing hypothesis

For each physical direction:
- intersect line pairs when numerically stable;
- or represent a vanishing direction at infinity when lines are effectively parallel;
- use robust fit across several lines rather than one pair;
- report residual angle/distance per observation.

No line family is accepted because it “looks approximately right”.

### M3 — visible-face reconstruction test

Before predicting any hidden face, reconstruct a face that is already visible.

Primary validation target:
**Module 01 side face**.

Inputs:
- its known front edge;
- estimated depth direction/model;
- confirmed physical depth `350 mm`;
- other canonical calibration evidence.

Output:
- predicted side polygon.

Compare against the actual visible side:
- front edge error;
- rear edge error;
- top/bottom depth edge error;
- area/IoU where a trustworthy side mask can be derived.

This is a leave-visible validation gate.

### M4 — hold-out strategy

Avoid circular success.

Two useful modes:

#### leave-one-face-out
Estimate projective model without using the target face edges, then predict that visible face.

Example:
- calibrate depth direction from stone edges + other geometry;
- predict Module 01 side;
- compare to its real pixels.

#### leave-one-cue-out
Calibrate using Module 01 + another cue, then predict the held-out stone depth edge.

This tests whether the model generalizes beyond a single donor.

### M5 — hidden-face prediction

Only after visible-face residuals are acceptable:

- take target Module 02 front side edge;
- use A1-confirmed `530 mm` depth;
- project rear/top/bottom side boundaries;
- emit polygon + confidence + residual lineage.

The result becomes the geometry guide for BMC-01.

## Important distinction: vanishing direction vs physical depth

A vanishing point/ray determines **direction**, not automatically how far the rear edge lies along the ray.

Physical depth therefore needs a projective metric relationship.

Possible deterministic strategies to compare:

1. local plane homography from a visible reference side;
2. single-view metrology using known reference lengths and vanishing points;
3. constrained camera fit directly on canonical 2D correspondences;
4. local empirical mapping with uncertainty bounds.

The benchmark should choose by residuals, not conceptual elegance.

## Module 01 side-mask hypothesis

A deterministic side-region candidate may be derivable from existing assets:

`module01 layer alpha - front finish mask`

with additional constraints:
- remain inside Module 01 alpha;
- select the connected region adjacent to the expected outer side;
- constrain by physical topology;
- reject hardware/edge artifacts;
- fit a quadrilateral/edge graph rather than using raw residual pixels as truth.

This is a **hypothesis to test**, not yet an accepted implementation.

If front mask subtraction is insufficient, alternatives include:
- color/gradient segmentation inside known alpha;
- manual one-time authoritative side polygon;
- vector tracing from high-confidence visible edges.

A one-time human-calibrated polygon is preferable to a fragile “automatic” segmentation if the latter cannot be made fail-closed.

## Relationship to generative completion

This metrology track exists specifically to reduce generation freedom.

For a hidden side, generative tooling should eventually receive:
- a geometry polygon established here;
- protected regions;
- donor material;
- neutral expected face.

Generation may improve appearance, but must not move the established face boundaries.

## Proposed helper responsibilities

Do not freeze APIs yet, but likely reusable primitives are:

- `fit_edge_support()`;
- `fit_line_family()`;
- `estimate_vanishing_direction()`;
- `intersect_projective_lines()`;
- `measure_visible_face_residual()`;
- `project_reference_length_on_plane()`;
- `emit_geometry_guide_svg()`.

Existing implementation should be audited before writing each helper.

## First experiment

### PM-01 — Module 01 visible-side validation

Goal:
determine whether canonical-frame evidence can predict the already-visible Module 01 side geometry with useful accuracy.

Phases:
1. derive or authoritatively annotate Module 01 side polygon;
2. identify independent depth-line evidence;
3. fit projective direction/model;
4. predict Module 01 side with some evidence held out;
5. compare predicted and observed geometry;
6. only then apply the same method to Module 02.

No generated imagery is required.

## Success interpretation

A successful PM-01 does not require perfect camera recovery.

It is enough to establish a bounded method such as:

> for cabinet side faces in this canonical composition, this projective model predicts visible hold-out side edges within measured tolerance.

That would be materially stronger than the current Module 02 rear-edge visual hypothesis.

## Failure interpretation

A failure is also useful.

If no shared projective model explains Module 01 and the stone cues, possible causes include:
- source image compositing from non-uniform transforms;
- module assets originating from different renders/cameras;
- post-render warps;
- incorrect physical-to-image correspondence;
- edge extraction error.

In that case the architecture should fall back to per-module local calibration rather than forcing a global camera model.
