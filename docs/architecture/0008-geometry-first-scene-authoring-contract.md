# ADR 0008 — Geometry-First Scene Authoring Contract

Status: exploratory / proposed

## Context

The current kitchen demonstrates two distinct realities:

1. an existing editorial scene can be visually convincing while its exact projective relationship to the Promob calibration remains uncertain;
2. future scenes should not require reverse-engineering camera geometry after appearance authoring.

The reconstruction method therefore needs two operating modes:

- **geometry-first** for new scenes;
- **evidence-adaptive** for legacy/editorially assembled scenes.

The evidence-adaptive mode exists for compatibility. It is not the target authoring standard.

## Decision

For a new furniture environment, geometric authority must be materialized **before** generative appearance work.

Preferred sequence:

`physical model -> fixed camera -> deterministic geometry passes -> constrained appearance authoring -> geometry conformance -> approved scene assets`

A request such as “render this based on the Promob image” is not sufficient geometric authority.

## Geometry-first source package

A new scene should have a versioned source package containing at minimum:

### Physical scene

- module transforms;
- dimensions in mm;
- physical face primitives;
- shelves/dividers/cavities where known;
- material slots;
- adjacency;
- visibility/occlusion relationships;
- appliance envelopes.

### Camera

- projection type;
- intrinsics or orthographic scale;
- camera pose/extrinsics;
- exact output canvas;
- crop/presentation transform;
- camera/version hash.

No later beauty pass may silently redefine this camera.

### Deterministic passes

At minimum:

#### neutral beauty
Simple deterministic geometry render used for visual registration.

#### entity ID
One stable ID/color per physical entity.

Purpose:
- module isolation;
- ownership;
- visibility;
- exact masks.

#### face ID
Stable IDs for semantically important faces:
- front;
- left side;
- right side;
- top;
- bottom;
- back;
- shelf;
- divider;
- stone top/return;
- plinth.

Purpose:
- hidden-face reconstruction;
- material targeting;
- face-level occlusion.

#### depth
Camera-space/projective depth.

Purpose:
- occlusion checks;
- edge ordering;
- reprojection diagnostics.

#### optional normals
Useful for deterministic/local relighting and checking whether a generated shading cue contradicts face orientation.

#### material ID
Separates front finish, carcass, stone, metal, glass and other slots.

## Mask policy

In geometry-first scenes, masks should be **derived products**, not manually reconstructed authorities.

Preferred:

`entity/face ID pass -> deterministic mask derivation -> runtime mask`

Manual or AI-assisted mask repair is allowed only when appearance authoring introduces a local contour that is deliberately outside the deterministic physical silhouette.

Such repair must carry provenance and must not overwrite the face-ID authority.

## Appearance authoring

Generative image tooling may be used for sophistication, but geometry is constrained externally.

Preferred inputs:
- neutral render;
- clean deterministic render;
- entity/face guide;
- depth/normal context where usable;
- material references;
- strict protected regions.

The generative responsibility is:
- material realism;
- photographic light;
- small decorative detail;
- microtexture;
- local atmospheric integration.

It is **not**:
- cabinet dimensions;
- camera;
- vanishing points;
- hidden face location;
- shelf topology;
- module ownership.

## Geometry-preservation gate

A generated candidate must be compared against deterministic geometry.

Possible measurements:
- silhouette drift;
- named edge drift;
- projected corner drift;
- occlusion-order violations;
- face-ID boundary violations;
- appliance opening drift;
- stone/plinth contact drift.

A candidate that looks plausible but moves structural geometry beyond tolerance is:
- rejected;
- or retained only as an appearance donor.

## Appearance-donor fallback

If an image model cannot reliably preserve the deterministic render:

1. allow it to generate a visually richer image;
2. treat that output as **appearance evidence only**;
3. transfer texture/light/detail back into the authoritative deterministic geometry through masks/warps/local synthesis;
4. preserve the geometric render as the structural base.

This prevents model capability from becoming camera authority.

## Hidden-face behavior

For a geometry-first scene, hiding an occluder should not require inventing the newly exposed face geometry.

The physical/face-ID model already provides:
- face existence;
- face dimensions;
- projection;
- expected exposure;
- material slot.

Authoring may still be required for photographic appearance, but the geometry guide is deterministic.

This is the target state for future bedroom/living-room projects.

## Technical/internal views

The same physical source package should drive:
- frontal technical view;
- side view;
- internal view;
- simple isometric;
- dimension guides.

Therefore technical views and photographic reconstruction share A1 geometry but use different presentation backends.

## Evidence-adaptive legacy mode

Existing scenes such as the current kitchen may not satisfy the geometry-first contract retrospectively.

The legacy path is:

`canonical pixels -> consistency audit -> strongest valid projection class -> local reconstruction -> delta/provenance gates`

Projection classes:
- global-calibrated;
- planar-derived;
- local-derived;
- bounded-inference.

The architecture must support this mode without treating it as the preferred creation process.

## Legacy correction policy

A legacy base is not rebuilt merely because it is mathematically imperfect.

Use impact classes:

- G0 — no visible/product impact: document;
- G1 — affects hidden reconstruction only: compensate locally;
- G2 — visible in conditional variants: correct overlays/variants;
- G3 — visible in canonical base: consider bounded local correction;
- G4 — pervasive incompatibility that prevents reliable composition: evaluate base rebuild.

The cost of rematerializing masks, bridges, overlays and approved assets must be included before choosing G3/G4 remediation.

## Required provenance for future scenes

A geometry-first scene should record:

- physical-source version/hash;
- camera version/hash;
- render pass hashes;
- beauty-authoring source hash;
- generation/edit receipts when used;
- geometry gate result;
- derived runtime-mask hashes;
- approval.

This makes the camera and physical scene reproducible rather than implicit.

## Consequence for method design

The reconstruction framework should not have one geometry solver.

It should expose a resolution ladder:

1. use exact geometry-first camera/face projection when available;
2. otherwise use validated planar projective evidence;
3. otherwise use validated local evidence;
4. only then use bounded inference;
5. never let a generative candidate silently upgrade its own geometry confidence.

This makes the method elastic enough for legacy scenes while rewarding mathematically controlled future scenes.
