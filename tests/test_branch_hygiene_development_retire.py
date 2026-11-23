#!/usr/bin/env python3
"""Fail-closed invariants for the opt-in development squash retirement path."""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from branch_hygiene_apply import apply, AUTH_ENV, DEV_AUTH_ENV
from branch_hygiene_plan import build_plan, select_bounded_batch

REPO="EAKerber/MobiliPresenter2D"
NAME="merged-development-example"
SHA="2"*40
MERGE="4"*40


def payloads():
    obs={"schemaVersion":"BranchObservation 0.1","repository":REPO,
         "controlBranch":"development","controlSha":"5"*40,
         "observedAt":"2026-11-23T00:00:00Z","observationHash":"z"*64,
         "complete":True,"openPrHeads":[],"openPrBases":[],
         "branches":[
             {"name":"main","sha":"9"*40,"treeSha":"e"*40,"protected":False,"ancestorOfControl":False},
             {"name":"development","sha":"5"*40,"treeSha":"b"*40,"protected":False,"ancestorOfControl":True},
             {"name":NAME,"sha":SHA,"treeSha":"a"*40,"protected":False,"ancestorOfControl":False},
         ]}
    disp={"schemaVersion":"BranchDispositionSet 0.1","controlBranch":"development",
          "preserveBranches":["main","development"],"terminalBranches":[]}
    batch={"schemaVersion":"BranchHygieneBatch 0.1","repository":REPO,
           "approvedRetirement":True,"branches":[
               {"branch":NAME,"sha":SHA,"squashMerge":{"pullRequest":301,"mergeCommit":MERGE}}
           ]}
    return obs,disp,batch


class DevelopmentRetirementGuards(unittest.TestCase):
    def test_requires_explicit_retirement_or_explicit_audit(self):
        obs,disp,batch=payloads()
        self.assertEqual(len(select_bounded_batch(build_plan(obs,disp),batch)),1)
        batch.pop("approvedRetirement")
        with self.assertRaisesRegex(ValueError,"BATCH_REPOSITORY_MISMATCH"):
            select_bounded_batch(build_plan(obs,disp),batch)
        batch["approvedRetirement"]=True
        batch["auditOnly"]=True
        with self.assertRaises(ValueError):
            select_bounded_batch(build_plan(obs,disp),batch)

    def test_main_and_development_never_selected(self):
        obs,disp,batch=payloads()
        for name,sha in (("main","9"*40),("development","5"*40)):
            with self.subTest(name=name),self.assertRaises(ValueError):
                batch["branches"]=[{"branch":name,"sha":sha}]
                select_bounded_batch(build_plan(obs,disp),batch)

    def test_no_applying_without_distinct_dev_authorization(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            plan=root/"plan.json"
            plan.write_text(json.dumps({"planHash":"okay","controlBranch":"development"}))
            batch=root/"batch.json"
            batch.write_text(json.dumps({"approvedRetirement":True}))
            with patch.dict(os.environ,{AUTH_ENV:"1","GITHUB_TOKEN":"test",
                                        "GITHUB_REPOSITORY":REPO},clear=True):
                with self.assertRaisesRegex(RuntimeError,"DEVELOPMENT_RETIREMENT_AUTHORIZATION_MISSING"):
                    apply(plan,root/"dispositions.json","okay",batch,root/"receipt.json",False)

    def test_no_applying_audit_only_manifest_even_when_authorized(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            plan=root/"plan.json"
            plan.write_text(json.dumps({"planHash":"okay","controlBranch":"development"}))
            batch=root/"batch.json"
            batch.write_text(json.dumps({"auditOnly":True}))
            with patch.dict(os.environ,{AUTH_ENV:"1",DEV_AUTH_ENV:"1",
                "GITHUB_TOKEN":"test","GITHUB_REPOSITORY":REPO},clear=True):
                with self.assertRaisesRegex(RuntimeError,"DEVELOPMENT_RETIREMENT_MANIFEST_NOT_APPROVED"):
                    apply(plan,root/"dispositions.json","okay",batch,root/"receipt.json",False)


if __name__ == "__main__":
    unittest.main()
