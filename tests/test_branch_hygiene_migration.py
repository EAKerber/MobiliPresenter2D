"""Historical retirement executors must not return to the executable path."""
import subprocess
import unittest

class LegacyRetirementTests(unittest.TestCase):
    def test_no_operational_legacy_consumers(self):
        p=subprocess.run(["git","grep","-n","-E","development_retirement_batch|development_aux_retirement|development-retirement-batch.yml|development-hygiene-safety.yml|development_branch_reconciliation_scan|development_pr_roster_probe",
                          "--",".github/workflows","tools","scripts","tests","package.json",
                          ":(exclude)tests/test_branch_hygiene_migration.py"],
                         text=True,capture_output=True,check=False)
        self.assertEqual(p.returncode,1,p.stdout+p.stderr)
