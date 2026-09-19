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

The earlier uncertainty around the Module 01 lower side edge is now resolved.

### The 14.92° luminance trace was a false semantic edge

The automatic luminance tracer found a mathematically clean line inside the white side face. Visual inspection of the isolated Module 01 side screenshot shows that this line is a shading/appearance transition, not the physical lower boundary of the side panel.

It is retained in the report as:
`REJECTED_AS_PHYSICAL_EDGE`.

This is a useful failure case for the future method: a low-RMS image edge is not automatically a geometric edge.

### Physical Module 01 side boundaries

Three sources now agree on the physical interpretation:

1. Scene Core/Promob confirms a full-height right side panel, `700 mm` high and `350 mm` deep, with no bottom setback that would justify the interior luminance trace.
2. The canonical Module 01 layer, constrained to the region right of the front finish mask, gives threshold-stable outer top and bottom boundaries.
3. The isolated Module 01 side screenshot supplied in the project conversation visually confirms that the white side face terminates on that outer bottom silhouette.

The canonical fits are approximately:

- top depth edge: angle `41.82°`, RMS `0.30 px`;
- bottom depth edge: essentially horizontal in the canonical layer residual.

Those two physical Y-direction edges imply:

`VP_M01 ≈ [620.49, 294.00]`.

### Independent lower-zone Y-direction evidence

The Module 02 visible stone depth cue is measured as:

`[742,586] -> [763,525]`.

Scene Core confirms Module 01 and Module 02 use the same unrotated physical axes, so their cabinet-depth edges are parallel in world Y.

If the canonical image were one exact perspective projection, the Module 02 depth line would pass through the same Y vanishing point as the Module 01 side.

It does not.

Perpendicular distance from `VP_M01` to the measured Module 02 stone depth line is approximately:

`210 px`.

That is vastly larger than the sub-pixel line-fit residual on the Module 01 edge and any reasonable raster-edge uncertainty.

The Module 03 reference-alpha stone line also lies far from the Module 01 VP, but because the Module 02/03 stone observations may represent adjacent/intersecting local termination geometry, Module 03 is retained as supporting context rather than the decisive independent test.

### Current classification

The current evidence now supports:

**`GLOBAL_COHERENCE_REJECTED_FOR_TESTED_Y_DIRECTION`**

This means:

> the tested canonical pixels cannot all be explained as one exact perspective projection of the unrotated physical Y direction represented in Scene Core.

It does **not yet** distinguish between:

- `PIECEWISE_COHERENT` — different regions were composited/rendered with locally coherent but different projection;
- `LOCALLY_DISTORTED` — one or more assets were warped internally;
- a more specific source/version mismatch.

The next audit should therefore test at least one additional physical depth edge within the upper region and one additional edge within the lower region. That will determine whether each region is internally coherent or whether distortion exists inside individual assets.

### Consequence for the current kitchen

This result still does not justify rebuilding the scene.

The visible product scene remains editorially convincing. Until a specific inconsistency causes visible configuration failure, the default remediation remains:

- preserve canonical base;
- use local/regional projection for hidden-face authoring;
- correct only variants/overlays whose exposed geometry makes the inconsistency visible.

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
