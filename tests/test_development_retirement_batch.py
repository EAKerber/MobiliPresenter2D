"Test strict bounded development-branch retirement selection without remote access."
import copy
import importlib.util
import unittest
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


if __name__ == "__main__":
    unittest.main()
