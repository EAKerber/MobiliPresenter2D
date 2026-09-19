# BMC-04 — Cooktop bounded generative replacement v0.1

Status: **DRAFT / deterministic footprint resolved; generation input assembly next**  
Runtime promotion: **forbidden**  
Generation: **allowed only after deterministic footprint materialization**

## Why this case exists

The current cooktop is an interesting failure mode for the reconstruction
program.

The cabinet/stone scene can be made locally coherent while the appliance raster
itself still carries a perspective/orientation that does not follow the host
plane convincingly.

Trying to repair a detailed cooktop by a large deterministic warp is a poor
default because the warp acts directly on:

- grate bar thickness;
- circular/elliptical burners;
- knobs;
- highlights;
- small gaps.

Those are exactly the features most likely to look stretched or mechanically
wrong after forcing an already-wrong view into a new perspective.

Therefore this case does **not** relax geometry authority.

It changes where generation is allowed.

## Classification

- taxonomy: `T6 appliance replacement`;
- modifier: `T6-G bounded generative appliance replacement`;
- target: appliance/object;
- locality: small ROI;
- runtime role: replacement-object;
- generation allowance: `isolated-object-synthesis`;
- approval: human review required.

## Authority split

### Deterministic / non-generative authority

Must decide:

- Stone 02 host plane;
- cooktop center/placement;
- target footprint/silhouette envelope;
- projected orientation;
- front/rear/left/right footprint edges;
- contact with the stone;
- edit ROI;
- protected pixels;
- maximum post-generation fit budget.

Generation cannot override these.

### Generative appearance authority

May decide only object-local appearance:

- grate shape/detail inside the accepted footprint;
- burner rendering;
- knob rendering;
- reflection/highlight structure;
- small local shadows/reflections belonging to the object.

This is a deliberate exception to the normal “generation only for residual”
rule, but only for **object-local pixels**.

The surrounding scene remains deterministic.

## Existing cooktop regeneration is useful precedent, not final method

The repository already contains:

- `review-assets/cooktop-regenerated-fit/donor.png`;
- `tools/fit_regenerated_cooktop.py`;
- technical PASS with zero changed pixels outside replacement support.

That experiment has several good properties:

- exact input hashes;
- real donor transparency required;
- deterministic removal/backing;
- zero changes outside replacement support;
- zero sink/faucet/drainer changes;
- zero front-edge/body changes;
- runtime installation explicitly false.

However the tool itself records the key limitation:

> independent width/height fit is not a perspective proof.

Its `214 x 32` fit at `(520,540)` is therefore appearance evidence and a
workflow precursor, not BMC-04 geometry authority.

## The accidental ImageGen result

The user designated the accidental ImageGen scene as visually excellent — close
to a golden target.

That is valuable, but its role is:

`perceptual-target / D2 appearance-only`.

It can answer:

> “What kind of cooktop integration looks convincing?”

It cannot answer:

> “Where are the physically/projectively correct cooktop corners?”

Before it becomes benchmark evidence it should be materialized and hashed. Its
geometry must never be reverse-promoted merely because the image is attractive.

## Proposed workflow

### C0 — resolve current evidence

Freeze:

- canonical source hash;
- current cooktop/removal support;
- Stone 02 owner pixels;
- Module 02 cooktop slot evidence;
- existing regenerated donor;
- perceptual target if materialized.

### C1 — deterministic host-plane footprint

Before calling an image model:

1. measure the current Stone 02 top-plane width axis;
2. reuse/resolve the lower-zone depth direction;
3. define a deterministic footprint quad for the cooktop;
4. publish named footprint edges;
5. publish the hard silhouette/placement guide;
6. set a maximum post-fit budget.

Important:

the slot currently says approximately `600 x 520 mm`, but its status in Scene
Core is **inferred**, not confirmed. Therefore the footprint must keep that
epistemic status. The host plane can be stronger than the exact appliance
dimensions.

### C2 — deterministic reuse attempt

Test whether the existing regenerated transparent donor can fit the corrected
footprint with only a **small** normalization.

If a large projective warp is required, record the candidate as
`APPEARANCE_WEAK` or `GEOMETRY_FAIL` rather than distorting it until it looks
acceptable.

### C3 — isolated guided generation

If C2 requires destructive warping, generation becomes justified.

Inputs:

- clean stone/cabinet crop with the old cooktop removed;
- deterministic footprint guide as a separate reference;
- current/existing cooktop reference;
- existing regenerated donor when useful;
- user-designated perceptual target when materialized;
- transparent output requirement where supported.

Prompt intent:

> synthesize the cooktop already seen in the required target perspective and
> footprint; do not redesign the countertop, cabinet or scene.

The model is asked to make a **new object view**, not to correct the scene.

### C4 — deterministic extraction/normalization

After generation:

- reject background pixels;
- extract object alpha;
- permit only small bounded placement/scale normalization;
- clip/extract to authorized object support;
- compose over deterministic clean backing;
- calculate exact delta.

If the candidate needs a large warp, regenerate.

### C5 — gates

Blocking:

- source hashes;
- deterministic footprint exists;
- footprint remains on host plane;
- outside ROI changed pixels = 0;
- y >= 575 protected front/body changed pixels = 0;
- sink/faucet/drainer changed pixels = 0;
- generated silhouette remains within footprint tolerance;
- no floating contact;
- no duplicated appliance fragments;
- no opaque background rectangle/checkerboard;
- delta round-trip exact.

Review:

- grate continuity;
- burner perspective;
- knob perspective;
- projected depth;
- contact with stone;
- fringe/halo;
- perceptual similarity to the golden target.

## Why this belongs in the current workflow

This is not a special exception that says “ImageGen may fix geometry”.

It formalizes the opposite:

**geometry stays outside the model.**

The model is allowed to avoid a destructive raster warp by synthesizing the
detailed appliance **already in the target geometry**.

For a future geometry-first bedroom/kitchen scene the same pattern applies to
objects such as:

- complex hardware;
- lamps;
- faucets;
- detailed appliances;
- decorative accessories;

when the scene knows the object's placement/footprint but lacks a satisfactory
view of the object.

## Deterministic footprint result

The blocked geometry step has now been executed by:

`tools/research_project_rect_on_host_quad.py`.

Inputs:

- Stone 02 top host quad:
  - front-left `[492,574]`;
  - front-right `[745,574]`;
  - back-right `[762,552]`;
  - back-left `[524,552]`;
- physical Stone 02 top: `791.01 x 550 mm`;
- cooktop slot:
  - left offset: `95.505 mm`;
  - front offset inside Stone 02: `15 mm`;
  - inferred size: `600 x 520 mm`.

The resulting local-derived footprint is approximately:

- front-left: `[523.37,573.40]`;
- front-right: `[714.97,573.40]`;
- back-right: `[732.75,552.60]`;
- back-left: `[551.91,552.60]`.

This is a host-plane trapezoid, not an axis-aligned rectangle.

Report:
`review-assets/research/bmc04-cooktop-footprint-v0.1-report.json`.

### Existing regenerated donor comparison

The existing regenerated fit is the rectangle:

`[520,540,214,32]`.

Relative to the new target footprint:

- max corner displacement: about `34.31 px`;
- mean corner displacement: about `17.43 px`.

More importantly, the difference is structural rather than a simple translation:
the existing fit has vertical depth edges while the host-plane footprint has
slanted, converging depth edges.

Therefore a “fix it with a deterministic warp” path would indeed require a
substantial projective deformation of grates/burners/knobs.

This is sufficient evidence to move BMC-04 to:

**`REGENERATION_JUSTIFIED` for object-local appearance.**

It does not make generation geometry authority. The deterministic footprint
above remains the hard guide.

## Current stop condition

Geometry is no longer the blocker.

Next step:

1. materialize a clean cooktop-free reference crop;
2. materialize a separate hard-footprint guide;
3. surface the current cooktop/reference donor;
4. materialize/hash the user-designated perceptual target if available;
5. call generation for an isolated cooktop already authored in the target
   perspective;
6. reject any result that needs another large projective correction.
