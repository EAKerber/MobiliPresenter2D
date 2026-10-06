# CP-SD-00 — schema/UI authority and coupling audit plan — 2026-10-06

Status: immediate next checkpoint. Documentation-only; no implementation changes.

Parent roadmap:
- `docs/backlog/schema-driven-ui-consolidation-roadmap-2026-10-06.md`.

## Objective

Produce a concrete map of current semantic, presentation and interaction authority before changing schema or renderer behavior.

The audit must answer two questions for every important hard-code:

1. **Is this legitimate code-level implementation knowledge?**
2. **Or is this a second authority for something normalized data/schema should own?**

The point is not to maximize generality. The point is to make the current product explainable and fail-closed, while keeping domain rules in the domain that actually owns them.

## Frozen baseline

Buyer/runtime visual baseline:
- PR #97 / accepted deploy preview behavior.

Repository starting point:
- live `main` at the start of CP-SD-00.

Production writes:
- none in this checkpoint.

Schema-version changes:
- none in this checkpoint.

## Audit classification vocabulary

Every finding must use one of these classes:

- **canonical-domain-rule** — legitimate product/business/scene rule owned by catalog, pricing, scene or state;
- **canonical-flow-rule** — legitimate Stage/Group/Section/Item ownership in the hierarchy authority;
- **renderer-binding** — implementation hook that maps declared model nodes/components to DOM/render code without owning semantics;
- **presentation-policy** — layout/view policy that should be explicit and generic enough to be driven by the presentation contract;
- **interaction-policy** — generic interaction behavior that belongs to components/controller code;
- **compatibility-migration** — explicit old-schema normalization before render;
- **duplicate-semantic-authority** — code/markup that redefines hierarchy/product meaning already owned elsewhere;
- **accidental-runtime-fallback** — missing data silently recreated or inferred during render/runtime;
- **test-only-assumption** — hard-coded fixture/assertion that is not runtime authority;
- **unknown** — temporary classification requiring investigation. Critical unknowns block checkpoint completion.

## Required inventory fields

The resulting audit document must record, per finding:

- file/path;
- symbol, selector, id or condition;
- current responsibility;
- classification;
- authority it currently depends on;
- whether it can create/restore semantic UI when data is missing;
- coupling/risk;
- intended target owner;
- proposed checkpoint for action;
- required regression proof before removal/change.

The audit result should be persisted as:
- `docs/architecture/schema-ui-authority-audit-2026-10-06.md`.

Do not overload the roadmap with the full inventory.

## Audit slices

### A. Hierarchy and semantic rendering

Inspect at minimum:
- `app/data/hierarchy-defaults.js`;
- `app/core/flow-model.js`;
- `app/core/hierarchy-administration.js`;
- `app/core/hierarchy-editor.js`;
- `app/core/flow-layout.js`;
- `app/app.js`;
- `app/index.html`;
- hierarchy/flow browser and unit tests.

Known seed to verify:
- CP-UX-04.2 centralized the legacy Stage -> Group -> Section defaults successfully;
- HTML ids are intended renderer hooks, but buyer markup may still display semantic sections even when published data omits ownership;
- `flow-layout.js` contains a Modules-specific view projection, currently legitimate but a candidate for the new companion/detail presentation primitive.

Required questions:
- Can any semantic section appear without a normalized owner?
- Does any stage/group/section name still drive behavior outside canonical flow data?
- Are any DOM ids/selectors being used as semantic discovery rather than renderer bindings?
- Does custom-stage fallback invent semantics or only normalize explicit old data?

### B. Compatibility paths and fallback behavior

Inspect:
- `app/core/runtime-contracts.js`;
- `app/core/legacy-stage-repair.js`;
- v3 -> v4 migration/projection paths;
- buyer load normalization;
- admin load/save normalization;
- server publication validation;
- tests that depend on repaired runtime state.

Known seed to verify:
- stone-skirting runtime repair is a compatibility shim;
- Puxadores now has an isolated v3 repair operation;
- long-term rule is migration-before-render, not render-time semantic repair.

Required output:
- explicit list of compatibility code that is allowed to remain temporarily;
- retirement precondition for each path;
- proof that ordinary current-schema rendering will not depend on those paths.

### C. Responsive authority and breakpoints

Inspect:
- CSS media/container queries;
- JS `matchMedia` / viewport checks;
- flow-layout behavior;
- mobile/PiP code;
- browser test viewport constants.

Known seeds from current code:
- CSS uses 1050 px workspace transition and 700 px compact/mobile rules;
- buyer JS has an explicit `(max-width: 700px)` mobile predicate for pinned-scene/PiP behavior;
- some stage composition also uses container-size behavior.

Required questions:
- Which thresholds describe one real layout state versus unrelated local constraints?
- Can the current states be named once (for example wide / stacked-workspace / compact) without forcing all component-level container queries into global profiles?
- Which code should consume a named profile, and which should remain local content-driven CSS?
- At which profile should PiP be available, optional, active or unavailable?

Do not decide final pixel thresholds in CP-SD-00 unless evidence requires it. Classify authority first.

### D. Modules list/detail presentation

Inspect:
- `flow-layout.moduleViewLayout()`;
- module list rendering;
- detail rendering;
- pane CSS;
- keyboard scroll containment;
- detail selection/navigation state.

Product requirement to preserve:
- user must be able to move between list and detail without scroll jumps;
- list/detail scroll state should be preserved;
- two permanent side-by-side columns are too cramped at many resolutions;
- a lateral expandable companion panel is a candidate;
- semantic module ownership must remain single.

Audit must distinguish:
- semantic module selection;
- inspect/detail action;
- include/exclude toggle;
- presentation relation between list and detail;
- scroll ownership.

### E. Estimate + primary action region

Inspect:
- `configurationValue`;
- `nextStepButton`;
- `.flow-actions`;
- controls/page scroll containers;
- mobile clearance calculations.

Target requirement:
- estimate and current primary CTA remain fixed/persistent on screen near their current bottom-of-flow position while stage content scrolls.

Audit must determine whether this belongs to:
- a generic shell dock;
- stage presentation metadata;
- or pure application shell behavior.

Do not encode CSS coordinates into schema.

### F. Pricing representation and admin editing

Inspect:
- `app/data/mock-price-book.js`;
- `app/core/pricing.js`;
- `app/admin/admin.js` pricing sections/editor;
- configuration normalization/validation;
- summary/pricing tests.

Known seeds:
- normal entries/global entries are represented in cents;
- front finish adjustments are already represented separately in basis points;
- admin pricing categories are currently enumerated in code.

Product requirement:
- editor should offer an explicit amount/percentage toggle.

Audit must answer:
- which price entries genuinely support percentage;
- percentage of which explicit basis;
- whether the current price-book schema or configuration schema owns that type;
- how current cents and BPS migrate with zero ambiguity.

### G. Small interaction affordances

Inspect module cards and admin password fields.

Requirements:
- whole module card inspects/opens detail;
- checkbox is the only selection-toggle control;
- checkbox receives an enlarged invisible hit target;
- visible `Ver` affordance does not need to remain a button;
- password fields should have a standard show/hide control.

Classification expectation:
- these are interaction/component concerns unless audit evidence proves a schema requirement.

Accessibility proof must be planned before implementation:
- no nested interactive controls;
- card inspect and checkbox toggle have distinct keyboard semantics;
- reveal-password control has an accessible name/state.

### H. Test authority

Inspect existing:
- flow layout browser;
- keyboard browser;
- mobile/PiP browser;
- admin hierarchy browser;
- summary/pricing browser;
- schema migration/normalization unit coverage.

The audit must identify missing **negative** tests, especially:
- modeled section absent -> buyer section absent;
- unknown presentation/component -> validation/invariant failure;
- renderer binding missing -> no semantic fallback;
- changing layout profile -> no semantic ownership/order change.

## CP-SD-00 gates

PASS requires all of the following:

- full inventory persisted in the architecture audit document;
- every critical hard-code classified;
- no critical `unknown` remains;
- each actionable duplicate/fallback has a target owner and future checkpoint;
- legitimate domain-specific code is explicitly protected from premature generalization;
- no runtime or schema file changed;
- no production configuration was written;
- current roadmap and `CURRENT_STATE.md` updated with the audit result and CP-SD-01 entry condition.

## Stop / replan rules

Stop and update the plan rather than continuing mechanically if the audit finds:

- a second normal runtime hierarchy authority that cannot be removed without changing current product semantics;
- production v3/v4 data whose meaning cannot be reconstructed deterministically;
- a responsive state that cannot be represented without coupling product semantics to CSS geometry;
- a pricing percentage case with no unambiguous basis;
- any planned "generic" abstraction that requires more special cases than the current code.

## CP-SD-01 entry condition

CP-SD-01 may start only after the audit makes the following boundaries explicit:

- semantic schema authority;
- renderer-binding authority;
- presentation-profile authority;
- compatibility/migration boundary;
- pricing type/basis authority;
- component-only interaction concerns.

At that point the schema design can be intentionally small instead of speculative.
