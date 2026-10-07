# CP-SD-02A2c0 — Lighting specialization discovery — result — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- `docs/backlog/schema-driven-ui-cp-sd-02a2c0-lighting-discovery-2026-10-07.md`

Baseline:
- CP-SD-02A2b merged via PR #112 at `317baa57f05cd9210fc95999fd968b8a4075b3d5`;
- production remains unchanged;
- this checkpoint changes no runtime behavior.

## Decision

Choose:

> **CP-SD-02A2c1 — generate the Lighting section shell only, preserving a specialized Lighting item adapter.**

Do **not** extract a generic item-effects framework first.

The audit shows the current architecture already has a usable boundary:

- normalized flow owns the **section semantics**;
- existing Lighting runtime code owns the **specialized item/state/scene effects**.

The next implementation therefore only needs to remove the static semantic section wrapper and heading, not rewrite Lighting behavior.

## Authority map

| Concern | Current authority | Classification | A2c1 action |
| --- | --- | --- | --- |
| section id `lighting` | `hierarchy-defaults.js` -> normalized flow | canonical semantic section | keep; generate DOM from it |
| section label `Iluminação` | hierarchy defaults -> normalized flow | canonical semantic copy | keep; generated heading consumes it |
| section behavior `toggle` | normalized flow | canonical interaction behavior | keep |
| section component `toggle-list` | presentation contract / normalized flow | canonical renderer binding | keep |
| section item membership | explicit `itemIds: ["lighting-08"]` | canonical ownership | keep |
| static `<section data-keyboard-section="lighting">…` | `index.html` | residual static semantic shell | remove in A2c1 |
| static heading `Iluminação` | `index.html` | duplicate semantic copy | remove in A2c1 |
| `#lightingToggle` checkbox + service-card content | buyer runtime/HTML | specialized item adapter surface | preserve in A2c1 |
| `updateAccessoryControls()` | `app.js` | specialized item-state adapter | preserve |
| Lighting change listener -> `setEntityVisibility()` | `app.js` | specialized item-state adapter | preserve |
| dependencies on `module-04` + `module-06` | administration `dependencies[]` | canonical domain dependency | preserve |
| dependency resolution | `configuration.resolveEventState()` + buyer helper | generic dependency/state engine | preserve |
| scene entity/layer | `scene-data.js` + visibility core | canonical scene concern | preserve |
| `itemAvailable("lighting-08")` scene/estimate gates | buyer adapter | legitimate availability bridge, not section authority | preserve for now |
| Lighting price entry | price book + pricing core | commercial/domain concern | preserve |
| summary label for Lighting | catalog accessory lookup | domain presentation adapter | preserve |
| keyboard section order/ownership | normalized flow | canonical interaction authority | keep tests |
| shared service-card geometry | CSS/current browser contract | presentation primitive | preserve |

## Why no adapter extraction first

Lighting is specialized, but the specialization is already concentrated enough to leave untouched:

- `updateAccessoryControls(resolved)` owns checked/disabled/title state;
- the existing change listener owns the action bridge to `setEntityVisibility("lighting-08", …)`;
- dependency requirements are data-driven through `dependencies[]`;
- scene visibility is resolved by existing scene/state machinery;
- pricing reads effective resolved Lighting visibility;
- summary uses catalog data.

None of these responsibilities require the static **section** wrapper.

Extracting a generic effects framework before removing the wrapper would increase scope without solving the immediate duplicate semantic authority.

## Residual direct Lighting knowledge that remains intentionally after A2c1

A2c1 must not pretend to finish Lighting consolidation.

Expected remaining direct references include:

- `const lightingToggle = document.getElementById("lightingToggle")`;
- `updateAccessoryControls()`;
- `lightingToggle.addEventListener("change", …)`;
- `itemAvailable("lighting-08")` in scene/estimate/count gates;
- special label lookup in `globalItemLabel()`;
- Lighting pricing entry.

These are future item-adapter/domain cleanup candidates, not blockers for section-shell authority.

## Slot seam for A2c1

A2b's current generated-section factory selects an unclaimed slot by component.

If Lighting also becomes a neutral `toggle-list` slot, Services will contain two same-component neutral slots:
- Lighting specialized content;
- Additional Services generic content.

Component alone is therefore no longer sufficient to choose the correct slot.

Smallest safe extension:

- allow a neutral slot to declare optional **item affinity**, e.g. `data-flow-slot-item="lighting-08"`;
- when materializing a normalized section:
  1. first prefer an unclaimed compatible slot whose affinity item belongs to `section.itemIds`;
  2. otherwise use an unclaimed compatible generic slot only when the match is unique;
  3. ambiguous/missing matches remain fail-closed.

This is renderer binding metadata for a specialized item host, not semantic section ownership:
- it does not name `lighting`;
- it does not supply section label/order/behavior/component;
- it cannot create a section absent from normalized flow.

## A2c1 exact implementation boundary

Allowed:

1. replace the static Lighting section wrapper with one hidden neutral slot;
2. keep the existing Lighting checkbox/card content inside that slot;
3. remove static Lighting section id, section heading id/copy, keyboard behavior and component ownership from HTML;
4. extend generated-section slot matching with optional item affinity;
5. let normalized flow generate the Lighting section id/label/behavior/component;
6. preserve the existing specialized checkbox adapter unchanged except for any DOM lookup timing required by generated-shell mounting;
7. add a negative fixture with `lighting-08` absent.

Not allowed:

- rewrite dependency logic;
- rewrite `setEntityVisibility()`;
- move pricing logic;
- introduce generic item-effects registry;
- modify Modules/PiP/dock;
- migrate Additional Services content logic;
- production write.

## Required negative proof for A2c1

Use a configuration where Services still exists but `lighting-08` is absent.

Prove:

- normalized flow contains no `lighting` section;
- zero `[data-keyboard-section="lighting"]` nodes exist;
- the Lighting neutral item slot remains hidden/unclaimed;
- the scene layer for `lighting-08` is not configurable/visible;
- no renderer invariant/fallback error is produced;
- Additional Services remains present and functional.

This proves “missing Lighting data = no Lighting semantic UI” without changing specialized item behavior.

## Tests that move with A2c1

Focused changes should be limited to:

- source/static-markup assertions;
- Flow layout browser:
  - generated Lighting shell;
  - label/behavior/component/ownership;
  - absence fixture;
  - existing Services geometry;
- Keyboard browser:
  - existing Lighting navigation/toggle behavior must remain unchanged.

Broader repository gates remain regression-only.

## Stop rule

Stop A2c1 rather than expanding scope if generated-shell mounting requires:

- moving dependency semantics into the toggle-list renderer;
- changing pricing semantics;
- introducing a general effects framework;
- changing buyer state representation.

If any of those occurs, create a separate adapter checkpoint.

## Result

A2c0: **PASS**.

Immediate next checkpoint:

> **CP-SD-02A2c1 — generated Lighting section shell with item-affinity slot matching; preserve specialized Lighting item adapter.**
