# CP-SD-04A0 — interaction affordance discovery result — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- `docs/backlog/schema-driven-ui-cp-sd-04a0-interaction-affordance-discovery-2026-10-07.md`.

## Conclusion

The roadmap items split cleanly into two independent execution slices:

1. buyer Modules card inspection/inclusion affordance;
2. admin password reveal affordance.

They should not be implemented together.

No domain schema, auth policy, credential persistence or generic component framework is required.

## Modules card — current ownership

### DOM

`renderModuleControlsFromData()` currently creates:

- `article.module-card`;
- `label.module-card__toggle`;
- checkbox `[data-module-toggle]`;
- module number + title/dimensions inside the label;
- separate `button.module-card__detail[data-select-entity]` with visible copy “Ver”.

Because number/title/copy live inside the checkbox label, clicking most of the visible card body currently changes **inclusion**, not **inspection**.

This conflicts with the intended mental model:
- body -> inspect;
- checkbox -> include/exclude.

### Events / state

Inclusion owner:
- delegated `change` on `#moduleList`;
- `[data-module-toggle]`;
- `setEntityVisibility(...)`.

Inspection owner:
- delegated `click` on `[data-select-entity]`;
- `selectEntity(entityId, "list")`;
- existing `detailOrigin`, close focus, compact replace, scene/PiP paths.

These are already correctly separated in state/domain logic. A1 should change only the affordance projection.

## Recommended semantic DOM

Keep the outer card non-interactive:

```html
<article class="module-card">
  <label class="module-card__toggle">
    <input type="checkbox" data-module-toggle="...">
    <span class="sr-only">Incluir ...</span>
  </label>

  <button class="module-card__inspect" data-select-entity="...">
    <span class="module-number">...</span>
    <span class="module-card__copy">...</span>
    <span class="module-card__inspect-affordance" aria-hidden="true">›</span>
  </button>
</article>
```

Rationale:
- no nested interactive controls;
- checkbox is the only inclusion target;
- inspection body is a real button with native Enter/Space semantics;
- Tab order remains two controls per card, as today;
- number/title/dimensions become inspection surface;
- the visually heavy “Ver” button disappears without hiding the action from assistive tech;
- the existing `data-select-entity` event/focus path remains reusable.

Do **not**:
- turn the whole article into a button;
- wrap the inspection button in the checkbox label;
- emulate a button with click handlers on a non-interactive div/article.

## Checkbox hit target

The label should own only a generous checkbox region, at least the existing 44×44 interaction size.

The visual checkbox may remain 18×18 inside it.

This preserves:
- native checkbox semantics;
- accessible state;
- large pointer target;
- separation from card-body inspection.

## Blocked / event-controlled modules

Current runtime disables the checkbox when inclusion is controlled by an event.

A1 should preserve the inspection button as enabled even when the checkbox is disabled.

Blocked means “cannot directly change inclusion”, not “cannot inspect”.

## Keyboard contract

Custom Modules keyboard behavior remains unchanged:
- ArrowLeft/ArrowRight -> inspection navigation;
- digits -> module inspection;
- Space in the custom Modules model -> inclusion toggle;
- Escape -> close inspection.

Tab traversal:
- checkbox remains focusable when enabled;
- inspect button remains independently focusable;
- disabled checkbox is skipped natively while inspection remains reachable.

Native Enter/Space on the inspect button should open detail when the user reaches it by Tab. This does not replace the stage-level custom shortcuts.

## Focus / compact projection

Keep `data-select-entity` on the inspection button.

That preserves:
- `storeDetailOrigin()`;
- close -> return to the inspect button;
- compact `replace` focus repair;
- profile round trips;
- current detail navigation fallback.

## Module-card execution gate

A1 must prove:
- clicking checkbox hit area changes inclusion only;
- clicking number/title/dimensions opens detail only;
- clicking body never toggles inclusion;
- disabled/event-controlled checkbox does not disable inspection;
- exactly two semantic controls per ordinary card: checkbox + inspect button;
- no nested interactive control;
- Tab + Enter opens detail;
- Tab + Space on checkbox toggles inclusion;
- existing Arrow/numeric/Space/Escape module keyboard model remains deterministic;
- close restores focus to the inspect button;
- compact replace and stacked pane behavior remain green.

## Password inventory

Two live password fields exist in the current admin surface:

1. `#passwordInput`
   - file: `app/admin.html`;
   - login form;
   - `type="password"`;
   - `autocomplete="current-password"`;
   - consumed by `app/admin/admin.js` login path.

2. `#newPasswordInput`
   - file: `app/admin.html`;
   - invite/recovery password action form;
   - `type="password"`;
   - `autocomplete="new-password"`;
   - `minlength="8"`;
   - consumed by `app/admin/admin.js` invite/recovery path.

No reveal control currently exists.

## Recommended password reveal pattern

A2 should add one reusable **admin-local** reveal helper/pattern, not a global framework:

- button adjacent to each password input;
- `type="button"`;
- toggles only `input.type` between `password` and `text`;
- `aria-pressed` reflects reveal state;
- accessible label/title switches between “Mostrar senha” and “Ocultar senha”;
- does not alter value, autocomplete, minlength, form submission or Identity/auth calls;
- resets safely when the corresponding form/state is reset or replaced if needed.

The two fields may share a small helper in `app/admin/admin.js` and one CSS pattern in `app/admin/admin.css`.

## Slice split

### CP-SD-04A1 — Modules card affordance execution

Buyer-only interaction cleanup.

Expected files:
- `app/app.js`;
- `app/styles.css`;
- buyer source/browser tests.

### CP-SD-04A2 — admin password reveal execution

Admin/auth-surface affordance only.

Expected files:
- `app/admin.html`;
- `app/admin/admin.js`;
- `app/admin/admin.css`;
- focused admin/source tests.

Do not couple A2 to A1.

## Non-goals

Do not:
- alter module inclusion rules;
- change module detail content;
- change item/domain schema;
- add auth policy;
- store credentials;
- change Netlify Identity behavior;
- build a generic component library;
- write production configuration.

## Next

Execute A1 first:
- `docs/backlog/schema-driven-ui-cp-sd-04a1-module-card-affordance-execution-2026-10-07.md`.

Then A2:
- `docs/backlog/schema-driven-ui-cp-sd-04a2-admin-password-reveal-execution-2026-10-07.md`.
