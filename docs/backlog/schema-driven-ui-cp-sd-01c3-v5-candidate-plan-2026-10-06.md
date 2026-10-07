# CP-SD-01C3 — consolidated unpublished administration candidate — 2026-10-06

Status: **COMPLETE / PASS**.

Parent:
- `docs/backlog/schema-driven-ui-cp-sd-01c-contract-plan-2026-10-06.md`

Baseline:
- CP-SD-01A merged via PR #104.
- CP-SD-01B merged via PR #105.
- CP-SD-01C1 merged via PR #106.
- CP-SD-01C2 merged via PR #107 at `c9df1a6fd8094cf9893b89f9e5b46c7134de1eab`.
- production remains on the guarded published v3 boundary.

## Goal

Freeze one **unpublished current administration candidate** that carries all schema decisions made in CP-SD-01 without publishing or changing production.

Candidate:

```text
ConfiguratorAdministration2D 5.0
```

The v5 document must be able to represent, in one validated model:

- Stage -> Group -> Section -> Item semantic hierarchy;
- explicit section interaction behavior plus executable section component identity;
- the validated presentation policy from CP-SD-01C1;
- explicit authored material `color: hex | null` semantics;
- existing non-hierarchy administration data unchanged.

v4 remains a historical/intermediate import format. Do not redefine v4 in place.

## v5 shape

### Top level

v5 keeps the existing administration payload and changes only the hierarchy/presentation boundary:

```json
{
  "schemaVersion": "ConfiguratorAdministration2D 5.0",
  "revision": 1,
  "stages": [],
  "presentationPolicy": {},
  "materials": [],
  "...": "existing administration domains"
}
```

`presentationPolicy` is required and validates against `ConfiguratorPresentation2D 1.1` plus the canonical layout-profile vocabulary.

### Section

v5 section representation:

```json
{
  "id": "handles",
  "label": "Puxadores",
  "behavior": "selection",
  "component": "choice-grid",
  "itemIds": ["handles-all"]
}
```

`behavior` is explicit section semantics and is not inferred from the visual component. This is required because a section can expose a primary inspect/selection interaction even when its items also have a secondary toggle capability (Modules is the current concrete case).

There is **no parallel persisted legacy `presentation` string** in v5.

That is important: `component` is the executable current authority. Keeping both `presentation` and `component` would recreate the duplicate authority CP-SD-01B was intended to remove.

### Group

Current `columnSpan` remains temporarily because it is already an authored hierarchy/presentation primitive in the admin and is required to losslessly import v4.

It is not a CSS pixel value.

Later CP-SD-02/03 may decide whether group span belongs under a richer presentation object; C3 must not broaden the schema merely for naming purity.

## Migration

### v3 -> v5

Deterministic pipeline:

```text
v3
 -> normalize current v3 domains
 -> derive hierarchy from canonical hierarchy defaults
 -> resolve every legacy section presentation to one executable component
 -> attach validated default presentation policy
 -> validate v5
```

No renderer participates in migration.

### v4 -> v5

Deterministic pipeline:

```text
v4
 -> validate v4 historical schema
 -> preserve hierarchy identity/order/ownership
 -> convert each legacy section presentation to explicit component
 -> attach validated default presentation policy unless a current supported policy is already present
 -> preserve compatibility metadata
 -> validate v5
```

### v5 -> v5

Normalize idempotently. No fallback or re-derivation of an unknown component.

## Compatibility / safe v3 projection

The existing admin must remain able to save **only legacy-equivalent changes** to production v3 until authenticated v5 publication is implemented.

Therefore v5 keeps the current compatibility proof boundary.

Projection:

```text
v5 candidate
 -> flatten semantic hierarchy into a v3 candidate
 -> normalize as v3
 -> migrate projected v3 back to v5
 -> compare the current v5 publication signature
```

The publication signature must include:

- hierarchy identity/order/labels/enabled state;
- group span;
- section interaction behavior and executable component;
- section item order/ownership;
- presentation policy.

If any of those cannot be recovered from v3 exactly, projection returns:

```text
hierarchy_requires_publication
```

Thus:
- ordinary object/pricing/material edits remain saveable when v5 structure/policy is baseline-equivalent;
- hierarchy/component/policy changes are never silently flattened;
- explicit material null/value data is projected because v3 already carries materials and CP-SD-01C2 proved that representation is lossless.

## Admin behavior in C3

The hierarchy admin should use v5 internally.

Section presentation editor becomes a **component selector** backed by the closed executable component registry.

Expected labels may remain user-friendly, but values are component IDs.

Examples:

- `choice-swatches`
- `choice-grid`
- `choice-cards`
- `selection-list`
- `toggle-list`
- `action-list`

The editor must not expose `auto`.

New/split sections choose a deterministic component from item interaction behavior at creation time. There is no hidden runtime auto resolution in a persisted v5 document.

The presentation policy is loaded/validated in v5 but is not yet made fully editable in this checkpoint.

## Flow/runtime compatibility

`flow-model.js` must accept v5 section `component` and expose it to the normalized flow.

The presentation contract already treats an explicit component as authoritative.

The buyer remains on production v3 until CP-SD-06; C3 therefore changes no buyer-visible production semantics.

## Server boundary

The Netlify configuration endpoint must explicitly recognize v5 and reject direct publication with the same authenticated migration boundary as v4.

Required response remains:

```text
hierarchy_publication_required
```

Do not enable v5 writes in C3.

The isolated `persist-handles-all` v3 operation remains unchanged.

## Version authorities

After C3:

- `ConfiguratorAdministration2D 3.0` — current published legacy schema;
- `ConfiguratorAdministration2D 4.0` — historical/intermediate hierarchy schema supported for deterministic import;
- `ConfiguratorAdministration2D 5.0` — current unpublished repository administration candidate;
- `ConfiguratorPresentation2D 1.1` — executable presentation/policy contract;
- `ConfiguratorLayoutProfiles2D 1.0` — named topology profile authority.

No version is silently redefined.

## Required tests

Migration/normalization:

1. current default v3 -> v5;
2. v3 -> v5 deterministic across repeated migration;
3. historical v4 -> v5 preserves stage/group/section/item structure;
4. v4 `swatches/grid/cards/list/auto` resolve deterministically to explicit behavior + component pairs;
5. v5 normalization is idempotent;
6. v5 contains no persisted section `presentation` field;
7. v5 always contains a validated presentation policy;
8. v5 explicit material null survives migration/normalization.

Validation:

9. unknown behavior or component fails;
10. missing component fails;
11. invalid presentation policy fails;
12. missing presentation policy fails;
13. duplicated semantic item ownership still fails;
14. mixed section behavior still fails;
15. component/behavior incompatibility fails where the executable component has incompatible interaction semantics.

Projection:

16. untouched v3 -> v5 -> v3 equals current normalized v3;
17. legacy-equivalent non-hierarchy edit projects successfully;
18. group/section reorder fails projection;
19. component change fails projection;
20. presentation-policy change fails projection;
21. explicit material null projects losslessly;
22. v3 projection -> v5 round-trip reproduces the publication signature.

Admin/browser:

23. admin loads v3 source as v5 internal model;
24. component selector exposes executable IDs, not `auto/swatches/grid/cards/list`;
25. representable ordinary edit still saves v3 safely;
26. component change is blocked from legacy save with publication-required message;
27. Puxadores isolated v3 persistence operation remains green.

Server:

28. direct v4 publication remains explicitly rejected;
29. direct v5 publication is explicitly rejected;
30. unsupported operation remains rejected;
31. `persist-handles-all` remains v3-only and independently verified.

## Gate

PASS requires all current repository gates:

- App build purity;
- Current variant fidelity;
- Current asset gates;
- Admin hierarchy browser;
- Flow layout browser;
- Keyboard browser;
- Mobile browser;
- Stone browser;
- Summary/Pricing browser;
- Netlify deploy preview;
- focused v3/v4/v5 migration and projection unit tests.

No production configuration write.

## Definition of done for CP-SD-01

If C3 passes, CP-SD-01 is complete when documentation records:

- v5 as the frozen unpublished current administration candidate;
- v3 as current production legacy;
- v4 as historical deterministic import only;
- v5 direct publication still server-blocked;
- CP-SD-02 may now remove static semantic buyer UI fallback surfaces against this stable contract.

No further schema fields should be added in CP-SD-01 unless a failing gate demonstrates a missing semantic requirement.


## Gate-discovered correction — explicit section behavior

The first v5 unit run exposed a real semantic loss in v4: Modules items have item capability `toggle`, while the canonical Modules section intentionally has primary section behavior `selection` (inspect/detail). v4 persisted only `presentation: list`, so deriving v5 behavior exclusively from item kind incorrectly produced `toggle-list`.

Decision:
- v5 persists `section.behavior` explicitly;
- v3/v4 migration restores an explicit behavior from the canonical hierarchy template when the section has one, otherwise from homogeneous item capabilities;
- `section.component` must be compatible with the persisted section behavior;
- item capability remains a separate secondary/domain capability and is not overwritten by section behavior.

This is a contract correction required by a failing gate, not a new generic interaction engine.


## Completion record

Result: **PASS** on reviewed head `7ff4746cfb60acaada1c91bf87fc54958bc957cf` in PR #108.

Implemented:
- `ConfiguratorAdministration2D 5.0` is the frozen unpublished repository administration candidate;
- v3 remains the published legacy schema and deterministically upgrades through the historical hierarchy boundary into v5;
- v4 remains an unchanged historical/intermediate import schema and deterministically upgrades to v5;
- v5 sections persist explicit `behavior` + executable `component`; the legacy `presentation` field is rejected;
- the first v5 gate exposed the Modules distinction between section-level primary `selection` behavior and item-level secondary `toggle` capability; migration now restores stage-aware section behavior from canonical hierarchy semantics before falling back to homogeneous item capability;
- `presentationPolicy` is required and validated against `ConfiguratorPresentation2D 1.1` and the named layout-profile authority;
- v5 safe projection to current v3 round-trips back through v5 and compares the publication signature, so hierarchy, behavior, component or presentation-policy changes cannot be silently flattened;
- admin uses v5 internally, exposes only behavior-compatible executable components, and continues to PUT only losslessly projectable v3 payloads;
- direct v4 and v5 publication remain explicitly server-blocked with `hierarchy_publication_required`;
- the isolated `persist-handles-all` v3 repair remains independent;
- no production configuration was written.

Final gates on `7ff4746cfb60acaada1c91bf87fc54958bc957cf`:
- App build purity — PASS;
- Current variant fidelity — PASS;
- Current asset gates — PASS;
- Admin hierarchy browser — PASS;
- Flow layout browser — PASS;
- Keyboard browser — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- focused v3/v4/v5 migration/projection unit suite — PASS through App build purity;
- Netlify deploy preview #108 — PASS.

### Frozen version authority after C3

- `ConfiguratorAdministration2D 3.0` — current production legacy schema;
- `ConfiguratorAdministration2D 4.0` — historical/intermediate deterministic import schema;
- `ConfiguratorAdministration2D 5.0` — frozen unpublished current repository candidate;
- `ConfiguratorPresentation2D 1.1` — executable presentation/policy contract;
- `ConfiguratorLayoutProfiles2D 1.0` — named topology profile authority.

CP-SD-01 is complete. The next repository checkpoint is **CP-SD-02 — remove static semantic buyer-UI fallback surfaces and make buyer composition fully data-driven/fail-closed against the frozen contract**.
