"""Cross-control workflow references and protected archive refs."""
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from branch_hygiene_apply import verify_control_workflow_dependencies
from branch_hygiene_plan import build_plan

class ControlWorkflowTests(unittest.TestCase):
    def test_both_controls_and_yaml_extensions(self):
        refs = {"main": "a"*40, "development": "b"*40}
        with patch("branch_hygiene_apply.subprocess.run",
                   return_value=SimpleNamespace(returncode=1)) as run:
            verify_control_workflow_dependencies("candidate", refs)
        self.assertEqual(run.call_count, 2)
        for call, sha in zip(run.call_args_list, refs.values()):
            cmd = call.args[0]
            self.assertIn(sha, cmd)
            self.assertIn(":(glob).github/workflows/*.yml", cmd)
            self.assertIn(":(glob).github/workflows/*.yaml", cmd)

    def test_other_control_reference_blocks(self):
        with patch("branch_hygiene_apply.subprocess.run",
                   side_effect=[SimpleNamespace(returncode=1),
                                SimpleNamespace(returncode=0)]):
            with self.assertRaisesRegex(RuntimeError, "ACTIVE_CONTROL_WORKFLOW_REF"):
                verify_control_workflow_dependencies("candidate", {"main":"a"*40,"development":"b"*40})

    def test_scan_error_and_missing_control_block(self):
        with patch("branch_hygiene_apply.subprocess.run",
                   return_value=SimpleNamespace(returncode=128)):
            with self.assertRaisesRegex(RuntimeError, "CONTROL_WORKFLOW_SCAN_FAILED"):
                verify_control_workflow_dependencies("candidate", {"main":"a"*40,"development":"b"*40})
        with self.assertRaisesRegex(RuntimeError, "CONTROL_REF_MISSING"):
            verify_control_workflow_dependencies("candidate", {})

    def test_control_and_archive_preserved_even_if_ancestor(self):
        obs = {"schemaVersion":"BranchObservation 0.1","repository":"owner/repo",
               "controlBranch":"main","controlSha":"a"*40,"complete":True,
               "branches":[{"name":n,"sha":"a"*40,"ancestorOfControl":True}
                           for n in ("main","development","archive/example","ordinary")]}
        disp = {"schemaVersion":"BranchDispositionSet 0.1","controlBranch":"main"}
        result = {e["branch"]:e for e in build_plan(obs,disp)["entries"]}
        for n in ("main","development","archive/example"):
            self.assertFalse(result[n]["autoDeleteEligible"])
        self.assertTrue(result["ordinary"]["autoDeleteEligible"])
