# SC-01 — Scene Projective Consistency Audit v0.1

Status: exploratory

## Question

Does the canonical kitchen frame behave like:

1. one globally coherent perspective;
2. several internally coherent projective regions;
3. local distortions within individual objects;
4. a mixture of source/provenance mismatches that cannot be explained by projection alone?

This audit is deliberately independent of the Promob fixed-camera transfer result.

## Principle

Do not call the scene "invalid" because it does not match the Promob camera.

Instead, test consistency **inside the canonical frame**.

## Evidence hierarchy

### Stronger
- exact visible pixel edge measured from canonical frame;
- alpha edge tied to known physical face;
- authoritative one-time human trace with explicit status.

### Weaker / proxy
- finish-mask outer bounds;
- layer alpha bounds;
- historical editorial annotation;
- inferred seam.

Weak evidence may reject an overly simple hypothesis, but should not establish a global camera alone.

## Probe families

### Front-plane X/Z families

Use front finish masks for Modules 01, 02, 03, 05, 06 and 07.

Measure:
- top/bottom boundary angle;
- left/right boundary angle;
- threshold stability;
- line-fit RMS.

Purpose:
detect gross disagreement among front-facing planes.

Caveat:
finish masks may include editorially derived boundaries and are not equivalent to physical CAD corners.

### Depth Y family

Initial cues:
- measured Module 02 visible stone depth edge;
- Module 01 visible side, if a trustworthy side region can be extracted;
- Module 03 historical human-calibrated stone direction, kept explicitly annotation-only.

Purpose:
test whether independent physical-depth edges support a common vanishing direction.

## Module 01 side extraction experiment

Current deterministic hypothesis:

`module01 layer alpha - module01 finish mask`

Seed the residual connected component from the existing clean carcass-side donor quad:

`[[360,110],[378,110],[378,250],[360,250]]`.

This is useful because the donor recipe already establishes that region as carcass-side appearance evidence.

The resulting component remains a **segmentation hypothesis**, not automatic truth.

If unstable across alpha thresholds or topologically implausible, SC-01 must stop and request a one-time authoritative side polygon rather than silently forcing automation.

## Classification policy

SC-01 should only assign a stronger scene classification when evidence supports it.

Possible outputs:

- `GLOBAL_COHERENT`;
- `PIECEWISE_COHERENT`;
- `LOCALLY_DISTORTED`;
- `SOURCE_MISMATCH_SUSPECTED`;
- `INSUFFICIENT_EVIDENCE`.

The first automated probe remains `DIAGNOSTIC_ONLY`; final classification requires reviewing residual structure and evidence authority.

## Current SC-01 findings

The first deterministic probes are now materialized in:
`review-assets/research/scene-projective-consistency-v0.1-report.json`.

### Negative finding: front finish masks are not camera evidence

Modules 01, 02, 03, 05 and 07 expose perfectly axis-aligned rectangular finish-mask bounds across all tested alpha thresholds.

This is a property of the current authoring masks, not independent proof that the photographed/rendered fronts obey an exact orthographic X/Z projection.

Module 06 demonstrates why generic outer-mask fitting is unsafe: its nonrectangular mask support produces meaningless outer-boundary fits because the mask encodes front topology rather than one physical rectangle.

Therefore:
**front finish masks are removed from the list of authoritative scene-camera observations.**

They remain useful for:
- ownership;
- material application;
- seam extraction;
- topology constraints.

### Module 01 side topology probe

Using the known clean carcass-side donor as a seed and restricting the residual to the right of the front mask produces a stable side-region hypothesis across alpha thresholds:

- bounds: approximately `[353,58,381,296]`;
- threshold-stable support;
- top outer edge fit:
  - angle ≈ `41.82°`;
  - RMS ≈ `0.30 px`.

The raw residual bottom silhouette is not accepted as a physical depth edge because it follows the outer alpha boundary.

A separate interior luminance-edge trace near the front bottom finds:

- angle ≈ `14.92°`;
- RMS ≈ `0.45 px`;
- continuous support from x≈353 to 380.

If those two traces are the actual parallel top/bottom depth edges of the physical Module 01 side, they intersect at approximately:

`VP_module01 ≈ [722.44, 385.21]`.

### Lower stone pixel evidence

The actual reference-alpha stone edge used by `gap_pixel_gate.py` was measured directly rather than via the historical annotation:

- local points run approximately from `[749.5,553]` to `[742.5,567]`;
- fit `dx/dy = -0.5`;
- RMS ≈ `0.25 px`.

The earlier Module 02 measured stone cue remains:
`[742,586] -> [763,525]`.

These lower-zone observations are spatially close and may describe the same/adjacent joint geometry. They must **not** be treated as independent parallel lines merely to manufacture a global vanishing point.

### Provisional inconsistency signal

If the Module 01 top + internal-bottom traces are confirmed as physical Y-direction edges, their vanishing point misses the lower-zone depth evidence by a large amount:

- Module 02 measured stone line: roughly `84 px` perpendicular residual;
- Module 03 reference-alpha stone line: roughly `99 px` residual.

That would be strong evidence for a piecewise/projectively inconsistent scene.

However, one of the two lines defining `VP_module01` is still an automatically traced luminance edge.

Therefore the current scene classification is deliberately:

**`INSUFFICIENT_EVIDENCE`**

with:

**`piecewiseSignal = STRONG_IF_MODULE01_EDGE_TRACE_IS_CONFIRMED`**.

The next useful action is not another automatic fit. It is to validate/replace the Module 01 top and bottom side edges with an authoritative one-time vector trace against the canonical pixels, then rerun the residual test.

## Relationship to future furniture

The target architecture should support both:

### New geometrically controlled scenes
Preferred:
`physical model -> fixed camera -> deterministic ID/depth/face passes -> appearance authoring`.

These should normally enter reconstruction as `global-calibrated`.

### Legacy/editorially assembled scenes
Use:
`global test -> regional test -> local planar calibration -> bounded inference`.

The method degrades gracefully without treating distortion as the ideal.

## Decision rule for correcting the current kitchen

Do not rebuild the base solely because a projective inconsistency exists.

Classify impact:

- G0: invisible/editorially irrelevant — document only;
- G1: affects hidden reconstruction only — compensate locally;
- G2: visible only in configurations — correct affected overlays/variants;
- G3: visible in canonical base — consider local base correction;
- G4: pervasive and blocks reliable composition — consider substantial rebuild.

SC-01 exists to determine which category is justified.
