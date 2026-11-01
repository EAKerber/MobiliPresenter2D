"Test strict bounded development-branch retirement selection without remote access."
import copy
import importlib.util
import unittest
from unittest.mock import patch
from pathlib import Path

FILE = Path(__file__).resolve().parents[1] / "tools/development_retirement_batch.py"
spec = importlib.util.spec_from_file_location("devbatch", FILE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
MAIN = mod.MAIN_SHA
DOC = "docs/handover-reconcile-20261023"
DOC_SHA = "d6c238946526cfd33b3b498b5d2187790c1d78bd"
R9 = "maintenance/branch-retirement-r9-operational-20261026"
R10 = "maintenance/branch-retirement-r10-squash-20261026"
ARCHIVE = {"branch": DOC, "sha": DOC_SHA, "kind": "archive-diverged",
           "archiveTag": "archive/m2d/docs-handover-20261023-d6c23894",
           "snapshotPath": "docs/handoffs/ARCHITECTURE_CHECKPOINT_2026-10-23_ARCHIVED.md",
           "sourcePath": "docs/handoffs/ARCHITECTURE-CURRENT-2026-10-22.md",
           "sourceBlobSha": "06ece5e9f97dc7b8141338a0dc2c844d90e80ec7"}
ANCESTORS = [
    {"branch": R9, "sha": "535a2edf9d7b" + "0" * 28, "kind": "ancestor-main"},
    {"branch": R10, "sha": "74562dd8a26b" + "0" * 28, "kind": "ancestor-main"},
]


def fixture():
    names = [DOC, R9, R10] + [f"fixture/{i:03d}" for i in range(57)]
    mapping = {x: format(i + 1234, "040x") for i, x in enumerate(names)}
    mapping[DOC] = DOC_SHA
    mapping[R9], mapping[R10] = ANCESTORS[0]["sha"], ANCESTORS[1]["sha"]
    inventory = {"baseSha": MAIN, "totals": {"branches": 60},
                 "rows": [{"branch": b, "sha": sha} for b, sha in mapping.items()]}
    batch = {"schemaVersion": "M2DDevRetirementBatch/0.1",
             "repository": mod.REPO, "controlBranch": "development",
             "mainSha": MAIN, "batchId": "dev-20261027-doc-and-maintenance",
             "targets": [copy.deepcopy(ARCHIVE)] + copy.deepcopy(ANCESTORS)}
    return batch, inventory


def closed_pr_archive(number=34):
    branch, sha = mod.PR_HEAD_PINS[number]
    return {"branch": branch, "sha": sha, "kind": "archive-diverged",
            "archiveTag": mod.PR_ARCHIVE_TAGS[number],
            "snapshotPath": mod.PR_ARCHIVE_EVIDENCE,
            "closedPrNumber": number}


class DevelopmentRetirementContract(unittest.TestCase):
    def test_exact_three_and_60_source_roster(self):
        b, i = fixture()
        old, targets = mod.canonical_targets(b, i)
        self.assertEqual(len(old), 60)
        self.assertEqual(len(targets), 3)

    def test_empty_batch_denied(self):
        b, i = fixture()
        b["targets"] = []
        with self.assertRaisesRegex(ValueError, "BATCH_SIZE"):
            mod.canonical_targets(b, i)

    def test_four_denied(self):
        b, i = fixture()
        b["targets"].append(copy.deepcopy(b["targets"][0]))
        with self.assertRaisesRegex(ValueError, "BATCH_SIZE"):
            mod.canonical_targets(b, i)

    def test_duplicate_denied(self):
        b, i = fixture()
        b["targets"][1] = copy.deepcopy(b["targets"][0])
        with self.assertRaises(ValueError):
            mod.canonical_targets(b, i)

    def test_changed_sha_denied(self):
        b, i = fixture()
        b["targets"][0]["sha"] = "a" * 40
        with self.assertRaisesRegex(ValueError, "TARGET_NOT"):
            mod.canonical_targets(b, i)

    def test_unrecorded_branch_denied(self):
        b, i = fixture()
        b["targets"][0]["branch"] = "forgotten/source"
        with self.assertRaises(ValueError):
            mod.canonical_targets(b, i)

    def test_main_and_development_denied(self):
        for branch in ["main", "development"]:
            b, i = fixture()
            b["targets"][0]["branch"] = branch
            with self.assertRaises(ValueError):
                mod.canonical_targets(b, i)

    def test_extra_fields_for_ancestor_denied(self):
        b, i = fixture()
        b["targets"][1]["force"] = True
        with self.assertRaisesRegex(ValueError, "UNEXPECTED_ANCESTOR_FIELDS"):
            mod.canonical_targets(b, i)

    def test_ancestor_cannot_pretend_to_be_archive(self):
        b, i = fixture()
        b["targets"][1]["kind"] = "archive-diverged"
        with self.assertRaisesRegex(ValueError, "INVALID_ARCHIVE_FIELDS"):
            mod.canonical_targets(b, i)

    def test_archive_tag_injection_denied(self):
        for tag in ["refs/heads/main", "archive/m2d/../main",
                    "archive/m2d/test//bad", "-untrusted", "archive/m2d/"]:
            b, i = fixture()
            b["targets"][0]["archiveTag"] = tag
            with self.assertRaisesRegex(ValueError, "INVALID_ARCHIVE_IDENTITY"):
                mod.canonical_targets(b, i)

    def test_external_snapshot_path_denied(self):
        for path in ["../secrets.txt", "/tmp/file", "docs/handoffs/../../.env"]:
            b, i = fixture()
            b["targets"][0]["snapshotPath"] = path
            with self.assertRaisesRegex(ValueError, "INVALID_ARCHIVE_IDENTITY"):
                mod.canonical_targets(b, i)

    def test_wrong_repository_and_main_denied(self):
        for key, value in [("repository", "other/repo"), ("mainSha", "f" * 40),
                           ("controlBranch", "main")]:
            b, i = fixture()
            b[key] = value
            with self.assertRaisesRegex(ValueError, "INVALID_BATCH_CONTRACT"):
                mod.canonical_targets(b, i)

    def test_incomplete_inventory_denied(self):
        b, i = fixture()
        i["rows"].pop()
        with self.assertRaises(ValueError):
            mod.canonical_targets(b, i)

    def test_bad_batch_id_denied(self):
        b, i = fixture()
        b["batchId"] = "already-consumed"
        with self.assertRaises(ValueError):
            mod.canonical_targets(b, i)


    def test_equal_blob_proof_accepts_valid_shape(self):
        b, i = fixture()
        b["targets"][0].pop("sourcePath")
        b["targets"][0].pop("sourceBlobSha")
        b["targets"][0]["equalBlobPath"] = "app/styles.css"
        b["targets"][0]["equalBlobSha"] = "d43e6fb5e66133d2389b5c39b165b76b13cfa868"
        self.assertEqual(len(mod.canonical_targets(b, i)[1]), 3)

    def test_closed_pr_documentary_archive_proof_accepts_only_its_exact_pin(self):
        b, i = fixture()
        target = closed_pr_archive()
        i["rows"][-1] = {"branch": target["branch"], "sha": target["sha"]}
        b["targets"] = [target]
        self.assertEqual(mod.canonical_targets(b, i)[1], [target])
        self.assertEqual(mod.prove_snapshot(target)["closedPrNumber"], 34)

    def test_closed_pr_documentary_archive_proof_rejects_wrong_number_or_tag(self):
        for field, value in [("closedPrNumber", 182),
                             ("archiveTag", "archive/m2d/wrong")]:
            b, i = fixture()
            target = closed_pr_archive()
            i["rows"][-1] = {"branch": target["branch"], "sha": target["sha"]}
            target[field] = value
            b["targets"] = [target]
            with self.subTest(field=field):
                with self.assertRaisesRegex(ValueError, "CLOSED_PR_ARCHIVE_PROOF_PIN_MISMATCH"):
                    mod.canonical_targets(b, i)

    def test_ds02_non_pr_archive_record_accepts_only_its_exact_head_and_tag(self):
        b, i = fixture()
        branch, sha, tag = mod.NON_PR_ARCHIVE_PINS["ds02-original-images"]
        i["rows"][-1] = {"branch": branch, "sha": sha}
        target = {"branch": branch, "sha": sha, "kind": "archive-diverged",
                  "archiveTag": tag, "snapshotPath": mod.PR_ARCHIVE_EVIDENCE,
                  "archiveRecord": "ds02-original-images"}
        b["targets"] = [target]
        self.assertEqual(mod.canonical_targets(b, i)[1], [target])
        self.assertEqual(mod.prove_snapshot(target)["archiveRecord"], "ds02-original-images")

    def test_ds02_non_pr_archive_record_denies_pin_or_key_drift(self):
        for field, value in [("archiveTag", "archive/m2d/wrong"),
                             ("archiveRecord", "unknown")]:
            b, i = fixture()
            branch, sha, tag = mod.NON_PR_ARCHIVE_PINS["ds02-original-images"]
            i["rows"][-1] = {"branch": branch, "sha": sha}
            target = {"branch": branch, "sha": sha, "kind": "archive-diverged",
                      "archiveTag": tag, "snapshotPath": mod.PR_ARCHIVE_EVIDENCE,
                      "archiveRecord": "ds02-original-images"}
            target[field] = value
            b["targets"] = [target]
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "NON_PR_ARCHIVE_PROOF_PIN_MISMATCH"):
                mod.canonical_targets(b, i)

    def test_mixed_equal_and_archived_delta_proof_denied(self):
        b, i = fixture()
        b["targets"][0]["equalBlobPath"] = "app/styles.css"
        b["targets"][0]["equalBlobSha"] = "d43e6fb5e66133d2389b5c39b165b76b13cfa868"
        with self.assertRaisesRegex(ValueError, "MIXED_ARCHIVE_PROOF_MODES"):
            mod.canonical_targets(b, i)

    def test_equal_blob_wrong_path_or_sha_denied(self):
        for key, val in [("equalBlobPath", "../secrets"),
                         ("equalBlobPath", "netlify.toml"),
                         ("equalBlobSha", "not-a-sha")]:
            b, i = fixture()
            b["targets"][0].pop("sourcePath")
            b["targets"][0].pop("sourceBlobSha")
            b["targets"][0]["equalBlobPath"] = "app/styles.css"
            b["targets"][0]["equalBlobSha"] = "d43e6fb5e66133d2389b5c39b165b76b13cfa868"
            b["targets"][0][key] = val
            with self.assertRaisesRegex(ValueError, "INVALID_EQUAL_BLOB_PROOF"):
                mod.canonical_targets(b, i)

    def test_previous_retired_cannot_be_retargeted(self):
        b, i = fixture()
        b["retired"] = [{"branch": R9, "sha": ANCESTORS[0]["sha"], "kind": "ancestor-main"}]
        b["targets"] = [ANCESTORS[0]]
        with self.assertRaisesRegex(ValueError, "TARGET_NOT_IN_PINNED_INVENTORY"):
            mod.canonical_targets(b, i)


    def test_auxiliary_exact_pin_happy_path(self):
        b, i = fixture()
        ref = {"branch": "integration/10-a11y-fallback-semantic-reconcile-20261027",
               "sha": "a" * 40}
        b["auxiliaryRefs"] = [ref]
        b["targets"] = [{"branch": ref["branch"], "sha": ref["sha"],
                         "kind": "auxiliary-ancestor-development"}]
        roster, targets = mod.canonical_targets(b, i)
        self.assertEqual(len(roster), 61)
        self.assertEqual(roster[ref["branch"]], ref["sha"])
        self.assertEqual(len(targets), 1)

    def test_auxiliary_missing_lease_denied(self):
        b, i = fixture()
        b["targets"] = [{"branch": "integration/10-unknown",
                         "sha": "a" * 40,
                         "kind": "auxiliary-ancestor-development"}]
        with self.assertRaisesRegex(ValueError, "UNPINNED_AUXILIARY_TARGET"):
            mod.canonical_targets(b, i)

    def test_auxiliary_unaccounted_roster_denied(self):
        b, i = fixture()
        b["auxiliaryRefs"] = [{"branch": "integration/unapproved",
                               "sha": "a" * 40}]
        with self.assertRaisesRegex(ValueError, "UNACCOUNTED_AUXILIARY_PIN"):
            mod.canonical_targets(b, i)

    def test_auxiliary_wrong_prefix_and_original_collision_denied(self):
        for branch in ["main", "development", "feat/suspicious", DOC,
                       "integration/../bypass", "integration/a//b"]:
            b, i = fixture()
            b["auxiliaryRefs"] = [{"branch": branch, "sha": "a" * 40}]
            with self.assertRaisesRegex(ValueError, "AUXILIARY_PIN_NOT_ISOLATED"):
                mod.canonical_targets(b, i)

    def test_auxiliary_extra_force_flag_denied(self):
        b, i = fixture()
        b["auxiliaryRefs"] = [{"branch": "integration/a", "sha": "a" * 40}]
        b["targets"] = [{"branch": "integration/a", "sha": "a" * 40,
                         "kind": "auxiliary-ancestor-development", "force": True}]
        with self.assertRaisesRegex(ValueError, "UNPINNED_AUXILIARY_TARGET"):
            mod.canonical_targets(b, i)

    def test_auxiliary_cannot_promote_ordinary_historical_ref(self):
        b, i = fixture()
        b["targets"] = [{"branch": DOC, "sha": DOC_SHA,
                         "kind": "auxiliary-ancestor-development"}]
        with self.assertRaisesRegex(ValueError, "UNPINNED_AUXILIARY_TARGET"):
            mod.canonical_targets(b, i)

    def test_supplemental_archive_accepts_only_exact_allowlisted_pin(self):
        b, i = fixture()
        pin = copy.deepcopy(mod.SUPPLEMENTAL_ARCHIVE_PINS["ux04-focus-restore"])
        b["supplementalRefs"] = [pin]
        b["targets"] = [{**pin, "kind": "archive-diverged"}]
        roster, targets = mod.canonical_targets(b, i)
        self.assertEqual(roster[pin["branch"]], pin["sha"])
        self.assertEqual(targets, [{**pin, "kind": "archive-diverged"}])

    def test_supplemental_archive_rejects_ref_or_target_drift(self):
        for field, value in [("sha", "a" * 40),
                             ("archiveTag", "archive/m2d/unrelated"),
                             ("branch", "integration/not-ux04")]:
            b, i = fixture()
            pin = copy.deepcopy(mod.SUPPLEMENTAL_ARCHIVE_PINS["ux04-focus-restore"])
            pin[field] = value
            b["supplementalRefs"] = [pin]
            b["targets"] = [{**pin, "kind": "archive-diverged"}]
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "SUPPLEMENTAL_PIN_NOT_ALLOWLISTED"):
                mod.canonical_targets(b, i)

        b, i = fixture()
        pin = copy.deepcopy(mod.SUPPLEMENTAL_ARCHIVE_PINS["ux04-focus-restore"])
        b["supplementalRefs"] = [pin]
        b["targets"] = [{**pin, "kind": "archive-diverged", "sha": "b" * 40}]
        with self.assertRaisesRegex(ValueError, "TARGET_NOT_IN_PINNED_INVENTORY"):
            mod.canonical_targets(b, i)

    def test_supplemental_pin_without_target_or_with_duplicate_denied(self):
        b, i = fixture()
        pin = copy.deepcopy(mod.SUPPLEMENTAL_ARCHIVE_PINS["ux04-focus-restore"])
        b["supplementalRefs"] = [pin]
        with self.assertRaisesRegex(ValueError, "UNACCOUNTED_SUPPLEMENTAL_PIN"):
            mod.canonical_targets(b, i)
        b["supplementalRefs"] = [pin, copy.deepcopy(pin)]
        with self.assertRaisesRegex(ValueError, "INVALID_SUPPLEMENTAL_ROSTER"):
            mod.canonical_targets(b, i)

    def test_apply_authorization_requires_successful_audit_for_exact_parent(self):
        b, _ = fixture()
        pin = mod.SUPPLEMENTAL_ARCHIVE_PINS["ux04-focus-restore"]
        b["batchId"] = "dev-20261101-ux04-focus-retire"
        b["targets"] = [{**pin, "kind": "archive-diverged"}]
        b["applyAuthorization"] = {
            "batchId": b["batchId"], "auditRunId": 50001,
            "developmentSha": "c" * 40,
            "targetBranch": pin["branch"], "targetSha": pin["sha"],
            "archiveTag": pin["archiveTag"],
        }
        run = {"status": "completed", "conclusion": "success", "event": "push",
               "head_sha": "c" * 40, "name": mod.RETIREMENT_WORKFLOW_NAME}
        jobs = {"jobs": [{"name": "audit", "status": "completed", "conclusion": "success"}]}
        with patch.object(mod, "git", return_value="c" * 40), \
             patch.object(mod, "api", side_effect=[run, jobs]):
            self.assertEqual(mod.verify_apply_authorization(b),
                             {"auditRunId": 50001, "auditDevelopmentSha": "c" * 40})

    def test_apply_authorization_rejects_wrong_parent_or_run_with_apply_job(self):
        b, _ = fixture()
        pin = mod.SUPPLEMENTAL_ARCHIVE_PINS["ux04-focus-restore"]
        b["batchId"] = "dev-20261101-ux04-focus-retire"
        b["targets"] = [{**pin, "kind": "archive-diverged"}]
        b["applyAuthorization"] = {
            "batchId": b["batchId"], "auditRunId": 50001,
            "developmentSha": "c" * 40,
            "targetBranch": pin["branch"], "targetSha": pin["sha"],
            "archiveTag": pin["archiveTag"],
        }
        with patch.object(mod, "git", return_value="d" * 40), \
             self.assertRaisesRegex(RuntimeError, "APPLY_AUTHORIZATION_PIN_MISMATCH"):
            mod.verify_apply_authorization(b)
        run = {"status": "completed", "conclusion": "success", "event": "push",
               "head_sha": "c" * 40, "name": mod.RETIREMENT_WORKFLOW_NAME}
        jobs = {"jobs": [{"name": "audit", "status": "completed", "conclusion": "success"},
                         {"name": "apply", "status": "completed", "conclusion": "success"}]}
        with patch.object(mod, "git", return_value="c" * 40), \
             patch.object(mod, "api", side_effect=[run, jobs]), \
             self.assertRaisesRegex(RuntimeError, "PRIOR_RUN_IS_NOT_AUDIT_ONLY_PASS"):
            mod.verify_apply_authorization(b)

    def test_completed_target_requires_exact_archive_tag_and_branch_absence(self):
        target = {**mod.SUPPLEMENTAL_ARCHIVE_PINS["ux04-focus-restore"],
                  "kind": "archive-diverged"}
        branch, sha, tag = target["branch"], target["sha"], target["archiveTag"]
        self.assertEqual(mod.completed_targets([target], {}, {tag: sha}), {branch})
        self.assertEqual(mod.completed_targets([target], {branch: sha}, {}), set())
        with self.assertRaisesRegex(RuntimeError, "TARGET_BRANCH_MISSING_WITHOUT_ARCHIVE"):
            mod.completed_targets([target], {}, {tag: "f" * 40})
        with self.assertRaisesRegex(RuntimeError, "TARGET_BRANCH_SHA_DRIFT"):
            mod.completed_targets([target], {branch: "e" * 40}, {tag: sha})


    def test_semantic_gate_explicit_green_run_shape(self):
        b, i = fixture()
        b["targets"][0].pop("sourcePath")
        b["targets"][0].pop("sourceBlobSha")
        b["targets"][0]["semanticGate"] = {
            "runId": 40581205414,
            "headSha": "0f752e6d09623579d3db87a7f65d6eabbc183457",
            "workflowName": "Development 10 — legacy a11y fallback semantic supersession (offline)"
        }
        self.assertEqual(len(mod.canonical_targets(b, i)[1]), 3)

    def test_unproved_divergent_archive_denied(self):
        b, i = fixture()
        b["targets"][0].pop("sourcePath")
        b["targets"][0].pop("sourceBlobSha")
        with self.assertRaisesRegex(ValueError, "EXACTLY_ONE_ARCHIVE_PROOF_REQUIRED"):
            mod.canonical_targets(b, i)

    def test_semantic_gate_conflicting_proofs_denied(self):
        b, i = fixture()
        b["targets"][0]["semanticGate"] = {
            "runId": 40581205414,
            "headSha": "0f752e6d09623579d3db87a7f65d6eabbc183457",
            "workflowName": "Development 10 — legacy a11y fallback semantic supersession (offline)"
        }
        with self.assertRaisesRegex(ValueError, "EXACTLY_ONE_ARCHIVE_PROOF_REQUIRED"):
            mod.canonical_targets(b, i)

    def test_semantic_gate_invalid_run_denied(self):
        for run in [0, -2, True, "40581205414"]:
            b, i = fixture()
            b["targets"][0].pop("sourcePath")
            b["targets"][0].pop("sourceBlobSha")
            b["targets"][0]["semanticGate"] = {
                "runId": run,
                "headSha": "0f752e6d09623579d3db87a7f65d6eabbc183457",
                "workflowName": "Development 10 — legacy a11y fallback semantic supersession (offline)"
            }
            with self.assertRaisesRegex(ValueError, "INVALID_SEMANTIC_GATE"):
                mod.canonical_targets(b, i)


if __name__ == "__main__":
    unittest.main()
