# CP-SD-02A2g1 — bound-section Services checklist renderer — 2026-10-07

Status: **READY / NEXT**.

Parent:
- CP-SD-02A2g0 Services item-renderer discovery — PASS.

Goal:
- make the normalized section that owns `#servicesChecklist` the sole membership/order authority for generic service cards.

## Allowed implementation

### Remove stage-level membership helper

`stageItems()` currently exists only for `renderServices()`.

Delete it once the checklist no longer consumes whole-stage membership.

Do not change:
- `stageConfig()`;
- `stageKind()`;
- `stageOwns()`;
- `itemAvailable()`.

### Generic bound-section helper

Add a small local helper, naming flexible, that accepts a DOM adapter and returns the normalized section currently owning it.

Derive:
- stage id from nearest `[data-flow-group-grid]`.dataset.flowGroupGrid;
- section id from nearest `[data-keyboard-section]`.dataset.keyboardSection;
- section by traversing the matching normalized stage groups.

Return null/empty before binding or if no matching normalized section exists.

No Services id/name branch in this helper.

### Checklist renderer

Rename or narrow `renderServices()` if useful, but keep the existing service-card markup and event contract.

Membership/order:
1. get bound normalized section for `#servicesChecklist`;
2. iterate its `itemIds` in order;
3. resolve each id through `catalog.services`;
4. render resolved catalog-service records only.

Catalog remains metadata authority, not membership/order authority.

The existing `servicesChecklist` change handler remains generic:
`setGlobalService(id, checked)`.

### Lighting

No changes to:
- `#lightingToggle`;
- `updateAccessoryControls()`;
- Lighting dependencies;
- Lighting scene layer;
- Lighting pricing/visibility semantics.

## Proof

Source:
- no `stageItems(` helper remains in `app.js`;
- generic bound-section lookup exists;
- checklist renderer does not contain `stageItems("services")`;
- Lighting renderer/state code unchanged.

Positive browser:
- rendered generic service ids equal the normalized item ids of the section that owns `#servicesChecklist`;
- normal default remains `move-stone, tempered-glass`;
- cards/checkbox geometry and keyboard behavior unchanged.

Order-authority fixture:
- valid v3 Services stage order places `tempered-glass` before `move-stone`;
- normalized `additional-services.itemIds` equals `["tempered-glass", "move-stone"]`;
- rendered `[data-global-service-id]` order equals that normalized order;
- state toggles continue to operate after redraw.

Absence:
- existing fixture with only `lighting-08` keeps Additional Services absent;
- `#servicesChecklist` remains hidden and empty;
- Lighting remains present;
- no renderer/page/console errors.

Regression:
- Keyboard Services tests unchanged;
- Summary/Pricing global service rows/totals unchanged;
- all eight workflows + Netlify preview green.

## Explicitly unchanged

- generated Services group/section shells;
- presentation policy;
- service card visual markup;
- service state;
- service prices;
- events/dependencies;
- custom-stage renderer;
- Modules/PiP/dock;
- production configuration.

## Stop rule

Stop and split if this requires:
- generic item-effects abstraction;
- changing Lighting specialized behavior;
- adding support for arbitrary non-service toggle-list items;
- changing pricing/state;
- publishing hierarchy/configuration.

No production configuration write.
