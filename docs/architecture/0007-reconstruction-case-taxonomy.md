# ADR 0007 — Reconstruction Case Taxonomy v0.1

Status: exploratory / proposed

## Purpose

Classify reconstruction operations by **what is physically missing, what evidence exists, and what kind of transformation is required**.

The taxonomy is not a list of UI features. It exists so the authoring system can choose:
- the right authority sources;
- the lowest-entropy candidate ladder;
- the correct projection method;
- mandatory guide products;
- required gates;
- whether generative completion is allowed at all.

The taxonomy is intentionally provisional. New classes should be added only when real project cases cannot be represented cleanly by an existing class.

## Classification axes

A case should be classified along six independent axes before assigning a concrete case class.

### X1 — physical target

What physical thing is being reconstructed?

Values:
- `face`;
- `edge-or-seam`;
- `termination`;
- `material-surface`;
- `appliance-or-object`;
- `environment`;
- `internal-geometry`;
- `presentation-only`.

### X2 — visibility state

Why is the target unavailable?

Values:
- `already-visible`;
- `partially-visible`;
- `occluded-by-entity`;
- `cropped-by-frame`;
- `absent-from-canonical-source`;
- `removed-by-configuration`;
- `technical-only`.

### X3 — geometry authority

Strongest available geometry source:

- `A1-physical-confirmed`;
- `A4-authored-technical`;
- `A3-planar-derived`;
- `A3-local-derived`;
- `bounded-inference`;
- `none`.

### X4 — appearance evidence

Strongest available appearance source:

- `same-object-canonical`;
- `same-material-canonical`;
- `same-scene-analog`;
- `external-reference`;
- `material-only`;
- `none`.

### X5 — edit locality

How local can the operation remain?

- `exact-existing-pixels`;
- `single-face`;
- `small-roi`;
- `multi-face-local`;
- `contextual-region`;
- `whole-scene`.

Whole-scene authoring should be exceptional and normally donor-only.

### X6 — runtime role

What does the final asset do?

- `configuration-variant`;
- `conditional-overlay`;
- `technical-view`;
- `material-layer`;
- `replacement-object`;
- `review-only`.

## Core case classes

## T1 — Hidden structural side face

Definition:
A cabinet/module side physically exists but is occluded in the canonical scene and becomes visible when a neighboring entity is removed.

Examples:
- Module 02 right side when Module 03 is hidden.
- Other neighboring cabinet sides expected to appear when a foreground/z-order neighbor disappears.

Typical authorities:
- A1 physical side geometry when available;
- A2 neighboring visible surfaces and same-material donors;
- A3 local/projective calibration.

Preferred candidate ladder:
`C0 -> C1 -> C2 -> C3/C4 -> C5`

Mandatory guides:
- face polygon;
- named front/rear/top/bottom edges;
- donor region when available;
- protection mask;
- contact lines.

Mandatory gates:
- front-edge alignment;
- rear-edge/projection tolerance;
- zero protected overlap;
- material continuity;
- floor/plinth/counter contact;
- outside-ROI policy.

Generative policy:
Allowed only for residual appearance after geometry is fixed.

Reference case:
`module-02-right-exposed-face-edit`.

## T2 — Hidden plinth / toe-kick side

Definition:
A lower plinth or toe-kick side becomes visible when an adjacent module is removed.

Typical difference from T1:
- narrow geometry;
- strong floor contact;
- high sensitivity to shadow and perspective;
- may be physically separate from the cabinet side.

Preferred candidate ladder:
`C0 -> C1 -> C2 -> C4 -> C5`

Mandatory gates:
- floor contact;
- vertical alignment with host;
- material class;
- no floating pixels;
- no overlap with cabinet/front/stone.

## T3 — Countertop / stone return

Definition:
A stone or countertop face/return becomes newly exposed at a module termination.

Examples:
- small left termination/rounded stone return of Module 03 when Module 02 is hidden.

Typical authorities:
- A2 canonical stone pixels;
- A3 measured stone edge;
- A1 physical support when available.

Preferred candidate ladder:
`C0 -> C1 -> C2 -> C4 -> C5`

Forbidden default:
Inventing a large full-height divider or side face when only a small return is evidenced.

Reference:
`module-03-left-termination-edit`.

## T4 — Joint / seam bridge

Definition:
A small raster or vector bridge exists only when two neighboring entities coexist and visually closes their junction.

Examples:
- `stone-02-joint-bridge`;
- `stone-03-joint-bridge`.

This is not a hidden-face reconstruction. It is a conditional compositing case.

Preferred candidate ladder:
`C0 -> deterministic-derived`

Generative policy:
Normally prohibited.

Mandatory gates:
- exact visibility truth table;
- zero residual pixels when either host is hidden;
- alpha ownership;
- seam continuity.

## T5 — Object removal / background continuation

Definition:
A foreground object is removed and the scene behind it must be reconstructed.

Subclasses:
- `T5a wall-continuation`;
- `T5b floor-continuation`;
- `T5c mixed-wall-floor`.

Preferred candidate ladder:
`C0 -> same-background donor -> deterministic texture continuation -> C5 -> C6`

Geometry requirement:
Often lower than T1, but protection and perspective repetition may be critical.

Generative policy:
More permissive than T1, because the missing appearance may have no direct physical donor, but the edit must remain local.

## T6 — Appliance replacement

Definition:
An appliance or commercial object is replaced while the host geometry and surrounding scene must remain canonical.

Examples:
- range replacement;
- microwave/oven substitution.

Preferred candidate ladder:
`existing approved object -> exact donor -> isolated generated donor -> deterministic composition`

The final runtime asset should remain a deterministic composite/delta over the canonical frame.

Important:
A full generated scene may be used only as donor when the authoring contract allows it.

## T7 — Material transfer

Definition:
Geometry remains unchanged and only material appearance is transferred/recolored/textured.

Examples:
- MDF finish;
- stone finish;
- carcass-side donor material.

Preferred candidate ladder:
`deterministic material pipeline -> donor transfer -> local generative residual`

Generative policy:
Normally unnecessary for uniform MDF; may be useful for irregular stone or photographic harmonization.

Mandatory gates:
- alpha ownership;
- seam preservation;
- luminance/texture bounds;
- no protected-object contamination.

## T8 — Corner / termination completion

Definition:
A small corner, cap, rounded return or termination is required to make a known geometry visually complete.

This class should remain small by definition.

Preferred candidate ladder:
`C0 -> local donor -> deterministic construction -> C5`

Escalation warning:
If the required area becomes structurally large, reclassify as T1/T3 instead of stretching T8.

## T9 — Internal technical view

Definition:
A technical/presentation view exposes shelves, dividers, cavities or internal layout that are not part of the fixed photographic scene.

This is **not** a raster reconstruction case.

Authority order:
1. A1 Scene Core / Promob-derived geometry;
2. A4 authored technical layout;
3. deterministic technical projection;
4. `external-required` when unsupported.

Examples:
- Module 06 divider + left/right shelves + microwave cavity;
- Module 01 shelf;
- Module 05 shelf;
- Module 03 authored internal layout where supplied.

Preferred backend:
deterministic SVG/vector or deterministic neutral raster render.

Generative policy:
Optional cosmetic polish only; never geometry authority.

## T10 — External technical/presentation-only diagram

Definition:
A diagram communicates dimensions, envelopes, openings or assembly facts without corresponding directly to scene pixels.

Examples:
- frontal/lateral/isometric technical view;
- simplified exploded view;
- dimensioned neutral cabinet illustration.

This class consumes A1/A4 and does not enter the scene-reconstruction candidate ladder.

## T11 — Occluded internal/secondary face in scene

Definition:
A physically internal or secondary face becomes visible due to configuration, but is not a simple exterior cabinet side.

Examples could include:
- shelf edge exposed after opening/removing a front;
- divider edge;
- appliance cavity lining.

This class is intentionally separate from T1 because appearance evidence and contact-shadow behavior are different.

Status:
provisional; no canonical MobiliPresenter2D benchmark yet.

## Case modifiers

Any core class may carry modifiers.

### M1 — donor quality
- `exact-same-surface`;
- `same-object-other-region`;
- `same-material-same-scene`;
- `same-material-external`;
- `none`.

### M2 — projection confidence
Use the projection confidence vocabulary from ADR 0005.

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

## Classification examples

### Module 02 right side

- class: T1 hidden structural side face;
- target: face;
- visibility: occluded-by-entity;
- geometry: local-derived + bounded rear-edge inference;
- appearance: same-material-canonical donor from Module 01;
- locality: small-roi;
- runtime role: conditional-overlay;
- generation: local-residual allowed, donor-only preferred;
- approval: human-review-required while rear boundary remains inferred.

### Module 03 left stone termination

- class: T3 countertop/stone return;
- visibility: occluded-by-entity;
- geometry: measured visible edge + bounded small-return interpretation;
- locality: small-roi;
- generation: local-residual allowed;
- explicit forbidden outcome: full-height divider.

### Module 02↔03 stone bridge

- class: T4 joint/seam bridge;
- geometry: deterministic;
- generation: forbidden;
- runtime role: conditional-overlay;
- visibility predicate: both hosts visible.

### Module 06 internal view

- class: T9 internal technical view;
- geometry: A1 confirmed from Promob-derived primitives;
- presentation: deterministic technical projection;
- generation: geometry-forbidden / cosmetic optional.

## Taxonomy evolution rule

A new core class is justified only when at least one of the following is true:

1. it requires a different authority ordering;
2. it requires a materially different candidate ladder;
3. it requires different mandatory gates;
4. it permits/prohibits generation differently;
5. it has a different runtime materialization strategy.

Otherwise use a modifier on an existing class.

## Open questions

- Whether wall and floor continuation should remain subclasses of T5 or split because their perspective/texture models differ.
- Whether stone returns deserve a material-specific class or remain T3 with material modifiers.
- Whether hidden internal faces in runtime will become a real product requirement.
- Whether technical neutral renders and photographic reconstruction should share a single packet schema or sibling packet schemas.
