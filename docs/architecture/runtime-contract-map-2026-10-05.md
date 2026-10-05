# Runtime contract map — 2026-10-05

Status: housekeeping reference for the current `main`. This document describes authority boundaries before removing compatibility code or legacy assets.

## Canonical flow

1. `app/data/catalog-data.js` is the public product/catalog authority: modules, accessories, services and commercial option families. It is not the published administration record.
2. `app/data/configurator-settings.js` is the static stage seed (`ConfiguratorSettings2D 1.0`). It currently exposes Modules, Acabamentos, Serviços and Resumo and already places `fronts-all`, `handles-all`, `stone-all` and `stone-skirting` in Acabamentos.
3. `app/core/configuration.js` owns the administrative schema (`ConfiguratorAdministration2D 3.0`), default administration materialization, migration, validation, normalization, dependencies/events and the item registry.
4. `netlify/functions/configuration.mjs` is the published-configuration persistence boundary. Runtime must consume only data accepted by the configuration core.
5. `app/core/runtime-contracts.js` is currently a compatibility layer. It repairs older stage contracts, injects scene-stack CSS and dynamically installs keyboard shortcuts. These are transitional responsibilities, not a desirable second source of application semantics.
6. `app/app.js` materializes the accepted configuration into runtime catalog/scene state and DOM controls, resolves configured assets, dependencies/events, visibility and rendering.
7. `app/core/state.js`, `visibility.js`, `finishes.js`, `stone.js` and `pricing.js` are runtime domain layers. `app/data/stone-data.js` and `mask-data.js` are generated/derived rendering data, not catalog schema.
8. Browser/core gates are the final contract boundary. A housekeeping change is not complete merely because a file becomes unused statically; the relevant browser states must remain equivalent.

## Confirmed architectural scars

### 1. `stone-skirting` has split authority

`stone-skirting` is not present in `catalog.services`, but `configuration.js` manually registers it as a service, permits it in `initialState.services`, allows it as an event target/trigger and links it from the `stone-all` material group. Pricing/runtime also know this ID directly.

This is functional today but violates the intended catalog -> administration -> runtime authority chain. Do not delete the special cases independently. First choose and migrate to one canonical semantic model:

- either make it a true catalog service; or
- model it explicitly as a stone/material add-on instead of pretending it is a service.

The second option matches the current UI better because the toggle belongs to Acabamentos and is linked to the stone package. It may require a small schema-kind extension, so it is a separate migration slice rather than incidental cleanup.

### 2. `runtime-contracts.js` is carrying migrations and presentation fixes

Current duties:

- repairs static default stages by inserting handles/skirting if absent;
- repairs old published configurations where skirting is active but has no stage control;
- injects z-index rules for grid/hotspots/selection;
- injects `keyboard-shortcuts.js` dynamically.

The static defaults already contain handles/skirting, so that first repair is compatibility-only. The preferred end state is:

- migrations happen in the configuration schema/persistence path;
- permanent stack rules live in `styles.css`;
- keyboard script loading is explicit in `index.html`;
- `runtime-contracts.js` disappears after old published records are migrated/normalized safely.

### 3. Legacy skirting overlay DOM is inert

`index.html` still contains `#skirtingOverlay02` and `#skirtingOverlay03`; `styles.css` still defines `.scene-skirting` and references `assets/kitchen/masks/skirting-02.svg` / `skirting-03.svg`; `app.js` still collects those nodes.

However `syncSkirtingAppearance()` explicitly removes `is-mdf` and forces `aria-hidden=true`. The semantic `plinthCanvas` owns both MDF and stone plinth rendering. Therefore the old overlay path is a proven removal candidate.

Safe removal slice:

- delete both overlay DOM nodes;
- delete `skirtingOverlays` and `syncSkirtingAppearance()` dead plumbing;
- delete `.scene-skirting*` CSS;
- delete `skirting-02.svg` and `skirting-03.svg` only after repository-wide reference validation confirms no remaining consumer;
- run core + Stone browser + keyboard browser and inspect OFF/ON stone-skirting across both single-module-hidden states.

This removal must not change `stone-skirting` state semantics; it removes only the old painter.

## Branch classification after cleanup

Canonical/product:
- `main` — authority.
- `feat/exposed-sides-and-glass` — explicitly preserved because PR #34 remains open/draft.

Retained temporarily:
- `audit/boundary-forensics` — still contains useful boundary/legacy evidence and authoring diagnostics not yet migrated into canonical tooling/docs.
- `research/bmc04-compact-donor-calibration-v0.1` — active historical research packet around bounded cooktop generation; do not delete until research disposition is explicit.
- `research/reconstruction-architecture-v0.1` — reconstruction research lineage; do not delete until its useful contracts are either promoted or archived intentionally.

Terminal now:
- `audit/live-state-2026-09-17` — self-cleaning audit lineage; zero current file diff versus `main`.
- `audit/module02-finish-mask` — self-cleaning stone audit lineage; zero current file diff versus `main`.

## Housekeeping gates / order

1. Branch cleanup with exact-SHA dispositions only.
2. Remove proven inert skirting overlay painter.
3. Move permanent stack CSS and keyboard loading out of `runtime-contracts.js`.
4. Resolve `stone-skirting` semantic ownership and migrate published administration safely.
5. Only then remove skirting compatibility repairs from `runtime-contracts.js` and delete that shim if no other duty remains.
6. Rebaseline historical visual/generation gates only after separating genuine source drift from obsolete checkpoints; never silence a current visual regression by refreshing a baseline.
7. Revisit `audit/boundary-forensics` and the two research branches after their unique evidence/contracts have been promoted or explicitly archived.

## Non-goals

- No mask geometry or stone-data geometry is changed by this architecture pass.
- No PR #34 glass/exposed-side work is promoted or discarded here.
- No research branch is deleted merely because it is old.
- No published administration record is rewritten without a migration/readback gate.
