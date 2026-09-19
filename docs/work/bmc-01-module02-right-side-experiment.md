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

## Historical replay baseline

Before testing new methods, the existing projective-donor candidate was revalidated after a minimal authoring-tool repair.

Research workflow:
`35453134871`.

Exact replay results:
- source variant SHA reproduced:
  `f502790c76afe612563958ca3acfcc7d653018d718d11d852ed3a45df553ecfa`;
- candidate bytes equal historical bytes: **yes**;
- candidate SHA:
  `3becbf8a510dd76757593ed5c227482edef7af57c48877e9d2e714398e77fff8`;
- changed pixels: `1910`;
- difference/alpha bounds: `[755,525,764,815]`;
- outside ROI changes: `0`;
- round-trip mismatch: `0`;
- edited frame SHA:
  `dfa445834900d87450392f3ccec827880eade882ca914153110b6f9d3558eca4`;
- recipe SHA:
  `a4ac0fa6702dc0707dde90dce0447b0e233cd222b9ecb3543be8494f0525d742`.

Therefore C-A is now a **reproducible deterministic baseline**, not merely a historical artifact.

This replay validates the implementation path, not the physical correctness of the inferred rear edge.

## Geometry evidence reassessment after ownership audit

The historical C-A raster candidate remains reproducible, but its original
geometry argument is superseded.

### Historical long depth line is not current exposed-state authority

Ownership audit:
`review-assets/research/module02-depth-cue-ownership-v0.1.json`.

The old line `[742,586] -> [763,525]` was mostly supported by
`stone-02-joint-bridge`. That bridge is correctly hidden when Module 03 is
hidden.

Therefore:
- C-A remains a deterministic process/appearance baseline;
- its old target quad is not projection ground truth;
- the old back anchor is legacy conditional-joint evidence.

### Current stable local depth reference

`review-assets/research/stone-depth-edge-probe-v0.1-report.json` measures the
current exposed Stone 03 top termination across alpha thresholds.

At thresholds 32/64/128/192 the fitted edge is stable:

- front ≈ `[740.565,574]`;
- back ≈ `[749.696,552]`;
- front→back ≈ `[+9.130,-22]`;
- RMS ≈ `0.60 px`.

Scene Core defines the associated slab depth as `550 mm`.

Stone 02's current exposed-right edge is excluded from projection authority:
its termination is deliberately clipped by the existing authored recipe and
measures only about `[+1.65,-22]` over the same band.

### Local physical-depth transfer v0.2

Using the stable Stone 03 vector and confirmed physical depths gives:

Carcass side, 530 mm:
- vector ≈ `[+8.798,-21.2]`;
- quad ≈ `[[742,590],[750.798,568.8],[750.798,834.8],[742,856]]`.

Plinth, 348.83 mm:
- vector ≈ `[+5.791,-13.953]`;
- quad ≈ `[[742,856],[747.791,842.047],[747.791,884.047],[742,898]]`.

This remains a bounded local-affine hypothesis. It does not establish a global
camera and currently keeps the same projected depth vector at the top and
bottom of each face.

### Geometry-support audit

The binary support audit runs at alpha thresholds 1 and 128 because the legacy
layer decomposition contains meaningful semi-transparent contributions.

At alpha > 0:
- local carcass: 96.2% of the proposed polygon already has canonical host/stone
  contribution; 101 pixels have none;
- local plinth: 100% already has canonical contribution;
- the historical exposed-side overlay has **0 pixels inside either local
  polygon**.

At alpha >= 128:
- local carcass support falls to about 30%;
- local plinth support falls to about 42%.

This threshold sensitivity means layer alpha must **not** be treated as physical
occupancy. It is decomposition/appearance evidence, not a face-existence mask.

The strong result is different: the local geometry and the historical overlay
describe almost disjoint regions. Therefore the historical overlay cannot be
used as an appearance implementation of the new local geometry without a new
benchmark.

### Current policy

Do not author the next candidate by filling either alpha-defined "missing"
set.

Instead:
1. render the exact current target variant without the historical exposed-side
   overlay;
2. overlay deterministic geometry guides only;
3. review local geometry against canonical pixels;
4. only then define an edit mask from visible defects, preserving canonical
   pixels by default.

## Experiment questions

BMC-01 should answer separate questions.

### Q1 — geometry

Can the target side polygon be derived more strongly than the current bounded local hypothesis?

Current result:
- exact Promob fixed-camera transfer to the MobiliPresenter2D frame is **not supported**;
- tested full-depth direction differs by `32.22°`;
- the simple crop/uniform-scale hypothesis is rejected;
- coarse front-envelope anisotropy is also inconsistent with the ratio needed to explain the observed depth cue.

Therefore BMC-01 should not use the Promob fixed camera as global pixel authority.

Remaining subquestions:
- can front-edge + visible stone-depth evidence define a stronger local planar model?
- can confirmed physical depth constrain that local model without forcing the source camera?
- can another visible side face, especially Module 01, provide an empirical projective donor geometry prior?

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
4. Projection compatibility probe completed: global fixed-camera transfer rejected for the tested correspondence; continue with local/planar evidence.
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
