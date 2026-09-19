# BMC-01 Tooling Implementation Conformance Audit v0.1

Status: static/deep source audit complete; deterministic historical replay revalidated  
Target: Module 02 exposed right face  
Research branch: `research/reconstruction-architecture-v0.1`

## Purpose

Check whether the **actual implementation** behind the existing Module 02 right-face pipeline matches the reconstruction architecture now being formalized.

This audit deliberately distinguishes:
- a historically acceptable candidate;
- a conceptually useful algorithm;
- a currently runnable implementation;
- a reusable architectural primitive.

Those are not the same thing.

## Audit basis

Inspected:
- `tools/materialize_perspective_donor_recipe.py`;
- `tools/extract_candidate_delta.py`;
- `tools/validate_authoring_provenance.py`;
- `tools/validate_candidate_assets.py`;
- `tools/render_candidate_review.py`;
- `tools/gap_pixel_gate.py`;
- `tools/gap_parallelism_gate.py`;
- `tools/perspective_editorial_gate.py`;
- `tools/experiment_gap_local_warp.py`;
- relevant unit tests;
- `.github/workflows/candidate-assets.yml`;
- BMC-01 recipe, candidate metadata and authoring contract.

No runtime/product code was changed.

## Executive finding

The existing authoring system contains **several strong primitives**, especially around:
- source/variant binding;
- bounded perspective donor transfer;
- ROI protection;
- exact delta extraction semantics;
- provenance;
- fail-closed pixel measurement.

However, the current pipeline should **not** be promoted wholesale as the reconstruction method.

Three reasons dominate:

1. projective target geometry is authored as recipe data rather than resolved from an explicit physical/projection authority;
2. several validators are intentionally narrow and must remain narrow;
3. the current `extract_candidate_delta.py` file contains a concrete Python syntax defect in its CLI metadata block, which transitively prevents the projective donor materializer from being considered currently runnable.

The historical candidate remains useful evidence about the method/result; it is not proof that the current source implementation executes successfully.

## Finding F-01 — Projective donor materializer

File:
`tools/materialize_perspective_donor_recipe.py`

Classification:
**CONFORMANT_WITH_LIMITS** as a donor materializer; **REUSABLE_CORE** internally.

### What conforms

The implementation correctly validates several strong preconditions before editing:

- recipe schema;
- role exists uniquely;
- authoring contract exists uniquely;
- role ↔ contract binding;
- contract target scope;
- target variant fingerprint;
- method permission;
- exact source-frame SHA when declared;
- canonical canvas size.

The four-point projection itself is deterministic:
- solves the projective coefficients;
- maps target quad to donor quad;
- uses PIL perspective transform;
- applies a polygon mask;
- intersects that mask with authorized ROI;
- removes pixels owned by protected assets;
- composites deterministically.

It then delegates to deterministic delta extraction.

This strongly matches the intended **C1/C2 donor materialization** role.

### What does not yet conform to ProjectionResolver

The materializer does **not** establish why the target quad is correct.

It consumes:
- `donorQuad`;
- `targetQuad`;

as recipe authority.

It does not bind the target quad to:
- A1 physical side primitive;
- a projection model;
- projection confidence;
- named edge residuals;
- an epistemic status for inferred rear boundaries.

Therefore this tool should not become `ProjectionResolver`.

Correct architectural decomposition:

`ProjectionResolver -> target geometry`

then

`ProjectiveDonorMaterializer -> raster transfer`.

### Protection limitations

Protected regions are currently expressed as a list of full-canvas RGBA assets whose nonzero alpha is binarized and unioned.

Strength:
- deterministic;
- easy to audit;
- prevents overwriting existing owned pixels.

Limitations:
- no vector/polygon protection source;
- no reason/authority attached to each protected region;
- any nonzero alpha is treated as fully protected;
- protection semantics are internal to this materializer rather than a shared protection primitive.

Recommended disposition:
**extract/generalize the projective-copy and protected-mask cores; do not promote the whole script unchanged.**

## Finding F-02 — Delta extractor syntax blocker found and repaired on research branch

File:
`tools/extract_candidate_delta.py`

Classification:
algorithm/file: **CONFORMANT_WITH_LIMITS** for `opaque-replacement-pixels`

### Strong algorithmic behavior

`extract_delta()` implements a valuable contract:

- source and edited frames must match size;
- difference is computed deterministically;
- empty edit fails;
- every changed RGB pixel must be inside ROI;
- candidate is full-canvas RGBA;
- changed pixels become opaque replacements;
- alpha bounds must exist;
- recomposition must reproduce the edited RGB frame exactly;
- nonzero round-trip mismatch fails.

The unit tests explicitly cover:
- exact inside-ROI round trip;
- outside-ROI rejection;
- empty edit rejection;
- frame-size mismatch.

This is close to a canonical primitive for the existing `opaque-replacement-pixels` delta mode.

### Concrete source defect

The CLI metadata dictionary currently contains JavaScript/JSON literals in Python source:

- `true`;
- `null`.

These appeared in:
- `provenance.deltaExtractionRequired`;
- `humanReview.reviewer`;
- `humanReview.reviewedAt`.

They were invalid Python syntax and were repaired minimally on the research branch:
- `true -> True`;
- `null -> None`.

A second implementation issue surfaced immediately under focused unit import: the perspective donor script used a script-local import that failed when imported as `tools.materialize_perspective_donor_recipe`. It now follows the repository's existing dual import pattern and supports both package import and direct script execution.

This is a real implementation-conformance finding, not an architectural objection.

### Historical implication

The repository contains a materialized candidate and extraction report, but that proves only that an earlier authoring path produced those artifacts.

It does not establish that the current checked-in extractor is runnable.

### Additional scope limit

The algorithm compares RGB and emits only fully opaque replacement pixels.

That is correct for the declared current mode:
`opaque-replacement-pixels`.

It is not yet a generic delta primitive for:
- alpha-only changes;
- partially transparent replacement;
- additive/multiply material layers.

Recommended disposition:
- repair syntax before any BMC-01 execution;
- preserve `extract_delta()` semantics as a bounded primitive;
- make delta mode explicit if generalized.

## Finding F-03 — Provenance validator is strong but method-specific

File:
`tools/validate_authoring_provenance.py`

Classification:
**CONFORMANT_WITH_LIMITS**

### Strong behavior

For roles bound to an authoring contract it verifies:

- contract exists;
- role and target variant match;
- authoring mode requires canonical-frame edit and delta extraction;
- candidate method is allowed;
- candidate binds the same contract;
- delta extraction is declared;
- required source references are present;
- source/edited frame hashes have valid form;
- extraction report exists and is PASS;
- extraction report fields match metadata;
- outside-ROI change count is zero;
- round-trip mismatch is zero;
- candidate image hash matches report and metadata.

For `method == derived`, it additionally verifies:
- recipe path;
- recipe SHA;
- actual recipe bytes match SHA;
- report binds the same recipe.

This is excellent lineage behavior for BMC-01.

### Architectural limit

Recipe binding is currently special-cased for `derived`.

The new architecture expects method-specific provenance to be explicit for all candidate families, including future:
- generated residual;
- neutral render;
- donor + generation;
- calibrated projection.

Recommended disposition:
retain as a strong provenance primitive, then move method-specific evidence under a Reconstruction Packet/candidate lineage schema rather than accumulating conditionals indefinitely.

## Finding F-04 — Candidate intake is correctly structural, not authoring authority

File:
`tools/validate_candidate_assets.py`

Classification:
**CONFORMANT_WITH_LIMITS**

### Conforming behavior

It validates:
- candidate schema/id;
- scene;
- role;
- target variant and role compatibility;
- basic provenance method vocabulary/references;
- PNG path;
- exact canvas;
- RGBA mode;
- nonempty alpha;
- alpha containment in authorized ROI;
- alpha pixels outside ROI = 0;
- minimum/maximum alpha bbox constraints;
- image hash;
- human review state;
- approval bound to exact candidate hash and complete checklist.

The unit tests exercise:
- valid review candidate;
- ROI leak;
- wrong canvas;
- hash-bound approval;
- stale approval hash;
- no-candidate state.

### Important non-capability

A structural PASS does **not** prove:
- source hash;
- authoring contract;
- geometry;
- projection;
- round trip.

That evidence belongs to other gates.

This separation is healthy.

Recommended disposition:
keep structural intake narrow; do not expand it into a monolithic validator.

## Finding F-05 — Review renderer is a presentation/replay primitive, not a geometry gate

File:
`tools/render_candidate_review.py`

Classification:
**REUSABLE_CORE**

### Strong behavior

The renderer can:
- replay current deterministic target variant;
- recover a historical baseline through source manifest;
- verify historical baseline source hash;
- compose candidate over exact baseline;
- calculate visible RGB change;
- recheck outside-ROI changes;
- emit candidate/composed/difference files;
- emit full-scene and ROI review sheet;
- preserve human gate state.

This is very useful for benchmark/review tooling.

### Limit

Its `machineVisualGate` is effectively:
- candidate changes something;
- change remains inside ROI.

It is not:
- perspective validation;
- material validation;
- structural geometry validation.

Recommended disposition:
promote conceptually as `ReviewRenderer`, never as a complete `GateRunner`.

## Finding F-06 — Pixel gap gate is a strong fail-closed measurement primitive

File:
`tools/gap_pixel_gate.py`

Classification:
**CONFORMANT_WITH_LIMITS**

### Strong behavior

It measures **actual pixels**, not declared annotation geometry:

- source/candidate/reference canvas match;
- reference must provide real alpha;
- source/candidate delta is measured;
- reference edge comes from reference alpha;
- candidate visible edge comes from actual RGB delta;
- multiple delta thresholds are evaluated;
- line fit, RMS, angle, slope and gap range are reported;
- missing/clipped edge blocks;
- mixed threshold PASS/FAIL becomes BLOCKED rather than cherry-picking a passing threshold;
- output explicitly states limitations;
- `promotionEligible = false`.

The unit test intentionally preserves the historical p8/s28 result as FAIL even though an earlier declared measurement had passed.

This behavior matches the new architecture extremely well.

### Scope limit

It is specifically a **local horizontal visible-support gap** gate.

It assumes:
- edge extraction convention;
- horizontal distance between candidate and reference edge;
- row band;
- delta thresholds.

It should not be renamed/generalized to “GeometryGate” unchanged.

Recommended disposition:
extract reusable pieces later:
- line fit;
- threshold-sweep edge support;
- edge-quality diagnostics.

Keep the existing gate intact as a domain-specific regression.

## Finding F-07 — Editorial perspective gate is correctly non-authoritative

File:
`tools/perspective_editorial_gate.py`

Classification:
**EXPERIMENT_ONLY / CONFORMANT_WITH_LIMITS**

The output explicitly declares:

- `scope = declared-geometry-only`;
- `pixelEdgeVerification = NOT_EVALUATED`;
- `promotionEligible = false`.

It compares declared:
- roll;
- vertical axis;
- projected depth;
- front/back alignment;
- floor contact;
- center;
- width;
- signed depth direction/slope.

It emits correction vectors useful for authoring.

The unit tests show it:
- fails inverted depth;
- emits directional correction;
- passes a declared corrected fit.

Recommended disposition:
retain as a diagnostic/guide instrument.
Do not allow it to satisfy G2 geometry by itself for photographic reconstruction.

## Finding F-08 — Human-calibrated parallelism gate remains annotation authority only

File:
`tools/gap_parallelism_gate.py`

Classification:
**EXPERIMENT_ONLY / CONFORMANT_WITH_LIMITS**

The tests explicitly require human-calibrated reference authority and reject `agent-inferred` for the v0.2 grid.

This is useful historical/editorial evidence.

It is weaker than `gap_pixel_gate.py` as a statement about actual candidate pixels because its candidate input is a declared measurement line rather than extracted support.

Recommended disposition:
keep it as a calibration/annotation comparator; do not promote it over pixel evidence.

## Finding F-09 — Local warp experiment correctly refuses authority

File:
`tools/experiment_gap_local_warp.py`

Classification:
**EXPERIMENT_ONLY**

The source is unusually explicit:

- “mesh refinement hypothesis”;
- “not a camera-pose or rigid-plane correction”;
- attempted protected-stone collisions are counted before clipping;
- selected candidate remains `promotionEligible=false`;
- warning records that local warp can bend internal top-plane geometry.

This is exactly how an experiment should behave.

Recommended disposition:
keep as evidence generator. Do not extract a generic projection primitive from it without a new contract.

## Finding F-10 — Test coverage is uneven at the architectural boundary

### Strongly covered

Observed direct tests for:
- delta algorithm;
- provenance;
- structural candidate intake;
- gap pixel gate;
- perspective editorial gate;
- human-calibrated parallelism gate.

### Missing direct boundary test

No dedicated unit test file was found for:
`materialize_perspective_donor_recipe.py`.

The current candidate workflow exercises many gates but does not itself establish that the perspective donor materializer is covered by a focused unit fixture.

The most important missing unit cases are:

- perspective coefficient mapping;
- singular quad rejection;
- source hash mismatch;
- variant fingerprint mismatch;
- protected alpha exclusion;
- ROI intersection;
- exact recipe replay;
- recipe target geometry preservation.

Recommended disposition:
before promoting projective donor code, add focused tests in the research implementation phase.

## Current BMC-01 chain classification

| Stage | Current code | Audit result |
|---|---|---|
| exact variant derivation | manifest + variant renderer | CONFORMANT_WITH_LIMITS |
| recipe/contract/source binding | perspective donor materializer | CONFORMANT_WITH_LIMITS |
| projection geometry resolution | recipe-authored quad | CONTRACT_MISMATCH with future ProjectionResolver |
| donor perspective warp | perspective donor materializer | REUSABLE_CORE |
| protected asset masking | perspective donor materializer | REUSABLE_CORE |
| deterministic delta | extractor algorithm | REUSABLE_CORE |
| current extractor module execution | `extract_candidate_delta.py` | CONFORMANT_WITH_LIMITS after research repair |
| structural intake | candidate validator | CONFORMANT_WITH_LIMITS |
| authoring lineage | provenance validator | CONFORMANT_WITH_LIMITS |
| review rendering | candidate review | REUSABLE_CORE |
| actual-pixel local gap measurement | gap pixel gate | CONFORMANT_WITH_LIMITS |
| declared perspective guidance | editorial gate | EXPERIMENT_ONLY |
| local warp experiment | local warp | EXPERIMENT_ONLY |

## Promotion decisions v0.1

### Candidate for promotion after repair

- `extract_delta()` exact opaque replacement algorithm;
- source hash utility;
- exact round-trip invariant;
- authoring provenance cross-binding;
- candidate structural intake;
- historical/current review replay.

### Candidate for extraction/generalization

- projective coefficient solver;
- perspective donor warp;
- protected-mask union;
- line fitting;
- threshold-sweep edge measurement.

### Keep experiment-specific

- editorial perspective correction vectors;
- human-annotation parallelism;
- piecewise local gap warp.

### Do not implement yet

- generic ProjectionResolver;
- OcclusionResolver;
- NeutralFaceRenderer;
- automatic method selector.

Those require the pending camera/projection and benchmark work.

## D-001 resolution and exact replay

D-001 is resolved **only on the research branch**.

Changes:
- repaired Python literals in `extract_candidate_delta.py`;
- made the perspective donor materializer importable both as a package module and as a direct script;
- added focused unit coverage for projective coefficient mapping, singular geometry rejection, ROI masking, protected-pixel behavior and deterministic replay of the warp primitive.

Research workflow run:
`35453134871`.

Results:
- compile gate: PASS;
- focused tests: `29/29 PASS`;
- historical source variant exact SHA: PASS;
- projective donor recipe: PASS;
- historical candidate byte-for-byte reproduction: PASS;
- candidate SHA:
  `3becbf8a510dd76757593ed5c227482edef7af57c48877e9d2e714398e77fff8`;
- changed pixels: `1910`;
- difference bounds: `[755,525,764,815]`;
- outside ROI changes: `0`;
- round-trip mismatch: `0`;
- edited frame SHA reproduced:
  `dfa445834900d87450392f3ccec827880eade882ca914153110b6f9d3558eca4`;
- canonical historical provenance validation: PASS.

The temporary workflow self-removed after success.

This is strong evidence that **the donor materialization + delta extraction + provenance chain is deterministically reproducible** for BMC-01.

It does **not** validate the target quad as physical ground truth; that remains a projection-authority question.

## Recommended next implementation-aware sequence

1. record this audit — DONE;
2. add Track D — DONE;
3. repair D-001 and add focused perspective-donor tests — DONE;
4. rerun exact BMC-01 historical recipe — DONE, byte-for-byte match;
5. perform the camera/projection compatibility investigation — NEXT;
6. use that result to decide whether the current authored target quad remains only bounded inference or can be strengthened;
7. only then extract/generalize ProjectionResolver-adjacent primitives.

## Architectural conclusion

The current repository is **closer to the desired method than a greenfield rewrite would be**.

The right strategy is not “build a reconstruction framework”.

It is:

- preserve strong existing invariants;
- repair concrete implementation defects;
- separate recipe-authored geometry from projection authority;
- extract narrowly reusable primitives;
- keep diagnostics/experiments explicitly non-authoritative;
- let BMC-01 prove which abstractions deserve to become stable code.


## F-11 — Local depth transfer implementation

File:
`tools/research_local_depth_transfer.py`

Classification:
**EXPERIMENT_ONLY / REUSABLE_CORE**

The implementation correctly separates:
- physical depth from Scene Core;
- current raster projection evidence;
- local transfer;
- historical comparison.

It scales the current Stone 03 local depth vector independently for:
- 530 mm carcass;
- 348.83 mm recessed plinth.

It explicitly refuses:
- global camera authority;
- promotion eligibility;
- unqualified reuse of the historical BMC-01 quad.

That behavior matches ADR 0005/0006.

The limitation is architectural scope: it is a local affine hypothesis for the
legacy lower-kitchen zone, not a general ProjectionResolver.

## F-12 — Ownership and underlayer audits

Files include:
- `tools/research_depth_cue_ownership.py`;
- `tools/research_bmc01_underlayer_reuse.py`;
- `tools/research_bmc01_underlayer_identity.py`;
- `tools/research_bmc01_plinth_identity.py`.

Classification:
**CONFORMANT_WITH_LIMITS** as evidence helpers.

These tools materially changed the result rather than merely confirming it.

They rejected two attractive but false shortcuts:

1. the historical long Module 02 depth line was mostly conditional bridge
   support;
2. nonzero Module 02 alpha to the right of the seam was mostly compositing
   support and could not be promoted to opaque hidden-face appearance.

This is strong conformance with the architecture's ownership-before-geometry
rule.

The implementations remain case-bound and should not be promoted by filename.

## F-13 — Antialiased deterministic completion

File:
`tools/research_bmc01_antialiased_completion.py`

Classification:
**EXPERIMENT_ONLY**

The implementation is appropriate as a BMC-01 authoring experiment:

- separate carcass/plinth target geometry;
- separate donors;
- supersampled target coverage;
- strong existing owner protection;
- no generative synthesis;
- explicit ROI.

It should not become the generic deterministic renderer.

Its target quads and donor choices are supplied by BMC-01 research evidence,
and its material appearance remains donor-based.

## F-14 — Runtime asset materializer

File:
`tools/materialize_bmc01_runtime_assets.py`

Classification:
**CONFORMANT_WITH_LIMITS**

This implementation repaired an important conceptual weakness in the first
runtime prototype.

The research candidate is no longer consumed as one RGBA image that implicitly
mixes:
- appearance RGB;
- alpha coverage;
- semantic ownership.

The materializer creates separate:
- neutral RGB;
- alpha ownership mask;

for carcass and plinth and emits a provenance manifest.

The outputs live inside `app/assets/`, so they are valid for the actual Netlify
publish root rather than depending on repository-parent paths.

The implementation remains BMC-01-specific because slot names and source
filenames are hard-coded.

## F-15 — Runtime reconstruction renderer

File:
`app/core/reconstruction.js`

Classification:
**REUSABLE_CORE / CONFORMANT_WITH_LIMITS**

Conforming behavior:
- consumes neutral+mask pairs;
- applies current material color/texture;
- preserves source luminance as bounded shading evidence;
- keeps carcass/plinth independent;
- async render revisions prevent stale material state from winning;
- query gate keeps default runtime untouched.

Observed browser proof:
- four visibility states: PASS;
- MDF response: PASS;
- stone-skirting split: PASS;
- outside authorized ROI: 0;
- page errors: 0;
- default runtime remains historical without query flag.

Limitations:
- current integration assumes full-scene canvas assets;
- only BMC-01 supplies data;
- slot material policy is still wired by app code rather than resolved from a
  packet/material policy engine;
- it is not a NeutralFaceRenderer.

## F-16 — Browser behavior gate

File:
`tests/reconstruction-browser.cjs`

Classification:
**CONFORMANT_WITH_LIMITS**

This is now a real behavior contract rather than a screenshot-only smoke test.

It covers:
- both modules visible -> no reconstruction;
- Module 02 hidden -> no reconstruction;
- both hidden -> no reconstruction;
- only Module 03 hidden -> reconstruction active;
- base-light material;
- dark MDF;
- stone package selected but skirting off;
- stone skirting on;
- Module 02 hidden after edits;
- default query-less app does not delegate the historical overlay.

This is strong evidence for the current case while remaining intentionally
case-specific.

## F-17 — Reconstruction Packet validator

Files:
- `review-assets/research/bmc01-reconstruction-packet-v0.1.json`;
- `tools/validate_reconstruction_packet.py`;
- `tests/test_validate_reconstruction_packet.py`.

Classification:
**CONFORMANT_WITH_LIMITS**

Research run:
`35475061682`.

Observed:
- packet validation: PASS;
- Python regression suite: 98 tests, PASS.

The validator enforces the most important first-order boundaries:
- required packet sections;
- claim and confidence vocabulary;
- transformation-confidence vocabulary;
- valid ROI;
- zero-change/default-runtime invariants;
- no default promotion before human approval;
- required evidence paths;
- runtime material-slot manifest;
- separated neutral/mask assets.

It deliberately does not yet claim complete ADR 0006 coverage.

Missing before general promotion:
- versioned formal schema/migrations;
- claim-source hash resolution;
- per-claim uncertainty/residual validation;
- automatic gate selection from case class;
- generic packet serialization.

## Updated disposition

The correct next abstraction step is **not** a framework rewrite.

BMC-01 has now demonstrated enough implementation to extract stable concepts,
but not enough diversity to freeze all APIs.

Promote conceptually now:
- Reconstruction Packet vocabulary;
- appearance/ownership separation;
- material-slot runtime representation;
- fail-closed lifecycle rule;
- ownership audit before geometric inference.

Keep case-specific until BMC-02/BMC-03:
- local depth transfer;
- BMC-01 donor selection;
- BMC-01 neutral/mask materializer;
- BMC-01 browser selectors.

A second scene/case should now be used to determine which interfaces are
actually generic.
