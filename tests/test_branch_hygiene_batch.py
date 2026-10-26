#!/usr/bin/env python3
"""Safety regression tests for explicit branch-hygiene batches."""
import unittest

from tools.branch_hygiene_plan import build_plan, select_bounded_batch


class BoundedHygieneTests(unittest.TestCase):
    def setUp(self):
        self.obs = {
            "schemaVersion": "BranchObservation 0.1",
            "repository": "EAKerber/MobiliPresenter2D", "controlBranch": "main",
            "controlSha": "1" * 40, "observedAt": "2026-10-26T00:00:00Z",
            "complete": True, "observationHash": "o" * 64,
            "openPrHeads": [], "openPrBases": [],
            "branches": [
                {"name": "main", "sha": "1" * 40, "treeSha": "a" * 40,
                 "protected": False, "ancestorOfControl": True},
                {"name": "merged", "sha": "2" * 40, "treeSha": "b" * 40,
                 "protected": False, "ancestorOfControl": True},
                {"name": "diverged", "sha": "3" * 40, "treeSha": "c" * 40,
                 "protected": False, "ancestorOfControl": False},
            ],
        }
        self.dispositions = {
            "schemaVersion": "BranchDispositionSet 0.1",
            "controlBranch": "main", "preserveBranches": [],
            "terminalBranches": [],
        }
        self.batch = {
            "schemaVersion": "BranchHygieneBatch 0.1",
            "repository": "EAKerber/MobiliPresenter2D",
            "branches": [{"branch": "merged", "sha": "2" * 40}],
        }

    def chosen(self):
        return select_bounded_batch(
            build_plan(self.obs, self.dispositions), self.batch
        )

    def test_exact_pin_succeeds(self):
        self.assertEqual([x["branch"] for x in self.chosen()], ["merged"])

    def test_sha_drift_blocks(self):
        self.batch["branches"][0]["sha"] = "4" * 40
        with self.assertRaises(ValueError):
            self.chosen()

    def test_open_pr_blocks(self):
        self.obs["openPrHeads"] = ["merged"]
        with self.assertRaises(ValueError):
            self.chosen()

    def test_explicit_preserve_blocks(self):
        self.dispositions["preserveBranches"] = ["merged"]
        with self.assertRaises(ValueError):
            self.chosen()

    def test_three_pin_limit(self):
        self.batch["branches"] *= 4
        with self.assertRaises(ValueError):
            self.chosen()

    def test_duplicate_pins_block(self):
        self.batch["branches"] *= 2
        with self.assertRaises(ValueError):
            self.chosen()

    def test_diverged_blocks_even_when_disposition_allows(self):
        self.batch["branches"] = [{"branch": "diverged", "sha": "3" * 40}]
        self.dispositions["terminalBranches"] = [
            {"branch": "diverged", "sha": "3" * 40, "allowDelete": True}
        ]
        with self.assertRaises(ValueError):
            self.chosen()

    def test_main_blocks(self):
        self.batch["branches"] = [{"branch": "main", "sha": "1" * 40}]
        with self.assertRaises(ValueError):
            self.chosen()

    def test_invalid_repository_blocks(self):
        self.batch["repository"] = "different/repository"
        with self.assertRaises(ValueError):
            self.chosen()


if __name__ == "__main__":
    unittest.main()
