"""Reconstructed 52-head campaign: classification only, not historical live Git proof."""
import json
import unittest
from pathlib import Path
from tools.branch_hygiene_plan import build_plan, discovery_report

class HistoricalReplayTests(unittest.TestCase):
    def test_original_campaign_classification(self):
        fixture=json.loads((Path(__file__).parent/"fixtures/branch-hygiene-20261125.json").read_text())
        rows=fixture["rows"]
        self.assertEqual(len(rows),52)
        candidate,preserved=set(),set()
        for control in ("main","development"):
            obs={"schemaVersion":"BranchObservation 0.1","repository":"EAKerber/MobiliPresenter2D",
                 "controlBranch":control,"controlSha":next(r["sha"] for r in rows if r["branch"]==control),
                 "observationHash":"historical-fixture-"+control,"complete":True,
                 "openPrHeads":[r["branch"] for r in rows if r.get("open")],"openPrBases":[],
                 "branches":[{"name":r["branch"],"sha":r["sha"],"treeSha":r.get("treeSha"),
                              "ancestorOfControl":False,"protected":False} for r in rows]}
            facts={"schemaVersion":"BranchMergedHeadEvidence 0.1","repository":obs["repository"],
                   "controlBranch":control,"observationHash":obs["observationHash"],"facts":{}}
            for r in rows:
                related=[]
                if r.get("pullRequest"):
                    evidence={"pullRequest":r["pullRequest"],"headSha":r["sha"],"exactHead":True,
                              "merged":bool(r.get("mergeCommit")),"base":r.get("control")}
                    if r.get("control")==control and r.get("treeSha") and r.get("mergeCommit"):
                        evidence.update(mergeReachable=True,treeEqual=True,singleParent=True,
                                        originalBaseReachable=True,
                                        squashMerge={"pullRequest":r["pullRequest"],"mergeCommit":r["mergeCommit"]})
                    related.append(evidence)
                facts["facts"][r["branch"]]=related
            plan=build_plan(obs,{"schemaVersion":"BranchDispositionSet 0.1","controlBranch":control})
            report=discovery_report(plan,facts)
            self.assertEqual(report["authorization"],"NONE")
            for b in report["suggestedBatches"]:
                self.assertLessEqual(len(b),3)
                candidate.update(x["branch"] for x in b)
            preserved.update(x["branch"] for x in report["entries"] if x["state"]=="preserve")
        self.assertEqual(candidate,{r["branch"] for r in rows if r["expected"]=="candidate"})
        self.assertEqual(preserved,{r["branch"] for r in rows if r["expected"]=="preserve"})
        review={r["branch"] for r in rows}-candidate-preserved
        self.assertEqual(review,{r["branch"] for r in rows if r["expected"]=="review"})
        self.assertEqual((len(candidate),len(review),len(preserved)),(38,8,6))
