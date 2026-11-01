# UX04 focus restore branch archive — 2026-11-01

Repository: `EAKerber/MobiliPresenter2D`  
Control branch: `development`  
Candidate ref: `fix/ux04-focus-restore-20261101@61e49ff44e21c4ba02f116f749a68d72d58faf61`  
Archive tag: `archive/m2d/ux04-focus-restore-20261101-61e49ff4`  
Archive record key: `ux04-focus-restore`

## Provenance

The candidate is the unmerged head of closed PR [#264](https://github.com/EAKerber/MobiliPresenter2D/pull/264). Its parent is `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`. The candidate changes only `app/app.js` and `tests/keyboard-browser.cjs`.

`development@c7c2822d5b651ae0bcfcf0ac28c66cb61b645e98` already contains the exact candidate blobs:

| Path | Blob |
| --- | --- |
| `app/app.js` | `c77a18a40702d18b7f14446a5649b202b928d2ed` |
| `tests/keyboard-browser.cjs` | `7c3fe251bc368510b7f4e1e3e36dc2e42a8ef971` |

Thus branch retirement preserves the candidate commit object and its ancestry under the exact archive tag; it does not promote changes to `main` or alter the current `development` implementation.

## Protected operation

The bounded executor allowlists this one supplemental ref and requires a documentary proof, closed-PR check, unprotected branch check, exact SHA lease, tag-before-delete ordering, and independent remote readback. The batch audit is read-only. Apply is separately enabled only by an explicit `[M2D-RETIRE-APPLY]` commit that pins a successful audit run on its exact first parent SHA. No completion is claimed until the final tag and branch readback are recorded by the apply receipt.

Status: complete; both archive tags and branch deletions were confirmed by the protected apply receipt.

## Final archive readback

Protected apply: [GitHub Actions run 41359334010](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/41359334010) — `PASS` at `development@46837de746018273bbf80d17bbd7c920d5ea0632`. The executor created the tag before deletion, used exact SHA leases, and confirmed both branch refs absent. Final roster: `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` and `development@46837de746018273bbf80d17bbd7c920d5ea0632` (2 branches). Readback tags: `archive/m2d/ux04-focus-restore-20261101-61e49ff4` → `61e49ff44e21c4ba02f116f749a68d72d58faf61`; `archive/m2d/ux04-retirement-guard-be4f4748` → `be4f4748ec5c9aece18ca6ba005cd13eccc7819a`.

