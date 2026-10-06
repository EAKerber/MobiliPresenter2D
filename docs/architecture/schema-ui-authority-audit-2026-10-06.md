# Schema/UI authority audit — 2026-10-06

Status: **CP-SD-00 complete**. Documentation-only audit; no runtime, schema-version or production-configuration behavior changed.

Parent plan:
- `docs/backlog/schema-driven-ui-consolidation-roadmap-2026-10-06.md`
- `docs/backlog/schema-driven-ui-cp-sd-00-audit-plan-2026-10-06.md`

Baseline:
- buyer/runtime behavior accepted in PR #97;
- live repository inspected from `main` after PRs #99/#101/#102;
- production write boundary unchanged.

## Executive result

The repository is already farther toward a single hierarchy authority than the Puxadores incident initially suggested. CP-UX-04.2 successfully centralized the legacy Stage -> Group -> Section template in `app/data/hierarchy-defaults.js`, and both flow normalization and keyboard navigation now fail closed in several important cases.

The remaining problem is narrower and more actionable:

1. **semantic hierarchy is mostly centralized, but presentation is not yet an executable contract**;
2. **static buyer markup still carries enough semantic shape to act as a residual fallback surface**;
3. **a few interaction/stage policies are duplicated across core/admin/runtime**;
4. **responsive/PiP behavior is split between CSS and JS without one named layout-state authority**;
5. **pricing type is encoded by storage bucket instead of an explicit typed rule**;
6. **several kitchen-specific rules are legitimate domain constraints and should not be generalized merely for cleanliness**.

No critical finding remains classified as `unknown`. CP-SD-01 can therefore freeze the next schema/presentation contract from concrete evidence rather than speculation.

## Classification vocabulary

- **canonical-domain-rule** — legitimate product/business/scene rule.
- **canonical-flow-rule** — legitimate hierarchy ownership/order rule.
- **renderer-binding** — code/DOM hook binding normalized model to a renderer.
- **presentation-policy** — generic visual/layout policy that should be explicitly modeled.
- **interaction-policy** — generic interaction/component behavior.
- **compatibility-migration** — old-schema normalization/repair with an explicit retirement boundary.
- **duplicate-semantic-authority** — the same meaning declared in more than one runtime authority.
- **accidental-runtime-fallback** — missing semantic data can be silently replaced/inferred at runtime.
- **test-only-assumption** — fixture/assertion, not production authority.

## Findings

| ID | Location / symbol | Classification | Finding / risk | Target owner | Action checkpoint |
| --- | --- | --- | --- | --- | --- |
| SD-A01 | `app/data/hierarchy-defaults.js`, `flow-model.js` | canonical-flow-rule | Legacy v3 hierarchy derivation has one explicit default authority and fails when that template is missing. This is healthy compatibility behavior. | hierarchy migration | protect |
| SD-A02 | `hierarchy-administration.js` `PRESENTATIONS`; `app.js` `data-flow-presentation` | presentation-policy | v4 persists `auto/swatches/cards/list/grid`, and presentation changes require hierarchy publication, but buyer CSS/runtime does not actually interpret the value beyond copying it to a data attribute. The field currently promises more authority than it has. | executable presentation contract | **CP-SD-01 blocker** |
| SD-A03 | `flow-model.js:itemBehavior`; `hierarchy-administration.js:itemBehavior`; `admin.js:itemBehavior` | duplicate-semantic-authority | The same kind -> interaction mapping is repeated three times. Drift could make normalization, validation and editor placement disagree. | server-safe item capability registry | **CP-SD-01** |
| SD-A04 | hierarchy defaults `allowedItemKinds`; hierarchy validation; v3 configuration validation | duplicate-semantic-authority | Stage/item compatibility is partially represented in defaults and independently hard-coded in validators. | server-safe item/stage capability policy | **CP-SD-01** |
| SD-A05 | `hierarchy-defaults.js:aggregateOptions` | duplicate-semantic-authority | Option-source metadata for Frentes/Puxadores/Pedra is useful, but it is not hierarchy. Keeping it inside hierarchy defaults mixes semantic placement with item capability/rendering inventory. | item capability/data registry | **CP-SD-01** |
| SD-A06 | `app/index.html` initial flow nav | accidental-runtime-fallback | Four core stage buttons are statically present and later removed/rebuilt from data. This is redundant startup semantic markup. | generic navigation mount | **CP-SD-02** |
| SD-A07 | `app/index.html` static finishes/services sections | renderer-binding + accidental-runtime-fallback risk | Current runtime correctly hides/reorders unmodeled shells after flow application, so these hooks are not the primary hierarchy authority anymore. However, full semantic shells and labels exist before successful binding and can mask failures or flash stale UI. | empty/generic renderer mounts + explicit binding registry | **CP-SD-02** |
| SD-A08 | `app.js:mountStageGroups` | renderer-binding | Good boundary: modeled groups/sections are ordered from normalized flow, unmodeled shells are hidden, missing/duplicate bindings produce invariant errors. Preserve this fail-closed behavior while replacing static semantic shells. | renderer binding layer | protect / CP-SD-02 migration |
| SD-A09 | `app.js:stagePanels` | renderer-binding | Core stage kind -> DOM panel mapping is legitimate renderer knowledge, but it is currently an inline map alongside many direct element references. | one explicit component/binding registry | **CP-SD-02** |
| SD-A10 | `app.js:applyBuyerFlowLayout` | renderer-binding | Layout mounting explicitly names only finishes, services and Modules. Summary/custom paths use separate composition mechanisms. This prevents one generic schema-driven composition path. | presentation renderer | **CP-SD-02** |
| SD-A11 | `app.js:stageHas(_stageId,itemId)` | duplicate-semantic-authority | The function ignores its stage argument and actually means “item exists in any enabled stage”. Call sites pass `finishes` or `services`, making placement semantics appear stage-scoped when they are not. | explicit `itemAvailable` and `stageOwns` predicates from normalized flow/config | **CP-SD-01/02 blocker** |
| SD-A12 | `keyboard-shortcuts.js:activeStageId` | accidental-runtime-fallback | If no active step exists in the DOM, navigation silently defaults to `modules`. Current normalized flow should be the authority. | navigation model/binding | **CP-SD-02** |
| SD-A13 | `keyboard-shortcuts.js:visibleStageRoots` | accidental-runtime-fallback | It prefers the active step's `aria-controls`, then falls back to discovering visible panels by DOM shape. That can conceal a broken stage binding. | explicit stage renderer binding | **CP-SD-02** |
| SD-A14 | `keyboard-shortcuts.js:resolveModelSection` | canonical-flow-rule | Strong existing gate: exactly one visible DOM section must represent each modeled keyboard section, controls must be owned by modeled flow items, and unexpected/missing items are reported. | normalized flow + binding invariants | protect |
| SD-A15 | `flow-layout.js:moduleViewLayout` | presentation-policy | Two panes are hard-coded specifically for Modules. This was intentionally narrow when it had one use case; the requested lateral companion/detail behavior now justifies promoting it to a generic view relation. | presentation contract: companion/master-detail relation | **CP-SD-01/03** |
| SD-A16 | module pane CSS at >1050, 701–1050, <=700 | presentation-policy | Current projections are encoded only in CSS: side-rail one column, stacked workspace two independent columns, compact one column. Two permanent peers are cramped for the desired UX. | named layout profiles + companion projection | **CP-SD-01/03** |
| SD-A17 | CSS 1050/700 rules + `app.js:isMobileViewport()` | duplicate-semantic-authority | Workspace mode changes at 1050 px, while PiP code is gated by a separate JS 700 px predicate. The scene and content therefore disagree about the same broader responsive state. | one named viewport/workspace profile resolver | **CP-SD-01/03** |
| SD-A18 | local CSS container queries (430/300/520) | presentation-policy | These are content-driven component constraints and should **not** all be promoted into global layout profiles. They solve local readability rather than application topology. | local component CSS | protect unless later evidence differs |
| SD-A19 | `mobileScene*` / PiP state | presentation-policy | Pin availability, activation, drag position, size and transparency are all coupled under a “mobile” concept. Capability should be profile-driven; transient position/size stays runtime UI state. | presentation policy + local UI state | **CP-SD-01/03** |
| SD-A20 | `index.html:.flow-actions`; controls scroller CSS | presentation-policy | Estimate + primary CTA currently live at the end of the controls flow and scroll with it. Desired persistence is a shell-level bottom dock, not a hierarchy item. | application shell presentation | **CP-SD-01/03** |
| SD-A21 | `keyboard-shortcuts.js:scrollSectionIntoView` | presentation-policy | Scroll ownership is discovered dynamically and falls back to `window.scrollBy`. A persistent bottom dock will also require explicit bottom clearance. | explicit configurator scroller/shell geometry | **CP-SD-03** |
| SD-A22 | `renderModuleControlsFromData` + module card CSS | interaction-policy | Most of the card is inside a label that toggles inclusion; a separate raised `Ver` button inspects. This is the reverse of the requested interaction separation. | generic inspectable selectable-card component | **CP-SD-04** |
| SD-A23 | checkbox size/hit target | interaction-policy | Visual checkbox is 18 px and its broad label currently creates an oversized toggle surface. Desired behavior needs a compact visible checkbox with an explicit invisible hit target that does not consume the whole card. | design-system/component hit target | **CP-SD-04** |
| SD-A24 | `admin.html` password inputs | interaction-policy | Login and new-password fields have no reveal control. No domain/schema reason exists to model this. | password-input component | **CP-SD-04** |
| SD-A25 | `mock-price-book.js`, `pricing.js` | canonical-domain-rule + schema gap | Amount versus percentage is encoded by which bucket contains a number. `frontFinishRatesBps` is the one proven percentage case and its basis is eligible module base price. | typed pricing rule schema | **CP-SD-05** |
| SD-A26 | `admin.js:priceSections`; `configuration.js` pricing section list | duplicate-semantic-authority | Pricing bucket names, display kind and validation expectations are repeated. | pricing schema/registry | **CP-SD-05** |
| SD-A27 | pricing special cases (`stone-skirting`, `lighting-08`) | canonical-domain-rule / coupling | Scope and source contain product-specific branches. Current behavior is proven; generalize only where typed pricing or a second real case requires it. | pricing domain | CP-SD-05 selective cleanup |
| SD-A28 | `configuration.js:defaultMaterials` + material validation | schema gap | Stone material creation invents a fallback color and every material is required to have a hex color. Authored absence/null cannot survive as a distinct state. | material schema semantics | **CP-SD-01 decision** |
| SD-A29 | material group topology: exactly fronts/handles/stone | canonical-domain-rule | This is intentionally kitchen-specific and protects current assumptions. It is not a schema-consolidation bug by itself. | product/domain configuration | protect; generalize only with second topology |
| SD-A30 | scene/service branches for lighting/tempered glass | canonical-domain-rule / coupling | Scene-bound services are not yet represented by one generic service->scene contract. It is known debt, but unrelated to whether UI hierarchy is schema-driven. | scene/catalog contract | defer unless CP-SD implementation touches it |
| SD-A31 | `runtime-contracts.js:repairSkirtingStageContract` | compatibility-migration | Last normal runtime compatibility shim for the audited published v3 contradiction. | explicit legacy migration boundary | retire only after authenticated housekeeping read/write proof |
| SD-A32 | `legacy-stage-repair.js` + server `persist-handles-all` | compatibility-migration | Explicit authenticated v3 maintenance transaction, independently verified server-side. It is not a buyer renderer fallback. | authenticated maintenance path | keep until executed/obsolete, then retire |
| SD-A33 | server explicit v4 rejection | canonical-flow-rule | Strong fail-closed boundary: current server rejects v4 publication until the authorized migration checkpoint. | publication boundary | protect |
| SD-A34 | custom-stage defaults + renderer | canonical-flow-rule + renderer-binding | v3 custom stages normalize through explicit defaults and buyer controls are generated from stage items. This is a useful proof that generic data-driven rendering is already viable. | current flow/presentation architecture | reuse as evidence for CP-SD-02 |
| SD-A35 | current browser/unit gates | test-only-assumption | Existing tests prove modeled order, binding errors, independent module pane scrolling, keyboard ownership, and pricing round-trips. They do not yet prove the full negative “remove semantic data => UI disappears” contract or the new presentation primitives. | regression suite | add gates below |

## What is already fail-closed

The consolidation should preserve, not rewrite, these working properties:

- flat legacy flow cannot normalize without explicit hierarchy defaults;
- mixed flat/hierarchy source shapes are rejected;
- unknown item references are rejected;
- source item coverage is validated;
- hierarchy item ownership is unique;
- invalid section presentation strings are rejected;
- missing renderer group/section bindings can be detected;
- keyboard navigation ignores DOM-only sections that do not exist in normalized flow;
- direct v4 production publication is rejected server-side;
- hierarchy-changing v4 drafts cannot silently flatten to v3.

These are the foundation for the stricter UI contract.

## The important schema gap: presentation is currently descriptive, not executable

The highest-value result of this audit is SD-A02.

Today a section can persist:

```text
presentation = swatches | cards | list | grid | auto
```

but the buyer renderer does not select a component from that value. The current UI still knows that Frentes uses swatches, Puxadores uses its handle renderer, Pedra uses its stone renderer, and Services uses its service renderer.

Therefore publishing v4 now would freeze a hierarchy schema whose presentation field is not actually the presentation authority.

CP-SD-01 must resolve this before the production hierarchy migration.

## Responsive boundary

Use named application profiles for **topology**, not for every CSS breakpoint.

The current topology naturally exposes three states:

- side-rail workspace: currently >1050 px;
- stacked workspace: currently 701–1050 px;
- compact: currently <=700 px.

Exact thresholds can remain centrally resolved implementation values. Persisted/schema policy should reference profile names/capabilities rather than duplicate pixel values.

Local container rules such as handle-card readability remain local CSS.

PiP policy should become profile-capability data. Drag position, chosen PiP size and transparency are transient UI state and should not be published schema.

## Modules master/detail boundary

Modules already proves the key semantic rule: detail and list are two views over one semantic section.

Promote only the **view relation**, not duplicate module ownership.

Target abstraction:

```text
semantic source
  -> primary/list view
  -> companion/detail view
       relation = companion-of(primary)
       projection selected by layout profile
```

The contract needs to support a side panel/drawer/replacement projection while preserving list scroll, detail scroll and current selected module.

It does not need to become a generic window manager.

## Pricing boundary

The audit confirms one existing percentage rule:

- front finish: basis points applied to each eligible module's base amount.

Everything else is currently stored as fixed cents.

A future percentage entry must therefore declare both:

- type: amount or percentage;
- basis: a closed, explicit calculation basis.

A boolean such as `isPercentage` is insufficient.

This belongs to the pricing contract, not the hierarchy tree.

## Material null/default boundary

Current administration requires a color for every material and may synthesize one for stone. This means “no authored color/tint” cannot be represented faithfully.

CP-SD-01 should decide the minimum semantics needed now:

- authored value;
- explicit none/null, if supported;
- derived/default value only at rendering/migration boundaries.

Do not add a large inheritance engine unless a second real case requires it.

## Negative gates missing today

Before CP-SD-02/03 are considered complete, add focused regression coverage proving:

1. a semantic section absent from valid normalized data is absent from buyer UI;
2. an unknown/unsupported component or presentation fails validation rather than selecting a fallback;
3. a modeled section with no renderer binding reports an invariant failure and does not expose stale semantic markup;
4. missing active-stage binding does not silently become Modules;
5. layout-profile changes preserve semantic stage/group/section/item order;
6. companion list/detail preserves independent scroll position and selection state;
7. persistent bottom dock reserves enough scroll clearance that the last section is never covered;
8. module-card inspect does not toggle inclusion, and checkbox hit-target toggles exactly once;
9. legacy pricing migrates exactly into typed rules and every percentage has an explicit supported basis;
10. PiP availability follows the named profile policy and activation remains user-controlled.

## CP-SD-00 gate result

PASS.

Evidence:
- schema/UI-relevant runtime/admin/server/test paths were inventoried;
- every critical finding has a classification and target owner;
- no critical `unknown` remains;
- product-specific topology that should remain specialized is explicitly protected from premature generalization;
- no runtime/schema/production write was part of the audit.

Next:
- **CP-SD-01 — freeze the schema/presentation contract**.
- Detailed plan: `docs/backlog/schema-driven-ui-cp-sd-01-contract-plan-2026-10-06.md`.
