"""Real disposable-Git fixtures for exact concurrent squash preservation."""
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from branch_hygiene_apply import verify_squash_delta, verify_squash_merge


class ConcurrentSquashTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        old = Path.cwd()
        os.chdir(self.root)
        self.addCleanup(os.chdir, old)
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.name", "Fixture")
        self.git("config", "user.email", "fixture@example.invalid")
        self.git("config", "commit.gpgsign", "false")
        # Index mode changes are intentional; do not treat the fixture worktree
        # executable bit as an unstaged edit (also works on Windows).
        self.git("config", "core.filemode", "false")
        self.put("modify.txt", b"old")
        self.put("remove.txt", b"old")
        self.put("mode.txt", b"old")
        self.put("control.txt", b"old")
        self.base = self.commit("base")
        self.git("checkout", "-qb", "candidate")
        self.put("modify.txt", b"new")
        (self.root / "remove.txt").unlink()
        self.put("added.bin", b"\0\1\2")
        self.git("add", "-A")
        self.git("update-index", "--chmod=+x", "mode.txt")
        self.git("commit", "-qm", "candidate")
        self.head = self.git("rev-parse", "HEAD")
        self.git("checkout", "-q", "main")
        self.put("control.txt", b"independent")
        self.put("other.txt", b"independent addition")
        self.parent = self.commit("independent control")
        self.git("merge", "--squash", "candidate")
        self.git("commit", "-qm", "squash")
        self.merged = self.git("rev-parse", "HEAD")

    def git(self, *args):
        proc = subprocess.run(["git", *args], capture_output=True, text=True, check=False)
        if proc.returncode:
            raise AssertionError(f"fixture git {args[0]} failed: {proc.stderr}")
        return proc.stdout.strip()

    def put(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    def commit(self, name):
        self.git("add", "-A")
        self.git("commit", "-qm", name)
        return self.git("rev-parse", "HEAD")

    def proof(self, merged=None, parent=None):
        return verify_squash_delta(self.head, parent or self.parent,
                                   merged or self.merged)

    def test_disjoint_union_includes_add_modify_remove_mode(self):
        result = self.proof()
        self.assertEqual(result["proof"], "SQUASH_DELTA_PRESERVED")
        self.assertEqual(result["commonBase"], self.base)
        self.assertEqual(result["contributionPathCount"], 4)
        self.assertEqual(result["concurrentPathCount"], 2)

    def test_missing_contribution_fails(self):
        self.put("modify.txt", b"old")
        self.git("add", "modify.txt")
        wrong = self.git("write-tree")
        with self.assertRaisesRegex(RuntimeError, "delta-union"):
            self.proof(merged=wrong)

    def test_extra_change_fails(self):
        self.put("surprise.txt", b"extra")
        self.git("add", "surprise.txt")
        with self.assertRaisesRegex(RuntimeError, "delta-union"):
            self.proof(merged=self.git("write-tree"))

    def test_mode_loss_fails(self):
        self.git("update-index", "--chmod=-x", "mode.txt")
        with self.assertRaisesRegex(RuntimeError, "delta-union"):
            self.proof(merged=self.git("write-tree"))

    def test_overlapping_paths_fail_even_when_content_identical(self):
        self.git("checkout", "-q", "--detach", self.parent)
        self.put("modify.txt", b"new")
        other = self.commit("overlap")
        with self.assertRaisesRegex(RuntimeError, "overlapping-delta"):
            self.proof(parent=other)

    def test_no_divergence_fails(self):
        with self.assertRaisesRegex(RuntimeError, "delta-not-diverged"):
            self.proof(parent=self.base)

    def test_runtime_verifier_uses_delta_with_exact_pr_identity(self):
        repo, branch = "fixture/repo", "candidate"
        entry = {"branch": branch, "sha": self.head,
                 "treeSha": self.git("rev-parse", self.head + "^{tree}"),
                 "squashMerge": {"pullRequest": 1, "mergeCommit": self.merged}}
        payload = {"state": "closed", "merged_at": "fixture",
                   "merge_commit_sha": self.merged,
                   "head": {"ref": branch, "sha": self.head, "repo": {"full_name": repo}},
                   "base": {"ref": "main", "repo": {"full_name": repo}}}
        with patch("branch_hygiene_apply.api_get", return_value=payload):
            result = verify_squash_merge(repo, "fixture", entry, self.merged)
        self.assertEqual(result["proof"], "SQUASH_DELTA_PRESERVED")
        self.assertEqual(result["mergedTreeSha"],
                         self.git("rev-parse", self.merged + "^{tree}"))

    def test_runtime_rejects_unintegrated_merge(self):
        repo = "fixture/repo"
        entry = {"branch": "candidate", "sha": self.head,
                 "treeSha": self.git("rev-parse", self.head + "^{tree}"),
                 "squashMerge": {"pullRequest": 1, "mergeCommit": self.merged}}
        payload = {"state": "closed", "merged_at": "fixture",
                   "merge_commit_sha": self.merged,
                   "head": {"ref": "candidate", "sha": self.head, "repo": {"full_name": repo}},
                   "base": {"ref": "main", "repo": {"full_name": repo}}}
        with patch("branch_hygiene_apply.api_get", return_value=payload):
            with self.assertRaisesRegex(RuntimeError, "ANCESTRY_MISMATCH"):
                verify_squash_merge(repo, "fixture", entry, self.parent)


if __name__ == "__main__":
    unittest.main()
