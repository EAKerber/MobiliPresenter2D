# CP-SD-02A2d0 — Acabamentos family discovery — 2026-10-07

Status: **COMPLETE / PASS (documentation-only)**.

Parent:
- `docs/architecture/schema-driven-ui-cp-sd-02a0-renderer-inventory-2026-10-07.md`
- completed Services/Lighting shell work through PR #114.

Goal:
- choose the smallest safe Acabamentos section-family migration after Lighting, before changing buyer runtime again.

## Scope

Inspect only the remaining static semantic sections under the normalized `finishes` stage:
- `fronts`;
- `handles`;
- `stone-packages`;
- `stone-skirting`.

Classify:
- component family;
- item ownership;
- existing item/state renderer;
- coupling that must remain outside the section-shell migration;
- smallest negative absence proof.

No runtime, schema, pricing, catalog, scene, asset or production write belongs to A2d0.

## Gate

PASS only if:
- one next family can be isolated without changing domain semantics;
- current `mountStageGroups()` / neutral-slot seam is sufficient or a missing infrastructure blocker is named explicitly;
- later families remain separately bounded;
- the next implementation slice has explicit stop rules and absence proof;
- `CURRENT_STATE.md` and the canonical roadmap point to the same next checkpoint.

Result:
- `docs/architecture/schema-driven-ui-cp-sd-02a2d0-finishes-family-discovery-result-2026-10-07.md`.

Immediate next:
- `docs/backlog/schema-driven-ui-cp-sd-02a2d1-fronts-shell-2026-10-07.md`.
