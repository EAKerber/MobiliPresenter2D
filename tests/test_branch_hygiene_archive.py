"""Archival and destructive guards: real local bare Git, no network."""
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
from branch_hygiene_apply import archive_proof, verify_no_rulesets, verify_control_workflow_dependencies, delete_exact_ref
from branch_hygiene_plan import build_plan, select_bounded_batch

class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old = Path.cwd()
        self.addCleanup(self.temp.cleanup)
        self.addCleanup(os.chdir,self.old)
        root=Path(self.temp.name)
        subprocess.run(["git","init","--bare",str(root/"remote")],check=True,capture_output=True)
        (root/"work").mkdir()
        os.chdir(root/"work")
        self.git("init","-b","main")
        self.git("config","user.name","Test")
        self.git("config","user.email","test@example.invalid")
        self.git("commit","--allow-empty","-m","baseline")
        self.sha=self.git("rev-parse","HEAD")
        self.git("remote","add","origin",str(root/"remote"))
        self.git("push","origin","main")

    def git(self,*args):
        return subprocess.run(["git",*args],check=True,text=True,capture_output=True).stdout.strip()

    def entry(self,tag="archive/m2d/example"):
        return {"branch":"retired","sha":self.sha,"evidence":[
            {"kind":"explicit-terminal-disposition","archiveTag":tag}]}

    def test_audit_no_mutation_and_exact_tag_creation(self):
        e=self.entry()
        self.assertEqual(archive_proof(e)["status"],"WOULD_CREATE")
        self.assertEqual(self.git("ls-remote","--tags","origin"),"")
        self.assertEqual(archive_proof(e,create=True)["status"],"VERIFIED")
        self.assertEqual(archive_proof(e)["status"],"VERIFIED")

    def test_collision_and_missing_proof_rejected(self):
        self.git("commit","--allow-empty","-m","later")
        self.git("push","origin","HEAD:refs/tags/archive/m2d/example")
        with self.assertRaisesRegex(RuntimeError,"ARCHIVE_TAG_COLLISION"):
            archive_proof(self.entry(),create=True)
        with self.assertRaisesRegex(RuntimeError,"ARCHIVE_TAG_REQUIRED"):
            archive_proof(self.entry(None),create=True)

    def test_cross_control_literal_reference_real_git(self):
        main=self.sha
        self.git("checkout","-b","development")
        Path(".github/workflows").mkdir(parents=True)
        Path(".github/workflows/test.yaml").write_text("ref: retired\n")
        self.git("add",".")
        self.git("commit","-m","workflow")
        dev=self.git("rev-parse","HEAD")
        with self.assertRaisesRegex(RuntimeError,"ACTIVE_CONTROL_WORKFLOW_REF:retired:development"):
            verify_control_workflow_dependencies("retired",{"main":main,"development":dev})
        verify_control_workflow_dependencies("another-ref",{"main":main,"development":dev})

    def test_shared_exact_delete_and_stale_inventory_real_git(self):
        self.git("push","origin","HEAD:refs/heads/retired")
        refs={"main":self.sha,"retired":self.sha}
        with self.assertRaisesRegex(RuntimeError,"REF_DRIFT_BEFORE_DELETE"):
            delete_exact_ref("retired","9"*40,refs)
        self.assertIn("refs/heads/retired",self.git("ls-remote","--heads","origin"))
        self.assertEqual(delete_exact_ref("retired",self.sha,refs),{"main":self.sha})
        self.assertNotIn("refs/heads/retired",self.git("ls-remote","--heads","origin"))

    def test_rulesets_fail_closed(self):
        with patch("branch_hygiene_apply.paginate",return_value=[{"id":1}]):
            with self.assertRaisesRegex(RuntimeError,"RULESETS_REQUIRE_REVIEW"):
                verify_no_rulesets("owner/repo","token")

class TransferTests(unittest.TestCase):
    def test_archive_transfer_requires_explicit_pin_and_never_overrides_preserve(self):
        obs={"schemaVersion":"BranchObservation 0.1","repository":"owner/repo",
             "controlBranch":"main","controlSha":"a"*40,"complete":True,
             "branches":[{"name":"archive/old","sha":"b"*40,"ancestorOfControl":False}]}
        disp={"schemaVersion":"BranchDispositionSet 0.1","controlBranch":"main",
              "terminalBranches":[{"branch":"archive/old","sha":"b"*40,
              "reason":"archive-ref-to-tag","allowDelete":True,"archiveTag":"archive/m2d/old"}]}
        batch={"schemaVersion":"BranchHygieneBatch 0.1","repository":"owner/repo",
               "branches":[{"branch":"archive/old","sha":"b"*40}]}
        selected=select_bounded_batch(build_plan(obs,disp),batch)
        self.assertTrue(selected[0]["evidence"][0]["archiveTransfer"])
        disp["preserveBranches"]=["archive/old"]
        with self.assertRaises(ValueError):
            select_bounded_batch(build_plan(obs,disp),batch)
