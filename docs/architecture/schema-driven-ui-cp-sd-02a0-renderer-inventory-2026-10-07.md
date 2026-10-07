# CP-SD-02A0 — residual semantic-renderer inventory — result — 2026-10-07

Status: **COMPLETE / PASS**.

Parent plan:
- `docs/backlog/schema-driven-ui-cp-sd-02a0-semantic-renderer-inventory-2026-10-07.md`

Baseline:
- `main` at CP-SD-01 completion;
- frozen unpublished administration candidate: `ConfiguratorAdministration2D 5.0`;
- accepted PR #97 buyer behavior remains the visual baseline.

No runtime or production behavior was changed in this checkpoint.

## Executive finding

The buyer is already **partly fail-closed**:

- normalized flow owns section order and membership for keyboard/navigation;
- known static section shells are hidden when the normalized section is absent;
- component mismatches surface invariant errors rather than silently choosing a fallback;
- custom stages are created dynamically.

The remaining problem is therefore narrower than the historical Puxadores defect:

> the normalized flow decides which known semantic structures are valid, but core buyer stages still require pre-existing domain-specific DOM shells and domain-specific runtime branches.

This means:
- **removing an existing modeled section can already remove it from active UI** after runtime layout application;
- **adding a new valid declarative section to a core stage still cannot render without adding markup/code**;
- several stage/section/item IDs remain repeated in `index.html`, `app.js`, layout helpers and browser tests.

## Inventory matrix

| Surface | Class | Current semantic knowledge | Current consequence | Target owner | Smallest removal slice |
| --- | --- | --- | --- | --- | --- |
| `app/index.html` initial `.flow-step` buttons | R1 | hardcodes Modules/Acabamentos/Serviços/Resumo and order | runtime later deletes/rebuilds them, but pre-runtime markup is a second stage list | normalized enabled stages | **02A1** |
| `app.js renderStageNavigation()` compact-label object | R2 | hardcodes labels by stage kind | a new stage kind needs JS copy logic | presentation copy/default or generic stage label abbreviation policy | later 02A slice |
| `app.js stagePanels` map | R2 | hardcodes four core kinds -> four DOM roots | core stage topology cannot be introduced solely by schema | presentation stage renderer registry | 02A2+ |
| `app.js applyBuyerFlowLayout()` | R2 | explicitly calls finishes/services/modules/summary paths | renderer orchestration still knows domain stage IDs | generic stage/view dispatcher | 02A2+; Modules deferred to CP-SD-03 |
| `app/index.html` finishes group shells | R1 | pre-creates `cabinet-finishes` and `stone` | new group cannot render without HTML; absent known groups are hidden correctly | normalized groups + generic shell renderer | later 02A slice |
| `app/index.html` fronts/handles/stone sections | R1 | pre-creates section IDs, labels, component IDs and control hosts | new declarative section cannot render; existing absence hides shell | normalized section + component registry | later 02A slices by component family |
| `app/index.html` services group/sections | R1 | pre-creates `services`, `lighting`, `additional-services` | same restriction; absence hides known section | normalized section + toggle-list renderer | 02A3 candidate |
| `app.js mountStageGroups()` | R0/R1 boundary | uses normalized flow for order/hide, but binds only to existing DOM shells | safely detects missing/duplicate bindings but cannot create them | evolve into generic mount/create path | 02A2+ |
| `app.js validateRendererComponentBinding()` | R0 | verifies schema component vs DOM component | good fail-closed invariant; should remain through transition | presentation contract | keep |
| `app/core/flow-layout.js stageLayout()` | R0 | projects normalized groups/sections/components | correct generic semantic projection | normalized flow/presentation | keep |
| `app/core/flow-layout.js moduleViewLayout()` | R2 | hardcodes `modules`, detail/list pane shape | duplicates policy already represented in `presentationPolicy.stageViews.modules` | presentation policy | **CP-SD-03**, not 02A |
| `app/index.html` Modules list/detail panes | R1 | static companion panes | cannot yet be projected from policy | presentation policy/view renderer | **CP-SD-03** |
| `app.js renderModuleControlsFromData()` | R0/R2 | data-driven module cards but module-specific visual renderer | legitimate component renderer; interaction polish still hardcoded | `selection-list` + module card component | keep until CP-SD-04 |
| `app/index.html` summary panel | R1 | static summary semantic root + action-list binding | summary stage requires pre-existing DOM | action-list/stage renderer | later 02A slice |
| `app.js renderSummary()` | R0/R2 | product-specific summary content | legitimate domain presentation, not hierarchy authority | summary component renderer | keep |
| `app/core/keyboard-shortcuts.js` section discovery | R0 | locates DOM by section id, but reads order/behavior/items from normalized flow | DOM cannot override model behavior/order; missing owner becomes invariant error | normalized flow + renderer hooks | keep |
| `tests/keyboard-browser.cjs` DOM mutation tests | R5 | deliberately mutate DOM order/behavior/ownership | prove normalized flow remains authority | regression test | retain/adapt during dynamic DOM migration |
| `tests/flow-layout-browser.cjs` literal section IDs | R5 | pins current fixture sections/components | valid fixture knowledge, but some selectors will need component-generated DOM | fixture + generic renderer tests | update with each small slice |
| `app.js renderCustomStage()` | R0 with limitation | dynamically creates custom stage shell, but assumes one `items` toggle-list section | useful proof that runtime-created semantic DOM works; not a generic core-stage engine | future generic stage renderer | use as implementation reference, do not generalize blindly |
| `app.js renderServices()` | R2 | uses `stageItems("services")`; assumes catalog services belong in one checklist | section membership is broader than normalized section ownership | normalized section.itemIds | **02A3** |
| `app.js lightingToggle` + `updateAccessoryControls()` | R2 | special-cases `lighting-08` and its static element | lighting cannot yet use the generic toggle-list path | item capability/state adapter + toggle-list renderer | after generic toggle-list foundation |
| `app.js` layer configure branches for `tempered-glass` / `lighting-08` | R2 | special-cases scene visibility by item IDs | scene/runtime concern coupled to semantic availability | item capability/scene binding | separate later cleanup; not shell generation |
| `app.js applyMaterialLibrary()` IDs `fronts-all/handles-all/stone-all` | R2, non-layout | hardcodes material-domain adapters | not renderer hierarchy authority; still a consolidation target, but outside first buyer-shell slices | typed material-group capability | later data/domain cleanup |
| `app/index.html` bottom `.flow-actions` | R0 for now | fixed shell exists independently of semantic sections | desired future persistent dock is policy-driven but geometry not implemented | CP-SD-03 shell policy | defer |

## Trace of current core stages

### Modules

Source:
- normalized stage `modules` -> group `modules-main` -> section `modules`.

Projection:
- `flow-layout.js` exposes one semantic section;
- current `moduleViewLayout()` hardcodes detail + list views over that section;
- static panes in `index.html` are rebound and ordered.

Verdict:
- semantic ownership is single-source;
- view topology is still duplicated between policy and hardcoded module layout helper/DOM;
- defer to CP-SD-03.

### Acabamentos

Source:
- normalized hierarchy owns `fronts`, `handles`, `stone-packages`, `stone-skirting` and item membership.

Projection:
- `mountStageGroups()` reorders/hides static DOM shells according to normalized flow;
- static shells already contain labels, component IDs and control hosts;
- component mismatch is fail-closed.

Verdict:
- absence works for known sections;
- addition of a new valid section fails because no shell exists;
- needs gradual replacement by component-created section shells.

### Serviços

Source:
- normalized hierarchy owns `lighting` and `additional-services`.

Projection:
- static section shells exist;
- `additional-services` content is dynamically generated, but by `stageItems("services")`, not by that section's exact `itemIds`;
- lighting is an entirely separate hardcoded control path.

Verdict:
- best family for the first real generic section renderer after navigation/shell groundwork;
- use exact normalized `section.itemIds`, not stage-wide membership.

### Resumo

Source:
- normalized flow has one action section.

Projection:
- static summary panel is validated against one component binding;
- summary content itself is generated dynamically.

Verdict:
- static stage root remains; content renderer is legitimate.

## Negative/fail-closed behavior already present

Current code already gives useful safety properties that should not be lost:

- `mountStageGroups()` hides static groups/sections not present in the normalized plan;
- missing expected group/section emits `missing-group-binding` / `missing-section-binding`;
- component mismatch emits `component-binding-mismatch`;
- keyboard tests prove DOM order and `data-keyboard-behavior` cannot override normalized flow;
- removing `data-flow-item-id` produces a navigation invariant error.

The migration should therefore replace **static binding surfaces**, not weaken these checks.

## Small-checkpoint sequence chosen from the audit

To keep the work reviewable, CP-SD-02 will not be one renderer rewrite.

### CP-SD-02A1 — stage navigation source cleanup

Smallest safe code checkpoint.

- remove the four hardcoded initial stage buttons from `index.html`;
- render navigation exclusively from normalized enabled stages;
- keep the scene pin control;
- preserve current stage labels/order/keyboard behavior;
- add a negative fixture proving an omitted stage produces no navigation item;
- no section renderer changes.

This removes a real duplicate semantic authority with minimal blast radius.

### CP-SD-02A2 — generic core stage/group/section shell host

- introduce a generic shell builder from `stageLayout()`;
- initially create semantic shell structure without replacing component content renderers;
- preserve current classes/geometry;
- keep component binding validation.

This is infrastructure only and should not include Modules companion.

### CP-SD-02A3 — first dynamic component family: service toggle-list

- render the Services toggle-list sections from normalized section data;
- section membership must use `section.itemIds`, not `stageItems("services")`;
- first migrate `additional-services`;
- migrate `lighting` only if the same state adapter is proven generic without weakening dependency behavior; otherwise split lighting into A4.

### Later 02A slices

- Acabamentos component families one at a time;
- summary stage shell;
- remove obsolete static semantic markup only after each generated path is browser-proven.

Modules companion, PiP and bottom dock remain CP-SD-03.

## A0 gate result

PASS.

The inventory is sufficient to begin A1 without another broad audit. The immediate next checkpoint is deliberately small:

> **CP-SD-02A1 — remove static stage navigation authority; normalized enabled stages become the only source of buyer stage navigation.**
