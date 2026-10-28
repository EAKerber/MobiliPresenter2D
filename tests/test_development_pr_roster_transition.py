"""Negative, network-free PR closure transition gates; never mutate PR state."""
import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location("devbatch_roster",ROOT/"tools/development_retirement_batch.py")
mod=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)

def archives():
    return dict(mod.PR_ARCHIVE_TAGS.items())

def tags():
    return {tag:mod.PR_HEAD_PINS[n][1] for n,tag in mod.PR_ARCHIVE_TAGS.items()}

def full_prs():
    return [
        {"number":n,"state":"open","merged_at":None,
         "head":{"ref":name,"sha":sha},"base":{"ref":"main"}}
        for n,(name,sha) in sorted(mod.PR_HEAD_PINS.items())
    ]

def closed_from(pr, **kw):
    result=copy.deepcopy(pr)
    result.update({"state":"closed","merged":False,"merged_at":None,
                   "closed_at":"2026-10-28T22:00:00Z"})
    result.update(kw)
    return result

def fetch_map(mp):
    def f(path):
        return mp[int(path.split("/")[-1])]
    return f

class PRRosterGates(unittest.TestCase):
    def test_exact_12_still_open_is_valid_before_closure(self):
        self.assertEqual(mod.verify_open_pr_roster(full_prs(),tags(),fetch_map({})),
                         set(mod.PR_HEAD_PINS))

    def test_only_two_authorized_closed_unmerged_with_tag_pass(self):
        allp=full_prs()
        old={p["number"]:closed_from(p) for p in allp if p["number"] in (175,178)}
        openp=[p for p in allp if p["number"] not in old]
        self.assertEqual(mod.verify_open_pr_roster(openp,tags(),fetch_map(old)),
                         set(mod.PR_HEAD_PINS)-{175,178})

    def test_closed_pr_179_not_yet_authorized(self):
        allp=full_prs()
        old={179:closed_from(next(p for p in allp if p["number"]==179))}
        with self.assertRaisesRegex(RuntimeError,"UNAUTHORIZED_PR_CLOSURE"):
            mod.verify_open_pr_roster([p for p in allp if p["number"]!=179],
                                      tags(),fetch_map(old))

    def test_security_pr_182_must_never_close(self):
        allp=full_prs()
        old={182:closed_from(next(p for p in allp if p["number"]==182))}
        with self.assertRaisesRegex(RuntimeError,"UNAUTHORIZED_PR_CLOSURE"):
            mod.verify_open_pr_roster([p for p in allp if p["number"]!=182],
                                      tags(),fetch_map(old))

    def test_closure_tag_required_even_when_no_pr_closed(self):
        bad=tags()
        del bad[mod.PR_ARCHIVE_TAGS[180]]
        with self.assertRaisesRegex(RuntimeError,"PR_ARCHIVE_TAG_MISSING"):
            mod.verify_open_pr_roster(full_prs(),bad,fetch_map({}))

    def test_wrong_tag_sha_denied(self):
        bad=tags()
        bad[mod.PR_ARCHIVE_TAGS[175]]="f"*40
        with self.assertRaisesRegex(RuntimeError,"PR_ARCHIVE_TAG_MISSING"):
            mod.verify_open_pr_roster(full_prs(),bad,fetch_map({}))

    def test_open_pr_head_drift_denied(self):
        allp=full_prs()
        allp[0]["head"]["sha"]="f"*40
        with self.assertRaisesRegex(RuntimeError,"PR_OPEN_IDENTITY_DRIFT"):
            mod.verify_open_pr_roster(allp,tags(),fetch_map({}))

    def test_open_pr_wrong_base_denied(self):
        allp=full_prs()
        allp[0]["base"]["ref"]="development"
        with self.assertRaisesRegex(RuntimeError,"PR_OPEN_IDENTITY_DRIFT"):
            mod.verify_open_pr_roster(allp,tags(),fetch_map({}))

    def test_closed_pr_must_be_closed_unmerged_at_original_sha(self):
        allp=full_prs()
        pr=next(p for p in allp if p["number"]==175)
        openp=[p for p in allp if p["number"]!=175]
        for mutations in [{"merged":True},{"merged_at":"2026-10-28T21:00:00Z"},
                          {"head":{"ref":pr["head"]["ref"],"sha":"f"*40}},
                          {"state":"open"},{"closed_at":None},
                          {"base":{"ref":"development"}}]:
            with self.subTest(bad=mutations):
                with self.assertRaisesRegex(RuntimeError,"PR_CLOSED_UNMERGED_PIN_MISMATCH"):
                    mod.verify_open_pr_roster(openp,tags(),
                         fetch_map({175:closed_from(pr,**mutations)}))

    def test_duplicate_or_new_open_pr_denied(self):
        with self.assertRaisesRegex(RuntimeError,"PR_OPEN_INVENTORY_UNEXPECTED"):
            mod.verify_open_pr_roster(full_prs()+[full_prs()[0]],tags(),fetch_map({}))
        with self.assertRaisesRegex(RuntimeError,"PR_OPEN_INVENTORY_UNEXPECTED"):
            mod.verify_open_pr_roster(full_prs()+[
                {"number":345,"state":"open","head":{"ref":"new","sha":"f"*40},
                 "base":{"ref":"main"}}],tags(),fetch_map({}))

    def test_manifest_prevents_unapproved_mass_closure(self):
        with tempfile.TemporaryDirectory() as t:
            target=Path(t)/"phase.json"
            actual=json.loads(mod.PR_CLOSURE_TRANSITION.read_text())
            actual["allowedClosedOrOpen"]=[175,178,179,180]
            actual["remainingCandidatesFrozenOpen"]=[]
            # This is NOT permitted with the initial wave ID.
            target.write_text(json.dumps(actual),encoding="utf-8")
            old=mod.PR_CLOSURE_TRANSITION
            try:
                mod.PR_CLOSURE_TRANSITION=target
                with self.assertRaisesRegex(RuntimeError,"PR_TRANSITION_WAVE_DRIFT"):
                    mod.verify_open_pr_roster(full_prs(),tags(),fetch_map({}))
                actual["batchId"]="dev-20261028-cppublic-pr-close-aj"
                actual["remainingCandidatesFrozenOpen"]=[]
                target.write_text(json.dumps(actual),encoding="utf-8")
                self.assertEqual(mod.verify_open_pr_roster(full_prs(),tags(),fetch_map({})),
                                 set(mod.PR_HEAD_PINS))
            finally:
                mod.PR_CLOSURE_TRANSITION=old

if __name__=="__main__":
    unittest.main()
