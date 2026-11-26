#!/usr/bin/env python3
"""Fail-closed identity checks for merged-PR source branch cleanup."""
import unittest
import copy
import json
import os
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from tools.branch_hygiene_merged_pr_cleanup import merged_head_identity, cleanup
from tools import branch_hygiene_merged_pr_cleanup as subject

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
             "sha": SHA, "mergeSha": MERGE, "controlBranch": "main"},
        )

    def test_development_supported(self):
        payload = event()
        payload["pull_request"]["base"]["ref"] = "development"
        self.assertEqual(merged_head_identity(payload, REPO)["controlBranch"], "development")

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
            {"base": {"ref": "feature", "repo": {"full_name": REPO}}},
            {"head": {"ref": "development", "sha": SHA, "repo": {"full_name": REPO}}},
            {"head": {"ref": "archive/retained", "sha": SHA, "repo": {"full_name": REPO}}},
            {"base": {"ref": "main", "repo": {"full_name": "other/repo"}}},
            {"head": {"ref": "main", "sha": SHA, "repo": {"full_name": REPO}}},
            {"head": {"ref": "feature", "sha": "bad", "repo": {"full_name": REPO}}},
        ):
            payload = event()
            payload["pull_request"].update(update)
            with self.subTest(update=update), self.assertRaises(RuntimeError):
                merged_head_identity(payload, REPO)



class RuntimeCleanupTests(unittest.TestCase):
    def run_case(self, mutate=None, proof_error=None, drift=False, ruleset=False):
        payload=event()
        payload["pull_request"]["base"]["ref"]="development"
        pr=copy.deepcopy(payload["pull_request"])
        pr["merged_at"]="2026-11-25T12:00:00Z"
        name=pr["head"]["ref"]
        refs={"main":"3"*40,"development":"4"*40,name:SHA}
        obs={"schemaVersion":"BranchObservation 0.1","repository":REPO,
             "controlBranch":"development","controlSha":refs["development"],
             "observationHash":"z"*64,"complete":True,"openPrHeads":[],"openPrBases":[],
             "branches":[{"name":n,"sha":s,"treeSha":"5"*40,"protected":False,
                          "ancestorOfControl":False} for n,s in refs.items()]}
        if mutate:
            mutate(obs)
        refs={x["name"]:x["sha"] for x in obs["branches"]}
        fresh=copy.deepcopy(obs)
        if drift:
            fresh["branches"].append({"name":"new-work","sha":"6"*40})
        disp={"schemaVersion":"BranchDispositionSet 0.1","controlBranch":"development",
              "preserveBranches":["main","development"],"terminalBranches":[]}
        with tempfile.TemporaryDirectory() as tmp:
            e,r=Path(tmp)/"event.json",Path(tmp)/"receipt.json"
            e.write_text(json.dumps(payload))
            with patch.dict(os.environ,{"GITHUB_TOKEN":"test","GITHUB_REPOSITORY":REPO,
                   "GITHUB_EVENT_NAME":"pull_request_target",
                   "MOBILIPRESENTER2D_BRANCH_HYGIENE_AUTHORIZED":"1"},clear=True), \
                 patch.multiple(subject, api_get=lambda *args:pr,
                   load_json=lambda *args:disp,remote_refs=lambda:refs,
                   verify_no_workflow_dependency=lambda *args:None,
                   verify_control_workflow_dependencies=lambda *args:None,
                   reserve_operation=lambda *args:("key",None),
                   pin_marker=lambda *args:None,
                   write_pin_marker=lambda *args:{},
                   mark_applied=lambda *args:{}), \
                 patch.object(subject,"observe",side_effect=[obs,fresh]), \
                 patch.object(subject.subprocess,"run",return_value=SimpleNamespace(stdout=refs["main"],returncode=0)), \
                 patch.object(subject,"verify_no_rulesets",side_effect=RuntimeError("RULESETS_REQUIRE_REVIEW") if ruleset else None), \
                 patch.object(subject,"verify_squash_merge",return_value={"proof":"SQUASH_TREE_IDENTICAL"},
                              side_effect=RuntimeError(proof_error) if proof_error else None), \
                 patch.object(subject,"delete_exact_ref",return_value={n:s for n,s in refs.items() if n!=name}) as delete:
                if drift:
                    with self.assertRaisesRegex(RuntimeError,"CONCURRENT_INVENTORY_DRIFT"):
                        cleanup(e,r)
                    delete.assert_not_called()
                    return None
                result=cleanup(e,r)
                self.assertEqual(result,json.loads(r.read_text()))
                if result["deleted"]:
                    delete.assert_called_once_with(name,SHA,refs)
                else:
                    delete.assert_not_called()
                return result

    def test_exact_development_merge_uses_common_lease_primitive(self):
        self.assertEqual(self.run_case()["result"],"DELETED")

    def test_partial_tree_and_ruleset_preserve(self):
        self.assertEqual(self.run_case(proof_error="SQUASH_TREE_MISMATCH:example")["result"],"PRESERVED")
        self.assertEqual(self.run_case(ruleset=True)["result"],"PRESERVED")

    def test_moved_open_and_protected_preserve(self):
        name=event()["pull_request"]["head"]["ref"]
        for change in (
            lambda o:o["branches"][-1].update(sha="9"*40),
            lambda o:o["openPrHeads"].append(name),
            lambda o:o["openPrBases"].append(name),
            lambda o:o["branches"][-1].update(protected=True)):
            with self.subTest(change=change):
                self.assertEqual(self.run_case(mutate=change)["result"],"PRESERVED")

    def test_concurrent_drift_blocks(self):
        self.run_case(drift=True)

    def test_applied_cleanup_preserves_recreated_exact_head(self):
        payload=event()
        pr=copy.deepcopy(payload["pull_request"])
        pr["merged_at"]="2026-11-25T12:00:00Z"
        name=pr["head"]["ref"]
        refs={"main":"3"*40,"development":"4"*40,name:SHA}
        obs={"schemaVersion":"BranchObservation 0.1","repository":REPO,
             "controlBranch":"development","controlSha":refs["development"],
             "observationHash":"z"*64,"complete":True,"openPrHeads":[],"openPrBases":[],
             "branches":[{"name":n,"sha":s,"treeSha":"5"*40,"protected":False,
                          "ancestorOfControl":False} for n,s in refs.items()]}
        disp={"schemaVersion":"BranchDispositionSet 0.1","controlBranch":"development",
              "preserveBranches":["main","development"],"terminalBranches":[]}
        with tempfile.TemporaryDirectory() as tmp:
            event_path,receipt_path=Path(tmp)/"event.json",Path(tmp)/"receipt.json"
            event_path.write_text(json.dumps(payload))
            with patch.dict(os.environ,{"GITHUB_TOKEN":"test","GITHUB_REPOSITORY":REPO,
                   "GITHUB_EVENT_NAME":"pull_request_target","GITHUB_RUN_ID":"run-2",
                   "GITHUB_SHA":"7"*40,
                   "MOBILIPRESENTER2D_BRANCH_HYGIENE_AUTHORIZED":"1"},clear=True), \
                 patch.multiple(subject,api_get=lambda *args:pr,load_json=lambda *args:disp,
                   remote_refs=lambda:refs,verify_no_workflow_dependency=lambda *args:None,
                   verify_control_workflow_dependencies=lambda *args:None,
                   reserve_operation=lambda *args:("key",{"runId":"run-1"}),
                   pin_marker=lambda *args:None,write_pin_marker=lambda *args:{},
                   mark_applied=lambda *args:{}), \
                 patch.object(subject,"observe",return_value=obs), \
                 patch.object(subject.subprocess,"run",return_value=SimpleNamespace(stdout=refs["main"],returncode=0)), \
                 patch.object(subject,"verify_no_rulesets"), \
                 patch.object(subject,"verify_squash_merge",return_value={"proof":"SQUASH_TREE_IDENTICAL"}), \
                 patch.object(subject,"delete_exact_ref") as delete:
                result=cleanup(event_path,receipt_path)
                self.assertEqual(result["result"],"PRESERVED")
                self.assertEqual(result["reason"],"CONSUMED_HEAD_RECREATED")
                delete.assert_not_called()

    def test_no_authorization_blocks_before_reading_event(self):
        with patch.dict(os.environ,{},clear=True):
            with self.assertRaisesRegex(RuntimeError,"AUTHORIZATION_MISSING"):
                cleanup(Path("unread-event"),Path("unwritten-receipt"))


if __name__ == "__main__":
    unittest.main()
