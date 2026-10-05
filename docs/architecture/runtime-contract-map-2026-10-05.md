# Runtime contract map — 2026-10-05

Status: housekeeping reference for the current product line after the first contract-cleanup pass. This document distinguishes current authority, compatibility debt and generalizations that should not be forced without a second real furniture case.

## Canonical flow

1. `app/data/catalog-data.js` is the public product/catalog authority: modules, accessories, services and commercial option families. Services may declare catalog semantics such as `defaultSelected` and `stageKinds`.
2. `app/data/configurator-settings.js` is the static stage seed (`ConfiguratorSettings2D 1.0`). It declares the initial stage/item arrangement, not published administration state.
3. `app/core/configuration.js` owns the administrative schema (`ConfiguratorAdministration2D 3.0`), default administration materialization, migration, validation, normalization, dependencies/events and the item registry.
4. `netlify/functions/configuration.mjs` is the published-configuration persistence boundary. Runtime consumes only data accepted by the configuration core.
5. `app/core/runtime-contracts.js` is now compatibility-only. It repairs older stage/default contracts before they enter the current configuration core. Permanent stack CSS and keyboard loading no longer live there.
6. `app/index.html` explicitly loads the keyboard controller; `app/styles.css` owns the current UI stack contract for grid/hotspots/selection.
7. `app/app.js` materializes accepted configuration into runtime state and DOM, resolves configured assets, dependencies/events, visibility, renderer inputs and pricing inputs.
8. `app/core/state.js`, `visibility.js`, `finishes.js`, `stone.js` and `pricing.js` are runtime domain layers. `app/data/stone-data.js` and `mask-data.js` are generated/derived rendering data, not catalog schema.
9. Browser/core gates are the final behavior boundary. Static reachability alone is never sufficient authority to delete a renderer asset or compatibility path.

## Resolved scars in this housekeeping pass

### `stone-skirting` is now a canonical catalog service

The earlier split authority was removed. `catalog.services` now contains `stone-skirting` with its title, default-selection policy and allowed stage kinds. `configuration.js` discovers it through the normal service registry and default service materialization instead of manually inventing it as a service.

The relation `stone-all -> linkedItemIds: ["stone-skirting"]` remains intentional: it describes a domain relationship between the stone material group and the semantic rodapé toggle. It is not itself evidence that the service must share the material schema.

### Legacy skirting painter was removed

The old `#skirtingOverlay02/#skirtingOverlay03` DOM nodes, `.scene-skirting` CSS, dead runtime synchronization plumbing and the two SVG masks were removed after proving that `plinthCanvas` is the active renderer for both MDF and stone rodapé states.

### Permanent UI contracts left the compatibility shim

The current stack values are ordinary CSS and keyboard loading is explicit in `index.html`. `runtime-contracts.js` no longer injects either behavior dynamically.

## Open contract findings

These are not current user-visible bugs. They are architecture findings to resolve only when the benefit exceeds migration risk.

### 1. `stageHas(stageId, itemId)` is not stage-scoped

In `app.js`, the helper accepts a stage argument but deliberately/accidentally ignores it and answers whether an item appears in **any enabled stage**.

That behavior is currently useful because a service can be exposed in `finishes`, `services` or a custom stage while still remaining active globally. However the name and call sites imply a stronger contract than the implementation provides.

Before a second furniture schema depends on stage placement, choose one explicit model:

- rename it to an item-availability predicate and keep placement independent from activation; or
- introduce separate predicates such as `itemIsConfigured(id)` and `stageContains(kind,id)`.

Do not silently change the current helper to stage-scoped behavior; that could alter pricing/visibility of services whose control is intentionally placed outside the Services stage.

### 2. Linked-item validation is still hardcoded to stone skirting

`materialGroups` already preserves generic `linkedItemIds`, but validation separately says that active `stone-skirting` requires `stone-all`.

If linked items become a reusable schema concept, validation should derive this rule from `linkedItemIds` rather than contain an ID-specific exception. Until another linked-item use case exists, this is acceptable product-specific rigidity rather than an urgent refactor.

### 3. Material groups are intentionally fixed to the current product model

Administration validation currently requires exactly three material groups: `fronts-all`, `handles-all`, `stone-all`; material `groupIds` are likewise constrained to the current finish/stone model.

This is coherent for the kitchen and protects the admin/runtime assumptions. It should not be generalized speculatively. Revisit when a second furniture family requires a materially different group topology.

### 4. Scene-bound service visibility is partly ID-specific

Runtime has explicit handling for scene entities such as `tempered-glass` and `lighting-08`. The scene already carries useful declarative fields such as `serviceId`, but not every scene-bound commercial option follows one generic binding contract.

Before adding more scene-affecting services, define one declarative relation among catalog service/accessory, scene entity and stage availability instead of adding another ID branch.

### 5. Pricing still carries product-specific global semantics

`pricing.js` special-cases `stone-skirting` as stone-scoped and treats `lighting-08` as a scene/entity price path. This works for the current catalog, but scope/kind could eventually become catalog or price-book metadata if a second product family repeats the pattern.

Do not generalize pricing solely to remove string comparisons; first establish a second real semantic case.

### 6. `runtime-contracts.js` remains a migration shim

It still repairs old static/default settings and published administrations that predate the current handle/skirting stage contract. This is legitimate compatibility, not dead code.

Preferred retirement path:

1. prove current production/admin records normalize correctly;
2. perform a one-time persistence migration with readback;
3. verify old records no longer exist in supported storage;
4. remove the compatibility wrapper and its tests in a dedicated change.

### 7. Scene z-order has two authorities

Scene entity z-index values live in `scene-data.js`; UI overlays use CSS (`grid=840`, `hotspots=860`, `selection=900`). Browser tests currently assert the ordering, which prevents the earlier regression, but the values are not generated from one token source.

A shared stack contract may become worthwhile if future scenes introduce entities above the current `z=800` ceiling. Until then the browser invariant is the important authority.

## Branch/research disposition

Canonical/product:
- `main` — product authority.
- `feat/exposed-sides-and-glass` — explicitly preserved because PR #34 remains deferred for product review.

Retained temporarily:
- `audit/boundary-forensics` — historical boundary/legacy authoring diagnostics; disposition waits for the current asset/mask reachability review.
- `research/bmc04-compact-donor-calibration-v0.1` — large experimental reconstruction lineage. Its durable architecture knowledge has now been harvested into ADRs 0005–0008 on `main`; remaining tooling/artifacts still need a final archive/delete decision.

Transient housekeeping branches should be deleted after their evidence/PR is complete.

## Reconstruction architecture preserved from research

The following exploratory contracts were intentionally promoted as documentation, not runtime:

- ADR 0005 — Reconstruction Authority Contract;
- ADR 0006 — Reconstruction Packet and Authoring Pipeline;
- ADR 0007 — Reconstruction Case Taxonomy;
- ADR 0008 — Geometry-First Scene Authoring Contract.

They formalize a useful rule for future furniture: physical/topology truth, canonical raster appearance, ownership, transformation evidence, authoring method and edit authorization are separate concerns. New scenes should prefer geometry-first authoring; the current kitchen remains a legacy/evidence-adaptive case.

## Housekeeping order from here

1. Finish the current asset/mask reachability audit and remove only proven orphans/redundancy.
2. Complete PR #53 only after runtime/browser confidence is available; its historical asset-gate reds must not be mistaken for new regressions.
3. Reconcile `audit/boundary-forensics`: promote any reusable diagnostic, otherwise prune it.
4. Reconcile the remaining BMC04 research branch now that ADRs 0005–0008 are canonical.
5. Rebaseline historical asset/fidelity CI in a dedicated maintenance slice, preserving old evidence rather than silently overwriting it.
6. Persist normalized legacy administration before retiring `runtime-contracts.js`.
7. Revisit stage/material/service generalization only with a concrete second furniture case or a demonstrated current limitation.

## Non-goals

- No stone, glass or mask geometry is changed by this contract audit.
- PR #34 is neither promoted nor discarded here.
- A research/audit branch is not deleted merely because it is old.
- Published administration is not rewritten without migration/readback evidence.
- Schema generality is not treated as an end in itself; current product invariants may remain intentionally narrow.
