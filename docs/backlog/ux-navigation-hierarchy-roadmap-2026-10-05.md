# UX navigation and configurator hierarchy roadmap — 2026-10-05

Status: canonical plan for the newly evidenced buyer-navigation and configurator-structure work.

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

### CP-UX-00 — persist the UX/hierarchy plan — CURRENT

**Goal:** make the recovered discussion durable before touching runtime behavior.

Deliverables:

- this roadmap;
- canonical backlog/current-state links;
- explicit separation from the authenticated published-config migration;
- exact CP-UX-01 implementation plan.

Promotion: documentation-only PR, safe to merge if the diff contains no runtime/product changes.

### CP-UX-01 — explicit section navigation and immediate friction repair — NEXT IMPLEMENTATION CHECKPOINT

**Goal:** fix the observed navigation/visual-friction bugs without changing the published administration schema.

This is intentionally a product-safe compatibility checkpoint. It should improve current semantics while leaving `ConfiguratorAdministration2D 3.0`, pricing, scene assets and buyer selections unchanged.

Detailed implementation is defined below.

### CP-UX-02 — introduce an explicit internal flow model

**Goal:** stop treating DOM structure as the semantic source of groups/sections while preserving current published administration compatibility.

Plan:

1. Introduce one internal normalized flow representation:
   - stage;
   - group;
   - section;
   - item references;
   - section interaction/presentation metadata.
2. Derive the normalized model from current v3 administration plus current known layout contracts.
3. Make keyboard/navigation consume this normalized model instead of scanning arbitrary visible DOM for semantic ownership.
4. Keep rendering output equivalent to CP-UX-01.
5. Add model validation:
   - unique group/section ids within appropriate scopes;
   - item references must exist;
   - one item cannot appear in contradictory ownership positions;
   - section order and item order are deterministic.
6. Do not publish a new administration schema yet.

Exit criteria:

- same buyer-visible structure as CP-UX-01;
- keyboard browser proves navigation from the normalized model;
- no production configuration mutation;
- current product gates green.

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
