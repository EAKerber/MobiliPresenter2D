# CP-SD-02A2d0 — Acabamentos family discovery — result — 2026-10-07

Status: **COMPLETE / PASS**.

Baseline:
- `main` at `cb58d1306824e0c60e183e6a30dba57d440d3f5d`;
- CP-SD-02A2c1 merged via PR #114;
- production configuration unchanged.

## Decision

Choose:

> **CP-SD-02A2d1 — generate the Fronts section shell only, preserving its existing choice-swatches item/material adapter.**

No new generic renderer framework is required first.

## Family map

| Section | Component | Item owner | Existing specialized content/state | Decision |
| --- | --- | --- | --- | --- |
| `fronts` | `choice-swatches` | `fronts-all` | `#finishSwatches`, selected-finish description, material application and pricing adapters | **next** |
| `handles` | `choice-grid` | `handles-all` | handle-card rendering, active-section restoration and global handle selection/pricing | later isolated slice |
| `stone-packages` | `choice-cards` | `stone-all` | stone package cards, stone material/state and pricing | later isolated slice |
| `stone-skirting` | `toggle-list` | `stone-skirting` | service selection plus current published-v3 compatibility boundary | later; do not mix with authenticated housekeeping |

## Why Fronts first

Fronts is the smallest independent family:
- one normalized section with one explicit item;
- `choice-swatches` is already an executable presentation component;
- the existing DOM content is a bounded item adapter;
- keyboard ownership already follows `data-flow-item-id`;
- material/state/pricing logic does not require the static section id or heading;
- there is no dependency rule comparable to Lighting;
- there is no authenticated production-config inconsistency tied to this item.

The current neutral-slot machinery is already sufficient:
- component matching exists;
- item-affinity matching exists from A2c1;
- generated section identity/label/behavior/component already come from normalized flow;
- stale generated sections are already reconciled away.

## A2d1 exact boundary

Allowed:
1. replace the static `fronts` semantic section wrapper/heading with one hidden neutral `choice-swatches` slot;
2. give that slot item affinity `fronts-all`;
3. preserve `#finishSwatches` and `#selectedFinishDescription`;
4. preserve an explicit `data-flow-item-id="fronts-all"` item adapter inside the slot;
5. let normalized flow materialize section id, label, behavior and component;
6. add source/browser proof plus a negative fixture omitting `fronts-all`.

Not allowed:
- change material selection semantics;
- change `applyMaterialLibrary()`;
- change finish pricing;
- change masks/scene rendering;
- change Puxadores;
- change stone package/skirting;
- generate Acabamentos group shells;
- touch Modules/PiP/dock;
- write production configuration.

## Required absence proof

With Acabamentos still enabled but `fronts-all` omitted:
- normalized flow contains no `fronts` section;
- zero `[data-keyboard-section="fronts"]` semantic shells exist;
- the `fronts-all` neutral slot remains hidden/unclaimed;
- `handles`, `stone-packages` and `stone-skirting` remain independently modeled/rendered according to the fixture;
- no renderer invariant/fallback error is produced;
- no page/console error is produced.

## Stop rule

Stop and split another checkpoint if removing the static Fronts wrapper requires:
- changing material/state representation;
- changing price calculation;
- changing mask/scene behavior;
- creating a component-specific effects registry;
- changing group-shell ownership.

Result: **PASS**. Proceed to CP-SD-02A2d1.
