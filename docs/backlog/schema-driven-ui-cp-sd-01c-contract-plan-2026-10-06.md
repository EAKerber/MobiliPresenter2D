# CP-SD-01C — view/profile/shell contract freeze — 2026-10-06

Status: **IN PROGRESS**.

Parent:
- `docs/backlog/schema-driven-ui-cp-sd-01-contract-plan-2026-10-06.md`

Inputs:
- CP-SD-00 audit: `docs/architecture/schema-ui-authority-audit-2026-10-06.md`
- CP-SD-01A merged via PR #104 at `460869cfb12bf31e95fa09d915446c2f75c47c19`
- CP-SD-01B merged via PR #105 at `998b470364816112cc9003ff198104ee37544227`

## Goal

Freeze the remaining presentation/schema boundary before buyer UI generation work begins.

CP-SD-01C must establish, without yet performing the visual redesign:

- explicit item availability vs stage ownership;
- one named application layout-profile contract;
- one schema-shaped presentation policy for Modules companion/detail, scene PiP capability and persistent bottom dock;
- minimum authored material null/default semantics;
- the final unpublished administration candidate that can carry those policies through migration/validation.

The checkpoint is split so each change remains reviewable.

## CP-SD-01C1 — semantic queries + topology/presentation policy — COMPLETE / PASS

This is the immediate slice.

### Scope

1. Replace ambiguous `stageHas(_stageId,itemId)` with explicit queries:
   - `itemAvailable(flow,itemId)`
   - `stageOwns(flow,stageId,itemId)`

2. Add one pure layout-profile authority:
   - `side-rail`
   - `stacked`
   - `compact`

   Initial thresholds preserve current behavior:
   - side-rail: >1050 px
   - stacked: 701–1050 px
   - compact: <=700 px

   Numeric thresholds remain implementation authority; persisted presentation policy references profile names only.

3. Add one schema-shaped presentation policy default that describes the desired future topology without yet changing CSS/runtime geometry:
   - Modules primary list + detail companion relation over one semantic section;
   - companion projections:
     - side-rail -> side-panel
     - stacked -> side-panel
     - compact -> replace
   - scene PiP available in `stacked` and `compact`;
   - stacked PiP activation is manual;
   - compact preserves the current auto-after-anchor behavior;
   - persistent bottom dock enabled with `estimate` + `primary-action` slots.

4. Extend the presentation contract validator to fail closed on:
   - unknown profile names;
   - unknown view components;
   - broken companion target;
   - companion cycles;
   - unknown projection mode;
   - invalid PiP activation;
   - unknown shell slot.

5. Expose the current resolved layout profile to the buyer runtime/debug contract without changing visual behavior.

### Non-goals

- no drawer implementation;
- no PiP behavior change yet;
- no bottom dock CSS yet;
- no administration schema-version bump;
- no production write.

### Gates

- focused layout-profile/presentation-policy unit tests;
- app unit suite;
- Flow layout browser;
- Keyboard browser;
- Mobile browser;
- Stone browser;
- Summary/Pricing browser;
- App build purity;
- Current asset gates;
- Current variant fidelity;
- Netlify deploy preview.

### C1 stop rule

If a presentation policy requires CSS values, coordinates, transient scroll state or duplicated module ownership, stop and shrink the contract.

### C1 completion record

Result: PASS on functional head `b7716089175e2d7e324c95c8447be631cf5964de`.

Implemented:
- normalized flow now exposes separate `stageOwns(flow, stageId, itemId)` and `itemAvailable(flow, itemId)` queries;
- buyer runtime removed the ambiguous `stageHas(_stageId, itemId)` helper and now uses normalized-flow availability for the prior runtime decisions;
- `ConfiguratorLayoutProfiles2D 1.0` is the named topology authority for `side-rail`, `stacked`, and `compact`;
- current 1050/700 CSS projections are pinned by tests to those canonical thresholds until CP-SD-03 replaces the legacy media-query topology implementation;
- `ConfiguratorPresentation2D 1.1` now validates stage views, companion relations, per-profile projection, PiP profile/activation policy and shell dock slots;
- default policy represents Modules list/detail as two views over one semantic section, stacked+compact PiP capability, and a persistent estimate/primary-action dock;
- buyer startup/reload validates policy against the normalized flow and exposes current profile/policy/semantic queries for regression inspection;
- no visual behavior, administration schema version or production configuration changed.

Gates:
- App build purity — PASS;
- Current variant fidelity — PASS;
- Current asset gates — PASS;
- Admin hierarchy browser — PASS;
- Flow layout browser — PASS;
- Keyboard browser — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Netlify deploy preview #106 — PASS.

No production write.

## CP-SD-01C2 — authored material semantics — IN PROGRESS

Detailed plan:
- `docs/backlog/schema-driven-ui-cp-sd-01c2-material-semantics-plan-2026-10-06.md`.

Purpose: make authored absence explicit instead of silently synthesizing a color.

Target rule:

- current schema material `color` is either a valid hex color or explicit `null`;
- field absence is invalid in the consolidated schema;
- `null` means “no authored tint/color”;
- renderer/admin may use display-only fallback for a swatch, but that fallback is never persisted as authored color;
- v3/v4 legacy migration converts existing real source colors into explicit values, so current production appearance is unchanged.

No inheritance engine is introduced.

Required proof:
- explicit null survives normalize/round-trip;
- absent color fails current-schema validation;
- legacy current materials migrate with identical colors;
- no current catalog/scene visual behavior changes for existing data.

## CP-SD-01C3 — consolidated unpublished administration candidate

Purpose: freeze the final schema candidate before CP-SD-02.

Preferred candidate:
- `ConfiguratorAdministration2D 5.0`
- top-level presentation policy using the CP-SD-01B/01C contracts.

Migration:
- v3 -> deterministic hierarchy -> deterministic presentation policy -> v5
- v4 -> deterministic presentation policy -> v5

The admin may use v5 internally, but production publication remains blocked.

v5 must preserve:
- Stage -> Group -> Section -> Item semantic hierarchy;
- executable section component identity;
- view/companion policy;
- layout-profile references;
- PiP capability policy;
- shell dock capability;
- explicit material null/value semantics.

Down-projection:
- unchanged legacy-equivalent content may still use the guarded v3 compatibility save only where existing safety rules prove it;
- any hierarchy/presentation-policy/material-semantic change that cannot be represented losslessly in v3 fails closed with publication-required state.

Server:
- continues to reject direct v5 publication until CP-SD-06 authenticated migration support is deliberately enabled.

## CP-SD-01C completion gate

PASS when:

- semantic availability and stage ownership are separate;
- presentation topology references named profiles, not pixels;
- Modules companion is representable without duplicate hierarchy ownership;
- PiP policy can enable stacked+compact profiles without storing transient PiP state;
- persistent estimate/action dock is representable as shell policy;
- material null/value semantics are explicit;
- v3/v4 deterministically upgrade to the consolidated unpublished candidate;
- current buyer behavior is still representable and all gates remain green;
- no production configuration is written.

Then CP-SD-02 may remove static semantic UI fallback surfaces against a stable contract.
