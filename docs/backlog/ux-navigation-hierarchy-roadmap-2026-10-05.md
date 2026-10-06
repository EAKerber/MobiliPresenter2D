# UX navigation and configurator hierarchy roadmap — 2026-10-05

Status: canonical plan for the buyer-navigation and configurator-structure work. CP-UX-00 and CP-UX-01 are complete; CP-UX-02 is the next implementation checkpoint.

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

### CP-UX-02 — introduce an explicit internal flow model — NEXT

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

### CP-UX-03 — administration schema/editor for groups and sections

**Goal:** make the hierarchy administrable rather than hard-coded.

Preferred direction:

- introduce a versioned administration representation that can encode ordered stage groups and sections;
- migrate legacy v3 `stage.items[]` into a deterministic default hierarchy;
- retain read compatibility with the currently published v3 record until an authenticated migration is performed;
- admin editor can:
  - reorder groups;
  - reorder sections within groups;
  - move items between sections;
  - reorder items;
  - enable/disable allowed nodes;
  - choose from a small validated presentation vocabulary when needed;
- catalog remains the authority for actual option records and business data.

Do not expose raw CSS, coordinates or arbitrary HTML in admin configuration.

Exit criteria:

- migration is deterministic and covered by unit tests;
- admin round-trip preserves all unrelated administration data;
- no production write is required to merge support code;
- buyer runtime remains compatible with the existing published v3 record.

### CP-UX-04 — hierarchy-driven layout and Modules two-region composition

**Goal:** make the buyer UI layout consume groups/sections rather than fixed page-specific markup.

Plan:

- render stage groups through a responsive group grid;
- permit Acabamentos to express the current cabinet-finish and stone regions explicitly;
- give Modules a deliberate two-region desktop composition:
  - contextual selected-module detail;
  - module list;
- collapse naturally on narrower layouts;
- retain row-major section/item navigation independent of visual column count;
- keep summary semantics and pricing unchanged.

This is a visible layout checkpoint and therefore requires screenshot/browser review in addition to functional gates.

### CP-UX-05 — authenticated hierarchy publication and legacy retirement

**Goal:** publish the explicit hierarchy only after its runtime/admin support is proven.

Precondition: authenticated admin session and an immediately re-read current production administration.

Procedure:

1. fail closed if production revision/content differs from expected migration input;
2. publish the new hierarchy with no unrelated semantic changes;
3. read back and prove exact semantic preservation outside hierarchy;
4. run production navigation, Stone, Keyboard, Mobile and Summary/Pricing smokes;
5. only then retire legacy flow derivation / DOM-semantic fallback in a dedicated repository PR.

This checkpoint must remain separate from the one-time `stone-skirting` compatibility migration unless a later explicit plan proves combining them is safer. Default rule: do not combine them.

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
