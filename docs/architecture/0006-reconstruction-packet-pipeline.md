# ADR 0006 — Reconstruction Packet and Authoring Pipeline v0.2

Status: exploratory / proposed

Depends on:
- ADR 0005 Reconstruction Authority Contract;
- ADR 0007 Reconstruction Case Taxonomy.

## 1. Purpose

The Reconstruction Packet is the canonical intermediate contract for one
reconstruction operation.

It should be serializable, reproducible and auditable from exact source
evidence.

The packet deliberately separates:
- truth claims;
- transformation evidence;
- visibility/ownership;
- edit authorization;
- authoring method;
- acceptance/review.

That separation prevents a generated image, a local line fit or an approved
candidate from silently becoming geometry authority.

## 2. Packet sections

### identity

Suggested fields:
- `operationId`;
- `sceneId`;
- `targetVariant`;
- `targetVariantFingerprint`;
- `targetModuleId`;
- `faceRole` / `operationRole`;
- `caseClass`;
- source commit and source hashes.

### claims

A list of claim records from ADR 0005.

Each important claim should declare:
- subject;
- domain (D1/D2/D3/D4);
- property;
- value;
- unit/frame;
- source ref/hash;
- status: confirmed/derived/inferred/blocked;
- derivation;
- valid-for scope;
- uncertainty;
- supersession links when applicable.

Examples:
- D1: right side exists, depth=530 mm;
- D2: front/side seam x=742 in exact target frame;
- D4: joint bridge is hidden when Module 03 is hidden.

### physicalGeometry

Convenience materialization of relevant D1/D3 claims:
- dimensions in mm;
- local face plane;
- face normal;
- envelope;
- adjacency;
- shelves/dividers/openings;
- source bindings;
- epistemic status.

It must not contain unsourced geometry disguised as confirmed physical data.

### ownership

Contains target-state visibility/ownership:
- host/occluder graph;
- visible/hidden entities;
- source-layer ownership;
- conditional bridges;
- exact variant manifest/fingerprint;
- ownership uncertainties.

This section is required when an observed raster edge may change ownership
between variants.

### transformationEvidence

Contains the 3D/mm -> pixel or pixel -> pixel relationship:
- method;
- confidence level from ADR 0005;
- source and target frames;
- image size;
- named anchors/correspondences;
- target polygon/quad;
- named projected edges;
- local depth vectors;
- pixel/mm information where valid;
- residuals;
- valid region/plane;
- residual hypotheses.

A local projective constraint must remain distinct from full camera
calibration.

### visualEvidence

Contains D2 appearance evidence:
- canonical crop;
- same-surface/same-object donors;
- same-material donors;
- donor polygons;
- material samples;
- local luminance/chroma;
- texture statistics;
- edge/seam evidence;
- lighting/shadow observations.

### editContract

Contains edit entitlement:
- canonical source frame hash;
- target variant fingerprint;
- authorized ROI;
- exact edit mask when known;
- protected regions/assets;
- zero-change zones;
- alpha/compositing ownership constraints;
- allowed authoring methods;
- direct generated-promotion policy;
- deterministic delta requirement.

Knowledge of a larger physical face does not widen this contract.

### authoringPlan

Declares:
- candidate-ladder starting point;
- deterministic helpers;
- donor strategy;
- whether generation is allowed;
- residual-only requirement;
- guide products;
- fallback/stop conditions.

### generationGuide

Optional and only present when a deterministic candidate is insufficient:
- clean reference image;
- guided reference image;
- deterministic neutral render;
- donor crop(s);
- residual mask;
- prompt constraints;
- forbidden outcomes.

The guide should be a separate input from the clean target. Guide removal
should not require a second generative pass.

### acceptance

Contains measurable gates:
- exact source fingerprint;
- ownership validity;
- transformation residuals;
- geometry tolerances;
- protected overlap;
- pixel invariants;
- round-trip rule;
- outside-ROI rule;
- material continuity;
- seam/edge continuity;
- artifact checks;
- required review level.

### lifecycle

Contains candidate review state:
- DRAFT;
- MACHINE_VALID;
- AGENT_REVIEW;
- HUMAN_REVIEW_PENDING;
- APPROVED;
- REJECTED;
- SUPERSEDED.

### provenance

Records:
- all source refs/hashes;
- deterministic transforms;
- candidate lineage;
- generation receipt when applicable;
- gate results;
- superseded evidence;
- approval receipt.

## 3. Confidence vector

In addition to transformation confidence, the packet should expose:

- `G`: geometry/topology certainty;
- `P`: projection/transform certainty;
- `A`: appearance evidence certainty;
- `O`: ownership/occlusion certainty.

Each is:
- confirmed;
- derived;
- inferred;
- blocked.

This vector is more useful than one scalar reconstruction confidence.

## 4. Guide products

A packet may materialize four separate guide families.

### geometry guide
SVG/JSON/raster review overlay:
- face polygon;
- named corners;
- expected seams;
- projected thickness;
- contact lines;
- explicit inferred edges.

### appearance guide
Raster/statistics:
- donor material;
- tonal range;
- texture scale/frequency;
- local shadow gradient.

### protection guide
Raster/vector:
- editable mask;
- protected zones;
- owner assets;
- zero-change regions.

### generation guide
Visual composite for an image model.

Guide pixels are never candidate pixels merely because they look plausible.

## 5. Deterministic helper families

### geometry helpers
- extract physical faces from Scene Core;
- resolve adjacency;
- resolve newly exposed faces;
- internal shelf/divider model;
- physical bounds.

### ownership helpers
- exact variant visibility;
- host/occluder reasoning;
- conditional bridge ownership;
- source-layer pixel contribution audit;
- provenance contamination detection.

### transformation helpers
- exact canonical coordinate reuse;
- calibrated camera projection;
- local homography;
- quad fitting;
- line/edge intersection;
- local physical-depth transfer;
- transformation-confidence classification.

### raster helpers
- mask materialization;
- protected-region composition;
- donor extraction;
- affine/perspective warp;
- deterministic delta extraction.

### evidence helpers
- edge fitting;
- seam measurement;
- luminance/chroma;
- texture-frequency statistics;
- local lighting/shadow estimate;
- threshold sweeps.

### authoring helpers
- guide overlay generation;
- neutral face render;
- donor sheet;
- packet serialization;
- generation input assembly.

### gate helpers
- exact diff;
- ROI diff;
- round-trip verification;
- transformation error;
- edge continuity;
- protected overlap;
- seam/material continuity;
- ownership validation.

## 6. Candidate ladder

Attempt the lowest-entropy method that can satisfy the packet. Escalation is
allowed only when the previous level is insufficient or explicitly inapplicable.

- `C0 existing-canonical` — exact approved pixels already exist;
- `C1 same-object-donor` — same physical object/surface has usable pixels;
- `C2 same-material-donor` — equivalent material exists in-scene;
- `C3 deterministic-render` — geometry/material produce deterministic patch;
- `C4 deterministic-render-plus-donor` — projected neutral face + donor;
- `C5 local-generative-completion` — generation only for constrained residual;
- `C6 contextual-generative-edit` — larger context only when C5 cannot
  integrate plausibly.

These are authoring methods, not authority levels.

## 7. Authoring pipeline

### P0 — source resolution
Resolve exact assets, hashes, source commits and target variant fingerprint.

### P1 — claim resolution
Resolve D1/D2/D3/D4 claims and mark confirmed/derived/inferred/blocked.

### P2 — ownership/occlusion reasoning
Determine:
- occluder;
- newly exposed physical faces;
- current target-state owner assets;
- conditional bridges;
- newly exposed pixel region;
- unresolved residual.

Fail closed if a key geometric raster cue belongs to the wrong target-state
owner.

### P3 — transformation selection
Select the strongest valid transformation evidence for the exact target region.

Do not prefer a global model merely because one exists elsewhere.

### P4 — deterministic guide/base
Produce:
- target polygon;
- named edges;
- clean target;
- optional neutral render;
- expected seams/contact lines;
- protection masks.

### P5 — canonical/donor attempt
Try C0/C1/C2 before synthesizing new appearance.

### P6 — deterministic synthesis
Try C3/C4 where geometry and donor evidence are sufficient.

### P7 — generative residual
Only when deterministic candidates fail appearance requirements and the Edit
Contract permits generation.

The image model receives:
- clean canonical crop;
- guide;
- neutral expected face when useful;
- donor(s);
- strict residual mask.

The task is local appearance authoring, not free geometry design.

### P8 — deterministic extraction
Compare edited and canonical frames and extract only authorized delta pixels.

### P9 — fail-fast gates
Recommended order:
1. source fingerprint;
2. claim/domain consistency;
3. target-state ownership;
4. transformation validity;
5. ROI/edit-mask validity;
6. protected overlap;
7. geometry;
8. compositing/alpha invariants;
9. exact pixel/round-trip invariants;
10. material continuity;
11. seam/edge continuity;
12. artifact/perceptual review;
13. required human approval.

### P10 — approval/runtime materialization
Only approved deterministic runtime assets are promoted.

Runtime image generation is not required.

## 8. Technical/internal module views

Technical views primarily consume:
- D1 physical/topology claims;
- D3 sourced technical/editorial claims;
- deterministic presentation transforms.

Preferred backend:
- physical primitives;
- authored technical-only facts where sourced;
- deterministic orthographic/isometric projection;
- semantic edge graph;
- dimensions;
- optional deterministic neutral shading.

Generative polish, if used, cannot redefine geometry.

## 9. Taxonomy hook

Each packet carries `caseClass` from ADR 0007 plus modifiers.

The class may select:
- default candidate ladder;
- mandatory guide types;
- mandatory gates;
- allowed transformation confidence;
- generation policy;
- review requirement.

## 10. Benchmark hook

Each candidate records:
- authoring method;
- deterministic inputs;
- changed pixel count;
- geometry/transform error;
- ownership status;
- protected overlap;
- round-trip mismatch;
- appearance metrics;
- artifact flags;
- lifecycle state;
- human evaluation when required.

The first benchmark remains BMC-01 Module 02 exposed right face, but its
historical target quad is now baseline evidence only, not ground truth.

## 11. Open questions

Do not freeze these in v0.2:

- final regional/local projection model for the legacy kitchen;
- how to define visible-defect edit masks when legacy layers use
  semi-transparent decomposition;
- how much deterministic shading is sufficient before C5;
- which appearance metrics correlate with human review;
- whether runtime and authoring should share one occlusion graph;
- whether technical views should consume Scene Core directly or a compact
  exported physical model;
- final benchmark thresholds and promotion policy.
