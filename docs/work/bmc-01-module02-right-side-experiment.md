# BMC-01 — Module 02 Exposed Right Face Experiment Design

Status: exploratory / no image generation yet

## Objective

Design the first method-comparison experiment for the hidden-side reconstruction problem without changing runtime assets or generating new images yet.

Target case:
- taxonomy: `T1 hidden structural side face`;
- target module: Module 02;
- occluder: Module 03;
- target variant: `module-03-hidden`;
- target variant fingerprint: `scene2d-930c3dc3`.

## Existing confirmed/derived evidence

### Canonical source

Exact source frame:
- SHA-256: `f502790c76afe612563958ca3acfcc7d653018d718d11d852ed3a45df553ecfa`;
- size: `1536 × 1024`;
- exact source manifest already recorded in the calibration package.

### Measured front geometry

Confirmed from visible pixels:
- front edge: `x=742`;
- counter front: `y=586`;
- cabinet front bottom: `y=857`;
- floor contact: `y=898`.

### Local depth evidence

Measured stone edge:
- front: `[742,586]`;
- back: `[763,525]`;
- delta: `[+21,-61]` when interpreted from front toward back.

Status:
- local visible depth cue;
- valid for bounded contextual projection;
- not a complete camera/world calibration.

### Current inferred target

Cabinet side target quad:
- `[742,586]`;
- `[763,525]`;
- `[763,796]`;
- `[742,857]`.

Plinth target quad:
- `[742,857]`;
- `[763,796]`;
- `[763,837]`;
- `[742,898]`.

Important:
rear-side boundaries remain bounded hypotheses.

### Authorized edit region

ROI:
`[742,520,764,899]`.

Outside-ROI policy:
`zero-change`.

### Existing donor

Canonical Module 01 side sample:
- donor quad `[[360,110],[378,110],[378,250],[360,250]]`;
- semantic: `carcass-side-clean-sample`.

This donor is preferred over automatically applying the global front finish because the authoring contract explicitly treats the exposed surface as carcass-side material.

## Physical geometry evidence from MobiliPresenter

The Promob-derived physical model confirms that Module 02 actually contains:
- left side panel;
- right side panel;
- bottom;
- rear brace;
- top front/rear rails;
- oven surround.

Relevant right side primitive:
- role: `side`;
- local x origin: `773.01 mm`;
- width: `18 mm`;
- height: `742 mm`;
- depth: `530 mm`.

This confirms **existence and physical dimensions** of the side face.

It does not by itself prove the mapping from that physical face into the MobiliPresenter2D canonical frame.

## Experiment questions

BMC-01 should answer separate questions.

### Q1 — geometry

Can the target side polygon be derived more strongly than the current bounded local hypothesis?

Subquestions:
- can the Promob fixed-camera calibration be related to this 2D frame?
- can front-edge and stone-depth evidence constrain a planar homography?
- does physical depth 530 mm produce a rear boundary compatible with the measured stone cue?

### Q2 — deterministic donor quality

How good can the result become without any generative completion?

Compare:
- direct perspective donor;
- neutral face + donor texture/tonality;
- deterministic contact-shadow model.

### Q3 — residual generation value

If the deterministic result remains visually weak, what does generation actually improve?

Potential residual responsibilities:
- micro-shading;
- local texture continuity;
- contact shadow;
- antialias/edge integration.

Generation must not move the face polygon.

### Q4 — guide conditioning

Does generation behave more reliably when given:
- only geometry overlay + donor;
- or a deterministic neutral expected face in addition?

## Candidate definitions

## C-A — Existing projective donor baseline

Method family:
`M4-projective-donor`.

Use:
- current donor;
- current target quad;
- current ROI/protection rules.

Purpose:
establish the existing deterministic baseline.

Expected strengths:
- high locality;
- low operational cost;
- direct canonical material reuse;
- reproducible.

Expected weaknesses:
- may look flat;
- may inherit donor illumination poorly;
- target rear boundary still inferred.

## C-B — Neutral deterministic face + donor

Method family:
`M6-neutral-render-plus-donor`.

Deterministic construction:
1. materialize target face polygon;
2. establish neutral local shading;
3. perspective-project donor material;
4. blend donor appearance against neutral shading;
5. generate no pixels outside authorized mask.

Purpose:
separate geometric correctness from donor illumination.

Open parameter families:
- neutral luminance;
- front-to-rear shading gradient;
- contact-shadow width;
- donor contribution strength.

Do not choose final parameter values until measured against local scene evidence.

## C-C — C-B + local generative harmonization

Method family:
`M7-local-guided-generation`.

Inputs:
- canonical clean crop;
- strict residual mask;
- geometry guide;
- C-B expected-neutral candidate;
- Module 01 donor crop.

Generation responsibility:
appearance integration only.

Forbidden:
- changing face edges;
- changing front/oven;
- changing stone;
- changing wall/floor outside authorized mask;
- widening the side panel.

Final asset:
deterministic delta extracted from canonical source.

## C-D — Guide-first local generation

Method family:
`M7-local-guided-generation`, alternate conditioning.

Inputs:
- canonical clean crop;
- strict residual mask;
- geometry guide;
- donor crop;
- no pre-rendered neutral face.

Purpose:
measure whether the neutral deterministic render meaningfully reduces generative drift.

## Experimental order

1. Re-verify exact source hashes.
2. Re-materialize current C-A from recipe.
3. Build Reconstruction Packet for BMC-01.
4. Investigate projection compatibility before changing target geometry.
5. Produce C-B deterministically.
6. Run G0-G4 on A/B.
7. Only if B still has meaningful appearance deficit, generate C-C/C-D.
8. Extract deterministic deltas.
9. Compare using benchmark protocol.
10. Human review only after structural gates pass.

## Mandatory invariants

For all candidates:
- exact same source frame;
- same authorized ROI;
- zero changes outside ROI;
- zero overlap with protected Module 02 front/stone/bridges/overlay;
- front edge remains aligned to `x=742`;
- no invented full-width panel;
- no remote scene reconstruction;
- round-trip mismatch = 0 when delta extraction is used.

## Geometry experiment before image synthesis

The current target rear edge should not be silently accepted as ground truth.

Before C-B/C-C:
- project the physical Module 02 side through any viable camera mapping;
- compare predicted top-depth direction with measured stone edge;
- compare predicted side width with the current ~21 px rear displacement;
- report residuals;
- keep the current geometry as `bounded-inference` unless stronger evidence is demonstrated.

## Benchmark outputs

Recommended research structure:

`review-assets/benchmarks/bmc-01-module02-right-side/`

Potential files later:
- `packet.json`;
- `source-manifest.json`;
- `geometry-guide.svg`;
- `protection-mask.png`;
- `appearance-guide.json`;
- `candidate-a/`;
- `candidate-b/`;
- `candidate-c/`;
- `candidate-d/`;
- `comparison.json`;
- `review.md`.

This path is only a proposed layout; no benchmark assets are generated in this document-only phase.

## Stop conditions

Stop and classify as BLOCKED if:
- exact canonical source cannot be recovered;
- physical-to-pixel mapping conflicts materially with visible anchors and cannot be reconciled;
- the target face would require edits outside authorized ROI;
- generation cannot be constrained to residual appearance;
- a candidate requires overwriting protected physical pixels to appear plausible.

## Success criteria

The experiment succeeds even if no new asset is approved.

A successful research outcome can be:
- projective donor is already sufficient;
- neutral render materially improves deterministic quality;
- generation adds measurable value;
- current rear-edge hypothesis is contradicted and requires recalibration;
- evidence is insufficient and the case remains human-reviewed inference.
