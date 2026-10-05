# ADR 0005 — Reconstruction Authority Contract

Status: exploratory / proposed, revised after BMC-01 provenance audits

## Context

MobiliPresenter2D combines facts and evidence that answer different questions:

- Promob/Scene Core says what physically exists;
- the canonical 2D scene says what exact pixels are approved in a specific frame;
- technical catalogs say what a technical presentation should communicate;
- visibility/ownership rules say which entity owns a conditional region;
- calibration and projection transform facts between coordinate spaces;
- deterministic and generative authoring methods produce candidate pixels;
- edit contracts say which pixels may be changed;
- review/approval says whether a candidate may be promoted.

Treating all of these as one linear "authority" scale is unsafe.

The BMC-01 research demonstrated why. A line could be a perfectly measured
canonical raster feature and still be the wrong evidence for hidden-face
geometry because most of its pixels belonged to a conditional joint bridge.
Likewise a clean luminance edge could have low numerical residual and still not
be a physical edge.

## Decision

Do **not** use one global authority ordering.

Represent reconstruction as five separate concerns:

1. truth/evidence domains;
2. transformation evidence;
3. authoring method;
4. edit authorization;
5. candidate review lifecycle.

Every important claim also carries an epistemic status.

The legacy A1..A5 vocabulary is deprecated for new Reconstruction Packets.

Migration mapping:

- old A1 physical -> D1 physical/topology;
- old A2 canonical photographic -> D2 canonical raster/appearance;
- old A3 calibration/projection -> transformation evidence, not a truth domain;
- old A4 technical/editorial -> D3 technical/editorial;
- old A5 generative appearance -> authoring method, never authority.

## 1. Truth/evidence domains

### D1 — Physical/topology truth

Answers:
**what physically exists, what it is, and where it is in the physical model**.

Sources include:
- Scene Core;
- Promob-derived boxes/faces and source bindings;
- physical envelopes;
- shelves/dividers/fronts/sides;
- appliance slots;
- host/dependency relationships;
- confirmed dimensions.

D1 decides physical existence/topology when authoritative physical evidence is
available.

A raster edge cannot silently create or delete a physical shelf, divider or
side panel.

### D2 — Canonical raster/appearance truth

Answers:
**what the approved target frame actually contains visually**.

Sources include:
- canonical base frame;
- isolated scene layers;
- exact variants;
- approved overlays;
- alpha contribution;
- exact source hashes/fingerprints;
- approved photographic donors.

D2 is frame-specific.

It is authoritative for exact approved pixels in that frame, but it does not
automatically explain what physical surface produced those pixels.

### D3 — Technical/editorial truth

Answers:
**what a technical presentation must communicate when it is not simply a direct
render of D1**.

Sources include:
- Technical Catalog;
- supplied technical sheets;
- authored internal layouts;
- dimension-presentation rules;
- labels/warnings;
- explicitly authored presentation semantics.

D3 may supplement D1. A contradiction between D1 and D3 must be surfaced; D3
must not silently rewrite confirmed physical dimensions.

### D4 — Visibility/ownership truth

Answers:
**which entity/asset owns a conditional region and under what visibility state**.

Sources include:
- Scene2D visibility graph;
- host/occluder relationships;
- conditional bridge rules;
- source-layer ownership;
- exact variant manifests;
- authorized compositing semantics.

D4 is distinct from both topology and appearance.

Example:
a measured stone-colored line can belong to a joint bridge that disappears when
one host is hidden. Its pixels may be real D2 evidence while being invalid
evidence for the hidden host's exposed physical side.

## 2. Transformation evidence

Projection/calibration is not a truth domain. It is evidence for transforming a
claim from one coordinate space to another.

Supported levels:

- `exact-canonical` — exact target pixels/coordinates already known;
- `global-calibrated` — camera verified for the exact target source;
- `planar-derived` — plane homography/projective relation validated;
- `local-derived` — bounded local relation validated;
- `bounded-inference` — some anchors measured, remainder explicit hypothesis;
- `blocked` — evidence insufficient or contradictory.

A transformation claim must declare:
- source frame;
- target frame;
- anchors/correspondences;
- residuals;
- valid region/plane;
- uncertainty;
- provenance.

A local depth cue must never be relabeled as global camera calibration.

## 3. Authoring methods

Authoring methods produce candidates. They do not create truth.

Examples:
- exact canonical reuse;
- same-object donor;
- same-material donor;
- deterministic projection/render;
- affine/projective donor warp;
- texture synthesis;
- local generative completion;
- contextual generative edit.

Generation is therefore **not an authority**.

Generated output may propose appearance inside an authorized residual region.
It cannot by itself decide:
- topology;
- dimensions;
- target polygon;
- face normal;
- seam ownership;
- dependency graph;
- visibility ownership;
- protected pixels.

A successful visual review does not promote an inferred geometric claim to
confirmed physical truth.

## 4. Edit authorization

Knowing that a surface exists does not authorize changing pixels.

Every raster operation requires a separate Edit Contract declaring at minimum:
- canonical source frame hash;
- target variant fingerprint;
- operation/role;
- authorized ROI;
- exact edit mask when known;
- protected regions/assets;
- outside-ROI policy;
- allowed authoring methods;
- direct-generation-promotion policy;
- deterministic delta/round-trip requirements.

Edit authorization can be narrower than the known physical face.

This is intentional.

## 5. Candidate review lifecycle

Review status is separate from truth and from authoring method.

Suggested states:
- `DRAFT`;
- `MACHINE_VALID`;
- `AGENT_REVIEW`;
- `HUMAN_REVIEW_PENDING`;
- `APPROVED`;
- `REJECTED`;
- `SUPERSEDED`.

A deterministic candidate can remain pending.
A generated candidate can be approved as appearance.
Neither fact changes the epistemic status of its geometry claims.

## 6. Epistemic status

Individual claims use:

### confirmed
Directly supported by an authoritative source in the relevant domain.

### derived
Produced deterministically from confirmed evidence and a declared transform.

### inferred
Requires an explicit hypothesis.

### blocked
Required evidence is missing, contradictory or provenance-contaminated.

The project should prefer `blocked` over silently converting missing evidence
into an inferred claim.

## 7. Claim record

Important reconstruction claims should be representable as:

- `subject`;
- `domain` (D1/D2/D3/D4);
- `property`;
- `value`;
- `unitOrFrame`;
- `sourceRef` / hash;
- `evidenceKind`;
- `derivation`;
- `status`;
- `validFor`;
- `uncertainty`;
- `supersedes` / `supersededBy` when applicable.

This allows the system to say, for example:

> Module 02 right side physically exists (D1 confirmed), x=742 front/side seam
> is measured in the current raster (D2 derived), the rear projection is local
> inferred, and the historical long stone line is superseded because D4 shows
> that most of its pixels belong to a conditional bridge.

## 8. Conflict resolution is property-scoped

There is no universal:

`physical > photographic > projection > technical > generation`.

Use the domain that owns the property.

### Physical existence/topology
D1 authoritative physical evidence > raster inference.

### Exact target-frame pixels
D2 exact canonical pixels > projected or generated approximations, unless an
Edit Contract explicitly authorizes replacement.

### Technical/presentation facts
D1 supplies physical facts; D3 supplies explicit presentation-only facts.
Contradictions are reported, not silently merged.

### Visibility/ownership
D4 host/occluder/variant ownership decides whether evidence is valid in the
target state.

### Projection
Choose the strongest validated transformation evidence valid for the exact
region. A transform never overrides domain truth; it maps it.

### Appearance synthesis
Use the lowest-entropy authoring method that satisfies the packet. Generated
appearance is candidate material only.

## 9. Case confidence vector

A scalar confidence hides too much.

Each reconstruction case should eventually expose at least:

- `G` geometry/topology certainty;
- `P` projection certainty;
- `A` appearance evidence certainty;
- `O` ownership/occlusion certainty.

Each dimension may be:
- confirmed;
- derived;
- inferred;
- blocked.

Example for current BMC-01 research:
- G: confirmed side existence/dimensions, local rear polygon inferred;
- P: local-derived/bounded-inference;
- A: same-scene donor available;
- O: current variant ownership derived/confirmed for the tested assets.

## 10. Technical/internal views

Technical views primarily consume:
- D1 physical/topology;
- D3 technical/editorial facts;
- deterministic presentation transforms.

Photographic reconstruction is not required.

Generative polish, if ever used, remains an optional appearance authoring
method and may not invent internal geometry.

## Consequences

- a pixel can be real without being valid geometry evidence;
- generation can be useful without becoming a source of truth;
- projection can be strong or weak without being conflated with topology;
- edit entitlement is explicit instead of implied by knowledge;
- approval no longer changes epistemic status;
- failed/superseded evidence remains auditable;
- the same physical model can support deterministic technical views and
  bounded reconstruction of a legacy photographic scene.
