# ADR 0007 — Reconstruction Case Taxonomy v0.2

Status: exploratory / proposed

Depends on:
- ADR 0005 Reconstruction Authority Contract;
- ADR 0006 Reconstruction Packet and Authoring Pipeline.

## Purpose

Classify reconstruction operations by:
- what physical/presentation target is involved;
- why it is unavailable;
- what truth/evidence exists;
- what transformation evidence exists;
- who owns the target pixels in the requested state;
- how local the edit can remain;
- what runtime product is needed.

The taxonomy exists so the authoring system can choose the lowest-entropy
method, correct guides, mandatory gates and generation policy.

It is not a list of UI features.

## Classification axes

Classify the axes independently before assigning a core class.

### X1 — target kind

- `face`;
- `edge-or-seam`;
- `termination`;
- `material-surface`;
- `appliance-or-object`;
- `environment`;
- `internal-geometry`;
- `presentation-only`.

### X2 — availability / visibility state

- `already-visible`;
- `partially-visible`;
- `occluded-by-entity`;
- `cropped-by-frame`;
- `absent-from-canonical-source`;
- `removed-by-configuration`;
- `technical-only`.

### X3 — geometry/topology evidence

Strongest relevant source/status:

- `D1-physical-confirmed`;
- `D3-authored-technical`;
- `derived-from-D1`;
- `bounded-geometry-inference`;
- `blocked`;
- `none`.

Projection is not listed here. A physically confirmed side can exist while its
pixel polygon remains inferred.

### X4 — transformation evidence

Use ADR 0005 levels:

- `exact-canonical`;
- `global-calibrated`;
- `planar-derived`;
- `local-derived`;
- `bounded-inference`;
- `blocked`.

### X5 — appearance evidence

- `same-surface-canonical`;
- `same-object-canonical`;
- `same-material-canonical`;
- `same-scene-analog`;
- `external-reference`;
- `material-only`;
- `none`.

### X6 — ownership/occlusion evidence

- `D4-exact-target-variant`;
- `D4-derived-host-occluder`;
- `layer-contribution-only`;
- `ownership-inferred`;
- `ownership-conflicted`;
- `blocked`.

A raster cue with wrong target-state ownership cannot be used as hidden-face
geometry evidence.

### X7 — edit locality

- `exact-existing-pixels`;
- `single-face`;
- `small-roi`;
- `multi-face-local`;
- `contextual-region`;
- `whole-scene`.

Whole-scene authoring is exceptional and normally donor-only.

### X8 — runtime role

- `configuration-variant`;
- `conditional-overlay`;
- `technical-view`;
- `material-layer`;
- `replacement-object`;
- `review-only`.

## Core case classes

## T1 — Hidden structural side face

Definition:
A cabinet/module side physically exists but is occluded in the canonical scene
and becomes visible when a neighboring entity is removed.

Examples:
- Module 02 right side when Module 03 is hidden;
- neighboring cabinet sides revealed by configuration.

Required evidence:
- D1 side existence/dimensions when available;
- D4 exact target-state ownership/occluder reasoning;
- strongest valid transformation evidence;
- D2 same-object/same-material appearance donors.

Preferred ladder:
`C0 -> C1 -> C2 -> C3/C4 -> C5`.

Mandatory guides:
- face polygon;
- named front/rear/top/bottom edges;
- inferred-edge labeling;
- donor region;
- edit/protection mask;
- contact lines.

Mandatory gates:
- front-edge alignment;
- rear-edge/transform residual;
- ownership validity;
- zero protected overlap;
- material continuity;
- floor/plinth/counter contact;
- outside-ROI policy.

Generation:
local appearance residual only after geometry and edit entitlement are fixed.

Reference:
`module-02-right-exposed-face-edit`.

## T2 — Hidden plinth / toe-kick side

Definition:
A lower plinth/toe-kick side becomes visible after an adjacent module is
removed.

Differences from T1:
- separate physical depth may differ from cabinet depth;
- strong floor/contact-shadow sensitivity;
- narrow geometry;
- may be stone/other material instead of carcass.

Preferred ladder:
`C0 -> C1 -> C2 -> C4 -> C5`.

Mandatory gates:
- physical depth source;
- floor contact;
- host alignment;
- material class;
- no floating pixels;
- no overlap with protected front/stone.

BMC-01 already demonstrates why the plinth must not inherit the cabinet depth
vector by default.

## T3 — Countertop / stone return

Definition:
A countertop/stone termination becomes newly exposed.

Examples:
- Module 03 left termination when Module 02 is hidden.

Required evidence:
- D2 current stone pixels;
- D4 target-state ownership;
- D1 physical stone support when available;
- bounded transformation evidence.

Preferred ladder:
`C0 -> C1 -> C2 -> C4 -> C5`.

Forbidden default:
inventing a full-height divider/side when only a small termination is
supported.

## T4 — Joint / seam bridge

Definition:
A small raster/vector bridge exists only while two neighboring hosts coexist.

Examples:
- `stone-02-joint-bridge`;
- `stone-03-joint-bridge`.

This is conditional compositing, not hidden-face reconstruction.

Preferred ladder:
`C0 -> deterministic-derived`.

Generation:
normally forbidden.

Mandatory gates:
- exact visibility truth table;
- D4 ownership;
- zero residual pixels when either host is hidden;
- alpha/compositing round trip;
- seam continuity.

A bridge must never be reused as evidence for the exposed state in which that
bridge is hidden.

## T5 — Object removal / background continuation

Definition:
A foreground object is removed and missing background must be reconstructed.

Subclasses:
- `T5a wall-continuation`;
- `T5b floor-continuation`;
- `T5c mixed-wall-floor`.

Preferred ladder:
`C0 -> same-background donor -> deterministic texture continuation -> C5 -> C6`.

Generation may be more useful than in T1, but geometry/repetition/perspective
constraints remain explicit.

## T6 — Appliance replacement

Definition:
An appliance/commercial object is replaced while host geometry and the
surrounding canonical scene remain fixed.

Examples:
- range replacement;
- microwave/oven substitution.

Preferred ladder:
`existing approved object -> exact donor -> isolated generated donor -> deterministic composition`.

A full generated scene may be donor material only when the Edit Contract
allows it.

Final runtime output remains deterministic.

## T7 — Material transfer

Definition:
Geometry stays fixed and only material appearance changes.

Examples:
- MDF finish;
- stone finish;
- carcass-side material harmonization.

Preferred ladder:
`deterministic material pipeline -> donor transfer -> local generative residual`.

Mandatory gates:
- D4 ownership;
- protected objects;
- seam preservation;
- luminance/texture bounds;
- exact reset/round trip when applicable.

## T8 — Corner / termination completion

Definition:
A small cap/corner/rounded return is required for a known geometry.

Preferred ladder:
`C0 -> local donor -> deterministic construction -> C5`.

If the area becomes structurally large, reclassify as T1/T3.

## T9 — Internal technical view

Definition:
A technical view exposes shelves, dividers, cavities or internal layout that
are not part of the fixed photographic scene.

Not a raster reconstruction case.

Source order:
1. D1 Scene Core / Promob-derived geometry;
2. D3 explicitly authored technical facts;
3. deterministic presentation transform;
4. `external-required` / blocked when unsupported.

Examples:
- Module 06 divider + shelves + microwave cavity;
- Module 01 shelf;
- Module 05 shelf;
- Module 03 authored internal layout when supplied.

Preferred backend:
deterministic SVG/vector or neutral raster.

Generation:
optional cosmetic method only; never geometry source.

## T10 — External technical/presentation-only diagram

Definition:
A diagram communicates dimensions, envelopes, openings or assembly facts
without corresponding directly to canonical scene pixels.

Examples:
- frontal/lateral/isometric technical view;
- simplified exploded view;
- dimensioned neutral illustration.

Consumes D1/D3 plus deterministic presentation transforms and does not enter
the photographic candidate ladder.

## T11 — Occluded internal/secondary face in scene

Definition:
A physically internal/secondary face becomes visible due to configuration but
is not a simple exterior side.

Examples:
- shelf edge;
- divider edge;
- appliance cavity lining.

Separate from T1 because appearance donors and contact-shadow behavior differ.

Status:
provisional; no canonical MobiliPresenter2D benchmark yet.

## Case modifiers

### M1 — donor quality
- `exact-same-surface`;
- `same-object-other-region`;
- `same-material-same-scene`;
- `same-material-external`;
- `none`.

### M2 — transformation confidence
Use ADR 0005 transformation vocabulary.

### M3 — hypothesis burden
- `none`;
- `edge-only`;
- `single-plane`;
- `multi-plane`;
- `appearance-only`;
- `geometry-and-appearance`.

### M4 — generation allowance
- `forbidden`;
- `donor-only`;
- `local-residual`;
- `contextual-residual`.

### M5 — approval level
- `automatable`;
- `agent-review`;
- `human-review-required`.

### M6 — legacy-layer quality
- `semantic-owner-layer`;
- `semi-transparent-decomposition`;
- `mixed-owner-layer`;
- `unknown`.

This modifier exists because alpha contribution is not always physical
occupancy in the legacy scene.

## Confidence vector

Each case should publish ADR 0005's vector:
- G geometry/topology;
- P projection/transform;
- A appearance;
- O ownership/occlusion.

## Classification examples

### Module 02 right side — current research state

- class: T1 hidden structural side face;
- target: face;
- visibility: occluded-by-entity;
- geometry/topology: D1 confirmed side, 530 mm depth;
- transformation: local-derived + bounded inference;
- appearance: same-material/same-scene donor available;
- ownership: D4 exact target variant, with historical bridge cue superseded;
- locality: small-roi;
- runtime: conditional-overlay;
- generation: local residual allowed only after deterministic candidate;
- approval: human review required while rear projection remains bounded.
- confidence: G mixed confirmed/inferred; P local-derived; A derived; O derived/confirmed.

### Module 03 left stone termination

- class: T3;
- D1 stone slab exists;
- D2 current exposed pixels available;
- D4 target-state owner verified;
- transformation: local-derived;
- locality: small-roi;
- forbidden: full-height divider.

### Module 02↔03 stone bridge

- class: T4;
- deterministic;
- D4 predicate: both hosts visible;
- generation: forbidden;
- runtime: conditional-overlay.

### Module 06 internal view

- class: T9;
- geometry: D1 confirmed from Promob-derived primitives;
- technical facts: D3 where explicitly authored;
- presentation: deterministic transform;
- generation: geometry-forbidden / cosmetic optional.

## Taxonomy evolution rule

Add a new core class only when at least one is materially different:

1. truth/evidence domain pattern;
2. ownership/occlusion semantics;
3. transformation model;
4. candidate ladder;
5. mandatory gates;
6. generation policy;
7. runtime materialization strategy.

Otherwise use modifiers.

## Open questions

- whether wall/floor continuation should split beyond T5 subclasses;
- whether stone returns deserve another modifier rather than a separate class;
- whether hidden internal faces become a runtime product requirement;
- whether technical and photographic packets remain one schema family;
- final confidence-vector thresholds for automatic escalation.
