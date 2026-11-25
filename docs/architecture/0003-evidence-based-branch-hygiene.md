# ADR 0003 — Evidence-based branch hygiene

Status: Accepted — exact proof, bounded application and merged-head cleanup
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

## vNext — 2026-11-25

The 52-to-7 campaign demonstrated that the executor is effective, but discovery and batch selection were still agent-driven. The approved evolution retains Observe / Plan / Apply / Series, with no separate UI or service.

- Observe and Plan produce read-only exact merged-head evidence and suggested batches. Discovery reports explicitly carry `authorization: NONE`; they are not execution manifests.
- Automatic ordinary cleanup is authorized only for the exact same-repository head of a merged PR to main or development, on a trusted main checkout, with ancestry or the existing full-tree squash proof, both control workflow scans, no open PR relation, no protection or ruleset ambiguity, exact lease and readback. An unresolved or changed head is preserved. No semantic inference.
- Divergent terminal disposition requires a SHA-pinned decision and an exact archive tag under `archive/m2d/`. Audit never creates tags. Apply creates only absent tags, rejects collisions, verifies before deletion and reads back afterward. Archive branch transfer is exceptional and explicitly pinned; permanent and explicitly preserved refs remain blocked.
- Destructive workflows share one concurrency group. Historical manifests are evidence, not a mandate to replay. Tool-only PRs do not reapply or audit already consumed manifests.
- The legacy 60-ref executor is historical; retain its receipts and archive records, and remove its operational consumers after migration is proven.

### Agent usage (read-only)

```sh
python tools/branch_hygiene_observe.py --control main --output /tmp/obs.json --merged-head-evidence /tmp/evidence.json
python tools/branch_hygiene_plan.py --observation /tmp/obs.json --dispositions ops/branch-dispositions.json --merged-head-evidence /tmp/evidence.json --discovery-output /tmp/discovery.json
```

Use development with the corresponding current disposition file when the control is development. The scheduled/PR Branch hygiene workflow emits both discovery reports as artifacts; agents can consume the JSON and action logs using existing connectors. Review paths and related PR facts when proof is incomplete. A soft cap is a review signal, not authorization. Never execute a suggested batch as-is without the existing explicit authorization and independent gates.
