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

Primary workstream. Defines:
- authority ordering;
- reconstruction statuses;
- canonical intermediate artifacts;
- Reconstruction Packet;
- deterministic/generative boundary;
- candidate ladder;
- gate order;
- provenance.

### Track B — Case taxonomy

Not deferred or excluded. It classifies reconstruction operations so the architecture can choose different methods for different cases.

Initial candidate classes:
- hidden cabinet side;
- exposed plinth side;
- countertop return;
- seam bridge;
- object removal;
- appliance substitution;
- internal shelf/divider view;
- appliance cavity view;
- wall/floor continuation;
- material transfer;
- small termination/corner completion.

The taxonomy is expected to evolve from concrete cases rather than be frozen upfront.

### Track C — Method benchmark

Also mandatory. Candidate methods should be compared on real project cases, not ranked only by theory.

Initial method families:
- canonical-pixel reuse;
- same-object donor;
- same-material donor;
- affine/perspective donor warp;
- deterministic neutral render;
- deterministic render + donor material;
- local guided generative completion;
- larger contextual generative edit.

Metrics should include geometry fidelity, appearance fidelity, edit locality, reproducibility, artifact rate, operational cost and generative drift.

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

## Initial benchmark case

The exposed right side of Module 02 when Module 03 is hidden is the preferred first benchmark because the repository already contains:
- exact target variant fingerprint;
- measured front edge;
- local depth cue from stone;
- authorized ROI;
- target quad;
- protected assets;
- a real Module 01 carcass-side donor;
- deterministic perspective-copy recipe;
- delta extraction and pixel gates.

It can support comparisons between:
1. donor warp;
2. neutral render + donor;
3. neutral render + local generative harmonization.

## Non-goals for v0.1

- no runtime generation;
- no new image assets;
- no replacement of the current preview branch;
- no commitment to a single reconstruction method;
- no claim that the current fixed-camera calibration automatically applies to every 2D source frame;
- no final thresholds before benchmark measurements.

## Expected outputs of this research branch

1. Reconstruction Authority Contract;
2. Reconstruction Packet specification;
3. Authoring Pipeline and Gate specification;
4. evolving case taxonomy;
5. method benchmark protocol;
6. later, deterministic helpers only after the contracts stabilize.
