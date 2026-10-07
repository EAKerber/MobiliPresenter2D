# CP-SD-02A2d4.0 — Stone Skirting boundary discovery result — 2026-10-07

Status: **COMPLETE / PASS**.

Baseline:
- `main` = `136511e4af43342401db60fcdb521c18d6688f10`;
- Stone Packages section semantics are normalized-flow-owned;
- Stone Skirting remains a static semantic section;
- production configuration unchanged.

## Domain decision

Stone Skirting is independently controllable as **presence/service state**, not independently authorable as a material.

Current authority is deliberate:
- material group `stone-all` is labeled `Pedra e rodapé`;
- it links `stone-skirting` through `linkedItemIds`;
- Stone Skirting ON uses the selected Stone material;
- Stone Skirting OFF uses the MDF/front-finish path;
- no separate skirting material exists.

An earlier product idea would have allowed Stone and Skirting to use different colors/materials, with an administration setting deciding whether they were linked. That capability is **deferred** because it adds schema, editor, validation and runtime complexity without enough current value.

Therefore:

> separate semantic section / service state does not imply separate material authority.

## Renderer finding

The static Stone Skirting section wrapper is not required by its domain behavior.

Stable adapter boundary:
- `#stoneSkirtingToggle`;
- `data-configurable-item="stone-skirting"`;
- `data-flow-item-id="stone-skirting"`.

Existing runtime behavior can remain unchanged:
- `renderStonePackages()` synchronizes checked/disabled/title state;
- the change handler calls `setGlobalService(state, "stone-skirting", checked)`;
- keyboard navigation resolves semantic id `stone-skirting`;
- configuration validation preserves `stone-skirting requires stone-all`;
- legacy `repairSkirtingStageContract()` remains untouched.

## A2d4.1 decision

Generate only the Stone Skirting semantic shell from normalized flow:
- neutral `toggle-list` slot;
- item affinity `stone-skirting`;
- inner bounded adapter preserves the configurable item id, flow item id and toggle/label;
- normalized flow supplies section id/label/behavior/component.

No material/schema/admin/domain behavior changes.

## Future flexibility

Independent Stone/Skirting materials are not forbidden forever; they are simply **not part of the current architecture target**. Revisit only if a concrete product requirement justifies:
- separate material authority;
- admin linking/unlinking policy;
- migration semantics;
- pricing implications;
- rendering/state validation changes.

Until then, implementations must preserve the fixed linkage.
