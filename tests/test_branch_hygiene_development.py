#!/usr/bin/env python3
"""Development squash-proof audit remains read-only and fail-closed."""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from branch_hygiene_apply import AUTH_ENV, apply, verify_squash_merge
from branch_hygiene_plan import build_plan, select_bounded_batch

REPO = "EAKerber/MobiliPresenter2D"
NAME, HEAD, MERGE, BASE, TREE = "archived-dev-pr", "2"*40, "4"*40, "1"*40, "a"*40

def fixtures():
    obs = {
        "schemaVersion": "BranchObservation 0.1", "repository": REPO,
        "controlBranch": "development", "controlSha": "5"*40, "complete": True,
        "observedAt": "2026-11-23T00:00:00Z", "observationHash": "c"*64,
        "openPrHeads": [], "openPrBases": [],
        "branches": [
            {"name":"main","sha":"9"*40,"treeSha":"b"*40,"protected":False,"ancestorOfControl":False},
            {"name":"development","sha":"5"*40,"treeSha":"d"*40,"protected":False,"ancestorOfControl":True},
            {"name":NAME,"sha":HEAD,"treeSha":TREE,"protected":False,"ancestorOfControl":False},
        ]
    }
    disp = {"schemaVersion":"BranchDispositionSet 0.1", "controlBranch":"development",
            "preserveBranches":["main","development"],"terminalBranches":[]}
    batch = {"schemaVersion":"BranchHygieneBatch 0.1", "repository":REPO,
             "auditOnly":True,"branches":[{"branch":NAME,"sha":HEAD,
             "squashMerge":{"pullRequest":301,"mergeCommit":MERGE}}]}
    return obs, disp, batch

def git_result(args, **kwargs):
    if args[:3] == ["git","rev-list","--parents"]:
        return SimpleNamespace(stdout=MERGE+" "+BASE+"\n",returncode=0)
    if args[:3] == ["git","merge-base","--is-ancestor"]:
        return SimpleNamespace(stdout="",returncode=0)
    if args[:3] == ["git","show","-s"]:
        return SimpleNamespace(stdout=TREE+"\n",returncode=0)
    raise AssertionError(args)

class DevelopmentAuditTests(unittest.TestCase):
    def test_explicit_audit_only_required(self):
        obs,disp,batch=fixtures()
        self.assertEqual(select_bounded_batch(build_plan(obs,disp),batch)[0]["branch"],NAME)
        batch.pop("auditOnly")
        with self.assertRaises(ValueError):
            select_bounded_batch(build_plan(obs,disp),batch)

    def test_main_development_and_open_refs_block(self):
        obs,disp,batch=fixtures()
        for name,sha in (("main","9"*40),("development","5"*40)):
            batch["branches"]=[{"branch":name,"sha":sha}]
            with self.subTest(name=name), self.assertRaises(ValueError):
                select_bounded_batch(build_plan(obs,disp),batch)
        obs,disp,batch=fixtures()
        obs["openPrHeads"]=[NAME]
        with self.assertRaises(ValueError):
            select_bounded_batch(build_plan(obs,disp),batch)

    def test_runtime_proof_checks_development_base(self):
        pr={"state":"closed","merged_at":"2026-11-22T00:00:00Z",
            "merge_commit_sha":MERGE,
            "head":{"ref":NAME,"sha":HEAD,"repo":{"full_name":REPO}},
            "base":{"ref":"development","repo":{"full_name":REPO}}}
        entry={"branch":NAME,"sha":HEAD,"treeSha":TREE,
               "squashMerge":{"pullRequest":301,"mergeCommit":MERGE}}
        with patch("branch_hygiene_apply.api_get",return_value=pr), \
             patch("branch_hygiene_apply.subprocess.run",side_effect=git_result):
            proof=verify_squash_merge(REPO,"token",entry,"5"*40,"development")
        self.assertEqual(proof["controlBranch"],"development")
        pr["base"]["ref"]="main"
        with patch("branch_hygiene_apply.api_get",return_value=pr), \
             patch("branch_hygiene_apply.subprocess.run",side_effect=git_result):
            with self.assertRaisesRegex(RuntimeError,"IDENTITY_MISMATCH"):
                verify_squash_merge(REPO,"token",entry,"5"*40,"development")

    def test_no_development_apply_even_with_authorization(self):
        with tempfile.TemporaryDirectory() as d:
            plan=Path(d)/"plan.json"
            plan.write_text(json.dumps({"planHash":"ok","controlBranch":"development"}))
            with patch.dict(os.environ,{AUTH_ENV:"1","GITHUB_TOKEN":"dummy","GITHUB_REPOSITORY":REPO}):
                with self.assertRaisesRegex(RuntimeError,"DEVELOPMENT_RETIREMENT_AUTHORIZATION_MISSING"):
                    apply(plan,Path(d)/"dispositions.json","ok",
                          Path(d)/"batch.json",Path(d)/"receipt.json",False)

if __name__ == "__main__":
    unittest.main()
