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

### Ownership audit invalidates the historical Module 02 depth line as current geometry evidence

A dedicated ownership audit was run after the initial classification:

- tool: `tools/research_depth_cue_ownership.py`;
- report: `review-assets/research/module02-depth-cue-ownership-v0.1.json`;
- workflow: `35460274240` — PASS.

The historical line `[742,586] -> [763,525]` contains 62 sampled raster positions.

Current asset ownership along that line:

- current `stone-02` exposed-right variant: only `10/62` sampled positions carry alpha;
- `stone-02-joint-bridge`: `43/62` sampled positions carry alpha;
- approved stone overlay 02: `0/62`;
- module 02 cabinet layer: `0/62`.

Most importantly, in the **current** `module-03-hidden` visibility state:

- `stone-02`: visible;
- `stone-02-joint-bridge`: **hidden because module 03 is hidden**.

Therefore the distal/back portion of the historical “measured stone depth edge” was supported primarily by a conditional 02↔03 joint bridge that no longer belongs to the correct exposed-right state.

The historical calibration remains valid provenance for the old frame, but it is **not valid current hidden-face geometry authority**.

### Revised current classification

The earlier research conclusion
`GLOBAL_COHERENCE_REJECTED_FOR_TESTED_Y_DIRECTION`
is withdrawn.

That conclusion depended on treating the historical Module 02 line as independent current Y-direction evidence. The ownership audit shows that assumption was wrong.

Current classification returns to:

**`INSUFFICIENT_CURRENT_DEPTH_EVIDENCE`**

What is still established:

- Module 01 visible side geometry is usable as a strong local projective reference;
- the Promob fixed camera does not directly transfer to the current 2D frame;
- the historical BMC-01 candidate/delta pipeline is reproducible;
- the historical BMC-01 target quad is not yet justified as current physical projection.

What is **not** established:

- that the canonical kitchen is globally projectively inconsistent;
- that the current lower region has a different camera from Module 01;
- that the historical BMC-01 rear edge is physically correct.

The next valid comparison must use a depth edge that is both:
1. physically interpretable as Y-direction evidence; and
2. actually visible/owned in the **current** target variant.

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
