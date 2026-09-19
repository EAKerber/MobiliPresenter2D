# Reconstruction Method Benchmark Protocol v0.1

Status: exploratory / proposed

## Purpose

Provide a repeatable way to compare reconstruction methods on real MobiliPresenter2D cases without allowing subjective visual preference to hide geometry errors, edit leakage or provenance weakness.

The benchmark does **not** declare a universal winning method.

It measures which method is adequate for which case class.

## Benchmark principles

1. compare methods on the exact same canonical source frame;
2. keep geometry/protection contracts identical across candidates;
3. record method escalation explicitly;
4. fail structural gates before perceptual scoring;
5. separate deterministic fidelity from appearance quality;
6. distinguish agent review from human approval;
7. preserve rejected candidates as evidence when useful;
8. never reinterpret a failed gate as success because the image looks plausible.

The R5A gap-pixel calibration is the reference example for this last rule: regression tests correctly preserve a FAIL when the candidate does not satisfy measured pixel geometry.

## Benchmark unit

A benchmark unit is:

`case + exact source + reconstruction packet + candidate method`

Each candidate record should include:

- case ID and taxonomy class;
- source frame hash;
- target variant fingerprint;
- reconstruction packet hash/version;
- method level;
- deterministic inputs;
- generation receipt if any;
- candidate image/delta hash;
- gate outputs;
- metrics;
- reviewer result.

## Method IDs

Recommended stable method family IDs:

- `M0-canonical-reuse`;
- `M1-same-object-donor`;
- `M2-same-material-donor`;
- `M3-affine-donor`;
- `M4-projective-donor`;
- `M5-neutral-deterministic-render`;
- `M6-neutral-render-plus-donor`;
- `M7-local-guided-generation`;
- `M8-contextual-guided-generation`.

These IDs describe method families, not implementation versions.

An implementation should add a version/hash separately.

## Gate layers

## G0 — source integrity

Blocking.

Checks:
- source image hash;
- target variant fingerprint;
- required donor hashes;
- reconstruction packet/source references resolve.

Failure means the candidate is not comparable.

## G1 — edit authorization

Blocking.

Checks:
- authorized ROI exists;
- changed pixels outside ROI;
- protected layer overlap;
- protected object overlap;
- alpha ownership.

For zero-change contracts:
- outside authorized ROI changed pixels must equal zero.

## G2 — geometry fidelity

Blocking for structural classes such as T1/T2/T3/T4.

Possible measurements:
- front-edge error px;
- rear-edge error px;
- top/bottom contact error px;
- slope error;
- angular error;
- quad corner error;
- floor-contact error;
- gap bounds;
- width/depth ratio error.

Important:
Thresholds are case-specific and must come from the Reconstruction Packet or existing calibrated grids, not from benchmark convenience.

## G3 — round-trip / composition integrity

Blocking when delta extraction is required.

Checks:
- deterministic delta extracted;
- canonical + delta reproduces edited frame;
- round-trip mismatch pixel count;
- expected alpha semantics.

Current reference:
Module 02 exposed-right-face candidate records `roundtripMismatchPixelCount = 0`.

## G4 — material and tonal continuity

Usually non-blocking initially, but can become blocking after calibration.

Metrics may include:
- mean luminance delta to donor/adjacent surface;
- chroma delta;
- local contrast;
- texture-frequency difference;
- gradient/shadow continuity;
- seam contrast.

These metrics should be reported before final thresholds are chosen.

## G5 — artifact detection

Candidate should report binary or counted issues:
- floating pixels;
- halo;
- edge ringing;
- duplicated hardware;
- material smear;
- seam discontinuity;
- texture scale mismatch;
- shadow outside ROI;
- protected-object deformation.

Automated detection may be incomplete; agent review can supplement it.

## G6 — perceptual/editorial review

Non-deterministic by nature.

Separate:
- `agent-review`;
- `human-review`.

Suggested review questions:
- does the new face read as physically attached to the host?
- does material match the scene?
- is perspective plausible?
- are terminations/corners convincing?
- is any invented structure visible?
- does the result call attention to itself?

A visually pleasing candidate cannot override G0-G3 failures.

## Metric groups

## D — Determinism / reproducibility

Record:
- same inputs -> same output: yes/no;
- stochastic generation used: yes/no;
- number of attempts;
- whether candidate selection was automatic/manual;
- whether output is reproducible from stored receipt;
- deterministic changed-pixel count variance.

## L — Locality

Record:
- changed pixel count;
- change bounds;
- changed area / ROI area;
- changed area / full frame area;
- protected overlap;
- outside ROI changes.

Lower is generally preferable only when it still satisfies appearance/geometry.

## P — Projection fidelity

Record:
- edge/corner errors;
- angle/slope;
- contact alignment;
- projection confidence class.

## A — Appearance fidelity

Record:
- luminance/chroma/texture metrics;
- artifact flags;
- agent review;
- human review.

## O — Operational cost

Record:
- helper steps;
- runtime duration;
- external generation calls;
- human interventions;
- manual annotations required;
- storage/provenance burden.

Operational cost is a secondary metric, not permission to weaken geometry gates.

## Benchmark result categories

Do not collapse the benchmark into one numeric score in v0.1.

Use categories:

### INVALID
Failed G0 source integrity.

### UNSAFE
Failed G1 edit authorization/protection.

### GEOMETRY_FAIL
Passed integrity/protection but failed G2.

### COMPOSITION_FAIL
Passed geometry but failed required G3.

### TECHNICALLY_VALID
Passed G0-G3.

### APPEARANCE_WEAK
Technically valid but fails appearance/artifact review.

### REVIEWABLE
Technically valid with acceptable automated/agent appearance checks; human review still required.

### APPROVED
Only when the relevant approval contract has been satisfied.

This preserves the difference between structural correctness and visual quality.

## Initial benchmark suite

## BMC-01 — Module 02 exposed right face

Taxonomy:
T1 hidden structural side face.

Why first:
The repository already provides unusually strong benchmark infrastructure:
- exact source frame hash;
- target variant fingerprint;
- measured front edge;
- local stone depth cue;
- target/support quad;
- authorized ROI;
- Module 01 canonical same-material donor;
- deterministic perspective-copy recipe;
- exact expected changed pixel count for the existing candidate;
- protected-layer overlap measurement;
- outside-ROI measurement;
- round-trip gate;
- agent review;
- human review pending.

Current candidate baseline:
- method: derived perspective donor;
- changedPixelCount: 1910;
- differenceBounds: `[755,525,764,815]`;
- protectedLayerOverlapPixels: 0;
- outsideAuthorizedRoiChangedPixelCount: 0;
- roundtripMismatchPixelCount: 0;
- visualReview: AGENT_PASS;
- humanReview: PENDING.

Important limitation:
The rear boundary remains a bounded hypothesis, so the benchmark must not treat current geometry as human-confirmed truth.

### Candidate methods to compare

#### BMC-01-A — existing projective donor
Use the current Module 01 carcass-side donor and current bounded target.

Purpose:
baseline.

#### BMC-01-B — deterministic neutral face + donor material
Construct the face deterministically from the same target geometry, then transfer donor material/tonality.

Purpose:
test whether stronger deterministic structure improves edge/shading consistency.

#### BMC-01-C — B + local generative harmonization
Use B as expected-neutral input and allow generation only inside the residual mask.

Purpose:
test whether generative authoring improves integration without changing geometry, ownership or edit entitlement.

#### BMC-01-D — guide-first local generation
Provide:
- clean crop;
- geometry guide;
- donor;
- strict residual mask;
without first rasterizing the neutral face into the candidate.

Purpose:
compare generative dependence on explicit neutral render vs guide-only conditioning.

Do not add a whole-scene regeneration candidate unless C/D demonstrate that the local context is insufficient.

## BMC-02 — Module 03 left stone termination

Taxonomy:
T3 countertop/stone return.

Purpose:
test a small termination case where over-generation is a larger risk than lack of texture detail.

Candidate families:
- deterministic small return;
- stone donor warp;
- local guided generation.

Key failure:
invented full-height divider/side panel.

## BMC-03 — technical/internal module view

Recommended initial module:
Module 06.

Taxonomy:
T9 internal technical view.

Purpose:
benchmark **presentation backends**, not raster reconstruction.

Compare:
- deterministic SVG line drawing;
- deterministic shaded neutral raster;
- optional cosmetic generative polish.

Blocking rule:
all methods must preserve the same physically confirmed divider/shelf/cavity geometry.

Generative polish is never allowed to improve geometry score.

## Benchmark matrix

Each benchmark report should include a table with columns:

- candidate ID;
- method family;
- deterministic/generative;
- projection confidence;
- G0;
- G1;
- G2;
- G3;
- material metrics;
- artifact flags;
- agent review;
- human review;
- changed pixels;
- attempts;
- operational notes.

## Repeatability protocol

For deterministic methods:
- run at least twice;
- hashes must match.

For stochastic/generative methods:
- keep exact guide inputs fixed;
- run a small controlled set of candidates;
- record each candidate independently;
- never report only the selected winner;
- candidate selection criteria must be explicit.

v0.1 should avoid inventing an arbitrary sample count. The sample count may be set per experiment based on tool cost and observed variance.

## Threshold policy

Three threshold sources are allowed:

1. existing human-calibrated threshold;
2. measured deterministic baseline;
3. exploratory distribution reported without pass/fail status.

Do not silently create a blocking threshold from one attractive candidate.

Example:
The historical p8/s28 line arithmetic was invalidated when actual pixels contradicted it. The corrected workflow keeps the candidate FAIL and reports threshold sensitivity instead of tuning the threshold until it passes.

## Method-selection conclusion format

After a benchmark, conclusions should be written like:

- `preferred-for-T1-under-local-derived-projection`: M6;
- `fallback`: M7;
- `rejected`: M8 because locality/drift;
- `confidence`: provisional;
- `evidence`: BMC-01 only;
- `retest-required`: another hidden-side case.

Do not write:
- "M6 is the best reconstruction method."

The benchmark supports case-conditional conclusions only.

## Promotion rule

A benchmark result may update:
- case-class defaults;
- candidate-ladder ordering;
- mandatory gates;
- generation allowance.

It must not automatically promote a candidate to runtime.

Runtime promotion remains a separate approval step with its own authoring contract.

## Open questions

- final material-continuity thresholds;
- how many independent hidden-side cases are needed before generalizing from BMC-01;
- whether operational cost should ever be a blocking constraint;
- how to score perceptual quality without obscuring deterministic failures;
- whether agent review can approve some automatable classes without human review;
- whether benchmark artifacts should live under `review-assets/benchmarks/` or a separate research area.
