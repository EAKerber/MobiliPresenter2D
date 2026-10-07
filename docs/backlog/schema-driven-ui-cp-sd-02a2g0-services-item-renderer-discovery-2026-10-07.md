# CP-SD-02A2g0 — Services item-renderer membership discovery — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- CP-SD-02A0 renderer inventory;
- CP-SD-02A2a–c1 generated Services group/section shells;
- CP-SD-02A2f2 completes Acabamentos group-shell generation.

Goal:
- identify the smallest safe removal of Services **item membership** hard-coding so normalized section ownership (`section.itemIds`) becomes the renderer authority, without broad stage-dispatch work and without replacing legitimate specialized item adapters.

## Why this remains in CP-SD-02

Services semantic shells are already normalized-flow-owned, but `renderServices()` still derives its checklist from:

`stageItems("services")`

and then applies local exclusions/special handling.

That means the renderer still knows:
- that all non-Lighting services assigned anywhere in the Services stage belong in one checklist;
- that `lighting-08` must be removed from that list because it has a separate adapter.

The normalized model already says more precisely:
- `lighting` section owns `lighting-08`;
- `additional-services` owns its own `itemIds`;
- section order/component/behavior are explicit.

The target is not a generic item-effects framework. It is to stop whole-stage membership from overriding normalized section membership.

## Discovery questions

Confirm:
- exact current `renderServices()` data path and exclusions;
- how `additional-services` section `itemIds` can feed the existing checklist renderer directly;
- whether the current `servicesChecklist` neutral slot can remain the bounded visual adapter;
- whether a small helper can retrieve normalized section item ids generically without introducing Services-name branches inside renderer plumbing;
- which parts of Lighting remain legitimate specialized item/state/scene adapters;
- whether any catalog service currently assigned to Services can belong to another section without code changes after this migration;
- how absence of `additional-services` should leave its neutral slot empty/hidden without rendering stage-level leftovers;
- whether `renderServices()` can be narrowed or split so it no longer owns semantic section membership;
- which browser fixture best proves moving a service between supported sections changes its rendered owner solely through normalized data.

## Explicitly preserve

Do not change:
- generated Services group shell;
- generated Lighting and Additional Services section shells;
- `lightingToggle` specialized state/dependency/scene behavior;
- `updateAccessoryControls()`;
- service pricing/global charge semantics;
- item capability validation;
- stage navigation;
- Modules companion/PiP/dock;
- production configuration.

## Stop rule

Stop and split if this requires:
- genericizing Lighting scene effects;
- changing service state or pricing semantics;
- changing catalog service identity;
- broad generic stage-root/dispatcher work;
- CP-SD-03 responsive work;
- production writes.

No runtime change in A2g0; discovery/documentation only.


## Discovery result — PASS

Observed on `main` at `0036c70d1ab14ad13cadd627dcc3eb8158d81eaa`.

### Current residual authority

`stageItems()` has exactly one runtime consumer:

`renderServices()`.

Current checklist membership is:

`catalog.services ∩ stageItems("services")`

and rendering order is catalog order.

That leaves two pieces of semantic authority outside normalized flow:
- which Services-stage items belong in the generic checklist;
- the order of those generic service items.

### Lighting is not a generic-service exclusion rule

`lighting-08` is registered as kind `object`, not `service`.

Therefore:
- hierarchy section `lighting` owns it explicitly by id;
- `additional-services` uses `itemKinds: ["service"]`, so legacy normalization never includes Lighting there;
- `renderServices()` never sees Lighting because it iterates `catalog.services`, while Lighting lives in `catalog.accessories`;
- `#lightingToggle`, dependency resolution, scene visibility and `updateAccessoryControls()` remain legitimate specialized item behavior.

No Lighting id exclusion needs to exist in A2g1.

### Correct renderer boundary

`#servicesChecklist` is a generic, non-affinity `toggle-list` slot. Once claimed, it is nested inside the generated semantic section that owns it.

The checklist can therefore derive its renderer membership from its **actual binding**:
1. nearest generated `[data-keyboard-section]` -> section id;
2. nearest `[data-flow-group-grid]` -> stage id;
3. normalized flow lookup -> that section's `itemIds`.

This avoids hardcoding `"additional-services"` in the renderer and keeps the visual adapter reusable for whichever compatible service-list section claims it.

Use a small local helper in `app.js`; no new public `flow-model` API is required.

### Catalog role after migration

`catalog.services` remains the product-data lookup for:
- title;
- description;
- status;
- pricing-entry association.

It must **not** decide membership or order.

A2g1 should map normalized `section.itemIds` in order through a service-by-id map and render the resolved catalog services in that exact order.

### Unsupported item-kind boundary

The generic checklist adapter remains a **catalog-service adapter**.

A2g1 does not make arbitrary `toggle-list` item kinds renderable. Lighting remains specialized. If a future hierarchy binds a section containing unsupported non-service ids to this generic checklist slot, that needs an explicit adapter-capability/fail-closed decision in a later checkpoint rather than silent genericization.

### Reconciliation order is safe

Both startup and remote configuration application call `applyBuyerFlowLayout()` before the `syncLayerVisibility()` path that renders the checklist.

Therefore, when `renderServices()`/its replacement runs, `#servicesChecklist` can already discover its current generated semantic owner.

Before the first mount, the helper may return no bound section; the renderer should simply leave the checklist empty.

### Strong browser proof without hierarchy publication

The current buyer configuration endpoint still normalizes through the v3 administration shape, so a hierarchy-v5 fixture cannot be injected end-to-end yet.

A valid v3 fixture can still distinguish the old and new authority:

Services stage:
`["tempered-glass", "move-stone", "lighting-08"]`

Legacy normalization preserves source stage order when deriving `additional-services.itemIds`:
`["tempered-glass", "move-stone"]`.

Expected after A2g1:
- normalized section order is `tempered-glass -> move-stone`;
- DOM `#servicesChecklist [data-global-service-id]` order matches exactly;
- current implementation would fail this because catalog order is `move-stone -> tempered-glass`.

The existing Additional Services absence fixture remains a valid negative proof:
- no normalized section;
- neutral slot hidden;
- generic checklist empty/no semantic fallback.

### Flow-model future-proofing

Existing flow-model tests already prove an item such as `move-stone` can move from Services to a custom stage while structural ownership changes and availability remains correct.

Hierarchical-source normalization additionally preserves explicit per-section `itemIds`. A2g1 should consume that normalized result, but it does not need to implement arbitrary new visual sections.

## Decision

Proceed to A2g1 as a small renderer-membership migration:
- remove the now-unused `stageItems()` helper;
- derive checklist membership from the section that actually claimed `#servicesChecklist`;
- preserve normalized item order;
- keep catalog as data lookup only;
- keep Lighting specialized and unchanged;
- add source proof + order fixture + existing absence regression.

No pricing/state/scene/schema/production change.
