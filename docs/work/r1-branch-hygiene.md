# R1 — Evidence-based branch hygiene

Status: active

## Purpose

Extract the useful branch-cleanup invariant from MobiliPresenter without importing its scheduler/agent stack or making `gh` a runtime dependency.

The R1 path is deliberately small:

`GitHub/git observation -> pure plan -> exact planHash -> reobserve -> point deletes -> full ref readback`

## Safety boundary

A branch prefix or name never authorizes deletion. Protection wins over deletion evidence. `main`, GitHub-protected branches, explicit preserves, and any branch currently participating in an open PR are kept.

Automatic evidence is intentionally narrow: a non-control branch whose current head is an ancestor of current `main`. A diverged branch requires an explicit terminal disposition bound to its exact current SHA.

Before apply, the executor rematerializes the whole observation and plan. Any changed branch inventory, control head, PR relationship, branch SHA, policy, or plan hash blocks mutation. After every delete, the complete remote branch inventory must equal the expected inventory with only that exact ref removed.

## Trigger policy

Pull-request runs are dry-run only so a change to the hygiene logic can expose its candidate set before integration. Scheduled and manual runs are audit-only.

Every push to `main` performs a fresh observation/plan and may apply that exact plan. This is intentionally not path-filtered: a normal product PR merge must be able to clean its just-integrated branch. The same CAS/readback rules apply to every main transition; a no-candidate plan is a valid no-op.

Branches that must survive a main transition can be listed explicitly in `ops/branch-dispositions.json` under `preserveBranches`.

## R0/R1 bootstrap result

The first accepted R1 plan removed five exact refs and left only `main`:

- `incoming/r0-v3.3.0`
- `work/r0-baseline-freeze`
- `work/r0-baseline-freeze-check`
- `work/r0-baseline-tools-stage`
- `work/r1-branch-hygiene`

Receipt: `deletedCount=5`, `remainingBranchCount=1`, `readback=PASS`.

## Non-goals

No scheduler supervisor, leases, peer recovery, agent lifecycle, branch-prefix heuristics, force updates, or `gh` executable are introduced.
