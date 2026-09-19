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
