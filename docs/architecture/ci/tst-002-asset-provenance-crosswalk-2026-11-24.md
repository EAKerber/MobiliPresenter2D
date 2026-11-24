# TST-002 crosswalk slice — archived asset provenance — 2026-11-24

## Scope and evidence limits

This slice maps the archived image-provenance audit and its negative fixtures to the exact source files and workflow triggers. It addresses automatic reachability for the existing audit; it does not authorize asset replacement or visual promotion.

Source pin before this candidate: Product development @ `5349f1c2a3e9d8b03ca67856443ba8be8ee54089`. The candidate changes only a GitHub Actions workflow and CI documentation. No Product runtime, Viewer, mask data, asset bytes, or asset consumers change.

Evidence status at authoring: E0/source-inspected. The workflow's exact-head run is required before claiming an executed gate.

## Source pins

| Role | Path / immutable source | Blob |
|---|---|---|
| Provenance checker | `tools/development_asset_provenance_audit.py` | `f5a1cef7e04345688348e727caf96ad13848d572` |
| Negative and parity fixtures | `tests/test_development_asset_provenance.py` | `aaf99c83d9fddb737e55bf2e026ef1a7fd105230` |
| Workflow | `.github/workflows/development-asset-provenance.yml` | `2ad5aa93c90fdd1c2ee9bc72f5451e4b89198ed9` |
| Archived manifest | `archive/m2d/ds02-imagens-originais-e9c405bf:manifest.json` | `e1ef704920e8be04091a4ff48815747176521255` |
| Pinned archive commit | `EAKerber/MobiliPresenter2D` | `e9c405bfc0189baed8b4b679a1113c37b6ddbd21` |

The archive manifest declares 40 source paths (36 active, 4 legacy). Its exact path set is watched by both the `pull_request` and `push` events for `development`; the test, checker and workflow files are watched in both events as well. Manual dispatch remains available.

## Assertion and trigger crosswalk

| ID | Assertion group | Contract / negative behavior | Consumer or risk | Trigger and evidence | Owner |
|---|---|---|---|---|---|
| ASSET-PROV-01 | Two pinned archive tags and commit identities | Missing or moved archive tags fail closed; only the exact archived commits are accepted. | Provenance checker | PR/push on the exact watched paths, or manual dispatch; exact-head gate pending. | UNKNOWN |
| ASSET-PROV-02 | Forty manifest paths, category counts and blob identities | Duplicate paths, malformed hashes, wrong archive path/category, archive hash mismatch, missing source, count drift or undeclared archive files fail. | 36 active + 4 legacy image sources | Same workflow; offline Git DAG read after shallow-history disabled checkout and pinned tag fetch. | UNKNOWN |
| ASSET-PROV-03 | Approved current-image delta | Exactly the ten currently changed icon paths are allowlisted; any different changed-path set fails pending review. | Landing room icons | Same workflow; no image regeneration or mutation. | UNKNOWN |
| ASSET-PROV-04 | Historic scene overlay comparison | Reports identical/different/historic-only identities and marks visual differences HOLD; it never copies or promotes scene binaries. | Archived kitchen scene overlays | Same workflow; report artifact is evidence, not an approval. | UNKNOWN |

The workflow runs the existing Python unittest fixture set, fetches only two exact archive tags, compares Git blob identities, and uploads `artifacts/asset-provenance/report.json`. It has read-only repository permissions and no Netlify, image-build, deploy, or write step.

## Reviewed friction and limits

Before this change, the audit was only `workflow_dispatch`: edits to an in-scope source image could bypass automatic execution. The scoped path filters close that reachability gap while avoiding unrelated product/test workflows. All 40 exact paths are derived from the pinned archive manifest; the four control files are also included in both filters. No assertion is removed or weakened. Runtime and assertion results remain unknown until the candidate's exact-head run completes.

This is not complete TST-002 or TST-001: it does not map every asset family, every workflow command, all event conditions, owners, or representative end-to-end cost. It makes no claim of visual/human approval and no change to masks or Viewer behavior.
