# CP-SD-04A2 — admin password reveal execution — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- CP-SD-04A0 interaction affordance discovery — COMPLETE / PASS.

Discovery result:
- `docs/architecture/schema-driven-ui-cp-sd-04a0-interaction-affordance-discovery-result-2026-10-07.md`.

## Goal

Add a standard accessible show/hide control to the two existing live admin password fields without changing authentication or credential handling.

## In scope

- `#passwordInput` — current password / login;
- `#newPasswordInput` — new password / invite-recovery.

## Allowed implementation

- adjacent `type="button"` reveal controls;
- one small admin-local JS helper shared by both fields;
- toggle input `type` only;
- `aria-pressed` + dynamic accessible label/title;
- admin-local CSS.

## Preserve

- input values;
- autocomplete attributes;
- minlength;
- form submission;
- Netlify Identity/auth calls;
- recovery/invite behavior.

## Non-goals

No:
- auth policy changes;
- password persistence;
- strength policy changes;
- generic form framework;
- buyer changes;
- production configuration writes.

## Gates

- source assertion for exactly two reveal controls bound to the two password fields;
- pointer + keyboard toggle proof;
- value preserved across reveal/hide;
- submit/recovery handlers unchanged;
- admin auth tests/source gates green.


## Result

Implemented on PR #144 without changing authentication or credential semantics:

- both live admin password fields now have adjacent non-submit reveal controls;
- one admin-local helper toggles only `input.type` between `password` and `text`;
- `aria-pressed`, accessible label/title and visible `Mostrar` / `Ocultar` copy stay synchronized;
- values, autocomplete, minlength, form submission, recovery/invite behavior and Netlify Identity/auth calls remain unchanged;
- admin asset cache revisions advance explicitly to `admin-affordance-v1`.

Gate corrections were test-harness-only. The first Admin hierarchy run exposed the old `admin-hierarchy-v7` bundle expectation; after that harness was updated, a retry was cancelled during Playwright installation before tests ran. The next retry passed the main hierarchy proof and exposed the same stale cache expectation in the isolated Puxadores persistence harness; that sister harness was updated as well.

Final functional head `77776f504147f0f9ed8718adbe3f41a5a77e61e9` passed all eight repository workflows plus Netlify deploy preview #144. No production configuration write occurred.

**CP-SD-04 — COMPLETE / PASS.** Next checkpoint: `docs/backlog/schema-driven-ui-cp-sd-05a0-typed-pricing-contract-discovery-2026-10-07.md`.
