# ADR 0003 — Evidence-based branch hygiene

Status: Accepted selectively; destructive automation deferred
Date: 2026-09-03

## Decision

MobiliPresenter2D adopts the evidence rules of the MobiliPresenter branch-hygiene design, not its full scheduler/agent stack and not its dependency on `gh`.

A branch name or prefix is never deletion authority. A branch can become a deletion candidate only from current observable evidence, such as exact-SHA duplication with an integrated branch, ancestry into the control branch, or an explicit terminal disposable operation whose current head is still the recorded head. Protected/control branches and open-PR relations always win over deletion evidence.

Before any delete, the executor must re-observe the candidate ref and control head, require exact SHA equality with the accepted plan, delete only that exact ref, and independently read back that the ref disappeared. Drift or incomplete observation blocks the batch.

## Transport

The conversational GitHub provider currently exposes ref creation/update but not ref deletion. A future destructive carrier may therefore run in GitHub Actions using the repository-scoped `GITHUB_TOKEN` and native `git`/REST calls. `gh` is not a required executable or architectural dependency.

## R0 disposition

No recurring hygiene scheduler is introduced in R0. Cleanup is a maintenance concern, not a product gate.

Current evidence:

- `work/r0-baseline-tools-stage` is an exact-SHA duplicate of the authoritative `work/r0-baseline-freeze` head and is therefore a strong future delete candidate once re-observed.
- `work/r0-baseline-freeze-check` contains two validation-only commits whose net file diff from its integrated base is empty. That is useful terminal evidence, but it is intentionally not auto-deleted merely from its name or tree equivalence.
- `incoming/r0-v3.3.0` is expected to become a terminal import carrier after successful materialization and is a natural future hygiene test case.
