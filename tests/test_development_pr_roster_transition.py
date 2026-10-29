"""Negative, network-free PR closure transition gates; never mutate PR state."""
import copy
import importlib.util
import json
import os
import subprocess
import sys
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
    def with_transition(self, allowed, batch_id):
        temporary = tempfile.TemporaryDirectory(dir=ROOT.parent)
        self.addCleanup(temporary.cleanup)
        target=Path(temporary.name)/"phase.json"
        actual=json.loads(mod.PR_CLOSURE_TRANSITION.read_text(encoding="utf-8"))
        actual["allowedClosedOrOpen"]=allowed
        actual["remainingCandidatesFrozenOpen"]=[n for n in mod.PR_ARCHIVE_TAGS if n not in allowed]
        actual["batchId"]=batch_id
        target.write_text(json.dumps(actual),encoding="utf-8")
        previous=mod.PR_CLOSURE_TRANSITION
        self.addCleanup(setattr,mod,"PR_CLOSURE_TRANSITION",previous)
        mod.PR_CLOSURE_TRANSITION=target

    def test_exact_12_still_open_is_valid_before_closure(self):
        self.assertEqual(mod.verify_open_pr_roster(full_prs(),tags(),fetch_map({})),
                         set(mod.PR_HEAD_PINS))

    def test_only_two_authorized_closed_unmerged_with_tag_pass(self):
        allp=full_prs()
        old={p["number"]:closed_from(p) for p in allp if p["number"] in (175,178)}
        openp=[p for p in allp if p["number"] not in old]
        self.assertEqual(mod.verify_open_pr_roster(openp,tags(),fetch_map(old)),
                         set(mod.PR_HEAD_PINS)-{175,178})

    def test_aj_allows_only_the_four_documented_public_pr_closures(self):
        self.with_transition([175,178,179,180],"dev-20261028-cppublic-pr-close-aj")
        allp=full_prs()
        inherited={p["number"]:closed_from(p) for p in allp if p["number"] in (175,178)}
        openp=[p for p in allp if p["number"] not in inherited]
        self.assertEqual(mod.verify_open_pr_roster(openp,tags(),fetch_map(inherited)),
                         set(mod.PR_HEAD_PINS)-{175,178})

        for candidate in (179,180):
            with self.subTest(closed=candidate):
                closed=dict(inherited)
                closed[candidate]=closed_from(next(p for p in allp if p["number"]==candidate))
                live=[p for p in allp if p["number"] not in closed]
                self.assertEqual(mod.verify_open_pr_roster(live,tags(),fetch_map(closed)),
                                 set(mod.PR_HEAD_PINS)-set(closed))

        closed=dict(inherited)
        closed.update({p["number"]:closed_from(p) for p in allp if p["number"] in (179,180)})
        live=[p for p in allp if p["number"] not in closed]
        self.assertEqual(mod.verify_open_pr_roster(live,tags(),fetch_map(closed)),
                         set(mod.PR_HEAD_PINS)-{175,178,179,180})

    def test_aj_still_rejects_security_pr_closure(self):
        self.with_transition([175,178,179,180],"dev-20261028-cppublic-pr-close-aj")
        allp=full_prs()
        closed={182:closed_from(next(p for p in allp if p["number"]==182))}
        with self.assertRaisesRegex(RuntimeError,"UNAUTHORIZED_PR_CLOSURE"):
            mod.verify_open_pr_roster([p for p in allp if p["number"]!=182],
                                      tags(),fetch_map(closed))

    def test_closed_pr_179_not_yet_authorized(self):
        self.with_transition([175,178],"dev-20261028-cppublic-pr-close-ai")
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
        # The full four-PR allowlist cannot be smuggled into the consumed AI wave.
        self.with_transition([175,178,179,180],"dev-20261028-cppublic-pr-close-ai")
        with self.assertRaisesRegex(RuntimeError,"PR_TRANSITION_WAVE_DRIFT"):
            mod.verify_open_pr_roster(full_prs(),tags(),fetch_map({}))
        self.with_transition([175,178,179,180],"dev-20261028-cppublic-pr-close-aj")
        self.assertEqual(mod.verify_open_pr_roster(full_prs(),tags(),fetch_map({})),
                         set(mod.PR_HEAD_PINS))


class PRHeadRetentionGates(unittest.TestCase):
    def refs(self):
        refs = {"refs/remotes/origin/" + branch: sha
                for branch, sha in mod.PR_HEAD_PINS.values()}
        refs.update({"refs/tags/" + tag: mod.PR_HEAD_PINS[n][1]
                     for n, tag in mod.PR_ARCHIVE_TAGS.items()})
        return refs

    def verify(self, refs, closed=(175, 178)):
        return mod.verify_pr_head_retention(mod.PR_HEAD_PINS, refs, closed)

    def test_exact_heads_before_and_after_two_closed_branches_removed(self):
        refs = self.refs()
        self.assertTrue(self.verify(refs))
        for n in (175, 178):
            refs.pop("refs/remotes/origin/" + mod.PR_HEAD_PINS[n][0])
            self.assertTrue(self.verify(refs))

    def test_open_pr_cannot_fall_back_to_archive_tag(self):
        for n in set(mod.PR_HEAD_PINS) - {175, 178}:
            with self.subTest(pr=n):
                refs = self.refs()
                refs.pop("refs/remotes/origin/" + mod.PR_HEAD_PINS[n][0])
                with self.assertRaisesRegex(RuntimeError, "OPEN_PR_BRANCH_MISSING"):
                    self.verify(refs)

    def test_existing_changed_branch_must_not_be_masked_by_correct_tag(self):
        for n in (175, 178, 179):
            with self.subTest(pr=n):
                refs = self.refs()
                refs["refs/remotes/origin/" + mod.PR_HEAD_PINS[n][0]] = "f" * 40
                with self.assertRaisesRegex(RuntimeError, "PR_RETENTION_BRANCH_DRIFT"):
                    self.verify(refs)

    def test_closed_pr_archive_required_even_if_branch_still_exists(self):
        for n in (175, 178):
            for present in (True, False):
                for replacement in (None, "f" * 40):
                    with self.subTest(pr=n, branch=present, tag=replacement):
                        refs = self.refs()
                        tag = "refs/tags/" + mod.PR_ARCHIVE_TAGS[n]
                        refs.pop(tag)
                        if replacement:
                            refs[tag] = replacement
                        if not present:
                            refs.pop("refs/remotes/origin/" + mod.PR_HEAD_PINS[n][0])
                        with self.assertRaisesRegex(RuntimeError, "PR_RETENTION_ARCHIVE_MISSING_OR_CHANGED"):
                            self.verify(refs)

    def test_closed_security_pr_is_not_an_archival_candidate(self):
        with self.assertRaisesRegex(RuntimeError, "UNARCHIVABLE_CLOSED_PR"):
            self.verify(self.refs(), closed=(175, 178, 182))

    def test_altered_historical_pin_is_not_accepted(self):
        pins = copy.deepcopy(mod.PR_HEAD_PINS)
        pins[175][1] = "f" * 40
        with self.assertRaisesRegex(RuntimeError, "PR_RETENTION_PIN_DRIFT"):
            mod.verify_pr_head_retention(pins, self.refs(), {175, 178})

    def test_both_real_lineage_suites_pass_without_closed_head_refs(self):
        # A disposable shared mirror hides refs locally; never mutate origin or
        # this checkout. Historical DAG/blob/route assertions run unchanged.
        root = str(ROOT)
        original = mod.local_pr_refs()
        with tempfile.TemporaryDirectory(dir=ROOT.parent) as tmp:
            bundle = str(Path(tmp) / "history.bundle")
            mirror = str(Path(tmp) / "history.git")
            # Bundling avoids Git-for-Windows spawning its restricted MSYS shell
            # for a local shared clone while still creating an isolated mirror.
            subprocess.run(["git", "bundle", "create", bundle, "--all"],
                           check=True, capture_output=True, text=True)
            subprocess.run(["git", "clone", "--quiet", "--mirror", bundle, mirror],
                           check=True, capture_output=True, text=True)
            for n in mod.PR_CONFIRMED_CLOSED_UNMERGED:
                branch, sha = mod.PR_HEAD_PINS[n]
                ref = "refs/remotes/origin/" + branch
                # Fresh post-retirement checkouts already have no such ref.
                # Keep the SHA lease when simulating the pre-retirement state.
                if ref in original:
                    self.assertEqual(original[ref], sha)
                    subprocess.run(["git", "--git-dir=" + mirror, "update-ref", "-d",
                                    ref, sha], check=True)
                absent = subprocess.run(["git", "--git-dir=" + mirror, "show-ref",
                                         "--verify", "--quiet", ref])
                self.assertEqual(absent.returncode, 1, "closed head must be absent in mirror")
            env = dict(os.environ, GIT_DIR=mirror, GIT_WORK_TREE=root,
                       PYTHONUTF8="1")
            result = subprocess.run([
                sys.executable, "-m", "unittest",
                "tests/test_development_cp_public_lineage.py",
                "tests/test_development_cp_public_prs_175_180.py", "-v"],
                cwd=root, env=env, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("Ran 15 tests", result.stderr)
        self.assertEqual(mod.local_pr_refs(), original)

if __name__=="__main__":
    unittest.main()
