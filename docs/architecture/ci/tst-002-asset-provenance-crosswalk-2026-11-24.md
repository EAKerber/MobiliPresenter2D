# TST-002 crosswalk slice — archived asset provenance — 2026-11-24

## Scope and evidence limits

This slice maps the archived image-provenance audit and its negative fixtures to the exact source files and workflow triggers. It addresses automatic reachability for the existing audit; it does not authorize asset replacement or visual promotion.

Source pin before this candidate: Product development @ `5349f1c2a3e9d8b03ca67856443ba8be8ee54089`. The candidate changes only a GitHub Actions workflow and CI documentation. No Product runtime, Viewer, mask data, asset bytes, or asset consumers change.

Evidence status: exact PR-head and post-merge development runs passed on the source below. These runs prove automated assertion execution and archive reconciliation; they do not approve visual promotion.

## Source pins

| Role | Path / immutable source | Blob |
|---|---|---|
| Provenance checker | `tools/development_asset_provenance_audit.py` | `f5a1cef7e04345688348e727caf96ad13848d572` |
| Negative and parity fixtures | `tests/test_development_asset_provenance.py` | `aaf99c83d9fddb737e55bf2e026ef1a7fd105230` |
| Workflow | `.github/workflows/development-asset-provenance.yml` | `7a2961741ea231717d371203dab39afbe783c704` |
| Archived manifest | `archive/m2d/ds02-imagens-originais-e9c405bf:manifest.json` | `e1ef704920e8be04091a4ff48815747176521255` |
| Pinned archive commit | `archive/m2d/ds02-imagens-originais-e9c405bf` | `e9c405bfc0189baed8b4b679a1113c37b6ddbd21` |

The archive manifest declares 40 source paths (36 active, 4 legacy). Its exact path set is watched by both the `pull_request` and `push` events for `development`; the test, checker and workflow files are watched in both events as well. The workflow exists only on `development`, so `workflow_dispatch` was not a reliable entry point from the default branch and has been removed. Automatic PR and push runs are the supported routes.

## Assertion and trigger crosswalk

| ID | Assertion group | Contract / negative behavior | Consumer or risk | Trigger and evidence | Owner |
|---|---|---|---|---|---|
| ASSET-PROV-01 | Two pinned archive tags and commit identities | Missing or moved archive tags fail closed; only the exact archived commits are accepted. | Provenance checker | Exact PR-head run #45372393480 and post-merge push run #45372633717 passed. | UNKNOWN |
| ASSET-PROV-02 | Forty manifest paths, category counts and blob identities | Duplicate paths, malformed hashes, wrong archive path/category, archive hash mismatch, missing source, count drift or undeclared archive files fail. | 36 active + 4 legacy image sources | Same workflow; exact PR and post-merge executions passed; offline Git DAG read after shallow-history-disabled checkout and pinned tag fetch. | UNKNOWN |
| ASSET-PROV-03 | Approved current-image delta | Exactly the ten currently changed icon paths are allowlisted; any different changed-path set fails pending review. | Landing room icons | Same passing PR and post-merge runs; no image regeneration or mutation. | UNKNOWN |
| ASSET-PROV-04 | Historic scene overlay comparison | Reports identical/different/historic-only identities and marks visual differences HOLD; it never copies or promotes scene binaries. | Archived kitchen scene overlays | Same passing PR and post-merge runs; the report artifact is evidence, not an approval. | UNKNOWN |

The workflow runs the existing Python unittest fixture set, fetches only two exact archive tags, compares Git blob identities, and uploads `artifacts/asset-provenance/report.json`. It has read-only repository permissions and no Netlify, image-build, deploy, or write step.

## Reviewed friction and limits

Before PR #384, the audit was only `workflow_dispatch`, which was unavailable as a dependable manual entry point because this workflow is absent from the default branch; edits to an in-scope source image could bypass automatic execution. PR #384 added scoped PR and push triggers for all 40 exact paths and the four control files. Its exact-head run #45372393480 passed on `f661bd7a1f942d223b1ddec9d79ba4ffb28c4226`; the post-merge push run #45372633717 passed on `54787e51528ae989fb2bc2b6690f87b6aa8b773a`. The post-merge provenance job passed negative guards, fetched only the two pinned archive tags, reconciled all 40 original image Git blobs and scene assets, and uploaded proof-only artifact `14909786529` (`sha256:21551bc3325b1809223ab6a54edd6215435cb5b28b660afbc5bdd5c38a20d4b1`). The gate remains read-only. No assertion was removed or weakened.

This readback corrects the earlier E0/pending statement: exact execution is now confirmed for this slice. It is not complete TST-002 or TST-001: it does not map every asset family, every workflow command, all event conditions, owners, or representative end-to-end cost. It makes no claim of visual/human approval and no change to masks or Viewer behavior.
