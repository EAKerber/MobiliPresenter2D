#!/usr/bin/env python3
"""Fail-closed identity checks for merged-PR source branch cleanup."""
import unittest

from tools.branch_hygiene_merged_pr_cleanup import merged_head_identity

REPO = "EAKerber/MobiliPresenter2D"
SHA = "1" * 40
MERGE = "2" * 40


def event():
    return {
        "action": "closed",
        "pull_request": {
            "number": 281, "state": "closed", "merged": True,
            "merge_commit_sha": MERGE,
            "head": {"ref": "codex/branch-hygiene-test", "sha": SHA,
                     "repo": {"full_name": REPO}},
            "base": {"ref": "main", "repo": {"full_name": REPO}},
        },
    }


class MergedHeadIdentityTests(unittest.TestCase):
    def test_exact_merged_same_repo_main_head_is_accepted(self):
        self.assertEqual(
            merged_head_identity(event(), REPO),
            {"number": 281, "branch": "codex/branch-hygiene-test",
             "sha": SHA, "mergeSha": MERGE},
        )

    def test_unmerged_or_wrong_event_is_rejected(self):
        payload = event()
        payload["action"] = "opened"
        with self.assertRaises(RuntimeError):
            merged_head_identity(payload, REPO)
        payload = event()
        payload["pull_request"]["merged"] = False
        with self.assertRaises(RuntimeError):
            merged_head_identity(payload, REPO)

    def test_wrong_repo_base_or_main_head_is_rejected(self):
        for update in (
            {"base": {"ref": "development", "repo": {"full_name": REPO}}},
            {"base": {"ref": "main", "repo": {"full_name": "other/repo"}}},
            {"head": {"ref": "main", "sha": SHA, "repo": {"full_name": REPO}}},
            {"head": {"ref": "feature", "sha": "bad", "repo": {"full_name": REPO}}},
        ):
            payload = event()
            payload["pull_request"].update(update)
            with self.subTest(update=update), self.assertRaises(RuntimeError):
                merged_head_identity(payload, REPO)


if __name__ == "__main__":
    unittest.main()
