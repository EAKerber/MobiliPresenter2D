# CP-SD-04A0 — interaction affordance discovery — 2026-10-07

Status: **READY / NEXT — DISCOVERY ONLY**.

Parent:
- CP-SD-03 responsive presentation primitives — COMPLETE / PASS.

Roadmap:
- CP-SD-04 interaction affordance cleanup.

## Goal

Audit the current generic interaction affordances and define the smallest execution slices that improve pointer, keyboard and screen-reader clarity **without adding domain schema**.

This checkpoint is discovery only.

## Known candidate: Modules card

Current buyer rendering creates:
- one `article.module-card`;
- one `label.module-card__toggle` containing the checkbox, number and copy;
- one separate `button.module-card__detail` labelled “Ver”.

Current semantics:
- checkbox changes inclusion/visibility;
- “Ver” opens inspection/detail;
- keyboard module navigation already treats selection/inclusion and inspection as separate concepts.

The roadmap intent is:
- card body inspects/opens detail;
- checkbox remains the only selection toggle target;
- checkbox receives a generous hit target;
- “Ver” becomes an affordance rather than a competing visual button where appropriate;
- avoid nested interactive content.

A0 must determine the semantic DOM pattern before implementation. Do not turn the entire card into a button if that would nest the checkbox.

## Password affordance

The roadmap also names a standard show/hide affordance for password fields.

A0 must first locate every live password input across buyer/admin/auth surfaces and classify:
- current product surface;
- owner file/component;
- whether the field is actually reachable in current builds;
- whether a browser-native/standard accessible reveal control already exists.

If no live password field exists in the current product surfaces, record that fact and do not invent one merely to satisfy the roadmap line item.

## Questions to resolve

1. **Module card pointer contract**
   - which non-checkbox region should open detail;
   - how to avoid accidental inclusion toggles;
   - whether the existing detail button should become visually subtle, sr-only, or be replaced by non-interactive affordance text/icon while a non-nested interaction surface owns inspection.

2. **Module card keyboard contract**
   - preserve current Arrow/numeric/Space semantics;
   - ensure Tab order remains intelligible;
   - define Enter/Space behavior for the inspection affordance without stealing Space from inclusion where the keyboard model already owns it.

3. **Hit area**
   - enlarge the checkbox interaction target without changing its semantic owner;
   - do not use a label wrapping the whole clickable inspection body if that would make inspection clicks toggle inclusion.

4. **Focus return**
   - opening detail from any new card-body affordance must preserve the existing `detailOrigin`/close-return contract.

5. **Blocked/event-controlled modules**
   - inspection should remain possible when inclusion is blocked unless current domain rules explicitly forbid it;
   - disabled inclusion must not disable inspection by accident.

6. **Accessibility**
   - no nested interactive controls;
   - inspection and inclusion have distinct accessible names/states;
   - visible affordance is not misleading about which action occurs.

7. **Password reveal**
   - locate real fields first;
   - use one standard reveal pattern if applicable;
   - no credential persistence or auth-policy changes.

## Required discovery output

Produce one architecture result with:
- current DOM/event/CSS ownership;
- pointer + keyboard + focus state machine;
- recommended semantic DOM for module cards;
- blocked-module behavior;
- password-field inventory;
- smallest implementation slice(s);
- source/browser/accessibility gates;
- explicit non-goals.

## Stop / split

Split rather than expand if the smallest coherent change requires:
- item/domain schema changes;
- module inclusion semantic changes;
- auth policy or credential storage changes;
- a generic component framework unrelated to these affordances;
- redesign of module detail itself;
- production configuration writes.

No production configuration write.
