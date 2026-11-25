"""Retry reconciliation on real local Git; no hosted mutations."""
import os
import sys
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
from branch_hygiene_apply import apply, AUTH_ENV, remote_refs
from branch_hygiene_plan import build_plan

R="owner/repo"

class RetryTests(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.addCleanup(os.chdir,Path.cwd())
        root=Path(tmp.name)
        self.git("init","--bare",str(root/"remote"))
        (root/"work").mkdir()
        os.chdir(root/"work")
        self.git("init","-b","main")
        self.git("config","user.name","Test")
        self.git("config","user.email","test@example.invalid")
        self.git("commit","--allow-empty","-m","base")
        self.sha=self.git("rev-parse","HEAD")
        self.git("remote","add","origin",str(root/"remote"))
        self.git("push","origin","main","HEAD:refs/heads/development","HEAD:refs/heads/live")
        self.disp={"schemaVersion":"BranchDispositionSet 0.1","controlBranch":"main",
                   "preserveBranches":[],"terminalBranches":[]}
        self.batch={"schemaVersion":"BranchHygieneBatch 0.1","repository":R,"branches":[
            {"branch":"absent","sha":self.sha},{"branch":"live","sha":self.sha}]}
        self.env={AUTH_ENV:"1","GITHUB_TOKEN":"test","GITHUB_REPOSITORY":R,
                  "GITHUB_ACTIONS":"true","GITHUB_EVENT_NAME":"push",
                  "GITHUB_REF":"refs/heads/main","GITHUB_SHA":self.sha,
                  "GITHUB_RUN_ID":"123","GITHUB_RUN_ATTEMPT":"2"}

    def git(self,*args):
        return subprocess.run(["git",*args],check=True,text=True,capture_output=True).stdout.strip()

    def observe(self,*args):
        return {"schemaVersion":"BranchObservation 0.1","repository":R,
                "controlBranch":"main","controlSha":self.sha,"complete":True,
                "openPrHeads":[],"openPrBases":[],"observationHash":"test",
                "branches":[{"name":name,"sha":sha,"treeSha":self.git("show","-s","--format=%T",sha),
                    "protected":False,"ancestorOfControl":sha==self.sha}
                    for name,sha in remote_refs().items()]}

    def execute(self,audit=False):
        plan=build_plan(self.observe(),self.disp)
        for name,data in (("plan",plan),("disp",self.disp),("batch",self.batch)):
            Path(name+".json").write_text(json.dumps(data))
        with patch.dict(os.environ,self.env,clear=True), \
                patch("branch_hygiene_apply.observe",side_effect=self.observe), \
                patch("branch_hygiene_apply.verify_no_rulesets"):
            return apply(Path("plan.json"),Path("disp.json"),plan["planHash"],
                         Path("batch.json"),Path("receipt.json"),audit)

    def test_partial_and_complete_retry(self):
        result=self.execute()
        self.assertEqual(result["deleted"],[{"branch":"live","sha":self.sha}])
        self.assertEqual(result["alreadyAbsent"],[{"branch":"absent","sha":self.sha}])
        self.assertEqual(result["readback"],"PASS")
        result=self.execute()
        self.assertEqual(result["deleted"],[])
        self.assertEqual(len(result["alreadyAbsent"]),2)
        self.assertEqual(set(remote_refs()),{"main","development"})

    def test_first_attempt_and_audit_are_strict(self):
        self.env["GITHUB_RUN_ATTEMPT"]="1"
        with self.assertRaisesRegex(ValueError,"UNSAFE_OR_MOVED_BRANCH"):
            self.execute()
        self.env["GITHUB_RUN_ATTEMPT"]="2"
        with self.assertRaisesRegex(ValueError,"UNSAFE_OR_MOVED_BRANCH"):
            self.execute(audit=True)
        self.assertIn("live",remote_refs())

    def test_recreated_changed_ref_blocks_all(self):
        self.git("commit","--allow-empty","-m","new")
        self.git("push","origin","HEAD:refs/heads/absent")
        self.git("reset","--hard",self.sha)
        with self.assertRaisesRegex(ValueError,"UNSAFE_OR_MOVED_BRANCH"):
            self.execute()
        self.assertIn("live",remote_refs())

    def test_absent_divergence_requires_existing_archive(self):
        self.git("commit","--allow-empty","-m","diverged")
        divergent=self.git("rev-parse","HEAD")
        self.git("reset","--hard",self.sha)
        self.batch["branches"][0]["sha"]=divergent
        self.disp["terminalBranches"]=[{"branch":"absent","sha":divergent,
            "allowDelete":True,"reason":"archived","archiveTag":"archive/m2d/retry"}]
        with self.assertRaisesRegex(RuntimeError,"RETRY_ARCHIVE_NOT_VERIFIED"):
            self.execute()
        self.assertIn("live",remote_refs())
        self.git("push","origin",divergent+":refs/tags/archive/m2d/retry")
        self.assertEqual(len(self.execute()["alreadyAbsent"]),1)
