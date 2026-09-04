#!/usr/bin/env python3
import copy
import unittest

from tools.branch_hygiene_plan import build_plan


class PlannerTests(unittest.TestCase):
    def observation(self):
        return {
            "schemaVersion": "BranchObservation 0.1",
            "repository": "EAKerber/MobiliPresenter2D",
            "controlBranch": "main",
            "controlSha": "m" * 40,
            "observedAt": "2026-09-04T00:00:00+00:00",
            "complete": True,
            "observationHash": "o" * 64,
            "openPrHeads": [],
            "openPrBases": [],
            "branches": [
                {"name": "main", "sha": "m" * 40, "treeSha": "1" * 40, "protected": False, "ancestorOfControl": True},
                {"name": "integrated", "sha": "a" * 40, "treeSha": "2" * 40, "protected": False, "ancestorOfControl": True},
                {"name": "diverged", "sha": "d" * 40, "treeSha": "3" * 40, "protected": False, "ancestorOfControl": False}
            ]
        }

    def dispositions(self):
        return {
            "schemaVersion": "BranchDispositionSet 0.1",
            "controlBranch": "main",
            "preserveBranches": [],
            "terminalBranches": []
        }

    def entry(self, plan, name):
        return next(item for item in plan["entries"] if item["branch"] == name)

    def test_control_is_kept(self):
        plan = build_plan(self.observation(), self.dispositions())
        self.assertEqual(self.entry(plan, "main")["action"], "keep")
        self.assertIn("control-branch", self.entry(plan, "main")["protections"])

    def test_ancestor_is_candidate(self):
        plan = build_plan(self.observation(), self.dispositions())
        self.assertEqual(self.entry(plan, "integrated")["action"], "delete-candidate")

    def test_diverged_without_disposition_is_kept(self):
        plan = build_plan(self.observation(), self.dispositions())
        self.assertEqual(self.entry(plan, "diverged")["action"], "keep")

    def test_exact_terminal_disposition_enables_diverged_delete(self):
        disp = self.dispositions()
        disp["terminalBranches"] = [{"branch": "diverged", "sha": "d" * 40, "reason": "test", "allowDelete": True}]
        plan = build_plan(self.observation(), disp)
        self.assertEqual(self.entry(plan, "diverged")["action"], "delete-candidate")

    def test_terminal_sha_drift_blocks(self):
        disp = self.dispositions()
        disp["terminalBranches"] = [{"branch": "diverged", "sha": "x" * 40, "reason": "test", "allowDelete": True}]
        plan = build_plan(self.observation(), disp)
        self.assertEqual(self.entry(plan, "diverged")["action"], "keep")

    def test_open_pr_protection_wins(self):
        obs = self.observation()
        obs["openPrHeads"] = ["integrated"]
        plan = build_plan(obs, self.dispositions())
        self.assertEqual(self.entry(plan, "integrated")["action"], "keep")
        self.assertIn("open-pr-head", self.entry(plan, "integrated")["protections"])

    def test_explicit_preserve_wins(self):
        disp = self.dispositions()
        disp["preserveBranches"] = ["integrated"]
        plan = build_plan(self.observation(), disp)
        self.assertEqual(self.entry(plan, "integrated")["action"], "keep")

    def test_plan_hash_is_deterministic(self):
        obs = self.observation()
        disp = self.dispositions()
        self.assertEqual(build_plan(copy.deepcopy(obs), copy.deepcopy(disp))["planHash"], build_plan(obs, disp)["planHash"])

    def test_plan_hash_ignores_observation_timestamp(self):
        obs1 = self.observation()
        obs2 = copy.deepcopy(obs1)
        obs2["observedAt"] = "2026-09-04T00:01:00+00:00"
        self.assertEqual(build_plan(obs1, self.dispositions())["planHash"], build_plan(obs2, self.dispositions())["planHash"])


if __name__ == "__main__":
    unittest.main()
