"""Read-only discovery must never become deletion authority."""
import copy
import unittest
from tools.branch_hygiene_plan import build_plan, discovery_report, select_bounded_batch

class DiscoveryTests(unittest.TestCase):
    def fixture(self, control="main"):
        names = ["main","development","archive/old","open","exact","ancestor","diverged","terminal"]
        obs = {"schemaVersion":"BranchObservation 0.1","repository":"owner/repo",
               "controlBranch":control,"controlSha":"b"*40,"complete":True,
               "observationHash":"c"*64,"openPrHeads":["open"],"openPrBases":[],
               "branches":[{"name":n,"sha":"a"*40,"treeSha":"d"*40,"protected":False,
                            "ancestorOfControl":n in ("ancestor","main","development","archive/old")}
                           for n in names]}
        disp = {"schemaVersion":"BranchDispositionSet 0.1","controlBranch":control,
                "terminalBranches":[{"branch":"terminal","sha":"a"*40,"allowDelete":True}]}
        facts = {"schemaVersion":"BranchMergedHeadEvidence 0.1","repository":"owner/repo",
                 "controlBranch":control,"observationHash":"c"*64,
                 "facts":{n:[] for n in names}}
        facts["facts"]["exact"] = [{"pullRequest":42,"headSha":"a"*40,"exactHead":True,
            "merged":True,"base":control,"mergeReachable":True,"treeEqual":True,
            "singleParent":True,"originalBaseReachable":True,
            "squashMerge":{"pullRequest":42,"mergeCommit":"e"*40}}]
        return build_plan(obs,disp),facts

    def test_candidates_are_suggestions_only(self):
        p,f = self.fixture()
        r = discovery_report(p,f)
        self.assertEqual(r["counts"],{"preserve":4,"candidate":2,"review":2})
        self.assertEqual(r["authorization"],"NONE")
        self.assertTrue(r["executorAuditRequired"])
        self.assertEqual({i["branch"] for b in r["suggestedBatches"] for i in b},{"ancestor","exact"})
        with self.assertRaises(ValueError):
            select_bounded_batch(p,r)

    def test_stale_or_partial_proof_never_suggested(self):
        for key in ("exactHead","merged","mergeReachable","treeEqual","singleParent","originalBaseReachable"):
            p,f = self.fixture()
            f["facts"]["exact"][0][key] = False
            with self.subTest(key=key):
                self.assertEqual(discovery_report(p,f)["counts"]["candidate"],1)

    def test_development_keeps_existing_squash_only_guard(self):
        p,f = self.fixture("development")
        self.assertEqual(discovery_report(p,f)["counts"]["candidate"],1)

    def test_snapshot_drift_blocks(self):
        p,f = self.fixture()
        f["observationHash"] = "bad"
        with self.assertRaises(ValueError):
            discovery_report(p,f)
