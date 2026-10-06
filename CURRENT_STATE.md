# CURRENT_STATE — MobiliPresenter2D

Updated: 2026-10-05
Authority: live `main` plus the canonical housekeeping roadmap linked below.

## Purpose

This is the first resume point for future work. Read this file before reconstructing state from chat history.

Do not treat an embedded commit SHA as the permanent current `main` head. Query `main` live. The last fully proven near-official product candidate is:

- `b969bb471831d405fd6e1c9c15bf761176885cdd`

Later housekeeping/documentation commits may advance `main` without changing buyer-visible product behavior.

## Current status

Housekeeping of repository/runtime legacy is substantially complete.

Completed and merged:
- legacy skirting SVG painter removed; `plinthCanvas` is authoritative;
- permanent runtime presentation contracts separated from compatibility migration logic;
- `stone-skirting` canonicalized as a real catalog service;
- proven empty orphan assets removed;
- old work/audit/research branches reconciled and pruned;
- current product gates separated from historical replay;
- near-official candidate fan-out passed all current product gates.

Deferred intentionally:
- PR #34 / `feat/exposed-sides-and-glass`: product-value decision, not housekeeping debt.

## Current P1

The only remaining architecture cleanup that affects current production configuration is the published-administration compatibility migration.

Production historically contained:
- `ConfiguratorAdministration2D 3.0`;
- `stone-all` assigned to an enabled stage;
- `stone-skirting` selected in `initialState.services`;
- `stone-skirting` missing from published stage assignment.

Buyer runtime is safe because `repairSkirtingStageContract()` repairs that contradiction in memory.

Next safe checkpoint:
1. authenticate through the real admin boundary;
2. re-read the live published administration;
3. fail closed if revision/content no longer matches assumptions;
4. persist exactly one semantic change: assign `stone-skirting` beside `stone-all`;
5. read back and prove every unrelated field is unchanged;
6. prove the runtime repair becomes a no-op;
7. only then remove the compatibility shim in a dedicated repository PR;
8. rerun current product gates and production Stone + Keyboard smokes.

Do not auto-add `handles-all`.

## Active authorization boundary

The public Netlify site is not protected by site-level password or SSO. The admin boundary is application-level Netlify Identity:
- `admin.html` logs in with `@netlify/identity`;
- the account must include role `admin`;
- `PUT /api/configuration` independently re-checks the authenticated user and admin role server-side before writing the strong-consistency Blobs store;
- the write is revision-guarded and returns 409 on concurrent change.

Current chat sessions can inspect repository/Netlify project state but do not provide an interactive authenticated browser session. To cross this boundary safely, use ChatGPT Work / Cloud Browser for this project, open the production admin page, and enter the admin credentials yourself in the browser session when prompted. Do not paste the password into chat.

Once authenticated, the next operation remains fail-closed: read live config, verify revision/content, add only `stone-skirting` beside `stone-all`, publish, read back, prove unrelated fields unchanged, then retire the runtime compatibility shim in a separate repository change.

## If authenticated admin access is unavailable

Stop at the current stable product state. Do not invent repository-side progress that bypasses the authorization boundary.

Useful housekeeping may continue only when independently evidenced and unrelated to the published-admin mutation.

## Canonical detail

Read, in order:
1. `docs/backlog/housekeeping-roadmap-and-checkpoint-2026-10-05.md`
2. `docs/architecture/official-candidate-gate-2026-10-05.md`
3. `docs/architecture/runtime-contract-map-2026-10-05.md`
4. `docs/architecture/published-config-compat-audit-2026-10-05.md`

The long roadmap is the detailed authority for backlog, gates, migration procedure and checkpoint acceptance criteria.

## Persistence rule

Update this file whenever a meaningful checkpoint changes:
- current phase;
- active blocker;
- next action;
- official candidate/release authority;
- intentionally preserved branches/PRs.

Do not create a new rotating status file for each chat. Keep this path stable.

For historical evidence, use normal docs/ADRs/PRs; for the current continuation state, update this file.
