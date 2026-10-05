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
- therefore `runtime-contracts.js` cannot yet be removed safely.

The omission of `handles-all` is **not** treated as corruption: unlike the selected-but-unreachable skirting toggle, an administrator may intentionally omit the handle selector. No automatic migration should add it.

## Required one-time migration

Persist a new production revision that differs only by assigning `stone-skirting` to the stage that contains `stone-all` while preserving all other published administration choices. The existing configuration endpoint already provides revision conflict protection and requires an authenticated `admin` PUT.

After that write:

1. GET the published configuration again;
2. confirm `stone-skirting` is assigned exactly once beside `stone-all`;
3. confirm the revision incremented;
4. confirm `repairSkirtingStageContract()` becomes a no-op;
5. run Stone browser and Keyboard browser against production;
6. only then remove the compatibility repair from `runtime-contracts.js`.

## Why migration is not performed by housekeeping automation

The production PUT endpoint is intentionally admin-authenticated. Repository and deploy tooling available to this maintenance session does not carry that end-user/admin identity. The audit must not bypass authorization, turn a public GET into a write, or infer credentials.

Until an authenticated publication is made, keeping the compatibility shim is the correct fail-safe behavior.
