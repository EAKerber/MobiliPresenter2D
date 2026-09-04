# R1 — Evidence-based branch hygiene

Status: candidate

## Purpose

Extract the useful branch-cleanup invariant from MobiliPresenter without importing its scheduler/agent stack or making `gh` a runtime dependency.

The R1 path is deliberately small:

`GitHub/git observation -> pure plan -> exact planHash -> reobserve -> point deletes -> full ref readback`

## Safety boundary

A branch prefix or name never authorizes deletion. Protection wins over deletion evidence. `main`, GitHub-protected branches, explicit preserves, and any branch currently participating in an open PR are kept.

Automatic evidence is intentionally narrow: a non-control branch whose current head is an ancestor of current `main`. A diverged branch requires an explicit terminal disposition bound to its exact current SHA.

Before apply, the executor rematerializes the whole observation and plan. Any changed branch inventory, control head, PR relationship, branch SHA, policy, or plan hash blocks mutation. After every delete, the complete remote branch inventory must equal the expected inventory with only that exact ref removed.

## R0 cleanup dispositions

Two R0 branches are automatically explainable by ancestry after PR #1 merged:

- `work/r0-baseline-freeze`
- `work/r0-baseline-tools-stage`

Two diverged branches require explicit terminal records:

- `work/r0-baseline-freeze-check` — validation-only branch, exact SHA recorded;
- `incoming/r0-v3.3.0` — completed binary import carrier, exact SHA plus archive/materialization evidence recorded.

The pull-request workflow is dry-run only. Scheduled and manual runs are also audit-only. Destructive apply occurs only on a push to `main` that changes this hygiene policy/tooling, after the same code has had a PR opportunity to expose its plan.

## Non-goals

No scheduler supervisor, leases, peer recovery, agent lifecycle, branch-prefix heuristics, force updates, or `gh` executable are introduced.
