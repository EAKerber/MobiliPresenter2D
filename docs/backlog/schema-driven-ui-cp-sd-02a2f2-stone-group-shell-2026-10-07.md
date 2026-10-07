# CP-SD-02A2f2 — generated Stone group shell — 2026-10-07

Status: **READY / NEXT**.

Parent:
- CP-SD-02A2f0 group-shell discovery — PASS;
- CP-SD-02A2f1 generic group-slot foundation + Cabinet migration — PASS.

Goal:
- make normalized flow own the `stone` group shell through the already-proven neutral group-slot seam, while retiring the now-redundant group-level `stone-all` visibility hook and preserving all Stone/Skirting material/state/pricing behavior.

## Allowed implementation

Convert only `#stonePanel`:
- keep `id="stonePanel"`;
- keep classes `panel flow-group-shell`;
- remove static `data-flow-group-shell="stone"`;
- remove group-level `data-configurable-item="stone-all"`;
- add `data-flow-group-slot="stone"`;
- start hidden;
- keep `aria-labelledby="stoneHeading"`;
- keep the explanatory paragraph unchanged;
- keep `stoneHeading` id/tabindex but remove static semantic label text;
- add `data-flow-group-label`;
- keep Stone Packages and Stone Skirting neutral section slots/adapters unchanged.

Do not change generic group-slot infrastructure unless a gate exposes a generic lifecycle defect.

## Why the old item hook can be retired

For every valid configuration:
- Stone group exists only when `stone-all` is assigned;
- `stone-skirting` cannot exist without `stone-all`;
- normalized flow therefore already owns the exact group availability condition.

The old `stonePanel[data-configurable-item="stone-all"]` duplicates normalized group existence and is no longer needed.

This retirement does **not** create independent Stone/Skirting material authority.

## Positive proof

Normal configuration:
- runtime `[data-flow-group-shell="stone"]` has `data-flow-generated-group="true"`;
- id remains `stonePanel`;
- visible `stoneHeading` text equals normalized `Pedra do conjunto`;
- Stone Packages and Stone Skirting sections remain generated/ordered;
- existing wide/stacked/mobile group geometry remains unchanged;
- Stone browser ON/OFF material behavior remains unchanged.

## Valid Stone-absence proof

Reuse/adapt the existing domain-valid fixture:
- keep Fronts/Handles;
- remove `stone-all` and `stone-skirting` from Acabamentos;
- remove `stone-skirting` from `initialState.services`.

Prove:
- normalized flow contains no `stone` group;
- no runtime semantic Stone group shell remains after default->remote reconciliation;
- neutral `data-flow-group-slot="stone"` remains hidden/unclaimed;
- Cabinet group remains visible;
- stage-entry focus remains on `frontFinishHeading`;
- no Stone Packages/Stone Skirting semantic sections are fabricated;
- no flow/page/console errors.

## Intentional Skirting absence

The existing fixture that keeps `stone-all` but removes `stone-skirting` must still prove:
- Stone group remains present;
- Stone Packages remains present;
- Stone Skirting stays absent;
- no compatibility repair re-adds the intentionally removed service.

## Regression

Must preserve:
- Stone Packages selection;
- Stone Skirting ON/OFF service state;
- ON -> selected Stone material;
- OFF -> MDF/front-finish path;
- pricing/global-charge ownership;
- `renderStonePackages()`;
- `stone-skirting requires stone-all`;
- legacy v3 repair;
- all section/item adapters;
- Summary/Modules/Services behavior.

Gate:
- all eight repository workflows + Netlify preview green.

## Stop rule

Stop and split if Stone group migration requires:
- changing the Stone/Skirting dependency;
- adding separate Skirting material authority;
- changing state/pricing/material rendering;
- changing the v3 repair;
- touching Modules/PiP/dock;
- publishing configuration.

No production configuration write.
