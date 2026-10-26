#!/usr/bin/env python3
"""Fail-closed tests for the optional merged-squash full-tree proof."""
import copy
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from branch_hygiene_apply import verify_squash_merge
from branch_hygiene_plan import build_plan, select_bounded_batch

HEAD = "2" * 40
MERGE = "4" * 40
BASE = "1" * 40
TREE = "a" * 40
REPO = "EAKerber/MobiliPresenter2D"
NAME = "archived-squash-example"


def observation():
    return {
        "schemaVersion": "BranchObservation 0.1", "repository": REPO,
        "controlBranch": "main", "controlSha": "5" * 40,
        "observedAt": "2026-10-26T00:00:00Z", "complete": True,
        "observationHash": "b" * 64, "openPrHeads": [], "openPrBases": [],
        "branches": [
            {"name": "main", "sha": "5" * 40, "treeSha": "c" * 40,
             "protected": False, "ancestorOfControl": True},
            {"name": NAME, "sha": HEAD, "treeSha": TREE,
             "protected": False, "ancestorOfControl": False},
        ],
    }


def batch():
    return {
        "schemaVersion": "BranchHygieneBatch 0.1",
        "repository": REPO,
        "branches": [{"branch": NAME, "sha": HEAD,
                      "squashMerge": {"pullRequest": 256, "mergeCommit": MERGE}}],
    }


def pr_data():
    return {
        "state": "closed", "merged_at": "2026-10-26T19:00:00Z",
        "merge_commit_sha": MERGE,
        "head": {"ref": NAME, "sha": HEAD, "repo": {"full_name": REPO}},
        "base": {"ref": "main", "repo": {"full_name": REPO}},
    }


def git_result(args, **_kwargs):
    if args[:3] == ["git", "rev-list", "--parents"]:
        return SimpleNamespace(stdout=MERGE + " " + BASE + "\n", returncode=0)
    if args[:3] == ["git", "merge-base", "--is-ancestor"]:
        return SimpleNamespace(stdout="", returncode=0)
    if args[:3] == ["git", "show", "-s"]:
        return SimpleNamespace(stdout=TREE + "\n", returncode=0)
    raise AssertionError("Unexpected git command: " + str(args))


class SquashBatchTests(unittest.TestCase):
    def select(self, payload=None, obs=None):
        d = {"schemaVersion": "BranchDispositionSet 0.1",
             "controlBranch": "main", "preserveBranches": [],
             "terminalBranches": []}
        return select_bounded_batch(build_plan(obs or observation(), d),
                                    payload if payload is not None else batch())

    def test_explicit_squash_allowed_only_as_request_for_runtime_proof(self):
        selected = self.select()
        self.assertEqual(len(selected), 1)
        self.assertEqual(selected[0]["squashMerge"]["mergeCommit"], MERGE)
        self.assertEqual(selected[0]["action"], "keep")
        self.assertFalse(selected[0]["autoDeleteEligible"])

    def test_diverged_without_complete_proof_fails_closed(self):
        for proof in [None, {}, {"pullRequest": 256},
                      {"pullRequest": 256, "mergeCommit": "bad"},
                      {"pullRequest": True, "mergeCommit": MERGE},
                      {"pullRequest": 256, "mergeCommit": MERGE, "extra": 1}]:
            with self.subTest(proof=proof):
                b = batch()
                if proof is None:
                    b["branches"][0].pop("squashMerge")
                else:
                    b["branches"][0]["squashMerge"] = proof
                with self.assertRaises(ValueError):
                    self.select(b)

    def test_protection_or_open_pr_prevents_squash(self):
        for alteration in ("protected", "openPrHeads", "openPrBases"):
            with self.subTest(alteration=alteration):
                obs = observation()
                if alteration == "protected":
                    obs["branches"][1]["protected"] = True
                else:
                    obs[alteration] = [NAME]
                with self.assertRaises(ValueError):
                    self.select(obs=obs)

    def test_modified_sha_and_other_repo_fail(self):
        b = batch()
        b["branches"][0]["sha"] = "9" * 40
        with self.assertRaises(ValueError):
            self.select(b)
        b = batch()
        b["repository"] = "wrong/repository"
        with self.assertRaises(ValueError):
            self.select(b)


class RuntimeProofTests(unittest.TestCase):
    def check(self, payload=None, git=git_result):
        entry = {"branch": NAME, "sha": HEAD, "treeSha": TREE,
                 "squashMerge": {"pullRequest": 256, "mergeCommit": MERGE}}
        with patch("branch_hygiene_apply.api_get", return_value=payload or pr_data()), \
             patch("branch_hygiene_apply.subprocess.run", side_effect=git):
            return verify_squash_merge(REPO, "dummy-token", entry, "5" * 40)

    def test_identical_tree_of_real_merged_pr_passes(self):
        report = self.check()
        self.assertEqual(report["proof"], "SQUASH_TREE_IDENTICAL")
        self.assertEqual(report["treeSha"], TREE)

    def test_head_identity_and_unmerged_pr_fail(self):
        for update in ({"state": "open"}, {"merged_at": None},
                       {"merge_commit_sha": "8" * 40},
                       {"head": {"ref": NAME, "sha": "9" * 40,
                                 "repo": {"full_name": REPO}}}):
            payload = pr_data()
            payload.update(update)
            with self.subTest(update=update), self.assertRaises(RuntimeError):
                self.check(payload)

    def test_mismatched_tree_and_unintegrated_merge_fail(self):
        def wrong_tree(args, **kw):
            if args[:3] == ["git", "show", "-s"] and args[-1] == MERGE:
                return SimpleNamespace(stdout="f" * 40 + "\n", returncode=0)
            return git_result(args, **kw)

        with self.assertRaisesRegex(RuntimeError, "TREE_MISMATCH"):
            self.check(git=wrong_tree)

        def unintegrated(args, **kw):
            if args[:3] == ["git", "merge-base", "--is-ancestor"] and args[3] == MERGE:
                return SimpleNamespace(stdout="", returncode=1)
            return git_result(args, **kw)

        with self.assertRaisesRegex(RuntimeError, "ANCESTRY_MISMATCH"):
            self.check(git=unintegrated)

    def test_not_squash_merge_fails(self):
        def two_parents(args, **kw):
            if args[:3] == ["git", "rev-list", "--parents"]:
                return SimpleNamespace(stdout=MERGE + " " + BASE + " " + "f" * 40, returncode=0)
            return git_result(args, **kw)

        with self.assertRaisesRegex(RuntimeError, "NOT_SINGLE_PARENT"):
            self.check(git=two_parents)


if __name__ == "__main__":
    unittest.main()
