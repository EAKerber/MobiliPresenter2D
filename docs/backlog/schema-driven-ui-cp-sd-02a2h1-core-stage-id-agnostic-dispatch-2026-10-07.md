# CP-SD-02A2h1 — id-agnostic generic core-stage dispatch — 2026-10-07

Status: **IN PROGRESS — IMPLEMENTATION CANDIDATE**.

Parent:
- CP-SD-02A2h0 residual discovery — PASS.

Goal:
- remove historical stage-id authority from generic Finishes / Services / Summary group mounting while preserving their accepted visual roots and all current domain renderers.

## Allowed implementation

### Neutral group-grid binding

For the generic core stage roots:
- `#finishesStagePanel`;
- `#servicesPanel`;
- `#summaryPanel`.

The group grid must remain a visual/binding host but not pre-author the semantic stage id.

Preferred seam:
- retain a single `[data-flow-group-grid]` host in each root;
- `mountStageGroups(stageId, stageRoot)` resolves exactly one host under that root;
- claim/update `grid.dataset.flowGroupGrid = stageId` before section/group binding;
- fail closed if zero or multiple grid hosts exist.

Do not infer stage kind from DOM.

### Generic non-Modules core dispatcher

`applyBuyerFlowLayout()` should iterate normalized stages.

For each stage:
- `kind === "modules"`: use the existing specialized Modules path unchanged;
- `kind === "custom"`: keep current custom-stage validation path;
- other known core kinds with a `stagePanels` renderer root: call `mountStageGroups(stage.id, stagePanelFor(stage))`.

No literal `mountStageGroups("finishes" ...)`, `"services"`, or `"summary"` branches remain.

### Explicitly unchanged

- `stagePanels` kind -> visual root registry;
- Modules companion topology and `stageViews.modules`;
- compact navigation abbreviations;
- section/group shell generation behavior;
- service/lighting/finish/stone/summary domain renderers;
- pricing/state/scene;
- production configuration.

## Proof

### Source

- no literal generic `mountStageGroups("finishes"|"services"|"summary")` calls;
- group grids in those roots do not own historical semantic ids before mount;
- dispatcher consumes normalized stage id + kind registry.

### Default regression

Current default ids:
- modules;
- finishes;
- services;
- summary.

Must render identically and pass all existing browser/unit gates.

### Renamed-core-id fixture

Clone a valid v3/current administration and rename only non-Modules core stage ids while preserving kinds:
- finishes -> `finishes-layout`;
- services -> `services-layout`;
- summary -> `review-layout`.

Keep Modules unchanged.

Expected:
- configuration validation passes;
- normalized stage ids equal renamed ids, kinds remain canonical;
- navigation uses renamed ids and existing labels/order;
- stable panel roots remain the same DOM elements;
- each runtime group grid reports the renamed `data-flow-group-grid` id after mount;
- normalized groups/sections/components materialize with no fallback;
- keyboard navigation follows normalized order;
- Summary remains mandatory/enabled by kind;
- no flow-layout/page/console errors.

### Negative binding

Add or retain a focused proof that:
- zero/multiple neutral group-grid hosts for a generic core stage fail closed;
- no silent Modules fallback occurs.

## Gate

- app/unit tests;
- Flow layout browser;
- Keyboard browser;
- Mobile browser;
- Stone browser;
- Summary/Pricing browser;
- current asset/variant/build gates;
- Netlify preview.

## Stop rule

Stop and split if this requires:
- changing Modules view topology or presentation policy;
- adding a new schema field for compact labels;
- changing domain renderers/state/pricing/scene;
- publishing configuration.

After a green A2h1, CP-SD-02 should be closed and CP-SD-03 becomes the next schema/UI track.


## Implementation candidate

Candidate changes:
- Finishes / Services / Summary static group grids retain only the neutral `data-flow-group-grid` host marker; historical ids are removed from static HTML;
- `mountStageGroups()` resolves exactly one direct neutral group-grid host, fails closed on zero/multiple hosts, then claims it with the actual normalized `stageId`;
- `applyBuyerFlowLayout()` iterates normalized stages:
  - Modules keeps the existing specialized pane mount;
  - custom stages keep their existing validator;
  - remaining core stages use the existing `stagePanels` kind registry and mount by actual `stage.id`;
- no literal generic `mountStageGroups("finishes"|"services"|"summary")` calls remain;
- shared cache revision advances v29 -> v30.

New browser proof:
- clones the live v3/current administration;
- renames only non-Modules core ids while preserving kinds:
  - `finishes-layout`;
  - `services-layout`;
  - `review-layout`;
- requires navigation to expose those renamed ids in normalized order;
- requires no historical Finishes/Services/Summary navigation ids;
- requires the same stable visual panel roots to claim the renamed grid ids;
- opens all three renamed stages and proves their existing generated sections still materialize;
- requires Summary to remain enabled by kind;
- requires zero flow-layout/page/console errors.

Explicitly untouched:
- Modules companion presentation policy/topology;
- compact nav copy;
- domain renderers, pricing, state and scene;
- production configuration.

Gate pending: all eight workflows + Netlify preview.
