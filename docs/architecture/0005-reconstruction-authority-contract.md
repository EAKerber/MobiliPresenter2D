# ADR 0005 — Reconstruction Authority Contract

Status: exploratory / proposed

## Context

MobiliPresenter2D already combines several kinds of evidence: canonical photographic pixels, masks, authored visual layers, local perspective measurements, generated donors and deterministic deltas. The source MobiliPresenter repository additionally contains Promob-derived physical geometry, technical presentation contracts and a calibrated fixed camera for its own source frame.

Without an explicit authority contract, the system risks allowing a visually plausible generated result, a local pixel measurement or a technical illustration to silently override stronger physical or source evidence.

## Decision

Adopt five authority classes and three epistemic statuses for all reconstruction work.

## Authority classes

### A1 — Physical authority

Answers: **what physically exists and where**.

Sources include:
- Scene Core geometry;
- Promob-derived boxes/faces and source bindings;
- module envelopes;
- shelf/divider/front/side roles;
- appliance slots;
- host and dependency relationships;
- confirmed physical dimensions.

Examples:
- Module 06 contains a divider, shelves and a microwave cavity;
- Module 01 contains one shelf;
- Module 04 is a side panel, not a cabinet volume.

A1 has precedence over visual guesses about topology.

### A2 — Canonical photographic authority

Answers: **how the approved scene actually appears in the fixed 2D composition**.

Sources include:
- canonical base frame;
- isolated module layers;
- approved overlays;
- exact variants;
- alpha/mask ownership;
- exact source fingerprints.

A2 has precedence over generated appearance.

### A3 — Calibration/projection authority

Answers: **how physical or measured geometry maps into image space**.

This authority has explicit levels:

- `global-calibrated`: camera model verified for the exact target source;
- `planar-projective`: a plane/quad can be related by projective mapping;
- `local-linear`: bounded mm/px or edge relation valid only locally;
- `bounded-hypothesis`: some edges are measured and the remainder is explicitly inferred.

A local depth cue must never be relabeled as complete world-space camera calibration.

### A4 — Technical/editorial authority

Answers: **what a technical view should communicate** when the information is not simply a projection of physical geometry.

Sources include:
- Technical Catalog;
- supplied technical sheets;
- authored internal layouts;
- dimension-presentation rules;
- technical labels and warnings.

A4 may add authored facts when their source exists, but must not overwrite A1 dimensions.

### A5 — Generative appearance authority

Answers only: **how an otherwise constrained residual region may look photographically**.

A5 is never allowed to decide:
- module topology;
- dimensions;
- target polygon;
- face normal;
- seam ownership;
- dependency graph;
- protected pixels;
- physical presence of shelves/dividers.

A5 is the lowest authority.

## Epistemic status

Every reconstruction fact or constraint should carry one of:

### confirmed
Directly supported by an authoritative source.

Examples:
- Promob-derived panel dimensions;
- exact alpha ownership in the canonical frame;
- user-provided technical layout.

### derived
Produced deterministically from confirmed evidence.

Examples:
- projected polygon from a calibrated camera;
- perspective-warp target from measured anchors;
- technical SVG generated from physical primitives;
- delta extracted from canonical and edited frames.

### inferred
Requires an explicit hypothesis.

Examples:
- a hidden rear side edge estimated from a local depth cue;
- photographic shading on a never-visible side face;
- a plausible corner completion.

An inferred fact does not become confirmed merely because it passes visual review.

## Conflict resolution

When authorities disagree, use the following order unless an operation contract explicitly narrows scope:

`A1 physical > A2 canonical photographic > A3 calibrated/projective > A4 technical/editorial > A5 generative`

This ordering is contextual rather than a claim that physical geometry always has better photographic appearance. For example:

- A1 determines that a right side face exists;
- A3 determines where it projects;
- A2 supplies the scene lighting/material reference;
- A5 may fill residual appearance inside the already-defined target.

## Projection confidence

A Reconstruction Packet must declare one projection confidence:

- `exact-canonical`;
- `global-calibrated`;
- `planar-derived`;
- `local-derived`;
- `bounded-inference`;
- `blocked`.

Downstream gates may be stricter for lower-confidence projection.

## Edit authority

Every raster reconstruction operation must also declare:

- canonical source frame hash;
- target variant fingerprint;
- authorized ROI;
- protected regions/assets;
- outside-ROI policy;
- whether generation is permitted;
- whether direct generated promotion is forbidden;
- whether deterministic delta extraction is required.

The existing Module 02 exposed-right-face authoring contract is the current reference model.

## Technical views

Technical/internal views follow a different presentation backend but the same authority model.

Preferred source order:
1. A1 physical geometry;
2. A4 explicitly authored technical layout;
3. deterministic derived representation;
4. `external-required` / unknown when unsupported.

A5 should not be needed to decide internal geometry.

## Consequences

- reconstruction can be audited;
- physical, photographic and generated truth are not conflated;
- local pixel calibration remains useful without being overclaimed;
- generated assets can be sophisticated without becoming a second geometry authority;
- the same physical model can support both technical views and scene reconstruction.
