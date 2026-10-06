# Published configuration compatibility audit — 2026-10-05

Production source: `https://mobilipresenter2d.netlify.app/api/configuration`.

## Observed published record

- schema: `ConfiguratorAdministration2D 3.0`
- revision: `3`
- stages: `modules`, `finishes`, `services`, `summary`
- `stone-all`: assigned to `finishes`
- `stone-skirting`: not assigned to any stage
- `stone-skirting`: selected in `initialState.services`
- `handles-all`: not assigned to any stage

## Compatibility result

- current core normalization accepts the published payload;
- current static defaults no longer need repair;
- `repairSkirtingStageContract()` still changes the published payload by adding the missing `stone-skirting` control beside `stone-all`;
- therefore the remaining published-record compatibility shim cannot yet be removed safely.

The omission of `handles-all` was **not** treated as corruption in the 2026-10-05 audit: unlike the selected-but-unreachable skirting toggle, an administrator could intentionally omit the handle selector. No automatic repair was therefore authorized by that audit.

## Product requirement update — 2026-10-06

Subsequent buyer/admin review clarified that this optionality no longer matches the intended product:

- Puxadores must be a first-class section under Acabamentos;
- the admin hierarchy must expose that section from configuration rather than relying on buyer renderer markup;
- the buyer runtime must not use a hardcoded renderer shell as a semantic substitute for a missing published assignment.

Therefore the old **“do not auto-add `handles-all`”** rule is superseded by a narrower rule:

- do **not** inject `handles-all` automatically at runtime or during unrelated housekeeping;
- if a fresh authenticated production read still shows `handles-all` unassigned, perform a deliberate, separately reviewed product-configuration write assigning it to Acabamentos/finishes;
- read back and prove that assignment is the only intended semantic change;
- smoke both buyer Puxadores navigation and the admin hierarchy before using that record as the v3 -> v4 migration source.

This product-configuration write remains separate from the `stone-skirting` housekeeping repair. Keeping them separate preserves attribution and makes the later schema migration equivalence proof simpler.

## Required one-time migrations

First, persist a production revision that differs only by assigning `stone-skirting` to the stage that contains `stone-all` while preserving all other published administration choices.

After that housekeeping repair is proven and its runtime shim is retired, freshly re-read production. If `handles-all` is still unassigned, persist a second production revision that differs only by assigning `handles-all` to Acabamentos/finishes. The existing configuration endpoint already provides revision conflict protection and requires an authenticated `admin` PUT.

After that write:

1. GET the published configuration again;
2. confirm `stone-skirting` is assigned exactly once beside `stone-all`;
3. confirm the revision incremented;
4. confirm `repairSkirtingStageContract()` becomes a no-op;
5. run Stone browser and Keyboard browser against production;
6. only then remove the remaining compatibility repair from `runtime-contracts.js`.

## Why migration is not performed by housekeeping automation

The production PUT endpoint is intentionally admin-authenticated. Repository and deploy tooling available to this maintenance session does not carry that end-user/admin identity. The audit must not bypass authorization, turn a public GET into a write, or infer credentials.

Until an authenticated publication is made, keeping the compatibility shim is the correct fail-safe behavior.
