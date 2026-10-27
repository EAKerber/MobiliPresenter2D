import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from development_asset_provenance_audit import (
    EXPECTED_CHANGED_PATHS, REPOSITORY, classify
)


def fixture():
    changed = sorted(EXPECTED_CHANGED_PATHS)
    other = [f"app/how-it-works/assets/fixture-{i:02d}.webp" for i in range(30)]
    entries = []
    old = {}
    current = {}
    for index, path in enumerate(changed + other):
        category = "legacy" if index >= 36 else "used"
        archived_path = ("legados_para_consulta/" if category == "legacy"
                         else "originais_em_uso/") + path
        sha = format(index + 10, "040x")
        present_sha = format(index + 200, "040x") if path in EXPECTED_CHANGED_PATHS else sha
        entries.append({"source_path": path, "archive_path": archived_path,
                        "category": category, "git_blob_sha": sha, "size_bytes": 123})
        old[archived_path] = sha
        current[path] = present_sha
    manifest = {"repository": REPOSITORY, "active_count": 36,
                "legacy_count": 4, "file_count": 40, "files": entries}
    return manifest, old, current


class AssetProvenanceTests(unittest.TestCase):
    def test_exact_lineage_and_count(self):
        manifest, old, now = fixture()
        result = classify(manifest, old, now)
        self.assertEqual(len(result), 40)
        self.assertEqual(sum(x["status"] == "identical" for x in result), 30)
        self.assertEqual(sum(x["status"] == "changed" for x in result), 10)

    def test_archive_integrity_failure(self):
        m, old, now = fixture()
        first = m["files"][0]["archive_path"]
        old[first] = "f" * 40
        with self.assertRaisesRegex(RuntimeError, "HASH_MISMATCH"):
            classify(m, old, now)

    def test_missing_current_blob_blocks_claim_of_parity(self):
        m, old, now = fixture()
        del now[m["files"][12]["source_path"]]
        with self.assertRaises(RuntimeError):
            classify(m, old, now)

    def test_changed_non_allowlisted_asset_requires_review(self):
        m, old, now = fixture()
        unapproved = m["files"][-1]["source_path"]
        now[unapproved] = "f" * 40
        with self.assertRaisesRegex(RuntimeError, "CHANGED_PATH_SET_DRIFT"):
            classify(m, old, now)

    def test_duplicate_fails(self):
        m, old, now = fixture()
        m["files"][1] = copy.deepcopy(m["files"][0])
        with self.assertRaises(RuntimeError):
            classify(m, old, now)

    def test_manifest_count_fails(self):
        m, old, now = fixture()
        m["file_count"] = 39
        with self.assertRaises(RuntimeError):
            classify(m, old, now)

    def test_archive_prefix_fails(self):
        m, old, now = fixture()
        m["files"][0]["archive_path"] = "originais_em_uso/private-data"
        with self.assertRaises(RuntimeError):
            classify(m, old, now)


if __name__ == "__main__":
    unittest.main()
