# CP-SD-02A2f0 — Acabamentos group-shell boundary discovery — 2026-10-07

Status: **COMPLETE / PASS**.

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


## Discovery result — PASS

Observed on `main` at `faa52a0d115409de36ac07f96b74b9bc93683d06`.

### Normalized group contract

Acabamentos already supplies all group semantics needed by the renderer:

| group | normalized label | span | sections |
| --- | --- | ---: | --- |
| `cabinet-finishes` | `Acabamentos do conjunto` | 1 | `fronts`, `handles` |
| `stone` | `Pedra do conjunto` | 1 | `stone-packages`, `stone-skirting` |

The normalized labels exactly match the current visible `h2` copy. The explanatory paragraphs and the `◐` icon are visual presentation copy, not hierarchy authority.

### Existing static shells are visual adapters plus semantic ownership

Both current groups use the same outer visual classes:

`panel flow-group-shell`.

Their accepted geometry comes from:
- `.panel { padding: 16px; }`;
- the common group grid;
- normalized `data-flow-span`;
- the `cabinet-finishes` container-query marker installed through `data-flow-group`.

The outer ids remain useful review/accessibility anchors:
- `frontFinishPanel` / `frontFinishHeading`;
- `stonePanel` / `stoneHeading`.

No domain behavior in `app.js` depends on the panel variables beyond their legacy element lookups; the buyer behavior lives in the section/item adapters.

### Generic neutral group-slot seam

Do not add group-name branches to `createGroupShell()`.

Add a generic direct-child group adapter seam such as:

`data-flow-group-slot="<group-id>"`.

A neutral group slot:
- is hidden in static HTML;
- carries accepted visual classes/id/header/description/icon and the section slots;
- does **not** carry `data-flow-group-shell`;
- exposes a generic `data-flow-group-label` hook whose text is populated from normalized `group.label`.

`createGroupShell(group)` should:
1. first look for exactly one unclaimed direct group slot whose affinity matches `group.id`;
2. fail closed on multiple matching slots;
3. claim the slot in place by setting `data-flow-group-shell`, `data-flow-generated-group="true"`, unhide it and populate any `data-flow-group-label`;
4. otherwise preserve the existing generic `data-flow-group-class` fallback used by Services/Summary;
5. return the existing `missing-group-binding` invariant if neither binding path exists.

This preserves exact panel geometry because the adapter itself becomes the generated semantic group shell; no wrapper is inserted.

### Section adapters remain unchanged

The existing section-slot algorithm already works when the group slot is claimed:
- the group becomes the nearest `[data-flow-group-shell]` owner;
- Fronts/Handles/Stone sections continue to be generated and appended in normalized order;
- item controls and domain state remain untouched.

No section migration is reopened.

### Valid group-absence proofs exist

**Cabinet group absent** is valid:
- remove `fronts-all` and `handles-all` from Acabamentos;
- keep `stone-all` (and current valid skirting assignment/state);
- normalized flow contains only group `stone`.

Expected:
- no semantic `cabinet-finishes` shell exists;
- neutral cabinet group slot stays hidden;
- Stone group remains visible;
- no section/group fallback or renderer errors.

**Stone group absent** is also valid:
- keep `fronts-all` / `handles-all`;
- remove `stone-all` and `stone-skirting`;
- remove `stone-skirting` from `initialState.services`.

The existing Stone absence fixture already establishes the domain-valid shape and can be adapted in A2f2.

### Stone availability hook

`#stonePanel[data-configurable-item="stone-all"]` is no longer needed as semantic group availability authority once group existence is normalized-flow-owned.

For every **valid** configuration:
- Stone group existence implies `stone-all`;
- `stone-skirting` cannot exist without `stone-all`.

Therefore the group-level item hook is semantically redundant, but removing it belongs to **A2f2**, not A2f1, so the first group migration does not reopen the Stone boundary.

### Stage-entry focus issue discovered

`focusCurrentStep()` currently uses:

`panel.querySelector("h2")`.

A hidden neutral group slot can appear earlier in DOM order than the first modeled group. Focusing its hidden heading would lose the intended stage-entry anchor.

A2f1 must make this selection generic and visibility-aware, e.g. choose the first `h2` without a `[hidden]` ancestor. Normal configurations continue to focus `frontFinishHeading`; the valid cabinet-absent fixture must focus the visible Stone heading.

This is a shell/focus invariant, not a domain branch.

## Sequencing decision

Split the migration:

### A2f1 — Cabinet group + generic group-slot foundation

Only:
- introduce the generic group-slot claim path;
- migrate `cabinet-finishes` from static semantic shell to hidden neutral group slot;
- make its normalized group label populate `frontFinishHeading`;
- preserve id/header description/icon and all section/item adapters;
- make stage-entry heading selection ignore hidden ancestors;
- prove normal geometry/order and valid cabinet-group absence.

Leave `stonePanel` untouched.

### A2f2 — Stone group

Then:
- migrate `stone` through the already-proven group-slot seam;
- populate `stoneHeading` from normalized group label;
- remove the redundant group-level `data-configurable-item="stone-all"` hook;
- adapt the existing valid Stone absence proof;
- prove Stone/Skirting state/material/pricing behavior unchanged.

## Non-goals

Do not:
- change section shells or item adapters;
- change material/state/pricing semantics;
- change `stone-skirting requires stone-all`;
- change `renderStonePackages()`;
- introduce group-id conditionals;
- touch Modules/PiP/dock;
- publish configuration.

Conclusion: proceed to A2f1 only.
