# Reconstruction Packet and Authoring Pipeline v0.1

Status: exploratory / proposed

## 1. Reconstruction Packet

The Reconstruction Packet is the canonical intermediate contract for a single reconstruction operation.

It should be serializable and reproducible from source evidence.

### identity

Suggested fields:
- `operationId`;
- `sceneId`;
- `targetVariant`;
- `targetVariantFingerprint`;
- `targetModuleId`;
- `faceRole` / `operationRole`;
- source commit and source hashes.

### physicalGeometry

Contains only physical or explicitly sourced geometry:
- dimensions in mm;
- local face plane;
- face normal;
- envelope;
- adjacency;
- related shelves/dividers/openings;
- source bindings;
- epistemic status.

### projection

Contains the 3D/mm -> pixel relationship:
- method;
- confidence;
- image size;
- named anchors;
- target polygon/quad;
- named projected edges;
- local depth vectors;
- pixel/mm information where valid;
- residual hypotheses.

The packet must distinguish a local projective constraint from full camera calibration.

### visualEvidence

Contains photographic evidence:
- canonical crop;
- equivalent in-scene donors;
- donor polygons;
- material samples;
- local luminance/chroma;
- texture statistics;
- edge/seam evidence;
- lighting/shadow observations.

### protection

Contains edit ownership:
- authorized ROI;
- exact edit mask;
- protected regions;
- protected assets;
- zero-change zones;
- alpha ownership constraints.

### generationGuide

Optional and only present when a deterministic candidate is insufficient:
- clean reference image;
- guided reference image;
- deterministic neutral render;
- donor crop(s);
- residual mask;
- prompt constraints;
- forbidden outcomes.

### acceptance

Contains the measurable contract:
- pixel invariants;
- geometry tolerances;
- edge/slopes;
- round-trip rule;
- outside-ROI rule;
- material continuity thresholds;
- human review requirement.

### provenance

Records:
- all source refs;
- hashes;
- deterministic transforms;
- candidate lineage;
- generation receipt when applicable;
- gate results;
- final approval.

## 2. Guide products

A Reconstruction Packet may materialize four separate guide families.

### geometry guide
SVG or JSON:
- face polygon;
- named corners;
- expected seams;
- projected thickness;
- contact lines.

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
- alpha ownership.

### generation guide
A visual composite for the image model.

Important: the generation guide should preferably be a separate image from the clean target so guide removal is not itself a required generative operation.

## 3. Deterministic helper families

### geometry helpers
- extract face planes from Scene Core;
- resolve adjacency;
- resolve newly exposed faces;
- internal shelf/divider model;
- physical bounds.

### projection helpers
- calibrated camera projection;
- local homography;
- quad fitting;
- line/edge intersection;
- local pixel/mm measurement;
- projection-confidence classification.

### raster helpers
- mask materialization;
- alpha ownership;
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
- projection error;
- edge continuity;
- protected overlap;
- seam/material continuity.

## 4. Candidate ladder

Methods must be attempted from least imaginative to most imaginative unless an operation contract justifies skipping a level.

- `C0 existing-canonical` — exact approved pixels already exist;
- `C1 same-object-donor` — another view/state exposes the same physical surface;
- `C2 same-material-donor` — equivalent material exists elsewhere in the scene;
- `C3 deterministic-render` — geometry and material are enough for a synthetic but deterministic patch;
- `C4 deterministic-render-plus-donor` — projected neutral face receives donor texture/shading;
- `C5 local-generative-completion` — IA completes only the constrained residual;
- `C6 contextual-generative-edit` — larger context only when C5 cannot integrate plausibly.

A method may be accepted early when it satisfies all required gates.

## 5. Authoring pipeline

### P0 — source resolution
Resolve exact assets, hashes and variant fingerprints.

### P1 — physical reconstruction
Resolve topology, face existence and internal geometry from A1/A4.

### P2 — occlusion reasoning
Determine:
- occluder;
- newly exposed physical faces;
- newly exposed pixel region;
- unresolved residual.

### P3 — projection
Select the strongest valid projection method and emit confidence.

### P4 — deterministic guide/base
Produce:
- target polygon;
- neutral render;
- expected seams;
- optional contact shadow;
- protection masks.

### P5 — donor synthesis
Try deterministic donor transfer/warp.

### P6 — generative residual
Only if prior candidate levels fail appearance gates.

The image model receives:
- clean canonical crop;
- guided crop;
- neutral expected face;
- donor(s);
- strict edit mask.

The requested task is local photographic completion, not free scene generation.

### P7 — deterministic extraction
Compare edited and canonical frames and extract only the authorized delta.

### P8 — fail-fast gates
Recommended order:
1. source fingerprint;
2. authority resolution;
3. projection validity;
4. ROI/mask validity;
5. protected overlap;
6. geometry;
7. alpha ownership;
8. exact pixel invariants;
9. material continuity;
10. seam/edge continuity;
11. perceptual review;
12. human approval when required.

### P9 — approval and runtime materialization
Only approved deterministic assets enter runtime.

No runtime image generation is required.

## 6. Technical/internal module views

Technical views use the same A1/A4 physical information but skip the photographic reconstruction ladder.

Preferred pipeline:
- physical primitives;
- authored technical-only facts where sourced;
- deterministic orthographic/isometric projection;
- semantic edge graph;
- dimensions;
- optional deterministic neutral material/shading.

Generative polish, if ever used, must be optional and must not redefine geometry.

## 7. Track B — case taxonomy hook

Each packet should eventually carry a `caseClass`.

The taxonomy remains open during v0.1. Early candidates:
- hidden-side;
- hidden-plinth-side;
- countertop-return;
- corner-termination;
- seam-bridge;
- object-removal;
- appliance-replacement;
- internal-view;
- wall-floor-continuation.

The case class may select:
- candidate ladder defaults;
- required guide types;
- mandatory gates;
- allowed projection confidence.

## 8. Track C — benchmark hook

Each candidate should record:
- method level;
- deterministic inputs;
- changed pixel count;
- geometry error;
- protected overlap;
- round-trip mismatch;
- appearance metrics;
- artifact flags;
- human evaluation.

The first recommended benchmark remains Module 02 exposed right face, using the already-existing canonical contract, target quad and Module 01 donor.

## 9. Open questions

Do not freeze these in v0.1:

- whether the fixed-camera calibration from MobiliPresenter can be mapped exactly onto the MobiliPresenter2D canonical frame;
- how much deterministic shading is sufficient before C5 is needed;
- which texture/material metrics correlate with human judgments;
- whether a single occlusion graph should serve runtime and authoring or whether authoring needs richer face-level metadata;
- whether internal technical views should reuse Scene Core directly or consume a compact exported physical model;
- final case taxonomy;
- final benchmark weights.
