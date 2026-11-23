#!/usr/bin/env python3
"""Negative regression tests for bounded retirement series."""
import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
from branch_hygiene_series import split_waves
R="EAKerber/MobiliPresenter2D"
def fixture():
    return {"schemaVersion":"BranchHygieneSeries 0.1","repository":R,
            "controlBranch":"development","approvedRetirement":True,
            "waves":[{"id":"batch-1","branches":[{"branch":"example","sha":"a"*40,
                       "squashMerge":{"pullRequest":301,"mergeCommit":"b"*40}}]}]}
class SeriesTests(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(len(split_waves(fixture(),R)),1)
    def test_wrong_authority(self):
        for key,value in [("repository","other/repo"),("controlBranch","main"),
                          ("approvedRetirement",False),("auditOnly",True)]:
            x=fixture(); x[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):
                split_waves(x,R)
    def test_no_more_than_three(self):
        x=fixture(); x["waves"][0]["branches"]*=4
        with self.assertRaises(ValueError): split_waves(x,R)
    def test_duplicates_and_control_refs(self):
        x=fixture(); x["waves"].append(copy.deepcopy(x["waves"][0]))
        with self.assertRaises(ValueError): split_waves(x,R)
        for name in ("main","development"):
            x=fixture();x["waves"][0]["branches"][0]["branch"]=name
            with self.assertRaises(ValueError): split_waves(x,R)
    def test_incomplete_proof(self):
        x=fixture();x["waves"][0]["branches"][0].pop("squashMerge")
        with self.assertRaises(ValueError): split_waves(x,R)
if __name__=="__main__": unittest.main()
