# Runtime contract map — 2026-10-05

Status: current housekeeping reference after the near-official cleanup pass.

## Canonical flow

1. `app/data/catalog-data.js` is public product/catalog authority: modules, accessories, services and commercial option families.
2. `app/data/configurator-settings.js` is the static stage seed (`ConfiguratorSettings2D 1.0`), not published administration state.
3. `app/core/configuration.js` owns `ConfiguratorAdministration2D 3.0`: defaults, migration, validation, normalization, dependencies/events and item registry.
4. `netlify/functions/configuration.mjs` is the published-configuration persistence boundary.
5. `app/core/runtime-contracts.js` is compatibility-only and currently contains one repair for the older published `stone-skirting` stage omission.
6. `app/index.html` and `app/styles.css` own the public UI structure and stack contract; keyboard behavior is explicit runtime code.
7. `app/app.js` materializes accepted configuration into runtime state/DOM and feeds renderer/pricing domains.
8. `state.js`, `visibility.js`, `finishes.js`, `stone.js` and `pricing.js` are runtime domain layers; generated stone/mask data are rendering data, not catalog schema.
9. Core/browser/build/asset gates are the final behavior boundary. Static reachability alone is insufficient authority to delete renderer assets or compatibility paths.

## Resolved scars

### `stone-skirting` is canonical

`catalog.services` owns `stone-skirting` as a real service. The old invented registry entry and legacy painter path are gone. `stone-all -> linkedItemIds: ["stone-skirting"]` remains an intentional domain relationship rather than a second service authority.

### Legacy painter and orphan UI paths are gone

The old skirting overlay DOM/CSS/SVG painter, empty/orphan assets, legacy glass SVG, shadowed runtime copies, unreachable UI hooks, unreferenced pricing helpers and unreachable public CSS were removed only after reachability and browser gates.

### Current build and CI are authoritative

Ordinary build packages the approved current assets. R0/R4/R5A materialization is explicit historical replay. Current asset, variant and build-purity checks are independent of historical evidence.

## Open contract findings

These are not current user-visible bugs.

### 1. `stageHas(stageId, itemId)` is not truly stage-scoped

It currently answers whether an item appears in any enabled stage. Before another furniture family depends on placement semantics, either rename it to an availability predicate or split availability from stage membership. Do not silently change current behavior.

### 2. Linked-item validation is still product-specific

`materialGroups[].linkedItemIds` is generic data but the proven relation is primarily `stone-all -> stone-skirting`. Generalize validation only when a second linked-item case exists.

### 3. Material-group topology is intentionally kitchen-specific

`fronts-all`, `handles-all` and `stone-all` protect current admin/runtime assumptions. Generalize only with a real second topology.

### 4. Scene-bound service ownership is partly product-specific

Tempered glass and lighting expose useful declarative data, but there is not yet one generic catalog-service -> scene-entity -> stage contract. Define one before adding more scene-affecting services.

### 5. Pricing scope still contains product-specific cases

The current behavior is tested and correct. Move scope/kind into catalog or price-book metadata only after a second repeated semantic case justifies it.

### 6. `runtime-contracts.js` is the last compatibility shim

Production revision 3 still selects `stone-skirting` while omitting it from every published stage. The safe retirement path is:

1. authenticate as admin;
2. persist exactly one new revision adding `stone-skirting` beside `stone-all`;
3. GET/read back the published record;
4. prove `repairSkirtingStageContract()` is a no-op;
5. run buyer-side browser gates against production;
6. remove the shim and its tests in a dedicated PR.

Repository/deploy automation must not bypass this authorization boundary.

### 7. Scene z-order has two authorities

Scene entities use data z-index; UI overlays use CSS. Browser invariants protect the current ceiling. Centralize tokens only if future scenes need a wider range.

## Branch disposition

- `main` — product authority.
- `feat/exposed-sides-and-glass` — explicitly preserved because PR #34 is deferred for product-value review.
- All previous audit/research/work lineages have been reconciled, harvested where useful, and pruned.
- Housekeeping branches are transient and should be marked terminal after merge through the exact-SHA branch-hygiene contract.

## Durable reconstruction architecture

ADRs 0005–0008 preserve the reusable research conclusions: reconstruction authority, Reconstruction Packet/pipeline, case taxonomy and geometry-first scene authoring. They are documentation/authoring contracts, not active runtime dependencies.

## Housekeeping order from here

1. Keep transient branch inventory clean after each housekeeping merge.
2. Perform the authenticated published-admin migration when an admin identity is available, then retire `runtime-contracts.js`.
3. Revisit schema/generalization candidates only with a concrete second furniture family or demonstrated current limitation.
4. Review PR #34 separately as a product decision, not as housekeeping.

## Non-goals

- No stone, glass or mask geometry changes are part of this contract cleanup.
- PR #34 is neither promoted nor discarded.
- Published administration is not rewritten without authenticated migration/readback evidence.
- Schema generality is not treated as an end in itself.
