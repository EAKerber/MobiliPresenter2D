# M2D Operations v0.1 — shadow readback

**Captured:** 2026-11-28T00:46:19Z  
**Repository:** `EAKerber/MobiliPresenter2D`
**Purpose:** validate the merged read-only operations tools against exact current Product and Design System refs, and record the limits of that validation.

## Exact refs and source

- Product `main`: `ecaa38cf0be54e8d586458a86d1062b90c0b9691`, tree `45dafef8c70e8421a360a044b71ee96b03737f8a`.
- Product `development`: `91c242c7ee869975dbd33df230052a45a8036df6`, tree `c83d4bde14a815501963eb6f47ccfd6540f940a8`.
- Design System `main`: `a405dff0b77ec3780cd8bcfb313dbad76e9be461`, tree `d0daa64675d7ce9a1792944809dfd866a63ebc0e`.
- Product `main`/`development` merge base: `221b54b2a41ecc8c338d1bf2cf67280cf165ce95`; current comparison is 683 commits ahead on development and 46 ahead on main. This is not a whole-tree merge candidate.
- `tools/m2d_ops/ops.py` blob `978f31f7092c210573128817ff54a8f5da799108`; test suite blob `87bd2a28151476d790493cc59784d3a8f4564a4d`.

The run used disposable clones pinned to those refs. The developer worktree was not read or changed. Raw snapshots were kept outside the repository because they include operational metadata.

## Results

- `python -m unittest discover -s tools/m2d_ops/tests -v`: **16/16 passed**.
- `snapshot` generated the private local snapshot.
- `validate`: **PASS** — all 125 annex IDs present exactly once, no invalid dependency edges or cycles, and the pinned Design System plan hash matches. Semantic review was **not performed**.
- `status`: reported `local_git_refs_not_live_remote`; it matched the pinned register blob `8b226951b8b8f08c19ca942bd6dcdc7bccd846f4`, plan blob `59bb530b14172eb9772b9f89bb62272173f4381c`, and impact-map blob `a1265fbee7f24338c52c16404b147bd8b766aad4`.
- `reconcile`: emitted 526 paths. An independent Git path comparison also emitted 526 paths with **zero set differences**. Every path was classified `needs_review`; `no_automatic_merge=true`.

## Hygiene consumption receipt

After PR #563 was squash-integrated into development at `91c242c7ee869975dbd33df230052a45a8036df6`, the merged-PR cleanup workflow completed successfully: run `46086839752`, job `140798284411`, artifact `15239666399` (`sha256:6be5cb1529c85ab72fd4e2bdc070e0ebf547834139832bc114806fc28436d618`). Its readback records `deleted: true` for the exact source head `fb5846df215792cd3e1a2b66919a8c0ed54b4725`, proves `SQUASH_TREE_IDENTICAL` against tree `c83d4bde14a815501963eb6f47ccfd6540f940a8`, and reports `status: PASS`. One exact cleanup proves this instance of the mechanism, not every future cleanup path.

## Limits

The CLI reads local Git refs only; it does not query the remote, CI, or deployments. Those refs were independently read from GitHub before cloning. The validation is structural and deterministic, not semantic approval of the 125 architectural IDs, proof of hosted behavior, or authorization to merge any family. No merge action was taken by these tools. The 16-test suite is opt-in and is not currently wired into CI.