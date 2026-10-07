# CP-SD-02A2f1 — generated Cabinet Finishes group shell — 2026-10-07

Status: **READY / NEXT**.

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
