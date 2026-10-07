# CP-SD-02A2c0 — Lighting specialization discovery — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- `docs/backlog/schema-driven-ui-cp-sd-02a2b-additional-services-section-shell-2026-10-07.md`

## Purpose

Determine the smallest safe way to remove Lighting's remaining static semantic shell without accidentally moving scene/dependency logic into a generic renderer.

This checkpoint changes **no runtime behavior**.

## Questions to answer

1. Which Lighting responsibilities are semantic section concerns?
   - section id/label;
   - section behavior;
   - executable component;
   - normalized item membership.

2. Which responsibilities are legitimate specialized item/state concerns?
   - dependency on lateral refrigerator + overhead sink module;
   - scene visibility/layer updates;
   - disabled/enabled state;
   - pricing/summary contribution;
   - persisted buyer state.

3. Which current code paths bind directly to `lighting-08` or `#lightingToggle`?
4. Can the existing toggle-list renderer host Lighting without domain-specific section markup?
5. Is a generic item-state adapter sufficient, or does Lighting require a dedicated component adapter?
6. What negative fixture proves missing Lighting data produces no UI and no scene side effect?

## Expected output

Persist one compact authority map covering:
- `app/index.html`;
- Lighting-related branches in `app/app.js`;
- scene/layer state coupling;
- pricing/summary coupling;
- keyboard/flow tests;
- candidate migration seam.

## Stop rule

If making Lighting generic would require:
- embedding scene dependency rules in a generic toggle-list renderer;
- introducing a broad item-effects framework;
- changing pricing or buyer-state semantics;
- touching Modules/PiP/dock;

stop and define a smaller adapter boundary instead.

## Exit

PASS when the repository contains enough evidence to choose exactly one next implementation slice, expected to be one of:

- **A2c1 — generated Lighting section shell only**, preserving a specialized item adapter; or
- **A2c1 — extract Lighting item-state adapter first**, with section generation deferred.

No implementation belongs in A2c0.


## Completion record

PASS.

Result:
- `docs/architecture/schema-driven-ui-cp-sd-02a2c0-lighting-discovery-result-2026-10-07.md`.

Decision:
- next implementation is **CP-SD-02A2c1 — generated Lighting section shell with item-affinity slot matching**;
- preserve the current specialized Lighting item adapter and dependency/scene/pricing behavior;
- do not introduce a generic item-effects framework in this track.
