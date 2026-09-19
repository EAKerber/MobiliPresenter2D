# Reconstruction Method Program v0.1

Status: exploratory / non-runtime  
Base branch: `feat/global-finishes-stone-mobile-pip`  
Base commit: `73e7cf24f7d260f38f408e1817b7d8dbb33802c5`

## Purpose

Formalize a reconstruction method for MobiliPresenter2D that maximizes deterministic geometry, measurement, projection, masking and provenance, while reducing generative image synthesis to the smallest residual that cannot be produced reliably from authoritative sources.

This program intentionally covers two related but distinct products:

1. technical/orientative module views;
2. reconstruction of newly exposed or previously occluded scene surfaces.

The current preview branch is treated as a stable product baseline. This research branch must not change its behavior unless a later experiment is explicitly approved for implementation.

## Existing foundations

This program is not greenfield. It reuses existing contracts and experiments already present in the repositories.

MobiliPresenter2D:
- `review-assets/authoring-contracts.json`;
- perspective-donor recipes and candidate manifests;
- authorized ROI and zero-change-outside-ROI policy;
- deterministic delta extraction;
- pixel-edge / gap calibration;
- perspective editorial grid;
- source hashes, fingerprints, candidate lineage and approval records;
- seam and mask semantics.

MobiliPresenter:
- Scene Core physical geometry;
- Promob-derived module geometry and source bindings;
- fixed camera calibration;
- Technical Presentation Contract;
- deterministic technical projection and isometric edge graph;
- explicit separation between physical, technical and appearance authorities.

## Program tracks

### Track A — Architecture and contracts

Status: v0.1 draft materialized.

Documents:
- `docs/architecture/0005-reconstruction-authority-contract.md`;
- `docs/architecture/0006-reconstruction-packet-pipeline.md`.

Defines:
- authority ordering;
- reconstruction statuses;
- canonical intermediate artifacts;
- Reconstruction Packet;
- deterministic/generative boundary;
- candidate ladder;
- gate order;
- provenance.

### Track B — Case taxonomy

Status: v0.1 draft materialized.

Document:
- `docs/architecture/0007-reconstruction-case-taxonomy.md`.

The taxonomy is intentionally two-level:
- independent classification axes;
- concrete case classes such as hidden side, stone return, seam bridge, appliance replacement and technical internal view.

New classes should be created only when they require materially different authorities, candidate ladders, gates, generation policy or runtime materialization.

### Track C — Method benchmark

Status: v0.1 protocol materialized.

Document:
- `docs/work/reconstruction-benchmark-protocol-v0.1.md`.

The benchmark protocol separates:
- source integrity;
- edit authorization;
- geometry fidelity;
- round-trip/composition integrity;
- material/appearance metrics;
- artifact detection;
- agent/human review.

It explicitly avoids one aggregate numeric score in v0.1.

## Architectural principle

Reconstruction is treated as compilation first and image generation second.

Preferred order:

`authoritative sources -> physical model -> visibility/occlusion reasoning -> projection -> deterministic guide/base -> donor synthesis -> generative residual if required -> deterministic delta extraction -> gates -> approval`

No generative output should become runtime authority directly.

## Research constraints

- Do not invent physical geometry when a stronger source exists.
- Do not treat local pixel evidence as global camera calibration unless explicitly validated.
- Do not promote an inferred edge to confirmed merely because the visual result is convincing.
- Prefer local edits over scene-wide regeneration.
- Preserve exact pixels outside authorized regions when the operation contract requires it.
- Generated full-scene attempts may be donors, never implicit canonical replacements.
- Runtime should consume approved, deterministic assets; generation belongs to authoring/build time.
- A failed deterministic gate is evidence, not something to be hidden by raster clipping.

## Initial benchmark cases

### BMC-01 — Module 02 exposed right face

Primary benchmark because the repository already contains:
- exact target variant fingerprint;
- measured front edge;
- local depth cue from stone;
- authorized ROI;
- target quad;
- protected assets;
- real Module 01 carcass-side donor;
- deterministic perspective-copy recipe;
- delta extraction and pixel gates.

Initial methods:
1. current projective donor baseline;
2. deterministic neutral face + donor;
3. neutral face + local generative harmonization;
4. guide-first local generative completion.

### BMC-02 — Module 03 left stone termination

Small-return benchmark intended to punish over-generation.

### BMC-03 — Module 06 internal technical view

Presentation benchmark using confirmed Promob-derived divider, shelf and microwave-cavity geometry.

This is a technical-view benchmark, not a scene-raster reconstruction benchmark.

## Non-goals for v0.1

- no runtime generation;
- no new image assets;
- no replacement of the current preview branch;
- no commitment to a single reconstruction method;
- no claim that the current fixed-camera calibration automatically applies to every 2D source frame;
- no final thresholds before benchmark measurements;
- no runtime implementation on this research branch yet.

## Expected outputs of this research branch

Completed v0.1 drafts:
1. Reconstruction Authority Contract;
2. Reconstruction Packet specification;
3. Authoring Pipeline and Gate specification;
4. evolving case taxonomy;
5. method benchmark protocol.

Next research outputs:
6. benchmark packet templates;
7. Module 02 BMC-01 experiment design without image generation;
8. calibration-compatibility investigation between the Promob fixed camera and the MobiliPresenter2D canonical frame;
9. deterministic helper specifications before helper implementation.
