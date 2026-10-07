# CP-SD-02A2f1 — generated Cabinet Finishes group shell — 2026-10-07

Status: **IN PROGRESS — IMPLEMENTATION CANDIDATE**.

Parent:
- CP-SD-02A2f0 group-shell discovery — PASS.

Goal:
- make normalized flow own the `cabinet-finishes` group shell while preserving the exact accepted panel/header/section geometry and every Fronts/Handles domain behavior.

## Allowed implementation

### Generic group-slot foundation

Extend `mountStageGroups()` generically:
- collect direct neutral `[data-flow-group-slot]` adapters;
- `createGroupShell(group)` first claims exactly one unclaimed slot whose affinity equals `group.id`;
- fail closed on ambiguous affinity;
- claim in place: set `data-flow-group-shell`, `data-flow-generated-group="true"`, unhide and register;
- populate any `[data-flow-group-label]` target from normalized `group.label`;
- if no affinity slot exists, preserve the existing `data-flow-group-class` fallback;
- preserve `missing-group-binding` when neither path exists.

No group-name conditionals.

### Cabinet markup

Convert only `#frontFinishPanel`:
- keep `id="frontFinishPanel"`;
- keep classes `panel flow-group-shell`;
- remove static `data-flow-group-shell="cabinet-finishes"`;
- add `data-flow-group-slot="cabinet-finishes"`;
- start hidden;
- keep `aria-labelledby="frontFinishHeading"`;
- keep the `◐` icon and explanatory paragraph unchanged;
- keep `frontFinishHeading` id/tabindex but remove static semantic label text;
- mark that heading with `data-flow-group-label`;
- keep the Fronts/Handles neutral section slots and item adapters unchanged.

Do not modify `#stonePanel`.

### Stage-entry focus

Replace first-`h2` lookup with a generic visible-heading selection:
- inspect headings in DOM order;
- choose the first whose ancestry has no `[hidden]`;
- no stage/group name branch.

Normal configuration must still focus `frontFinishHeading`.
Cabinet-absent configuration must focus `stoneHeading`.

## Proof

Source:
- no static `data-flow-group-shell="cabinet-finishes"`;
- one hidden `data-flow-group-slot="cabinet-finishes"`;
- `frontFinishHeading` contains no static “Acabamentos do conjunto” text;
- generic group-label hook exists;
- Stone markup remains unchanged.

Positive browser:
- generated cabinet group has `data-flow-generated-group="true"`;
- `data-flow-group-shell="cabinet-finishes"`;
- `frontFinishPanel` id preserved;
- `frontFinishHeading` text equals normalized group label;
- Fronts/Handles sections remain generated and ordered;
- 1366 / 1050 / compact geometry remains unchanged;
- keyboard stage entry still focuses the visible group heading.

Valid absence fixture:
- remove `fronts-all` + `handles-all`;
- retain valid Stone data;
- normalized flow has no cabinet group;
- no semantic cabinet group shell exists;
- neutral cabinet slot remains hidden;
- Stone group remains present/visible;
- Ctrl+ArrowRight stage entry focuses `stoneHeading`, never the hidden cabinet heading;
- no flow/page/console errors.

Regression:
- all eight workflows + Netlify preview green.

## Explicitly unchanged

- `#stonePanel` and its current availability hook;
- all four generated Acabamentos section shells;
- all item adapters/state/pricing/material behavior;
- `renderStonePackages()`;
- Stone/Skirting dependency/material rule;
- Modules/PiP/dock;
- production configuration.

## Stop rule

Stop and split if cabinet group generation requires:
- Stone changes;
- section renderer redesign;
- material/state/pricing changes;
- broad stage-root generation;
- production writes.

No production configuration write.


## Implementation candidate

Applied only the Cabinet group seam:
- added a generic direct-child `data-flow-group-slot` binding path to `mountStageGroups()`;
- group-slot affinity is exact `group.id`; ambiguous matches fail closed as `ambiguous-group-slot`;
- a claimed slot receives `data-flow-group-shell`, `data-flow-generated-group="true"`, normalized label text, span/order and is unhidden in place;
- the existing class-based group-shell fallback remains unchanged for Services/Summary;
- converted only `#frontFinishPanel` to hidden `data-flow-group-slot="cabinet-finishes"`;
- removed static `data-flow-group-shell="cabinet-finishes"`;
- `frontFinishHeading` is now populated from normalized `group.label`;
- the icon, explanatory paragraph, ids, Fronts/Handles section slots and item adapters are unchanged;
- `focusCurrentStep()` now chooses the first `h2` without a `[hidden]` ancestor;
- added normal generated-group proof and a valid Cabinet-absent fixture;
- shared runtime cache revision advanced v24 -> v25.

Valid Cabinet-absent fixture:
- removes `fronts-all` and `handles-all`;
- retains Stone;
- proves no semantic cabinet group shell is fabricated;
- proves the neutral Cabinet slot stays hidden;
- proves Stone remains visible;
- Ctrl+ArrowRight into Acabamentos focuses `stoneHeading`, not the hidden Cabinet heading;
- renderer/page errors remain empty.

Explicitly unchanged:
- `#stonePanel[data-flow-group-shell="stone"][data-configurable-item="stone-all"]`;
- all four generated Acabamentos section shells;
- finish/handle/stone state, pricing and materials;
- `renderStonePackages()`;
- Stone/Skirting dependency/material semantics;
- Modules/PiP/dock;
- production configuration.

Gate pending: eight repository workflows + Netlify preview.


### First Flow-layout gate correction

The first browser gate failed only on:

`Cabinet Finishes visible group heading comes from normalized group label`

The group slot itself was claimed successfully. Root cause: `flow-layout.stageLayout()` did not project normalized `group.label`; it exposed only group id/span/sections.

Correction is generic:
- add `label: group.label` to the group layout projection;
- unit-test normalized labels for Cabinet, Stone and Services;
- keep the group-slot renderer free of group-name branches;
- advance shared cache revision v25 -> v26 so the revised flow-layout contract cannot reuse the failed preview cache key.

No Cabinet visual adapter, section/item, Stone, material, state or pricing behavior changes are added by this correction.


### Second Flow-layout gate correction

The second browser gate advanced past label generation and failed only on the valid Cabinet-absence assertion:

`omitted Cabinet Finishes data creates no semantic cabinet group shell`

Cause:
- the app initially mounts canonical defaults, where Cabinet exists, so the neutral slot becomes a generated group shell;
- the routed configuration is then normalized without Cabinet;
- reconciliation hid the old generated shell but left its runtime `data-flow-group-shell` ownership in place.

That violates the fail-closed rule even though the UI was hidden.

Correction is generic for **claimed neutral group slots**:
- when their group is no longer expected, hide the slot;
- clear normalized group-label text;
- remove `data-flow-group-shell`, `data-flow-generated-group`, `data-flow-group` and `data-flow-span`;
- remove the stale shell from the current id map;
- keep `data-flow-group-slot` so a later valid configuration can reclaim the same visual adapter.

Existing class-created generic group shells are not broadened in this checkpoint.

Shared cache revision advances v26 -> v27.

The valid Cabinet-absence fixture remains unchanged and now tests both UI absence and runtime semantic ownership absence.
