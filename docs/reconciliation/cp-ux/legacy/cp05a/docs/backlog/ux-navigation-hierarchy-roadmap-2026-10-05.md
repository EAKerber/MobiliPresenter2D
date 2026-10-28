# UX navigation and configurator hierarchy roadmap — 2026-10-05

Status: canonical plan for the buyer-navigation and configurator-structure work. CP-UX-00 through CP-UX-04 are complete; CP-UX-05 is the next checkpoint and crosses the authenticated production boundary.

This roadmap is independent from the authenticated `stone-skirting` published-administration migration. The existing production compatibility cleanup remains valid and must not be bypassed or mixed into this work.

## Why this track exists

New visual review exposed concrete user-facing friction that was not represented in the previous housekeeping backlog.

Observed problems:

- changing stages does not always establish a clear visual starting position at the top of the new stage;
- keyboard section navigation is inferred from rendered DOM structure instead of an explicit flow contract;
- in Services, `lighting-08` forms an explicit configurable section while other services are emitted into an unowned checklist;
- the Services heading can become part of the inferred keyboard section because generic `[tabindex]` discovery treats `tabindex="-1"` headings as interactive;
- Services currently mixes two visual card families for semantically similar global toggles (`.accessory-toggle` and `.service-check`);
- Puxadores/handles visually behaves like a section but the browser gate does not prove horizontal option cycling there;
- the active keyboard section is recorded in DOM state but has no explicit visual treatment;
- section scrolling uses `focus({preventScroll:true})` followed by `scrollIntoView({block:"nearest"})`, so a final section that technically fits in the viewport can remain visually stranded at the bottom instead of becoming the clear focal region;
- the current administration model is essentially `stage -> items[]`; it cannot express groups, sections, section order, group order, or presentation structure;
- current layout therefore embeds product structure in HTML/CSS/runtime code, which makes keyboard navigation infer semantics from presentation instead of consuming the same configuration contract.

These are product/UX findings, not speculative housekeeping.

## Architectural boundary

Keep the existing responsibilities separate.

### Catalog / data

Owns what exists:

- modules;
- services;
- finish options;
- handle options;
- stone packages;
- labels, descriptions and commercial metadata;
- dependencies that belong to the product domain.

The flow schema must reference catalog/configuration identifiers instead of copying option data.

### Scene

Owns how selectable product entities compose visually:

- assets;
- masks;
- z-order;
- geometry/alpha bounds;
- visibility/occlusion relations.

Navigation hierarchy must not become a second scene authority.

### Administration / flow configuration

Owns where and in what order configurable concepts appear in the buyer journey.

Target hierarchy:

```text
Stage
└── Group
    └── Section
        └── Item
            └── Option(s)
```

Definitions:

- **Stage** — journey step such as Modules, Acabamentos, Serviços or Resumo.
- **Group** — layout/composition region inside a stage. A group may occupy a responsive column/span and contains ordered sections.
- **Section** — the semantic keyboard/focus unit. Up/Down changes section.
- **Item** — one configurable concept, action, toggle or selector.
- **Option** — a choice owned by the referenced item/catalog source. Options are not duplicated into the flow tree.

The hierarchy describes presentation/order, not product truth.

### Buyer state

Owns current selections only. It must not need to know whether an item lives in column one, group two or section three.

### UI renderer and keyboard navigation

Consume the same explicit flow structure.

The keyboard controller must not discover product semantics from arbitrary DOM shape once the explicit flow contract is available.

## Navigation contract

The intended keyboard grammar is:

- `Ctrl + Left/Right`: previous/next stage;
- `Up/Down`: previous/next section;
- `Left/Right`: previous/next option/item inside the active section;
- `Space`: binary toggle;
- `Enter`: non-binary action when appropriate;
- module-number shortcuts remain owned by the Modules stage/global module-access contract.

For option grids, logical order is always DOM/data row-major order:

```text
0 -> 1 -> 2 -> 3 -> ...
```

A responsive change from one to two or three columns must not change the canonical navigation order. This keeps the interaction agnostic to column count.

## Scroll and focus contract

Stage and section navigation need deterministic visual anchoring rather than `nearest`.

Required behavior:

- entering a stage establishes the top of that stage as the visual starting context;
- entering the first section aligns the section near the top usable viewport boundary;
- entering an intermediate section positions it as a clear focal region, normally around the center of the usable viewport when practical;
- entering the last section must make the end of the section/stage visually intentional, even when the whole section technically already fits in the viewport;
- sections taller than the usable viewport align from their start rather than hiding their heading;
- sticky navigation/mobile scene clearance must be included in target geometry;
- `prefers-reduced-motion` disables animated movement without changing the final target;
- active-section styling and item focus styling are distinct states.

A polished/eased scroll may be added only after final positioning is correct.

## Checkpoint discipline

Each checkpoint should preferably be a complete, independently reviewable increment that can merge safely to `main`.

If a checkpoint cannot safely merge, it must remain on one development branch with:

- exact scope;
- current assumptions;
- reproducible tests/evidence;
- known blockers;
- explicit completion/abandonment gate;
- no unrelated half-finished work.

Before starting the next implementation checkpoint, update this roadmap and `CURRENT_STATE.md` with the result of the previous checkpoint.

## Checkpoint plan

### CP-UX-00 — persist the UX/hierarchy plan — COMPLETE

**Goal:** make the recovered discussion durable before touching runtime behavior.

Deliverables:

- this roadmap;
- canonical backlog/current-state links;
- explicit separation from the authenticated published-config migration;
- exact CP-UX-01 implementation plan.

Result: PASS. Documentation-only PR #79 merged to `main` at `7e728d0f15e445fbb8a1625e2757ad40495fc97d`; no runtime/product behavior changed.

### CP-UX-01 — explicit section navigation and immediate friction repair — COMPLETE

**Goal:** fix the observed navigation/visual-friction bugs without changing the published administration schema.

This is intentionally a product-safe compatibility checkpoint. It should improve current semantics while leaving `ConfiguratorAdministration2D 3.0`, pricing, scene assets and buyer selections unchanged.

Detailed implementation is defined below.

### CP-UX-02 — introduce an explicit internal flow model — COMPLETE

**Goal:** stop treating markup/DOM ownership as the semantic source of groups/sections while preserving the current published administration contract and the CP-UX-01 buyer experience.

This checkpoint is deliberately internal-first. It must create one normalized source of truth for stage/group/section/item structure without yet making that hierarchy administrable in production.

#### Scope

Expected files:

- new `app/core/flow-model.js` or equivalently narrow flow-normalization module;
- `app/core/keyboard-shortcuts.js`;
- `app/app.js` only where current rendering needs normalized stage/group/section metadata;
- `app/core/configuration.js` only for pure read/normalize helpers if unavoidable; do not change the published schema/version;
- focused unit tests for normalization/validation;
- `tests/keyboard-browser.cjs`;
- this roadmap and `CURRENT_STATE.md` at checkpoint close.

No intended changes:

- `ConfiguratorAdministration2D 3.0` wire/storage schema;
- production administration data;
- catalog/product/pricing records;
- scene assets/masks;
- buyer selection state shape;
- visible layout beyond differences required to preserve CP-UX-01 semantics.

#### 1. Define the normalized flow representation

Use one explicit in-memory model, conceptually:

```text
NormalizedFlow
└── stages[]
    ├── id
    ├── label
    ├── enabled
    └── groups[]
        ├── id
        ├── order
        ├── presentation metadata
        └── sections[]
            ├── id
            ├── behavior
            ├── order
            └── itemIds[]
```

Options remain owned by catalog/item data and are not copied into the flow tree.

The normalized model must be plain data, deterministic and serializable for tests, but it is not yet a persisted production schema.

#### 2. Derive current hierarchy deterministically

Build the normalized flow from:

- current v3 stage enable/order/item assignments;
- a small explicit compatibility map that describes the current known group/section composition.

The compatibility map is temporary and must be isolated in the flow-normalization layer, not scattered through renderer/keyboard code.

Minimum current mapping:

- Acabamentos:
  - group for cabinet/front finish:
    - fronts section -> `fronts-all`;
    - handles section -> `handles-all`;
  - group for stone:
    - stone packages -> `stone-all`;
    - skirting -> `stone-skirting`.
- Serviços:
  - lighting section -> `lighting-08`;
  - additional services section -> the remaining configured global service items in deterministic configured/catalog order.
- Módulos and Resumo may use simple one-group structures until CP-UX-04 gives them richer composition.

Unknown future configured items must fail closed or enter an explicitly named compatibility section according to one documented rule; do not silently infer semantic ownership from DOM structure.

#### 3. Validation contract

Normalization must return either a valid flow or structured validation errors.

Validate at least:

- unique stage ids;
- unique group ids inside a stage;
- unique section ids inside a stage/group scope;
- deterministic order;
- every item reference resolves to a known configurable item;
- no item is owned by multiple sections unless an explicit future duplication rule exists;
- enabled stage references remain valid;
- section behavior is from a closed vocabulary such as `selection | toggle | action`;
- empty sections are either rejected or removed by one documented rule;
- an unknown v3 item cannot disappear silently.

Unit tests must cover valid current production-like input plus malformed duplicates, missing references and unknown-item compatibility behavior.

#### 4. Keyboard consumes the normalized flow

Replace semantic discovery based on `[data-keyboard-section]` enumeration as the authority.

The DOM may retain `data-keyboard-section` as a renderer/focus hook, but:

- section order comes from the normalized model;
- section behavior comes from the normalized model;
- item membership comes from normalized item ids;
- keyboard resolves the corresponding rendered controls by stable item/option hooks;
- missing rendered controls for a modeled visible item produce a detectable invariant violation in test/development rather than changing semantic ownership.

Keep the CP-UX-01 grammar unchanged:
`Ctrl+Left/Right` stage, `Up/Down` section, `Left/Right` item/option, `Space/Enter` activation.

#### 5. Renderer bridge

Do not rewrite the entire page in CP-UX-02.

Add the smallest bridge needed so rendered sections declare their normalized section ids and item ids consistently.

The visual output should remain equivalent to CP-UX-01. Layout migration belongs to CP-UX-04.

#### 6. Compatibility and migration boundary

CP-UX-02 must read current v3 records without writing or upgrading them.

No authenticated admin access is required.

Do not introduce a v4 persisted schema in this checkpoint. That belongs to CP-UX-03 after the internal representation is proven.

The existing independent `stone-skirting` runtime compatibility migration remains untouched.

#### 7. Tests

Add unit tests for:

- deterministic normalized flow from current default/v3 settings;
- stage/group/section/item order;
- unknown configured item behavior;
- duplicates/missing item references;
- semantic equivalence across repeated normalization;
- no product/catalog data duplication in the flow result.

Extend browser coverage to prove:

- discovered/navigable section sequence equals normalized model sequence;
- Puxadores remains row-major;
- Services remains exactly lighting + additional-services under current data;
- DOM reorder alone cannot change semantic section order;
- a modeled item missing from DOM is surfaced as an invariant failure in the test harness;
- existing stage/focus/scroll behavior remains unchanged.

#### 8. Gates

Required before merge:

- new flow-model unit suite;
- current core/unit tests;
- Keyboard browser;
- Mobile/PiP browser;
- Stone browser;
- Summary/Pricing browser;
- App build purity;
- Current asset gates;
- Current variant fidelity.

#### 9. Acceptance criteria

- one explicit normalized flow model exists;
- current v3 production-like configuration deterministically produces it;
- keyboard semantics consume that model rather than deriving ownership/order from arbitrary DOM;
- the buyer-visible CP-UX-01 experience remains unchanged;
- no persisted schema or production configuration mutation;
- all required gates green on the exact reviewed head;
- roadmap and `CURRENT_STATE.md` updated before CP-UX-03 begins.

#### 10. Fail-closed rule

If a faithful normalized model cannot be derived from v3 without guessing product meaning, stop and document the unresolved mapping.

Do not solve that by silently changing the published schema or by moving CP-UX-03 work into this checkpoint.


#### CP-UX-02 implementation result

Implementation branch: `feat/cp-ux-02-flow-model`.

Implementation head proven before documentation closeout:

- `2bd8eaadbcd7d4ee52751c8fdba8f36388222547`.

Implemented:

- new immutable `NormalizedConfiguratorFlow 1.0` runtime model;
- deterministic v3 compatibility mapping for Modules, Acabamentos, Serviços, Resumo and custom stages;
- structured fail-closed validation for unknown/unsupported items, duplicate stage/group/section/item ownership and source-coverage loss;
- explicit proof that product/pricing/material/object data is not duplicated into the flow model;
- renderer bridge through stable section/item ids;
- keyboard section sequence, behavior and membership now come from normalized flow rather than DOM order or `data-keyboard-behavior`;
- invariant reporting when a modeled rendered item/section is missing or unexpectedly owned;
- browser proof that DOM reordering and DOM behavior hints cannot change semantic navigation;
- browser proof that a DOM-only Summary section cannot create keyboard semantics without flow ownership;
- Keyboard workflow path coverage expanded so future flow/app/index changes trigger the navigation gate.

First CI attempt exposed only a Node test-fixture issue: `scene-data.js` is browser-scoped and could not be imported directly. The test was corrected to load browser data through the repository's existing VM sandbox pattern; no runtime workaround was required.

Gate evidence on `2bd8eaadbcd7d4ee52751c8fdba8f36388222547`:

- flow-model unit suite via App build purity — PASS;
- App build purity — PASS;
- Current variant fidelity — PASS;
- Keyboard browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Mobile browser — PASS;
- Current asset gates — PASS;
- Netlify deploy preview — PASS.

No production administration write, schema migration, pricing change, catalog change, scene change or asset change occurred.

Merge result: PASS. PR #83 merged to `main` at `f6ffa6bcfb06b12a76170933cb952bce869fd28b` after final reviewed head `bcf99e66e66d9394047873a8b68766cb191b3c99` passed the full required gate set and Netlify deploy preview. CP-UX-03 may begin from live `main` after this documentation closeout merges.

### CP-UX-03 — administration schema/editor for groups and sections — COMPLETE

**Goal:** make the hierarchy explicitly editable in the admin while preserving the current production v3 record and preventing an accidental hierarchy publication before the authenticated migration checkpoint.

This checkpoint introduces a versioned hierarchy-capable administration representation and a real editor for it, but it must remain safe to merge before production is migrated.

#### Scope

Expected files:

- `app/core/configuration.js` for hierarchy-capable schema/migration/validation helpers;
- `app/core/flow-model.js` so normalized runtime flow can consume both current v3 and the new hierarchy representation;
- `app/admin/admin.js` and admin styles/markup as needed;
- focused admin/configuration unit tests;
- browser coverage for hierarchy editing and round-trip;
- `netlify/functions/configuration.mjs` only if needed to make the production write boundary explicitly fail closed;
- this roadmap and `CURRENT_STATE.md` at checkpoint close.

No intended changes:

- catalog/product records;
- pricing semantics;
- scene/assets/masks;
- buyer selection state;
- production published hierarchy;
- CP-UX-01 keyboard grammar or scroll behavior.

#### 1. Define the hierarchy-capable administration representation

Introduce `ConfiguratorAdministration2D 4.0` as a supported representation.

In v4, hierarchy must have one authority. Do not preserve a second flat `stage.items[]` source alongside nested hierarchy.

Conceptually:

```text
stages[]
└── {
    id,
    kind,
    label,
    enabled,
    groups[]
    └── {
        id,
        label,
        order,
        columnSpan,
        sections[]
        └── {
            id,
            label,
            order,
            presentation,
            itemIds[]
        }
    }
}
```

Rules:

- options/products remain catalog-owned and are referenced by item id;
- group/section labels and presentation belong to flow configuration;
- interaction behavior is derived/validated from item semantics rather than being an arbitrary admin toggle;
- ordering is array order in the wire representation; explicit `order` may exist only in normalized runtime data, not as a second conflicting wire authority;
- no raw CSS, HTML, coordinates or arbitrary class names.

Use a small closed presentation vocabulary sufficient for current/future renderer work, initially:

- group `columnSpan`: `1 | 2`;
- section `presentation`: `auto | swatches | cards | list | grid`.

The runtime may ignore presentation until CP-UX-04, but validation/editor round-trip must preserve it.

#### 2. Deterministic v3 -> v4 migration

Add one pure migration using the proven CP-UX-02 normalized flow as the structural source.

Current v3 must migrate deterministically to:

- Módulos:
  - one default group/section containing current module item ids;
- Acabamentos:
  - group `cabinet-finishes` containing sections `fronts` and `handles`;
  - group `stone` containing `stone-packages` and `stone-skirting`;
- Serviços:
  - one group containing `lighting` and `additional-services`;
- Resumo:
  - one default group/section;
- custom stages:
  - one deterministic default group/section until explicitly edited.

Migration must preserve every unrelated v3 field byte-for-semantic-byte after normalization: objects, assets, initial state, materials, material groups, handle products, finishes, dependencies, events and pricing.

Unknown/unsupported v3 structure must fail closed exactly as CP-UX-02 does; do not invent grouping.

#### 3. Legacy-equivalence projector

Add a pure `v4 -> v3` projector that succeeds only when the v4 hierarchy is semantically equivalent to the current legacy-compatible hierarchy.

Purpose:

- existing production admin operations unrelated to hierarchy must remain possible after support code merges;
- an admin model upgraded locally to v4 can be projected back to v3 for an ordinary production save if hierarchy was not changed;
- once group/section/item hierarchy differs from the deterministic legacy structure, projection returns a structured `hierarchy_requires_publication` result rather than flattening/lossily guessing.

Tests must prove:

- `v3 -> v4 -> v3` semantic identity for current/default records;
- unrelated content/pricing edits survive the round trip;
- group reorder, section move, item reorder/move, presentation change or new hierarchy node makes legacy projection explicitly non-equivalent when that information cannot exist in v3.

#### 4. Validation contract for v4

Validate at least:

- 2–12 stages and existing stage-kind/core-stage rules;
- unique stage ids;
- unique group ids within a stage;
- unique section ids within a stage;
- nonempty enabled stages;
- group/section counts under explicit conservative limits;
- `columnSpan` and `presentation` from closed vocabularies;
- every item reference exists and is allowed for that stage kind;
- item ownership is unique across the whole hierarchy;
- sections cannot mix incompatible interaction semantics;
- `stone-skirting` retains its dependency on `stone-all`;
- Modules and Summary retain their mandatory/core rules;
- no catalog option/business record is embedded into hierarchy.

Validation errors should identify stage/group/section/item paths so the admin can point to the actual invalid node.

#### 5. Admin editor structure

Replace the current stage-only flat item surface with a nested editor that visually mirrors the hierarchy:

```text
Etapa
  Grupo
    Seção
      Item
```

Minimum controls:

- reorder stages (existing behavior retained);
- add/remove/reorder groups within a stage;
- edit group label and validated `columnSpan`;
- add/remove/reorder sections within a group;
- edit section label and validated presentation;
- move/reorder items within a section;
- move items between compatible sections/groups/stages without duplicating them;
- add currently unassigned compatible catalog items;
- enable/disable stages under existing core rules.

Prefer explicit up/down/move controls as the accessibility baseline. Drag-and-drop may remain as an enhancement, never the only way to manipulate hierarchy.

The editor must make ancestry visually obvious; a section cannot look like an item and a group cannot look like a flat stage item list.

#### 6. Safe production boundary

CP-UX-03 must not silently publish v4 hierarchy to the current production record.

Preferred boundary:

- GET of the current published record remains compatible with stored v3;
- admin upgrades v3 to the hierarchy-capable editor model locally;
- when hierarchy remains legacy-equivalent, unrelated production saves may down-project safely to v3;
- when hierarchy changes, production save is blocked with an explicit `hierarchy publication required` state until CP-UX-05;
- deploy-preview/test contexts may exercise full v4 serialization/validation without mutating production.

If the existing endpoint cannot enforce that distinction cleanly, stop and keep the PR self-contained rather than weakening the write boundary.

#### 7. Admin round-trip/browser tests

Add focused tests that prove:

- current published-like v3 opens as the deterministic nested hierarchy;
- Acabamentos visibly contains two groups rather than a flat item list;
- Serviços exposes lighting/additional-services sections;
- Modules exposes a valid hierarchy instead of wasting a conceptual second group/column;
- group reorder persists in the in-memory v4 model;
- section reorder/move persists;
- item reorder and cross-section move persist when compatible;
- incompatible moves are rejected with local feedback;
- unassigned items can be placed without duplication;
- keyboard-accessible reorder controls work without drag/drop;
- save normalization preserves every unrelated field;
- production-mode hierarchy-changing save is fail-closed;
- legacy-equivalent unrelated edit can still project/save as v3.

Do not require real production credentials for repository CI.

#### 8. Runtime compatibility

Buyer runtime must continue accepting current stored v3.

The CP-UX-02 normalized flow becomes the single adapter:

- v3 -> compatibility-derived normalized flow;
- v4 -> directly normalized hierarchy.

CP-UX-03 does not yet require the buyer layout to honor group columns/presentation. That visible renderer migration remains CP-UX-04.

Keyboard semantics must remain model-owned and unchanged.

#### 9. Gates

Required before merge:

- new v3/v4 migration + projection unit suite;
- admin hierarchy model/editor unit/browser suite;
- current core/unit tests;
- Keyboard browser;
- Mobile/PiP browser;
- Stone browser;
- Summary/Pricing browser;
- App build purity;
- Current asset gates;
- Current variant fidelity;
- Netlify deploy preview.

Any production-write behavior test must use isolated mocks/deploy-preview storage, never the live production blob.

#### 10. Acceptance criteria

- one hierarchy-capable v4 representation is fully specified and validated;
- current v3 deterministically upgrades without information loss;
- unchanged hierarchy can safely project back to v3;
- changed hierarchy cannot be silently flattened back to v3;
- admin can actually inspect/reorder groups, sections and items;
- catalog/product data remains separate from flow configuration;
- buyer runtime remains compatible with current production v3;
- no production configuration is written;
- all required gates green on the exact reviewed head;
- roadmap and `CURRENT_STATE.md` updated before CP-UX-04 begins.

#### 11. Fail-closed rule

If safe coexistence of v3 production writes and v4 hierarchy drafts cannot be proven, do not merge a production-enabled v4 writer.

The acceptable checkpoint fallback is a fully tested/readable v4 core + admin editor behind a non-production/disabled publication gate, with the exact remaining publication boundary documented for CP-UX-05. Do not silently persist lossy flattened hierarchy.

### CP-UX-04 — hierarchy-driven buyer layout and Modules two-pane composition — COMPLETE

**Goal:** make the buyer-facing composition consume the normalized flow hierarchy for stage/group/section placement, while keeping the current production v3 record fully compatible and avoiding duplicate semantic ownership.

This checkpoint is a renderer/layout migration, not a schema-publication checkpoint.

A key distinction is deliberate:

- Stage -> Group -> Section -> Item remains the **configuration/semantic ownership hierarchy**;
- the same semantic item may have multiple **views** of its state without acquiring multiple hierarchy owners.

That matters for Modules: the selected-module detail and the module list are two views of the same module-selection domain, not two independent configurable owners. CP-UX-04 must therefore create a two-pane view without duplicating module item ownership in the flow model.

#### Scope

Expected files:

- one narrow buyer layout adapter such as `app/core/flow-layout.js`;
- `app/app.js` for mounting existing stage content into hierarchy-driven group/section shells;
- `app/index.html` only for stable renderer/view hooks;
- `app/styles.css`;
- `app/core/flow-model.js` only if small presentation metadata is required, without changing persisted v3/v4 hierarchy semantics;
- focused layout unit tests;
- a new browser screenshot/layout gate;
- existing Keyboard/Mobile/Stone/Summary gates;
- this roadmap and `CURRENT_STATE.md` at checkpoint close.

No intended changes:

- production administration data;
- v3/v4 publication boundary;
- catalog/product/pricing data;
- scene/masks/assets;
- buyer selection state shape;
- keyboard grammar;
- hierarchy ownership rules established in CP-UX-02/03.

#### 1. Introduce one buyer flow-layout adapter

Create one pure/narrow adapter that receives normalized flow and returns the ordered visual composition required for the current stage.

For ordinary stages it should expose:

- ordered groups from normalized flow;
- each group's span/presentation metadata;
- ordered sections;
- stable section ids used to locate or create rendered section shells.

The adapter must not inspect arbitrary DOM to infer hierarchy.

The DOM remains a render target.

#### 2. Reuse controls instead of rewriting product behavior

Do not rebuild finish, handle, stone or service controls in this checkpoint.

Use stable hooks to mount/reorder the existing working section elements into group containers generated from normalized flow.

Preferred model:

```text
normalized flow
      |
      v
flow-layout adapter
      |
      v
stage group shells
      |
      +--> existing section/control DOM
```

The controls keep their current event/state/pricing logic; only composition ownership changes.

If a modeled section has no renderer hook or a renderer hook appears under the wrong modeled stage, surface a deterministic invariant failure in tests/development rather than silently falling back to source DOM order.

#### 3. Acabamentos becomes hierarchy-driven

Desktop should express the already-modeled two-group structure explicitly:

- `cabinet-finishes`
  - Cor das frentes
  - Puxadores
- `stone`
  - Pacote de pedra
  - Rodapé de pedra

Group order and span come from normalized flow rather than the hard-coded two-column page structure.

The current visual result may remain close to the existing desktop design; the important change is authority.

Responsive rule:

- wide viewport: group grid honors current span/available columns;
- narrow viewport: groups collapse to one column in semantic order;
- section keyboard order remains normalized-flow order, independent of visual columns.

#### 4. Serviços becomes hierarchy-driven

Mount the current `lighting` and `additional-services` sections through the same group/section layout adapter.

Do not introduce another Services-specific layout algorithm.

This proves the adapter is not merely an Acabamentos special case.

#### 5. Modules uses one semantic owner and two view panes

Keep the normalized Modules semantic hierarchy single-owned.

Render two desktop panes from that same state:

- **detail pane** — selected-module visual/details/context;
- **list pane** — ordered module list and selection controls.

These are presentation panes, not new configurable groups or duplicate item owners.

Use explicit view-level hooks such as `data-stage-pane="detail"` and `data-stage-pane="list"` or an equally narrow renderer contract.

Rules:

- selecting from either scene/list updates the same existing selected-module state;
- hidden/included state remains the same authority;
- detail pane follows selection;
- no module id appears twice in semantic flow ownership;
- desktop uses both available regions intentionally instead of leaving a conceptual empty column;
- mobile collapses to one column with a deliberate order, preferably detail then list unless browser review shows list-first is materially better.

Do not add persisted schema fields solely to encode these two views. A second real product case is required before promoting view-pane composition into the administration schema.

#### 6. Group grid geometry

Introduce one responsive group grid.

Preferred properties:

- 2-column desktop baseline for current composition width;
- `columnSpan: 1` occupies one column;
- `columnSpan: 2` spans full row;
- auto-collapse at a content-driven breakpoint rather than assuming exactly one device width;
- consistent inter-group vertical/horizontal gap;
- section scroll targets remain correct after remounting;
- sticky flow nav offsets from CP-UX-01 remain authoritative.

Do not encode absolute coordinates in flow/admin data.

#### 7. Section and focus preservation during remount

Hierarchy-driven mounting must not reset buyer state or keyboard cursor.

Prove:

- existing selected finish/handle/stone/service remains selected after layout render;
- changing stage and returning does not duplicate controls;
- section ids remain stable;
- `data-keyboard-active-section` remains attached to the correct semantic section;
- focus remains or is deterministically restored when layout rerenders;
- moving from desktop to narrow viewport changes layout only, not semantic navigation order.

#### 8. Layout/browser gate

Add a dedicated browser gate with screenshots at minimum:

Desktop:
- Modules: detail pane + list pane both occupy the stage composition;
- Acabamentos: two explicit group regions in normalized order;
- Serviços: hierarchy group/section shells are present;
- no orphan/duplicate controls;
- no horizontal overflow.

Narrow/mobile:
- all groups/panes collapse cleanly;
- no control is lost;
- semantic order remains deterministic;
- sticky navigation and section scroll targets remain valid.

Assertions should compare semantic ids/geometry, not fragile pixel-perfect CSS values.

Save review screenshots as artifacts.

#### 9. Existing regression gates

Required before merge:

- flow-layout unit suite;
- buyer layout browser/screenshot gate;
- Keyboard browser;
- Mobile/PiP browser;
- Stone browser;
- Summary/Pricing browser;
- App build purity;
- Current asset gates;
- Current variant fidelity;
- Admin hierarchy browser;
- Netlify deploy preview.

Reason: CP-UX-04 changes buyer composition authority while intentionally leaving all product semantics untouched.

#### 10. Acceptance criteria

- Acabamentos and Serviços visual group/section placement is driven by normalized flow;
- existing controls/state logic are reused rather than duplicated;
- Modules intentionally uses two desktop view panes without duplicate flow ownership;
- responsive layout does not change semantic section/item order;
- no production v4 hierarchy publication occurs;
- current production v3 still renders through the normalized-flow adapter;
- all required gates green on the exact reviewed head;
- screenshot artifacts make desktop/mobile composition reviewable;
- roadmap and `CURRENT_STATE.md` updated before CP-UX-05 begins.

#### 11. Fail-closed rule

If hierarchy-driven remounting requires duplicating item ownership or adding product meaning to CSS/DOM discovery, stop.

Do not solve the Modules two-pane requirement by assigning the same module ids to two semantic sections/groups.

If a generic view-pane schema would materially complicate CP-UX-04, keep Modules panes as a narrow renderer projection of one semantic module group and record the abstraction opportunity. Promote it only after another real furniture/stage case demonstrates the same need.

#### CP-UX-04 implementation result

Implementation branch: `feat/cp-ux-04-hierarchy-layout`.

Functional head proven before documentation closeout:

- `2f7480ed045bb611170e50c264a09c14033ff94f`.

Implemented:

- pure `flow-layout` adapter that projects normalized flow into ordered buyer group/section layout without using DOM order as semantic authority;
- Acabamentos now mounts `cabinet-finishes` and `stone` from normalized group order/span;
- Serviços uses the same group/section mounting contract rather than a stage-specific layout algorithm;
- existing controls/state/pricing code is reused; layout remounting does not clone product controls;
- Modules uses two view panes — selected-module detail and module list — over one semantic module section, so module ids remain single-owned;
- responsive group grid collapses by content/container width while semantic order remains unchanged;
- section renderer invariants are surfaced through the debug/test contract instead of silently falling back to arbitrary DOM order;
- the keyboard stage root resolves from the active flow step's `aria-controls`, so wrapper/layout changes do not orphan navigation;
- stage/section scrolling now targets the actual scrollable `.controls` container rather than assuming `window` is the scroller;
- stage entry and first/middle/last section positioning preserve sticky-nav clearance and reduced-motion behavior inside that real scroller;
- mouse/pointer/focus interaction synchronizes active-section state, so Puxadores is visibly the active section when a handle is clicked/focused rather than only after keyboard section traversal;
- Frentes, Puxadores, Pacote de pedra, Rodapé de pedra and Serviços use one `config-section` shell instead of mixing fieldset/legend geometry with service shells;
- Puxadores switches to a one-column card grid when its finish group is too narrow for readable two-column cards, without changing canonical item order;
- the admin hierarchy item for Puxadores now exposes Tango/Íris, Ponto, Alça em cores and Definir depois as option inventory, while `handles-all` remains the single hierarchy owner;
- the same option-inventory pattern is exposed for Cor das frentes and Pacote de pedra, preserving the separation between hierarchy items and their catalog/material options.

Buyer feedback caught three issues that the initial structural gate did not fully represent:

1. section scroll appeared absent because the implementation scrolled `window` while desktop interaction scrolls `.controls`;
2. Puxadores could be interacted with without becoming the visibly active section;
3. native `fieldset/legend` geometry made Acabamentos active-section framing visibly worse than Serviços.

All three were repaired and converted into regression assertions.

Manual screenshot review of the final functional head confirmed:

- desktop Acabamentos keeps the two normalized groups side-by-side while handle cards remain readable;
- narrow/mobile Acabamentos collapses groups in semantic order;
- Services retains the preferred section-shell geometry;
- Modules detail/list panes occupy distinct desktop regions and collapse intentionally on mobile;
- no duplicate buyer controls are created;
- the admin hierarchy visibly lists concrete Puxadores options beneath the semantic `handles-all` item.

Gate evidence on `2f7480ed045bb611170e50c264a09c14033ff94f`:

- flow-layout unit suite — PASS;
- Flow layout browser + screenshot artifacts — PASS;
- Keyboard browser, including real-scroller alignment, active Puxadores and section-shell parity — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Admin hierarchy browser, including option-inventory assertions — PASS;
- App build purity — PASS;
- Current asset gates — PASS;
- Current variant fidelity — PASS;
- Netlify deploy preview — PASS.

No production hierarchy/configuration, catalog, pricing, scene, mask or buyer-state data was written.

Merge result: PASS. PR #87 merged to `main` at `e11a5c7c377246f1343b79ff04c1f94b587e1c7f` after final reviewed head `b9f9565360f91cbd228481f4bdc150382d8c4d9d` passed the required CP-UX-04 gates and Netlify deploy preview. CP-UX-05 repository preparation may begin from live `main`; production publication still requires the authenticated boundary.

### CP-UX-04.1 — buyer review follow-up for Puxadores and finish breakpoint — COMPLETE

**Origin:** direct production review after CP-UX-04 merge showed two residual buyer-facing issues:

- selecting a handle did not reliably leave `Puxadores` visibly active as the current section after its buttons were redrawn;
- the two-column Acabamentos composition appeared only at unnecessarily wide horizontal space.

This checkpoint is intentionally narrow and remains inside the CP-UX-04 buyer-layout boundary.

Implementation branch: `fix/cp-ux-04-1-buyer-review`.

Functional head proven before documentation closeout:

- `a9cb29871058704f615f08d154eb0aa3af7c2c07`.

Implemented:

- added a small keyboard/navigation API to reactivate a modeled section and retain its item cursor without requiring DOM focus;
- handle selection now redraws controls, then synchronously reactivates the `handles` section against the newly rendered controls;
- no forced post-redraw focus is used, avoiding a new focus-stealing behavior while preserving keyboard continuation;
- reduced the flow-stage collapse threshold from 520 px to 300 px so the two finish groups can remain side-by-side at medium desktop/tablet widths;
- added an explicit `max-width: 700px` mobile override so small screens remain single-column regardless of the lower container threshold;
- strengthened Keyboard browser coverage so `Puxadores` must remain the active semantic/visual section after a handle redraw;
- strengthened Flow layout browser coverage so Acabamentos must remain two-column at a 1050 px viewport while still collapsing to one column at mobile width.

Visual review of the final functional artifact confirmed:

- at 1366 px, `cabinet-finishes` and `stone` remain side-by-side;
- Frentes and Puxadores retain readable card widths inside the left group;
- mobile Acabamentos remains one-column in semantic order;
- section shells remain visually consistent with the CP-UX-04 result.

Gate evidence on `a9cb29871058704f615f08d154eb0aa3af7c2c07`:

- Keyboard browser — PASS;
- Flow layout browser/screenshots — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- App build purity — PASS;
- Current asset gates — PASS;
- Current variant fidelity — PASS;
- Netlify deploy preview — PASS.

Intentionally unchanged:

- administration schema/publication;
- hierarchy ownership;
- catalog/pricing/scene/assets;
- buyer state schema;
- CP-UX-05 authenticated migration plan.

Merge result: PASS. PR #90 merged to `main` at `a7294f8dd4f8209de1e39ccdcdc0902cb84beab0` after final reviewed head `490ebda8ab56fa7c31411f1b5a6761a114d37cce` passed the applicable gate set and Netlify deploy preview. CP-UX-05 remains the next checkpoint.

### CP-UX-05 — authenticated hierarchy publication and legacy-boundary retirement — NEXT

**Goal:** make the explicit hierarchy the production administration authority without combining unrelated migrations, then simplify the runtime so legacy v3 is an import/migration boundary rather than the normal production source.

This checkpoint crosses an authenticated production write boundary. Repository work may prepare and prove the migration path, but the actual production transition must happen only in an authenticated admin browser session after a fresh production read.

CP-UX-05 is intentionally split into two independently stoppable sub-checkpoints so no half-migrated state is left behind.

#### CP-UX-05A-prep — server-safe hierarchy publication preparation — NEXT

**Goal:** make the server capable of validating and proving a candidate v4 migration without enabling a production v4 write.

This is a repository-only checkpoint and must be safe to merge independently.

Scope:

- one shared/server-safe publication-preparation module;
- deterministic canonical digest of the current v3 source and deterministic v3 -> v4 candidate;
- server-side v4 validation using the same hierarchy rules already proven in the admin/core;
- explicit semantic-equivalence proof between the immediately supplied v3 source and its deterministic v4 upgrade;
- structured validation/plan result suitable for a later authenticated admin action;
- existing `PUT /api/configuration` continues to reject v4 with `hierarchy_publication_required`;
- no production blob write, migration, schema switch or `stone-skirting` mutation.

Required preparation result:

```text
current v3 source
      |
      +--> canonical source digest
      |
      v
deterministic upgradeToHierarchy
      |
      +--> v4 closed-schema validation
      +--> non-hierarchy equivalence proof
      +--> candidate digest
      |
      v
publication plan (read-only)
```

Fail closed when:

- source is not supported v3;
- candidate is not v4;
- revision/content source does not match the plan input;
- v4 validation fails;
- any non-hierarchy semantic field differs;
- hierarchy candidate is not the deterministic migration of that exact source;
- payload size/schema is unsupported.

##### CP-UX-05A-prep implementation checkpoints

1. **Pure publication planner**
   - canonical/stable serialization;
   - SHA-256 digests;
   - deterministic candidate creation from the supplied v3 source;
   - explicit allowed/forbidden difference model;
   - structured `ok/code/errors` result.

2. **Server validation integration**
   - import the proven hierarchy core into the Netlify function/server layer;
   - validate v4 before returning the publication-disabled response;
   - preserve the current revision guard and admin authentication;
   - never write v4 in this checkpoint.

3. **Read-only preparation endpoint**
   - expose an authenticated, no-write way to ask the server for the migration plan for the currently published source;
   - response includes source schema/revision/digest, candidate schema/digest and validation/equivalence status;
   - do not expose secrets or credentials;
   - do not allow the client to substitute a different source for the server-read current record.

4. **Tests**
   - deterministic digest independent of object key insertion order;
   - current v3 -> deterministic v4 plan PASS;
   - non-hierarchy mutation FAIL;
   - invalid hierarchy FAIL;
   - stale/mismatched source FAIL;
   - direct v4 production PUT remains blocked;
   - validation/preparation path performs zero store writes.

5. **Checkpoint closeout**
   - full current regression gates;
   - Netlify deploy preview;
   - update roadmap and `CURRENT_STATE.md`;
   - merge only if the repository remains production-safe with v4 publication disabled.

#### CP-UX-05A-exec — authenticated v3 -> v4 publication — BLOCKED UNTIL PREP MERGES + AUTHENTICATED SESSION

**Goal:** execute exactly one guarded production schema transition using the preparation machinery proven in CP-UX-05A-prep.

##### 1. Re-read production immediately before migration

In the authenticated admin session:

- GET the current published administration;
- capture schema version, revision and the server-computed semantic digest;
- require the source to match the schema/revision/digest used to generate the publication plan;
- abort if any unexpected production change occurred.

Do not use a stale repository fixture as migration authority.

##### 2. Keep `stone-skirting` migration separate

The independent housekeeping compatibility migration remains separate by default.

If the current production v3 does not contain `stone-skirting`, CP-UX-05A-exec must migrate exactly that current item set into v4; it must not opportunistically add `stone-skirting`.

Only combine those operations if a new explicit plan demonstrates that one combined transaction is safer and easier to validate than two isolated transactions.

##### 3. Enable an explicit authenticated publication action

Do not make every ordinary Save silently migrate production.

Provide a deliberate action such as **Publicar hierarquia** only after CP-UX-05A-prep is merged and revalidated. It is available only when:

- the server-read source is current v3;
- the v4 candidate validates server-side;
- source revision/digest still matches the fresh production read;
- unrelated semantic differences are zero.

The action must make the schema transition obvious to the administrator.

##### 4. Production write transaction

With the fresh authenticated source:

1. send the server-prepared/validated v4 candidate with expected current revision and source digest;
2. require server rejection on stale revision or digest;
3. write exactly once;
4. read the published record back immediately with no cache;
5. require schema v4 and the expected new revision;
6. compare readback semantically to the exact candidate;
7. compare all non-hierarchy fields to the pre-migration source;
8. persist before/after digests and evidence without credentials/secrets.

If readback/equivalence fails, stop. Do not continue to cleanup.

##### 5. Production smoke after publication

Against the real published v4 record, run:

- buyer load with zero flow-layout invariant errors;
- Modules detail/list selection;
- Acabamentos group/section order;
- Puxadores selection and active-section state;
- Services;
- Stone;
- Summary/Pricing;
- mobile/narrow layout;
- admin readback/edit-open;
- read-only hierarchy inspection proving group/section/item ownership.

##### 6. CP-UX-05A completion criterion

CP-UX-05A-exec is complete only when production is durably v4, semantic preservation is proven and production smokes pass.

If authenticated access is unavailable, this checkpoint remains BLOCKED; do not simulate success with deploy-preview/local storage.

#### CP-UX-05B — retire legacy as a normal runtime authority

Start only after CP-UX-05A production proof is complete.

##### 1. Normalize at the load boundary

Change the normal production pipeline so the application/admin operate on v4 after configuration load.

Legacy v3 support may remain only as an explicit migration/import adapter for:

- older exports/snapshots;
- recovery fixtures;
- regression tests.

Do not keep two normal runtime authorities.

##### 2. Remove obsolete production fallback

Remove or isolate code whose only purpose was to derive production group/section semantics repeatedly from a v3 flat stage at runtime.

Keep deterministic v3 -> v4 migration tests as backward-compatibility evidence.

Do not remove migration support merely to reduce code size.

##### 3. Revisit compatibility metadata

If production is v4 and no normal save path down-projects to v3, remove compatibility metadata from ordinary v4 runtime/admin state unless another supported round-trip genuinely requires it.

If retained for import/export, document exactly why and keep it non-authoritative.

##### 4. Keep renderer invariants

Do not reintroduce DOM-derived semantics during cleanup.

Normalized hierarchy remains authority for:

- group order/span;
- section order/presentation;
- item ownership;
- keyboard section semantics.

Modules detail/list remains a view projection over one semantic owner unless another real use case justifies a generic pane schema.

##### 5. Gates before CP-UX-05B merge

Required:

- v4 configuration/validation unit suite;
- legacy v3 migration/import suite;
- hierarchy admin browser;
- flow-layout browser/screenshots;
- Keyboard browser;
- Mobile browser;
- Stone browser;
- Summary/Pricing browser;
- App build purity;
- Current asset gates;
- Current variant fidelity;
- Netlify deploy preview;
- production read-only smoke against the already-migrated v4 record.

##### 6. Fail-closed rule

Do not merge legacy-retirement cleanup while production is still v3.

Do not delete v3 migration capability until supported old snapshots/exports have an explicit replacement path.

Do not combine CP-UX-05B with product/catalog/pricing/scene changes.

#### CP-UX-05 final acceptance criteria

- production administration is v4 and was migrated from an immediately re-read authenticated source;
- non-hierarchy semantics are proven unchanged;
- production buyer/admin smokes pass;
- runtime/admin use one explicit hierarchy authority in normal operation;
- v3 survives only as a clearly named migration/import compatibility boundary where still required;
- no unrelated `stone-skirting` or product migration was smuggled into the transaction;
- migration and cleanup each leave a self-contained recoverable checkpoint;
- roadmap and `CURRENT_STATE.md` record the exact production revision/digests and repository merge SHAs.

## CP-UX-01 detailed implementation plan

### Scope

Files expected to change:

- `app/index.html`;
- `app/app.js` only where stage activation/section markup ownership requires it;
- `app/core/keyboard-shortcuts.js`;
- `app/styles.css`;
- `tests/keyboard-browser.cjs`;
- optionally one focused browser test if scroll assertions become clearer outside the existing keyboard gate;
- this roadmap and `CURRENT_STATE.md` after implementation result.

No intended changes:

- `app/core/configuration.js` schema/version;
- production administration data;
- catalog records;
- pricing data or calculation;
- scene/mask/stone assets;
- visual composition pixels;
- service selection semantics.

### 1. Make sections explicit in markup/runtime

Add an explicit section marker owned by navigation, for example `data-keyboard-section` or an equivalently narrow contract.

Do not overload `data-configurable-item` to mean both “configuration item” and “navigation section”.

Minimum explicit sections in current flow:

Acabamentos:

- front finish section;
- handles section;
- stone package section;
- stone skirting section where it remains independently navigable.

Serviços:

- lighting section;
- additional/global services section containing the service cards generated into `servicesChecklist`.

The stage heading is not a section item.

### 2. Remove accidental heading/action discovery

The generic interactive selector must not treat `tabindex="-1"` headings as actionable items.

Preferred rule:

- native actionable controls;
- explicit roles that represent actions/selections;
- non-negative explicit tabindex only when genuinely intended as an action;
- no negative-tabindex heading or programmatic-focus anchor in section item discovery.

Add a regression assertion proving `servicesHeading` can receive stage focus but never appears as a section item.

### 3. Make Services hierarchy visible

Use a shared section shell/presentation contract.

The two semantic sections should be visually recognizable as peers:

- each has a clear section region;
- section heading/description is distinct from item card content;
- active-section state highlights the section shell, not the stage heading.

Unify service toggle card structure.

Preferred implementation:

- one base service/toggle card component/class;
- dependency/blocked/included states expressed as modifiers;
- same checkbox dimensions/alignment for lighting, “Mover pedra” and “Vidro temperado 8 mm”;
- keep domain-specific copy and disabled rules.

Avoid a redesign of typography/colors beyond what is necessary to make hierarchy and states coherent.

### 4. Prove Puxadores as a real section

Ensure the handles fieldset/section exposes all handle option buttons as the ordered items of one selection section.

Horizontal behavior:

- `Right` advances to the next handle in canonical DOM/data order;
- after the final item, wrap to the first only if current section navigation retains wrap semantics;
- `Left` is the inverse;
- changing CSS grid column count must not change option order.

The test should explicitly cover the existing multi-column grid and verify more than one transition, including a row boundary.

### 5. Separate active-section state from item focus

The existing `data-keyboard-active-section="true"` state can remain if it is made part of the explicit contract.

Add CSS that makes the active section unambiguous but subordinate to item focus:

- subtle border/accent/background on section shell;
- focused item retains standard `:focus-visible` treatment;
- selected option retains selection styling;
- no title/heading should look like an option selection.

Do not make keyboard-only state permanently alter mouse-only presentation after focus leaves the configurator; clear or update state intentionally.

### 6. Deterministic stage/section scrolling

Replace section `scrollIntoView({block:"nearest"})` with one helper that computes the desired alignment.

Suggested behavior:

- first section: `start`;
- last section: `end`;
- middle section: `center`;
- oversized section: `start`.

The helper must account for usable viewport clearance caused by sticky flow navigation/mobile UI.

Implementation may use measured `getBoundingClientRect()` + `window.scrollBy/scrollTo` if native `scrollIntoView` cannot respect both sticky offsets and deterministic final alignment.

Stage change must reset visual context to the active stage heading/top, not preserve an arbitrary prior vertical position.

Respect `prefers-reduced-motion`.

### 7. Cursor/state rules

When changing stage:

- do not inherit another stage's active section;
- restore that stage's remembered section only if we intentionally keep per-stage memory and the stage is revisited through section navigation;
- direct stage activation should still establish a clear stage-top context before section traversal.

Within a section:

- retain selected/current option preference where meaningful;
- redraws must not orphan the stored cursor;
- if an item becomes disabled/hidden, choose the nearest valid item deterministically.

### 8. Browser regression coverage

Extend `tests/keyboard-browser.cjs` with explicit assertions for:

- stage switch places the target stage in the intended top context;
- Services exposes exactly the intended navigation sections;
- `servicesHeading` is never a section item;
- lighting and additional services use coherent keyboard ownership;
- active section marker moves with Up/Down;
- Puxadores is discoverable as a selection section;
- Right/Left changes handle selection;
- row-major handle traversal crosses the visual row boundary correctly;
- last section navigation causes the expected end/focal scroll movement even when it was already fully visible;
- reduced-motion path reaches the same final geometry without animated behavior;
- no browser console errors.

Keep existing assertions for finishes, stone, skirting, services, Ctrl stage navigation and multi-digit module access.

### 9. Gates

Minimum before merge:

- unit/core tests;
- Keyboard browser;
- Mobile/PiP browser;
- Stone browser;
- Summary/Pricing browser;
- App build purity;
- Current asset gates;
- Current variant fidelity.

Reason: CP-UX-01 should not change product data, pixels, pricing or scene behavior, so the broad gate set proves the navigation/UI repair did not leak into those domains.

### 10. CP-UX-01 acceptance criteria

- changing stage always establishes a predictable visual start;
- keyboard sections are explicit for the current built-in stages;
- no heading becomes an accidental section item;
- Services shows intentional section hierarchy;
- all service toggles share one coherent card/check control system;
- Puxadores cycles horizontally in deterministic row-major order;
- active section is visually clear and distinct from focused/selected item;
- final-section navigation scrolls to an intentional final viewport composition;
- no published configuration/schema migration;
- no pricing, state, scene or asset semantic change;
- all required gates green on the exact reviewed PR head;
- roadmap and `CURRENT_STATE.md` updated with result before beginning CP-UX-02.

### 11. Fail-closed / branch rule

If CP-UX-01 reveals that a safe fix requires changing the published administration schema, stop before that schema change.

Keep the development branch with:

- explicit failing case;
- screenshots or browser-test evidence;
- exact code state;
- updated roadmap explaining why CP-UX-01 cannot merge.

Do not quietly expand CP-UX-01 into CP-UX-02.


## CP-UX-01 implementation result

Implementation branch: `feat/cp-ux-01-navigation-friction`.

Implementation head proven by the full gate fan-out:

- `f524a3f43f851f1eabe6d0d4cfcb53b60f115197`.

Implemented:

- explicit semantic section ownership for fronts, handles, stone packages, stone skirting, lighting and additional services;
- keyboard discovery no longer treats negative-tabindex stage headings as actionable items;
- Services is visibly split into peer sections and lighting uses the same service-card/check contract as the other global services;
- Puxadores is a first-class selection section with row-major horizontal traversal independent of CSS column count;
- active section state has its own visual shell treatment, distinct from item focus/selection;
- stage changes reset section navigation and establish a deterministic top context;
- section changes use deterministic start/center/end geometry rather than `block: nearest`;
- final-section positioning and `prefers-reduced-motion` behavior are browser-tested.

Gate evidence on the implementation head:

- App build purity — PASS;
- Current variant fidelity — PASS;
- Summary pricing browser — PASS;
- Stone browser — PASS;
- Mobile browser — PASS;
- Keyboard browser — PASS;
- Current asset gates — PASS;
- Netlify deploy preview — PASS.

The first PR fan-out on `3846eeba4f8256461cf841ad13864ebd99c4dd6f` intentionally exposed a pre-existing cache-revision contract: temporary CP-UX cache query tokens caused core/runtime-contract tests to fail. The fix was to preserve the shared `runtime-v8` and existing keyboard script revision tokens because CP-UX-01 does not require a cache-contract migration. No product/runtime workaround was added.

Keyboard artifact result confirms the normalized current section surface for this checkpoint:

- Acabamentos: `fronts`, `handles`, `stone-packages`, `stone-skirting`;
- Serviços: `lighting`, `additional-services`;
- handles expose four ordered options and additional services expose `move-stone` and `tempered-glass`.

Merge result: PASS. PR #81 merged to `main` at `91973ebc056be58b62440ed48ad6f473bb9f26b9` after the final exact head `ede50780b3f48ea62fd078a34a9610018ccc24b1` passed the full required gate set and Netlify deploy preview. CP-UX-02 may begin from live `main` after this closeout is merged.

## Relationship to existing P1 work

The authenticated `stone-skirting` publication remains an independent P1 architecture cleanup.

When authenticated admin access is available, it can proceed according to the existing housekeeping roadmap.

When it is not available, CP-UX-01 is now a valid independent repository checkpoint because it is supported by new buyer-visible evidence and does not require crossing the admin write boundary.

## Resume rule

On any future continuation:

1. read `CURRENT_STATE.md`;
2. read this roadmap;
3. read the existing housekeeping roadmap for the independent published-config track;
4. inspect live `main`;
5. continue only the next incomplete checkpoint;
6. update both durable state documents after each implementation checkpoint before starting another.
