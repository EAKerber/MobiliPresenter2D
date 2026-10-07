# CP-SD-04A2 — admin password reveal execution — 2026-10-07

Status: **READY / QUEUED AFTER A1**.

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
