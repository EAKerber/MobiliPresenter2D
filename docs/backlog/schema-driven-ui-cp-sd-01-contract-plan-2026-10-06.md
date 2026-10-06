# CP-SD-01 — schema and presentation contract freeze — 2026-10-06

Status: **NEXT**.

Parent:
- `docs/backlog/schema-driven-ui-consolidation-roadmap-2026-10-06.md`

Audit input:
- `docs/architecture/schema-ui-authority-audit-2026-10-06.md`

This checkpoint designs and proves the contract. It should make only the minimum code/schema changes needed to establish that contract; buyer visual rewrites remain CP-SD-02/03.

## Goal

Freeze one explicit contract in which:

- semantic hierarchy says what exists and who owns it;
- presentation data says which supported visual primitive/view relation is requested;
- renderer bindings implement those primitives and fail closed when missing;
- responsive topology is expressed through named profiles;
- compatibility migrates old documents into the new current form before rendering.

The checkpoint must not turn the schema into CSS or a generic UI framework.

## Recommended version boundary

Treat `ConfiguratorAdministration2D 4.0` as a repository-proven but **unpublished** hierarchy milestone rather than silently changing its meaning.

Preferred current candidate:

- `ConfiguratorAdministration2D 5.0` for the consolidated administration document;
- nested presentation contract with its own explicit version, e.g. `ConfiguratorPresentation2D 1.0`.

Reason:
- v4 already has tests, migration semantics and historical documentation;
- its `presentation` field is currently descriptive/inert;
- redefining v4 in place would make old v4 fixtures and documents ambiguous;
- production can migrate directly v3 -> v5 after the final authenticated gate; v4 remains a known intermediate repository format if backward import is still useful.

Gate this decision at the start of implementation. If a simpler versioning strategy is proven safer, document the reason before changing code.

## Contract boundaries

### 1. Semantic hierarchy remains stable

Keep:

```text
Stage -> Group -> Section -> Item
```

It owns:
- existence;
- order;
- unique item ownership;
- labels where administrable;
- enabled state;
- semantic grouping.

It does not own:
- pixels;
- CSS breakpoints;
- PiP coordinates;
- transient open/closed UI state;
- current scroll position.

### 2. Replace descriptive presentation strings with executable component IDs

Current values such as `swatches`, `grid`, `cards`, `list` must either:

- map deterministically to a closed renderer-component registry; or
- be migrated to explicit component IDs.

Preferred shape conceptually:

```json
{
  "presentation": {
    "component": "choice-swatches"
  }
}
```

Examples of supported primitives may include:

- `choice-swatches`
- `choice-grid`
- `choice-cards`
- `toggle-list`
- `summary`

Exact names can change during implementation, but requirements are fixed:

- closed vocabulary;
- validator knows it;
- renderer registry knows it;
- unknown ID fails closed;
- no domain-name fallback such as “if handles then use handle UI”.

`auto` may exist only at an import/migration boundary if it resolves deterministically to an explicit current component before render.

### 3. Introduce one server-safe item capability registry

Consolidate the duplicated knowledge currently spread across flow/admin/validation.

Each configurable item/type needs enough metadata to answer, without UI-specific branching:

- interaction behavior: selection / toggle / action;
- allowed stage kinds;
- option-source capability where relevant;
- whether options are aggregate children rather than hierarchy owners;
- any default presentation used **only during migration**, not as a hidden runtime fallback.

The registry must be usable from browser core and server validation without DOM dependencies.

Do not move kitchen-specific business rules into a generic UI registry.

### 4. Separate availability from stage ownership

Replace the ambiguous current `stageHas(_stageId,itemId)` semantics with two explicit concepts:

- `itemAvailable(itemId)`
- `stageOwns(stageId,itemId)` or equivalent normalized-flow query.

Pricing/scene/state code must call the predicate that matches its real intent.

Add unit tests where a valid item is moved to a custom stage to prove the two predicates differ.

### 5. Add a minimal presentation-view relation

Modules now supplies the second requirement needed to promote its narrow two-pane code.

Presentation contract must support:

- one semantic source;
- a primary view;
- a companion/detail view over the same source;
- explicit relation between them;
- per-layout-profile projection mode.

Illustrative shape only:

```json
{
  "views": [
    {
      "id": "modules-list",
      "sourceSectionId": "modules",
      "component": "collection"
    },
    {
      "id": "modules-detail",
      "sourceSectionId": "modules",
      "component": "detail",
      "relation": { "kind": "companion", "of": "modules-list" }
    }
  ]
}
```

Do not duplicate module item IDs into two hierarchy sections.

Do not store open/closed state or scroll offsets in published configuration.

### 6. Define named layout profiles once

Introduce one application topology resolver. Candidate profiles based on current behavior:

- `side-rail`
- `stacked`
- `compact`

The exact current thresholds may initially remain 1050/700 to preserve behavior, but numeric thresholds must live in one implementation authority.

Schema/presentation policy references profile names, not pixel values.

Local component container queries remain local CSS.

### 7. Scene/PiP policy references profiles

Required semantic distinction:

- **availability** — whether PiP may be used in a profile;
- **default activation policy** — inline/pinned/optional, if the product needs it;
- **transient state** — position, chosen size, transparency, current open state.

Only the first two are candidates for published presentation configuration.

Target product requirement:
- PiP is available in the same stacked-workspace profile that moves scene above content, as well as compact where already supported;
- activation remains user-controlled unless review explicitly chooses otherwise.

### 8. Define persistent bottom dock as shell presentation

Estimate + primary CTA is application-shell composition, not a stage section.

Presentation contract should be able to state that the shell exposes a persistent bottom action region, but it should not encode CSS coordinates.

The dock content is known application capability:

- current composition estimate;
- current primary stage action.

Its implementation and final geometry remain CP-SD-03.

### 9. Material authored/default semantics

Freeze the minimum rule necessary to avoid silently inventing authored data.

Decision to make in CP-SD-01:

- whether `material.color` remains mandatory product data; or
- becomes nullable for texture-only/no-tint materials.

If nullable:
- normalization preserves explicit null;
- admin does not replace null with an arbitrary color;
- renderer may use a visual fallback for an empty swatch without writing that fallback back into authored data.

Do not introduce inheritance chains unless a current case requires them.

### 10. Pricing remains a separate contract

CP-SD-01 should record, not implement, the pricing boundary:

- pricing type/basis belongs to the price-book/pricing schema;
- hierarchy/presentation references items but does not define their monetary formula.

CP-SD-05 owns the typed amount/percentage migration.

This prevents the current UI-schema consolidation from absorbing unrelated commercial logic.

## Migration strategy

Required migration chain:

```text
published v3
  -> deterministic hierarchy upgrade
  -> deterministic presentation expansion
  -> current normalized administration
  -> validate
  -> render
```

If v4 import remains supported:

```text
v4
  -> deterministic presentation expansion
  -> current normalized administration
```

The renderer does not perform either migration.

### Legacy presentation mapping

Current v4 strings need an explicit migration table.

Example:

```text
swatches -> choice-swatches
grid     -> choice-grid
cards    -> choice-cards
list     -> validated item-capability-dependent explicit component
auto     -> resolve during migration or reject
```

Do not finalize an ambiguous `list` mapping until item capability is available.

## Validation gates

The current validator must gain focused checks for:

- known presentation component IDs only;
- view IDs unique within stage/presentation scope;
- every presentation source references an existing modeled group/section/item;
- companion relation target exists;
- companion and primary may share a semantic source without duplicating ownership;
- no cycles in companion relations;
- layout-profile names are from the closed topology vocabulary;
- PiP profile policy references only valid profiles;
- shell dock capabilities are closed vocabulary;
- null/material semantics are explicit;
- migration produces no unresolved `auto` presentation in the current schema.

Errors must identify paths.

## Required proof fixtures

Before CP-SD-02 begins, tests must include:

1. current production-like v3 -> current contract with exact semantic item membership;
2. current repository v4 -> current contract;
3. round-trip/current normalization idempotence;
4. changed hierarchy remains a hierarchy change rather than being flattened;
5. unknown presentation component rejected;
6. unknown layout profile rejected;
7. broken companion target rejected;
8. companion source shares semantic ownership without duplicating it;
9. moving an item between stages changes `stageOwns` but not necessarily `itemAvailable`;
10. material null/required behavior matches the chosen contract;
11. renderer receives only current normalized documents, never raw v3/v4.

## Scope discipline

Allowed implementation changes:
- pure schema/normalization/validation modules;
- one item-capability registry;
- one presentation-contract module/data definition;
- unit fixtures/tests;
- admin/core adapters required to read the current normalized model;
- documentation.

Avoid in this checkpoint:
- visual module side panel;
- persistent bottom dock CSS;
- PiP redesign;
- module-card interaction redesign;
- password reveal;
- typed pricing UI;
- production schema publication.

Those remain later checkpoints.

## CP-SD-01 acceptance gate

PASS only when:

- current semantic hierarchy and presentation are separately identifiable in the normalized contract;
- every persisted presentation choice has executable, closed semantics;
- item behavior/stage compatibility has one server-safe authority;
- availability vs stage ownership is unambiguous;
- a generic companion relation exists without duplicate semantic ownership;
- named layout profiles and PiP capability policy are representable;
- bottom dock is representable as shell presentation;
- material null/default semantics are decided and tested;
- v3 and any supported v4 source migrate deterministically;
- current runtime behavior can still be represented without requiring buyer UI rewrites in this checkpoint;
- no production write occurs;
- roadmap/current-state docs are updated before CP-SD-02.

## Stop / replan gates

Stop rather than expand the schema if:

- the proposed presentation model needs arbitrary CSS values;
- companion relations require duplicating hierarchy items;
- one item-capability registry starts absorbing scene/pricing business logic;
- a generic renderer component requires more item-ID exceptions than the current explicit renderers;
- material inheritance cannot be specified from a current real case;
- server-safe validation would require importing DOM/browser code.

The checkpoint should shrink the number of authorities, not create a framework.
