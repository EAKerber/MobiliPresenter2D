# CP-SD-02A2f0 — Acabamentos group-shell boundary discovery — 2026-10-07

Status: **READY / NEXT — discovery only**.

Parent:
- CP-SD-02A0 renderer inventory;
- CP-SD-02A2d1–d4 complete all Acabamentos section-shell migrations;
- CP-SD-02A2e1 completes Summary semantic shell generation.

Goal:
- determine the smallest safe removal of the remaining static Acabamentos group-shell authority for `cabinet-finishes` and `stone`, without changing section adapters, material/state behavior or accepted visual composition.

## Why discovery is required

The section layer is already normalized-flow-owned, but `app/index.html` still pre-creates:

- `#frontFinishPanel[data-flow-group-shell="cabinet-finishes"]`;
- `#stonePanel[data-flow-group-shell="stone"]`.

Those shells still own:
- the existence of the two known group containers;
- group-level visual headers;
- visual explanatory copy/icons;
- the `stonePanel[data-configurable-item="stone-all"]` availability hook.

`mountStageGroups()` can create a generic empty group shell today, but its current generated-group path only applies a shared class from `data-flow-group-class`. It does **not** create group headers, preserve specialized group content hosts, or model the Stone availability adapter.

A mechanical replacement would therefore risk visual/availability regressions.

## Discovery questions

Confirm:
- normalized group ids/labels/spans for `cabinet-finishes` and `stone`;
- whether group labels exactly correspond to the current visible headings;
- which current group-header text is semantic label vs purely visual explanatory copy;
- whether the two group shells can share one generic visual shell class;
- how section slots/controls can remain bounded adapters while the group wrapper becomes generated;
- whether a neutral **group-slot** seam is preferable to teaching `createGroupShell()` domain-specific behavior;
- how to preserve `stone-all` group availability without making the group renderer a material-domain authority;
- whether valid configurations can omit:
  - both `fronts-all` and `handles-all` while retaining Stone;
  - both Stone items while retaining cabinet finishes;
  and therefore provide clean group-absence proofs;
- whether group heading generation needs the same kind of optional visual-copy hook used for Summary section headings, or whether stage/group label alone is sufficient.

## Current invariants to preserve

Do not change:
- Fronts/Handles/Stone Packages/Stone Skirting generated section shells;
- `#finishSwatches`, `#handleOptions`, `#stonePackageOptions`, `#stoneSkirtingToggle`;
- finish/handle/stone state;
- `stone-skirting requires stone-all`;
- shared Stone/Rodapé material authority;
- pricing;
- `renderStonePackages()`;
- published-v3 repair;
- responsive CP-SD-03 work;
- production configuration.

## Preferred direction

Prefer a generic neutral group-slot/visual-adapter seam if it lets normalized flow own:
- group existence;
- group id;
- group label;
- order;
- span;

while static presentation adapters retain only:
- explanatory copy/icon;
- section-slot container;
- any narrowly justified item-availability host.

Do not add `cabinet-finishes` or `stone` name branches to the generic group builder.

## Stop rule

Stop and split if removing static group shells requires:
- changing material/state semantics;
- broad stage-root generation;
- touching Modules companion/PiP/dock;
- changing the Stone dependency contract;
- publishing configuration.

No runtime change in A2f0; discovery/documentation only.
