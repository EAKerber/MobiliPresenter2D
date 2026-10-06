# CP-SD-01B — executable presentation contract — 2026-10-06

Status: **NEXT / immediate implementation slice**.

Parent:
- `docs/backlog/schema-driven-ui-cp-sd-01-contract-plan-2026-10-06.md`

Inputs:
- CP-SD-00 audit: `docs/architecture/schema-ui-authority-audit-2026-10-06.md`
- CP-SD-01A capability authority: merged via PR #104 at `460869cfb12bf31e95fa09d915446c2f75c47c19`.

## Problem being solved

The current hierarchy v4 stores section presentation as:

```text
auto | swatches | cards | list | grid
```

but buyer rendering does not actually select/validate a renderer from that field. The value is copied to DOM metadata while section-specific renderers remain known by surrounding markup/runtime.

That is not sufficient for the target rule:

> normalized data says what semantic UI exists and which supported visual component renders it; missing/invalid presentation must fail closed.

## Scope

CP-SD-01B introduces an **internal executable presentation contract** without yet publishing a new administration schema version.

This is intentionally narrower than CP-SD-01C.

Implement:

1. one pure presentation-contract module;
2. one closed vocabulary of renderer component IDs;
3. deterministic legacy hierarchy-presentation -> executable component mapping;
4. normalized flow/layout exposes the resolved component ID;
5. renderer bindings declare which component they implement;
6. binding validation rejects component mismatch/missing binding;
7. focused negative tests.

Do not implement yet:

- lateral companion panel;
- named responsive profile behavior;
- PiP expansion to stacked workspace;
- persistent bottom dock;
- module-card interaction redesign;
- password reveal;
- typed pricing;
- production schema publication.

## Component contract

Initial supported component IDs should be small and behavioral, not CSS-class names.

Proposed vocabulary:

- `choice-swatches`
- `choice-grid`
- `choice-cards`
- `selection-list`
- `toggle-list`
- `action-list`

The current runtime may still use specialized code inside those bindings. The important new rule is that a section binding must explicitly claim the component it renders.

Do not create domain-named component IDs such as `puxadores-ui` merely to move a hard-code.

## Legacy mapping

For v3/v4 compatibility, the presentation contract resolves current strings before rendering.

Deterministic mapping:

- `swatches` -> `choice-swatches`;
- `grid` -> `choice-grid`;
- `cards` -> `choice-cards`;
- `list` / `auto` -> component selected from normalized section interaction behavior:
  - selection -> `selection-list`;
  - toggle -> `toggle-list`;
  - action -> `action-list`.

This mapping is a compatibility normalizer. It is not a runtime fallback for an unknown current component.

Unknown legacy presentation or unknown interaction behavior fails closed.

## Binding contract

Current static section shells are temporary renderer bindings.

Each bound shell declares one component, for example:

```html
data-render-component="choice-swatches"
```

The flow-layout binding gate compares:

```text
normalized section component
        ==
renderer binding component
```

Mismatch is an invariant failure.

A modeled section without a binding remains an invariant failure.

An unmodeled static section is hidden and must not become semantic UI.

This creates a safe bridge to CP-SD-02, where static semantic shells can be replaced by generated component mounts.

## Modules and Summary in this slice

Do not create the companion relation yet.

Modules currently normalizes as a selection/list section; therefore CP-SD-01B may resolve it to `selection-list`. The existing two-view projection remains renderer-level until CP-SD-01C.

Summary currently behaves as an action/list section and may resolve to `action-list`. CP-SD-01B does not redesign its markup.

## Custom stages

Custom v3 stages already normalize deterministically and can contain only one compatible interaction behavior per section.

Their resolved component comes from that behavior using the same compatibility mapping.

No custom-stage domain branch is added.

## Validation / fail-closed requirements

Required errors:

- unsupported legacy presentation;
- unsupported current component;
- unresolved section behavior;
- modeled section has no renderer binding;
- renderer binding declares a different component;
- duplicate renderer binding for the same modeled section.

No error may be repaired by choosing an arbitrary component.

## Required tests

Unit:

1. all current hierarchy defaults resolve to a supported component;
2. current Modules/Finishes/Services/Summary component mapping is deterministic;
3. custom toggle stage resolves to `toggle-list`;
4. unknown presentation rejects;
5. unknown behavior rejects;
6. explicit valid component normalizes unchanged;
7. explicit unknown component rejects.

Layout/binding:

8. current bindings validate;
9. missing section binding is reported;
10. component mismatch is reported;
11. an unexpected/unmodeled static section is reported or hidden according to the existing binding contract.

Browser regression:

12. buyer appearance/semantics remain unchanged for the current data;
13. no duplicate controls;
14. keyboard semantic order remains model-owned.

## Gate

PASS requires:

- App build purity;
- Flow layout browser;
- Keyboard browser;
- Mobile browser;
- Stone browser;
- Summary/Pricing browser;
- Current asset gates;
- Current variant fidelity;
- Netlify deploy preview;
- focused presentation unit suite.

No production configuration write.

## Exit to CP-SD-01C

CP-SD-01C starts only after a section renderer can be selected/validated from a closed executable component contract.

Then CP-SD-01C can safely add:

- companion/master-detail relation;
- named layout profiles;
- scene/PiP policy;
- bottom-dock shell capability;
- final material null/default semantics;
- final persisted administration version candidate.
