# CP-SD-02A2a — Services group shell from normalized flow — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- `docs/architecture/schema-driven-ui-cp-sd-02a0-renderer-inventory-2026-10-07.md`

Purpose:
- remove one more static semantic authority after CP-SD-02A1;
- make the Services **group shell** itself created from normalized flow instead of pre-authored DOM.

This checkpoint is intentionally narrower than a generic renderer rewrite.

## Scope

Only the `services/services` group shell.

Allowed changes:
- remove the static `data-flow-group-shell="services"` wrapper from `index.html`;
- keep the existing `lighting` and `additional-services` section markup/content unchanged;
- let `mountStageGroups()` create a missing group shell when the grid exposes a generic visual shell class contract;
- move the already-existing section elements into that generated shell according to normalized group membership/order;
- mark generated shells for tests/debugging.

Out of scope:
- generating section shells;
- changing toggle-list item rendering;
- changing lighting state/dependency behavior;
- Acabamentos group shells;
- Summary;
- Modules companion;
- PiP/dock/pricing;
- production configuration.

## Invariants

1. no static Services semantic group ID remains in HTML;
2. normalized flow is the only source of the Services group ID and membership;
3. current Services section order/geometry remains unchanged;
4. existing component-binding validation still runs after the generated shell is created;
5. unexpected/omitted sections are still hidden/fail-closed exactly as before;
6. Acabamentos behavior is unchanged;
7. no production write.

## Generic visual hook

The Services grid may declare only visual shell classes, for example:

```html
data-flow-group-class="flow-group-shell flow-group-shell--embedded"
```

This is allowed because it describes renderer appearance, not semantic group identity.

The runtime must not encode the group ID `services` in the shell factory.

## Gate

- Flow layout browser proves `[data-flow-group-shell="services"]` exists after runtime mount and is generated;
- source test proves static HTML no longer contains `data-flow-group-shell="services"`;
- current Services one-column/two-column geometry tests remain green;
- Keyboard browser;
- Mobile browser;
- Stone browser;
- Summary/Pricing browser;
- App build purity;
- Current variant fidelity;
- Current asset gates;
- Netlify preview.

Definition of done:
- current default UI is unchanged;
- the Services group wrapper exists only because normalized flow asked for that group.


## Completion record

Result: **PASS** on reviewed code head `a5a5765adc68d2b7c37fe516ca781396a39454fc` in PR #111.

Implemented:
- removed the static semantic `data-flow-group-shell="services"` wrapper from buyer HTML;
- Services grid now declares only the generic visual shell classes;
- `mountStageGroups()` creates a missing group shell from normalized group identity, marks generated shells and then mounts the existing sections in normalized order;
- current lighting/additional-services section markup and behavior remain unchanged;
- existing component-binding validation remains active after shell generation;
- existing static Acabamentos shells remain unchanged;
- runtime cache revision advanced to `runtime-v16`.

Gates:
- App build purity — PASS;
- Current variant fidelity — PASS;
- Current asset gates — PASS;
- Flow layout browser — PASS;
- Keyboard browser — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Netlify deploy preview #111 — PASS.

No production configuration write.

Next small checkpoint: **CP-SD-02A2b — generate only the `additional-services` section shell from normalized flow while retaining its existing toggle-list content renderer.** Lighting remains static because its dependency/state adapter is still specialized.
