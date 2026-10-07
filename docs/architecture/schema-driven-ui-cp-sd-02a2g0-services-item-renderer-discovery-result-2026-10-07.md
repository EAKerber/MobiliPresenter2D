# CP-SD-02A2g0 — Services item-renderer membership discovery result — 2026-10-07

Status: **COMPLETE / PASS**.

Baseline:
- `main` = `0036c70d1ab14ad13cadd627dcc3eb8158d81eaa`;
- Services group + Lighting + Additional Services semantic shells are normalized-flow-owned;
- Lighting specialized adapter remains intentionally domain-specific;
- production configuration unchanged.

## Finding

The residual Services duplication is **item membership/order**, not section-shell ownership.

Current generic checklist rendering uses:

`catalog.services.filter(service => stageItems("services").has(service.id))`.

Consequences:
- whole-stage membership is reinterpreted in the renderer;
- catalog order wins over normalized section order;
- the renderer does not consume the semantic section that already claimed its visual slot.

`stageItems()` has no other runtime consumer.

## Lighting boundary

Lighting is not being excluded by an id branch.

`lighting-08`:
- is a catalog accessory;
- registry kind = `object`;
- belongs to normalized section `lighting` through explicit `itemIds`;
- is rendered by the dedicated `#lightingToggle` adapter.

The generic checklist iterates `catalog.services`, so Lighting is naturally not part of that adapter.

Preserve all Lighting state/dependency/scene logic exactly.

## Generic bound-section lookup

After flow mounting, `#servicesChecklist` lives inside the generated semantic section that claimed the generic `toggle-list` slot.

A generic local lookup can derive:
- stage id from nearest `[data-flow-group-grid]`;
- section id from nearest `[data-keyboard-section]`;
- normalized section from `normalizedFlow`;
- exact `section.itemIds`.

The checklist renderer then:
- maps those ids through `catalog.services`;
- renders only resolved catalog-service records;
- preserves normalized item order.

This keeps the adapter bound to semantic ownership without hardcoding the current section name.

## Current-v3 browser gate

End-to-end runtime still accepts current administration through the v3 normalizer, so browser tests cannot yet publish arbitrary hierarchy-v5 sections.

Use a valid order fixture instead:
- reorder Services source items so `tempered-glass` precedes `move-stone`;
- normalized `additional-services.itemIds` must preserve that order;
- rendered generic service cards must match the normalized section order.

This specifically falsifies the old catalog-order renderer.

Keep the existing Additional Services absence fixture as the fail-closed absence proof.

## Scope boundary

This migration does **not** create a universal `toggle-list` item renderer.

The checklist supports catalog-service items only. Unsupported item kinds require explicit adapter capability rather than silent omission/generalization.

## Decision

A2g1 should:
- remove `stageItems()`;
- replace `renderServices()` with a bound-section checklist renderer;
- preserve service card markup/state/change handling/pricing behavior;
- add order/source proofs;
- leave Lighting untouched.

No production write.
