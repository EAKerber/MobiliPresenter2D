# Schema-driven UI consolidation roadmap — 2026-10-06

Status: canonical planning track for consolidating schema ownership before production hierarchy publication. CP-SD-00 and CP-SD-01 are complete; CP-SD-02 is in progress through small self-contained slices.

This track starts from the manually accepted PR #97 buyer baseline and the current repository state after the isolated Puxadores persistence hotfix. It is intentionally documentation-first: no runtime, schema-version, pricing, catalog, scene, asset or production-configuration behavior changes are part of CP-SD-00.

## Why this track exists

Recent guided review exposed a useful architectural limit: the hierarchy is increasingly data-driven, but the buyer UI still contains presentation and compatibility knowledge that can mask missing configuration. The Puxadores incident is the concrete failure mode to avoid: if the data does not contain a section, the long-term renderer must not silently recreate that section from hard-coded UI structure.

The target is not "put CSS in the schema". The target is:

- schema/data decide **what exists**, semantic ownership, order and supported presentation intent;
- renderer components decide **how a declared primitive is drawn**;
- interaction code implements generic actions declared by the model;
- compatibility is resolved by explicit migration/normalization **before rendering**, never by inventing missing semantic UI at render time;
- responsive behavior is coordinated through named layout profiles rather than scattered pixel assumptions;
- catalog, scene, pricing, buyer state and flow/presentation remain separate authorities.

## Architectural definitions

### Content / product data
Owns product entities, labels, commercial metadata, materials, options and genuine product dependencies.

### Flow / hierarchy
Owns Stage -> Group -> Section -> Item ownership and ordering. It answers where a configurable concept belongs, not how many pixels it occupies.

### Presentation contract
Owns limited semantic presentation intent needed to compose declared regions, for example:
- ordinary ordered region;
- companion/detail relation;
- docked persistent action region;
- supported section/card presentation variants;
- layout-profile policy such as whether scene PiP is available.

It must not encode absolute coordinates or duplicate product truth.

### Interaction contract
Names generic actions such as inspect, toggle selection, open/close companion and advance stage. Interaction implementation stays in code.

### Renderer binding
Maps a declared semantic node or generic component type to a renderer implementation. A missing binding is an invariant error; it must not trigger a semantic fallback.

### Layout profile
A named responsive state such as wide, stacked-workspace or compact. Pixel/container thresholds belong to one profile resolver. Schema/presentation policy references the profile name/capability, not duplicated numeric breakpoints.

### Compatibility migration
An explicit old-document -> current normalized model transformation that runs before validation/rendering and is testable independently.

### Runtime fallback
A renderer/runtime behavior that invents semantic structure when normalized data is missing. This is disallowed in the target architecture except for narrowly documented emergency compatibility code with a retirement gate.

## Non-negotiable target rules

1. **Absent data means absent UI.** If normalized configuration does not contain a semantic section/item, the buyer UI must not recreate it from hard-coded markup.
2. **Invalid data fails closed.** Unknown component types, missing renderer bindings or invalid presentation relations produce deterministic validation/invariant failures.
3. **Compatibility is front-loaded.** Old schemas may migrate to the current model; renderer code must not remain a second migration engine.
4. **One responsive authority.** Scene layout, PiP availability, pane projection and related shell behavior consume the same named layout profile.
5. **View duplication is not semantic duplication.** A module list and a module detail view can be two views over one semantic owner.
6. **Interaction affordances are not product schema.** Checkbox hit slop, password reveal mechanics and pointer tolerance belong to generic components/design-system behavior unless a real domain rule requires otherwise.
7. **Documentation is part of the gate.** No implementation checkpoint is complete until backlog/current-state documents describe the resulting authority and next step.

## Checkpoint sequence

### CP-SD-00 — authority, redundancy and coupling audit — COMPLETE

Goal: map the current implementation before changing behavior, so consolidation removes real duplicate authority rather than replacing working code speculatively.

This checkpoint is documentation-only. The detailed execution plan is:
- `docs/backlog/schema-driven-ui-cp-sd-00-audit-plan-2026-10-06.md`.

Primary outputs:
- one concrete authority/coupling inventory covering hierarchy, renderer bindings, responsive logic, PiP, module master/detail, fixed action/value region, pricing representation, interaction affordances and compatibility paths;
- classification of every discovered hard-code as canonical domain rule, renderer binding, presentation policy, compatibility migration, duplicate semantic authority, accidental fallback, test-only assumption or unknown;
- a proposed target owner and checkpoint for each actionable finding.

Gate:
- no runtime/schema/production write;
- no critical path left classified as unknown;
- current PR #97 behavior remains the reference baseline;
- audit results are persisted before CP-SD-01 starts.

Result: PASS. The concrete inventory is persisted in `docs/architecture/schema-ui-authority-audit-2026-10-06.md`. The audit found no critical unknowns and identified the main blocker before publication: v4 section `presentation` is persisted/validated but is not yet an executable buyer-renderer authority.

### CP-SD-01 — freeze the current schema/presentation contract — COMPLETE / PASS

Result: PASS. CP-SD-01A centralized item capabilities; CP-SD-01B made presentation executable; CP-SD-01C froze topology policy, material `hex | null` semantics and the unpublished `ConfiguratorAdministration2D 5.0` candidate. Final reviewed PR #108 head: `7ff4746cfb60acaada1c91bf87fc54958bc957cf`.

Detailed plan:
- `docs/backlog/schema-driven-ui-cp-sd-01-contract-plan-2026-10-06.md`.

Goal: define the smallest schema additions/refinements required by the audited product requirements before any large renderer rewrite.

Expected decisions:
- version boundary for the unpublished v4 milestone versus the consolidated current candidate (preferred: preserve v4 history and introduce a new current administration version with a separately versioned presentation contract);
- generic representation for a companion/detail relationship without turning it into a second semantic owner;
- named layout profiles and scene/PiP capability policy;
- persistent bottom action/value dock as shell presentation rather than scroll content;
- pricing boundary remains separate from hierarchy; typed amount/percentage rules are designed in CP-SD-05 with an explicit basis;
- exact null/absent/default/inherited semantics where current data needs the distinction;
- explicit migration and validation behavior.

Gate:
- schema diff documented;
- migration/round-trip fixtures prove current data survives unchanged;
- a negative fixture proves missing semantic data does not get recreated by a renderer fallback;
- no production v4 publication yet.

### CP-SD-02 — make buyer composition fail-closed and fully data-driven — NEXT

Goal: remove semantic UI fallbacks/hard-coded ownership that remain after CP-SD-01 while preserving the accepted product appearance and behavior.

Key proof:
- removing a modeled section from normalized data removes it from buyer UI;
- adding a valid declarative section through the supported contract renders without a new domain-specific branch;
- missing/invalid bindings fail visibly in development/tests instead of silently reverting to DOM order or compatibility markup.

Gate:
- current PR #97 baseline semantics preserved for unchanged data;
- flow/keyboard/admin/browser gates green;
- no duplicate semantic hierarchy authority remains in renderer code.

Current CP-SD-02 progress:
- CP-SD-02A1: stage navigation authority — complete;
- CP-SD-02A2a: Services group shell generation — complete;
- CP-SD-02A2b: Additional Services section shell generation — complete;
- CP-SD-02A2c0/A2c1: Lighting boundary discovery + generated Lighting shell — complete;
- CP-SD-02A2d0: Acabamentos family discovery — complete;
- CP-SD-02A2d1: generated Fronts section shell + absence proof — complete;
- CP-SD-02A2d2: generated Handles section shell + absence proof — complete;
- CP-SD-02A2d3: Stone Packages discovery + generated shell + schema-valid absence proof — complete;
- CP-SD-02A2d4: Stone Skirting discovery + generated shell + intentional absence proof — complete;
- CP-SD-02A2e0: Summary stage/single-section boundary discovery — complete;
- CP-SD-02A2e1: generated Summary semantic shell + binding fail-closed proof — complete;
- CP-SD-02A2f0: Acabamentos group-shell boundary discovery — complete;
- CP-SD-02A2f1: generated `cabinet-finishes` group shell + valid absence proof — complete;
- CP-SD-02A2f2: generated `stone` group shell + redundant group-availability hook retirement — complete;
- CP-SD-02A2g0: Services item-renderer membership discovery — complete;
- CP-SD-02A2g1: bound-section Services checklist membership/order — complete;
- CP-SD-02A2h0: stage navigation / core-dispatch residual discovery — complete;
- CP-SD-02A2h1: id-agnostic generic core-stage dispatch — complete;
- **CP-SD-02 gate: COMPLETE / PASS** — semantic renderer hierarchy authority consolidated; deliberate responsive/domain residuals deferred to their owning tracks.

### CP-SD-03 — responsive presentation primitives

Status: **IN PROGRESS**. CP-SD-03A0 responsive-presentation discovery — complete. Immediate checkpoint: `docs/backlog/schema-driven-ui-cp-sd-03a1-executable-modules-view-plan-2026-10-07.md`.

Goal: implement audited presentation behavior from one responsive authority.

Scope expected:
- master/detail companion behavior for Modules, with list/detail scroll positions preserved independently;
- side panel/drawer projection where two permanent columns are too cramped;
- PiP availability under the same layout profile that stacks the scene above content;
- persistent estimate + primary CTA dock that remains visible while stage content scrolls;
- no window-scroll leakage from pane navigation.

Current CP-SD-03 sequence:
- CP-SD-03A0: responsive presentation discovery — complete;
- CP-SD-03A1: executable Modules view plan/binding, no pixel change — next;
- later slices: profile-driven application topology, companion visual projection, stacked/compact PiP execution, persistent bottom dock + scroll clearance. Exact later split remains gate-driven.

Gate:
- wide, stacked-workspace and compact browser geometry tests;
- independent pane scroll tests;
- PiP and dock accessibility/keyboard tests;
- no change to semantic item ownership.

### CP-SD-04 — interaction affordance cleanup

Goal: polish generic interactions without inflating the domain schema.

Expected items:
- module card body inspects/opens detail;
- checkbox is the only selection toggle target, with generous invisible hit area;
- no nested-interactive/accessibility regression;
- password fields expose a standard show/hide control;
- "Ver" becomes an affordance rather than a separate visual button where appropriate.

Gate:
- pointer + keyboard + screen-reader semantics are unambiguous;
- existing selection state and navigation behavior remain deterministic.

### CP-SD-05 — typed pricing authoring

Goal: let admin price adjustments choose absolute amount or percentage without ambiguous numeric meaning.

Expected model:
- typed pricing rule, e.g. amount vs percentage;
- percentage always declares its calculation basis;
- migration preserves current cents and current basis-point finish adjustments;
- admin toggle edits the type, not a parallel hidden convention.

Gate:
- calculation unit tests for each supported basis;
- old price book migrates exactly;
- summary/current-value totals remain synchronized;
- unsupported bases fail validation.

### CP-SD-06 — production schema publication and legacy retirement

Goal: hand the consolidated contract back into the authenticated CP-UX-05 publication boundary.

This checkpoint does not replace the safety rules already documented in CP-UX-05. It updates the candidate schema to the final consolidated contract, then uses the same fresh-read, revision/digest, server-validation, equivalence, readback and production-smoke discipline.

The isolated v3 Puxadores repair (CP-UX-05A0) and independent stone-skirting housekeeping transaction remain valid and separate. Only the **v3 -> production v5 hierarchy/presentation publication** remains held for the later authenticated publication checkpoint.

Gate:
- production uses one normal current schema authority;
- old v3 survives only as explicit import/migration compatibility where required;
- no renderer semantic fallback remains as normal production behavior;
- docs record exact production revision/digests and merge SHAs.

## Consolidation definition of done

The consolidation track is complete when all of the following are true:

- a semantic section exists in the buyer UI because normalized data declares it, not because markup/runtime recognizes its domain name;
- removing that section from valid normalized data removes it from the UI;
- a supported new section/presentation can be introduced through the declared contract without adding a domain-name branch to the buyer renderer;
- layout profiles are resolved once and consumed consistently by scene, PiP and content presentation;
- Modules list/detail is modeled as one semantic owner with a declared presentation relation;
- estimate/CTA persistence is shell/presentation behavior rather than an accidental end-of-scroll placement;
- pricing values are typed and percentages have an explicit basis;
- renderer incompatibility fails closed;
- legacy compatibility is isolated to named migration/import boundaries;
- backlog and `CURRENT_STATE.md` remain synchronized at every checkpoint.

## Sequencing note relative to CP-UX-05

Do not publish the current hierarchy v4 to production merely to retire v3 before this consolidation decides whether v4 needs presentation-contract changes. Publishing a schema already known to be incomplete would create avoidable migration debt.

CP-UX-05A0 may still be executed as the isolated v3 Puxadores repair because it changes only the intended current production assignment and is independently guarded. CP-SD-01 is now frozen: the broader production hierarchy publication should target the consolidated v5 candidate directly rather than publishing the historical v4 intermediate first.
