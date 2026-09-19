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
- `docs/architecture/0006-reconstruction-packet-pipeline.md`;
- `docs/architecture/0008-geometry-first-scene-authoring-contract.md`.

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

### Track D — Tooling implementation conformance

Status: v0.1 static/deep audit materialized.

Documents:
- `docs/work/reconstruction-tooling-map-v0.1.md`;
- `docs/work/bmc-01-tooling-conformance-audit-v0.1.md`.

Track D is a gate between architecture and helper promotion.

Required sequence:
`tool inventory -> source implementation audit -> test/evidence audit -> CONFORMANT/REUSABLE/EXPERIMENT/MISMATCH decision -> only then promotion/refactor/replacement`.

The first deep audit follows the BMC-01 Module 02 right-face chain.

The initial implementation blocker in `tools/extract_candidate_delta.py` was repaired on the research branch, focused donor/delta tests were added, and the exact BMC-01 historical projective-donor candidate was reproduced byte-for-byte. The fixed-camera transfer has now been tested deterministically and is not supported as a global projection authority for the canonical 2D frame; BMC-01 remains local-derived + bounded-inference.

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

Current method ladder:
1. historical projective-donor baseline, retained only for comparison;
2. local physical-depth geometry transfer;
3. alpha-confidence + semantic ownership audit;
4. deterministic same-object continuation baselines;
5. clean Module 01 carcass-side donor projected into the local geometry;
6. generative harmonization only if a bounded residual remains.

Current strongest deterministic appearance hypothesis:
`BMC-01 minimal completion v0.6`.

Findings:
`docs/work/bmc-01-appearance-evidence-findings-v0.1.md`.

### BMC-02 — Module 03 left stone termination

Small-return benchmark intended to punish over-generation.

### BMC-03 — Module 06 internal technical view

Presentation benchmark using confirmed Promob-derived divider, shelf and microwave-cavity geometry.

This is a technical-view benchmark, not a scene-raster reconstruction benchmark.

## Scene consistency audit

SC-01 — Scene Projective Consistency Audit is now active.

Document:
`docs/work/scene-projective-consistency-audit-v0.1.md`.

Current global classification remains intentionally fail-closed:
`INSUFFICIENT_CURRENT_DEPTH_EVIDENCE`.

Two earlier apparent contradictions were traced to contaminated evidence:
- a low-RMS Module 01 luminance line was shading, not a physical edge;
- the long historical Module 02 depth line was mostly conditional joint-bridge support.

BMC-01 now uses a narrower local lower-region projection derived from the
current Stone 03 exposed-left edge plus confirmed physical depths. It is a
local legacy-scene hypothesis, not a recovered global camera.

## Projection path after fixed-camera rejection

The source Promob fixed camera is no longer treated as a likely global transfer for the canonical 2D frame.

Next projection experiment:
**PM-01 — Module 01 visible-side validation**.

Plan:
- extract/annotate the real visible Module 01 side;
- derive canonical-frame depth direction from independent cues;
- predict the visible side with held-out evidence;
- measure residuals;
- only then use the method to strengthen Module 02 hidden-side geometry.

Design:
`docs/work/canonical-frame-projective-metrology-v0.1.md`.

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
9. deterministic helper specifications before helper implementation;
10. tooling implementation conformance audits before any existing helper is promoted.
