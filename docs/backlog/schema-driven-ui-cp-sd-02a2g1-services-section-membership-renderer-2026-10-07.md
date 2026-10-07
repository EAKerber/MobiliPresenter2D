# CP-SD-02A2g1 — bound-section Services checklist renderer — 2026-10-07

Status: **COMPLETE / PASS**.

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


## Implementation candidate

Applied only the generic Services checklist membership seam:
- removed `stageItems()`, whose sole runtime consumer was the Services checklist;
- added a generic local `boundFlowSectionFor(element)` lookup using the element's nearest flow group grid + generated semantic section;
- added a service id -> catalog record map for metadata lookup;
- narrowed `renderServices()` to `renderServiceChecklist()`;
- checklist membership/order now follows the bound normalized `section.itemIds` exactly;
- catalog service order no longer acts as renderer semantic authority;
- service-card DOM, checked/disabled/title/copy/pricing display and change handler are unchanged;
- Lighting specialized adapter/state/dependencies/scene path are untouched;
- shared runtime cache revision advances v28 -> v29.

Proof added:
- source asserts `stageItems(` is absent and the renderer maps `section.itemIds`;
- default browser cards equal normalized bound-section item ids and remain `move-stone, tempered-glass`;
- valid v3 reorder fixture produces normalized `["tempered-glass", "move-stone"]` and requires the DOM to match;
- reordered first service still toggles state and redraws correctly;
- existing Additional Services absence fixture now also requires zero stale `data-global-service-id` cards;
- existing Lighting absence and keyboard/service-card contracts remain unchanged.

No section-shell, Lighting, pricing, state, event/dependency, custom-stage, responsive or production-configuration behavior is changed.

Gate pending: all eight repository workflows + Netlify preview.


## Final result — PASS

Final functional head:
`cb7998e6014314bb64f94f527cadcb1d71e93641`.

Proven:
- `stageItems()` is removed from buyer runtime;
- the generic service checklist derives its actual owning semantic section from the mounted flow DOM;
- checklist membership/order comes from normalized `section.itemIds`;
- catalog service records supply metadata only;
- default card order remains `move-stone, tempered-glass`;
- valid source reorder to `tempered-glass, move-stone` is reflected identically in normalized section and rendered DOM;
- the reordered service still toggles/restores state correctly after redraw;
- omitted Additional Services yields no semantic section and zero stale generic service cards;
- Lighting specialized adapter/dependencies/scene behavior remain unchanged;
- Summary/Pricing service rows and totals remain unchanged.

Gate:
- App build purity — PASS;
- Current variant fidelity — PASS;
- Current asset gates — PASS;
- Flow layout browser — PASS;
- Keyboard browser — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Netlify deploy preview #128 — PASS.

No production configuration write.
