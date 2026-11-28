# M2D Operations — merged PR cleanup readback

**Captured:** 2026-11-28T01:57:50Z
**Repository:** `EAKerber/MobiliPresenter2D`

## Exact cleanup executions

| PR | Deleted branch head | Integrated target | Workflow evidence |
|---|---|---|---|
| #564 | `codex/ops-readback-and-hygiene-env-20261128` @ `1800cae0eddde05f16e6e0755a290e1d9e8f52b0` | `development` @ `f8e0ecc2593a15ec20c1774346b0a47a560050a5`; tree `690f8d209f4a63031a99f0c02101d650677513a5` | run `46090330349`, job `140809491129`, artifact `15240892958`, `sha256:b483223af982ca4d1b0b7e5ac149e09fe540d927aacc4263eb2e6a03f5ab118b` |
| #565 | `codex/loc006-admin-pricing-copy-20261128` @ `0ba3e886bbb5dc546c0182b5bfced5a3f7b71aba` | `development` @ `66fbe5bb529c5f0550cb139f43b3dc3cf1306400`; tree `0aee7e6245731b16659b0036d47c52b97c2cd691` | run `46092433397`, job `140816190515`, artifact `15241468844`, `sha256:c69805b8e06a75785e2c12a82ec958a4d14c5ca2eb80a0df88bba3ad9221768f` |
| #566 | `codex/loc006-admin-material-prompt-copy-20261128` @ `9e3e11db8f63822120cda7671c101f005851fdf6` | `development` @ `674bfa6693d9905439653c371cae2a354c7b52bf`; tree `21c03e3b73b8f17ce14ff7b0086766a20e924925` | run `46093984884`, job `140821057937`, artifact `15242965273`, `sha256:dfc4023c0d2b40db7c393d9b78735b845bc3657a54eabbddf4392332295c59a2` |

All three cleanup jobs completed successfully. Their logs record `SQUASH_TREE_IDENTICAL`, `readback: PASS`, `deleted: true`, and `status: PASS` for the exact source head. The live branch listing after #566 contained 8 Product refs; `main` and `development` remained, as did the previously preserved work branches.

## Limits

## Current branch readback

At `2026-11-28T01:57:50Z`, Product had 8 refs, no open PRs, and all 8 branches were unprotected. No branch met the retirement criteria of an integrated PR, exact tree identity with its squash target, and no open PR use:

| Branch | Head | Readback |
|---|---|---|
| `main` | `ecaa38cf0be54e8d586458a86d1062b90c0b9691` | Canonical stable lane; retain. |
| `development` | `674bfa6693d9905439653c371cae2a354c7b52bf` | Integration lane; retain. |
| `codex/dom001-admin-form-map-index-20261126` | `f75affc29e8c035c5aacedb729ecf89e43dd0c6f` | Merged PR #509, but tree differs from squash `68566bff2e7739499728f474de58187b94062dbd`; retain. |
| `codex/v09-main-current-pointer-20261126` | `294e4bd031d44f3e6974164d9fe3947387b539f4` | Merged PR #508, but tree differs from squash `9f422ffe2112c06efd296425adb84dcb607bb563`; retain. |
| `proposal/hygiene-consumption-readback-and-ops-adoption-20261126` | `a8c515dc1fb099326f8a357b1e1b9fa2bbe86979` | Merged PR #528, but tree differs from squash `6750d9b67a9b5d8b52c022093fdac50f288c0339`; retain. |
| `codex/tst001-current-inventory-20261126` | `01063ff38bd30d31efd9dfc0d5c68452919147a7` | No associated PR found; retain. |
| `codex/v09-loc006-register-correction-20261126` | `f64d7f8c05b305f2536a44c2873008f8f2eb6d86` | No associated PR found; retain. |
| `codex/tst001-exact-ref-inventory-20261126` | `797bc7e51fe4d30d17bd5fc2fd2d8108848c26d7` | Head of closed, unmerged PR #521; retain. |

No ref was deleted in this audit. A count of 8 is above the preferred steady-state size, but no hard cap applies and reducing it without proof would discard unintegrated or divergent work.

These receipts prove only the three cleanup runs and this exact branch readback. They do not establish that every cleanup scenario or future ref policy path is correct. Keep GIT-020 partial and continue checking the exact workflow, artifact, and remote readback after subsequent merges.
