# M2D Operations — merged PR cleanup readback

**Captured:** 2026-11-28T01:25:03Z  
**Repository:** `EAKerber/MobiliPresenter2D`

## Exact cleanup executions

| PR | Deleted branch head | Integrated target | Workflow evidence |
|---|---|---|---|
| #564 | `codex/ops-readback-and-hygiene-env-20261128` @ `1800cae0eddde05f16e6e0755a290e1d9e8f52b0` | `development` @ `f8e0ecc2593a15ec20c1774346b0a47a560050a5`; tree `690f8d209f4a63031a99f0c02101d650677513a5` | run `46090330349`, job `140809491129`, artifact `15240892958`, `sha256:b483223af982ca4d1b0b7e5ac149e09fe540d927aacc4263eb2e6a03f5ab118b` |
| #565 | `codex/loc006-admin-pricing-copy-20261128` @ `0ba3e886bbb5dc546c0182b5bfced5a3f7b71aba` | `development` @ `66fbe5bb529c5f0550cb139f43b3dc3cf1306400`; tree `0aee7e6245731b16659b0036d47c52b97c2cd691` | run `46092433397`, job `140816190515`, artifact `15241468844`, `sha256:c69805b8e06a75785e2c12a82ec958a4d14c5ca2eb80a0df88bba3ad9221768f` |

Both cleanup jobs completed successfully. Their logs record `SQUASH_TREE_IDENTICAL`, `readback: PASS`, `deleted: true`, and `status: PASS` for the exact source head. The live branch listing after #565 contained 8 Product refs; `main` and `development` remained, as did the previously preserved work branches.

## Limits

These receipts prove these two runs only. They do not establish that every cleanup scenario or future ref policy path is correct. Keep GIT-020 partial and continue checking the exact workflow, artifact, and remote readback after subsequent merges.
