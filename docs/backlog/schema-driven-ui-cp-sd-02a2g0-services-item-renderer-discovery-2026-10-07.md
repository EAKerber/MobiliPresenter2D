# CP-SD-02A2g0 — Services item-renderer membership discovery — 2026-10-07

Status: **READY / NEXT — discovery only**.

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
