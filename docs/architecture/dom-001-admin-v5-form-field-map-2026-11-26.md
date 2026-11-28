# DOM-001 — Admin V5 form-to-schema field map

**Captured:** 2026-11-26  
**Repository:** `EAKerber/MobiliPresenter2D`  
**Scope:** Admin's editable form and the saved V5 configuration paths. This is a separate, bounded subinventory; it does not close the complete DOM-001 contract or CMP-001 route inventory.

## Ref identity

Source code was reviewed on Product `main@463327ce25687f29859a152a41f0915af51e9264` and `development@6e6bf126870af9ce1489ea4dafad3b9b3b4fcb5c`. Subsequent live readbacks were Product `main@ef9f073542c54ec44bf3c8808ab13d880222d329` and `development@ab518623bbfe59ef37a36a8bbc347ff9e03882c0`; intervening changes do not touch the Admin form, V5 schema, defaults, or tests. Main and development Admin shells/controllers differ (`app/admin.html`, `app/admin/admin.js`); the V5 schema and core contracts listed below are shared.

## Editable controls and persisted paths

| Admin area | Persisted V5 paths | Observed editor behavior and constraints |
|---|---|---|
| Stages | `stages[].id/kind/label/enabled`; `groups[].id/label/columnSpan`; `sections[].id/label/component/itemIds` | Add/remove/reorder stages; move/split items and sections; split/merge groups; edit labels, group width, component, and order. Section `behavior` is not directly editable; valid components are filtered by the semantic behavior. Availability controls can be disabled for required or empty stages. Schema validation checks behavior/component compatibility and ownership. |
| Initial state and dimensions | `initialState.entities`, `viewerEntities`, `services`; `moduleDimensions[id].width/height/depth` | Distinct Configurator and Viewer visibility controls, service controls, and nominal dimensions in mm with range and tenth-mm step checks. |
| Object copy | `objects[id].title/description/benefits[]/components[]/requirements[]` | Text inputs and newline-separated lists. |
| Images and masks | `objectAssets[id].imageAsset/detailImageAsset/maskAsset` | Asset-path selectors and previews; controls depend on a corresponding scene entity. |
| Materials | `materials[].id/label/kind/color/textureAsset/groupIds` | Create/remove, edit label/color/kind/texture, and choose target groups/handle products. “No color” is stored as `color: null` for texture kind. Removal cleans dependent references in groups, handles, finishes, and eligible pricing rules. |
| Material groups and handles | `materialGroups[].id/label/materialIds`; `handleProducts[].materialIds` | Group labels and availability membership are editable. Handle identity, label, description, and price-entry mapping are derived/read-only in this form. |
| Finish availability | `finishes[].id/enabled/scope/moduleIds` | Toggle, set global/local scope, and associate modules for local availability. UI enforces at least one usable global finish or a module association in the displayed cases; schema validation remains authoritative. |
| Initial material defaults | `initialState.finishId/handleId/stonePackageId` | Select defaults; the editor reconciles an invalid selection when availability changes. |
| Dependencies | `dependencies[].id/dependentId/requires[]` | Add/remove rules and edit the dependent and required items. |
| Events | `events[].id/triggerId/when/action` plus action-specific `targetId/enabled/dimension/valueMm` | Add/remove and edit event trigger, condition, effect, and target. Changing the action resets or removes fields that belonged to the prior action. |
| Typed pricing | `pricing.roles[role][id].type`, `cents` or `bps`, and supported percentage `basis` | Edit values and supported type choices. Switching amount/percentage resets the value to zero; basis choices come from role capabilities rather than a direct editor. |
| Viewer base-price publication | `viewerPricePublication.enabled` | Draft-only checkbox, available only when the stored source is V5. The public projection uses the persisted boolean as its price-authorization boundary. |

## Persisted fields without a direct Admin editor

These are retained or validated but are not directly editable in this form:

- `presentationPolicy`: required and validated; V3→V5 upgrade supplies `presentation-policy-defaults.js`.
- `pricing.allocation.handleFrontTotal`: part of typed pricing, with no direct control.
- `materials[].textureSize` and `locked`: no editor; `locked` constrains removal.
- Most `handleProducts[]` fields apart from `materialIds`: derived labels or selector inputs.
- Schema version and revision are not form controls. Revision is displayed and checked during save.

Selected tab, paging, selected object, previews, and the unsaved local draft are UI state rather than persisted configuration. Login, password, and identity are separate from V5 data.

## Schema, defaults, and save route

- `app/core/administration-v5.js` owns the V5 schema, validation, upgrade/normalization path, and exact `viewerPricePublication.enabled` shape.
- `app/core/configuration.js`, `hierarchy-administration.js`, `presentation-contract.js`, and `pricing-contract.js` own legacy compatibility, hierarchy, component/presentation, and typed-price rules.
- `app/data/configurator-settings.js`, `hierarchy-defaults.js`, `presentation-policy-defaults.js`, `catalog-data.js`, and `mock-price-book.js` provide defaults and authored data.
- On load, Admin keeps the published source separate from its edit model. V5 saves as native V5 after validation/normalization; revision must match the loaded source. The server increments it, then the client reads again and compares the returned JSON before reporting success.
- V3 save uses a loss-aware projection to the existing schema; it blocks when hierarchy or pricing would be lost and directs the user to the hierarchy-publication checkpoint. “Persistir Puxadores no v3” is V3-only.
- The V5 normalization observed trims stage/group/section labels and normalizes typed pricing. Other cloned authored fields are retained rather than independently normalized by that routine.

## Evidence coverage and gaps

**Existing tests inspected; not run in this source review:**

- `app/tools/test-administration-v5.js`: schema, defaults/upgrades, normalization, typed pricing, projection, and invalid contracts.
- `app/tools/test-v5-normal-save.js`: conditional write/readback failure modes, revision conflicts, and mocked concurrent-edit race.
- `tests/admin-v5-save-browser.cjs`: browser save flow, structural edits, pricing, conflict, and readback mismatch with stubbed auth/API. Its fixture differs between main and development.

The browser harness does not exercise every form control. A focused round-trip now covers finish scope and module association (see the exact-head follow-up below); remaining focused gaps include object copy/assets, material creation/removal, the finish enabled toggle and all availability guards, initial-state controls, dependencies, events, and assertions that every immutable V5 field survives unrelated edits. The fake-store race does not establish real Netlify Blob concurrency.

## Remaining work

This map closes only the observed Admin control-to-schema path. DOM-001 remains partial until field-level round-trip coverage is proportionate to the exposed controls, full compatibility/default inventories and all prioritized route consumers are reconciled, and actual hosted Identity/Blob write/readback is proven in an authorized non-production environment. Keep Buyer and public Viewer projections as distinct consumers and preserve their separate allowlists.

## Exact-head follow-up: finish scope and module association

PR #563 (`fb5846df215792cd3e1a2b66919a8c0ed54b4725`) added a browser round-trip for cocoa finish availability: change global to local, remove one module association, leave edits as a draft until explicit V5 save, verify normalized response and fresh reload. The Admin hierarchy browser gate run `46086574803` and development test-impact plan `46086574838` passed on the exact head; PR #563 was squash-integrated into development at `91c242c7ee869975dbd33df230052a45a8036df6`.

This fixture uses an in-memory endpoint and stubbed Identity. It does not test the enabled toggle, every availability guard, hosted Identity/Blob behavior, or all Admin controls. The covered scope/module-association case is removed from the uncovered list; DOM-001 remains partial.