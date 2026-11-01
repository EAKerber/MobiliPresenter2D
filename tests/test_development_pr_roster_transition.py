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
    n = 238
    name, sha = mod.PR_HEAD_PINS[n]
    return [{"number":n,"state":"open","merged_at":None,
             "head":{"ref":name,"sha":sha},"base":{"ref":"main"}}]

def closed_receipts(numbers=None):
    selected = mod.PR_CLOSED_ROSTER if numbers is None else numbers
    all_pins = {n: {"number":n,"state":"open","merged_at":None,
                    "head":{"ref":name,"sha":sha},"base":{"ref":"main"}}
                for n,(name,sha) in mod.PR_HEAD_PINS.items()}
    return {n: closed_from(all_pins[n]) for n in selected}

def pinned_branch_refs(numbers=None):
    selected = mod.PR_CLOSED_ROSTER if numbers is None else numbers
    return {mod.PR_HEAD_PINS[n][0]: mod.PR_HEAD_PINS[n][1] for n in selected}

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
    def with_transition(self, allowed=None, batch_id="dev-20261101-public-pr-archive-au"):
        temporary = tempfile.TemporaryDirectory(dir=ROOT.parent)
        self.addCleanup(temporary.cleanup)
        target=Path(temporary.name)/"phase.json"
        actual=json.loads(mod.PR_CLOSURE_TRANSITION.read_text(encoding="utf-8"))
        actual_allowed=mod.PR_CLOSED_ROSTER if allowed is None else allowed
        actual["allowedClosedOrOpen"]=actual_allowed
        actual["remainingCandidatesFrozenOpen"]=[n for n in mod.PR_ARCHIVE_TAGS if n not in actual_allowed]
        actual["batchId"]=batch_id
        target.write_text(json.dumps(actual),encoding="utf-8")
        previous=mod.PR_CLOSURE_TRANSITION
        self.addCleanup(setattr,mod,"PR_CLOSURE_TRANSITION",previous)
        mod.PR_CLOSURE_TRANSITION=target

    def test_live_roster_allows_untagged_closed_heads_only_while_exact_refs_exist(self):
        self.assertEqual(mod.verify_open_pr_roster(
            full_prs(), tags(), fetch_map(closed_receipts()), refs=pinned_branch_refs()),
            {238})

    def test_currently_present_archive_tags_must_match_exact_original_sha(self):
        bad=tags()
        bad[mod.PR_ARCHIVE_TAGS[175]]="f"*40
        with self.assertRaisesRegex(RuntimeError,"PR_ARCHIVE_TAG_MISSING_OR_CHANGED:175"):
            mod.verify_open_pr_roster(full_prs(),bad,fetch_map(closed_receipts()),
                                      refs=pinned_branch_refs())

    def test_closed_head_without_tag_or_exact_branch_ref_is_denied(self):
        refs=pinned_branch_refs()
        refs.pop(mod.PR_HEAD_PINS[34][0])
        archive_tags=tags()
        archive_tags.pop(mod.PR_ARCHIVE_TAGS[34])
        with self.assertRaisesRegex(RuntimeError,"PR_ARCHIVE_TAG_MISSING_OR_BRANCH_UNPINNED:34"):
            mod.verify_open_pr_roster(full_prs(),archive_tags,fetch_map(closed_receipts()),refs=refs)

    def test_closing_open_238_is_not_in_the_archive_allowlist(self):
        closed=closed_receipts()
        closed[238]=closed_from(full_prs()[0])
        with self.assertRaisesRegex(RuntimeError,"UNAUTHORIZED_PR_CLOSURE"):
            mod.verify_open_pr_roster([],tags(),fetch_map(closed),refs=pinned_branch_refs())

    def test_wrong_tag_sha_denied(self):
        bad=tags()
        bad[mod.PR_ARCHIVE_TAGS[175]]="f"*40
        with self.assertRaisesRegex(RuntimeError,"PR_ARCHIVE_TAG_MISSING_OR_CHANGED"):
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
        pr={"number":34,"head":{"ref":mod.PR_HEAD_PINS[34][0],
                                 "sha":mod.PR_HEAD_PINS[34][1]},"base":{"ref":"main"}}
        openp=full_prs()
        for mutations in [{"merged":True},{"merged_at":"2026-10-28T21:00:00Z"},
                          {"head":{"ref":pr["head"]["ref"],"sha":"f"*40}},
                          {"state":"open"},{"closed_at":None},
                          {"base":{"ref":"development"}}]:
            with self.subTest(bad=mutations):
                with self.assertRaisesRegex(RuntimeError,"PR_CLOSED_UNMERGED_PIN_MISMATCH"):
                    closed=closed_receipts()
                    closed[34]=closed_from(pr,**mutations)
                    mod.verify_open_pr_roster(openp,tags(),fetch_map(closed),
                                              refs=pinned_branch_refs())

    def test_duplicate_or_new_open_pr_denied(self):
        with self.assertRaisesRegex(RuntimeError,"PR_OPEN_INVENTORY_UNEXPECTED"):
            mod.verify_open_pr_roster(full_prs()+[full_prs()[0]],tags(),fetch_map({}))
        with self.assertRaisesRegex(RuntimeError,"PR_OPEN_INVENTORY_UNEXPECTED"):
            mod.verify_open_pr_roster(full_prs()+[
                {"number":345,"state":"open","head":{"ref":"new","sha":"f"*40},
                 "base":{"ref":"main"}}],tags(),fetch_map({}))

    def test_old_transition_wave_cannot_replace_current_exact_roster(self):
        self.with_transition([175,178,179,180],"dev-20261028-cppublic-pr-close-aj")
        with self.assertRaisesRegex(RuntimeError,"PR_TRANSITION_MANIFEST_DRIFT"):
            mod.verify_open_pr_roster(full_prs(),tags(),fetch_map(closed_receipts()),
                                      refs=pinned_branch_refs())


class PRHeadRetentionGates(unittest.TestCase):
    def refs(self):
        refs = {"refs/remotes/origin/" + branch: sha
                for branch, sha in mod.PR_HEAD_PINS.values()}
        refs.update({"refs/tags/" + tag: mod.PR_HEAD_PINS[n][1]
                     for n, tag in mod.PR_ARCHIVE_TAGS.items()})
        return refs

    def verify(self, refs, closed=None):
        if closed is None:
            closed = mod.PR_CONFIRMED_CLOSED_UNMERGED
        return mod.verify_pr_head_retention(mod.PR_HEAD_PINS, refs, closed)

    def test_closed_heads_can_be_untagged_only_while_exact_branch_ref_remains(self):
        refs = self.refs()
        for n in mod.PR_CLOSED_ROSTER:
            refs.pop("refs/tags/" + mod.PR_ARCHIVE_TAGS[n], None)
        self.assertTrue(self.verify(refs))
        n=34
        refs.pop("refs/remotes/origin/" + mod.PR_HEAD_PINS[n][0])
        with self.assertRaisesRegex(RuntimeError,"PR_RETENTION_ARCHIVE_MISSING_OR_CHANGED"):
            self.verify(refs)
        refs["refs/tags/" + mod.PR_ARCHIVE_TAGS[n]]=mod.PR_HEAD_PINS[n][1]
        self.assertTrue(self.verify(refs))

    def test_open_pr_cannot_fall_back_to_archive_tag(self):
        refs=self.refs()
        refs.pop("refs/remotes/origin/" + mod.PR_HEAD_PINS[238][0])
        with self.assertRaisesRegex(RuntimeError, "OPEN_PR_BRANCH_MISSING"):
            self.verify(refs)

    def test_existing_changed_branch_must_not_be_masked_by_correct_tag(self):
        for n in mod.PR_CLOSED_ROSTER:
            with self.subTest(pr=n):
                refs = self.refs()
                refs["refs/remotes/origin/" + mod.PR_HEAD_PINS[n][0]] = "f" * 40
                with self.assertRaisesRegex(RuntimeError, "PR_RETENTION_BRANCH_DRIFT"):
                    self.verify(refs)

    def test_wrong_archive_tag_is_rejected_even_with_branch_present(self):
        for n in mod.PR_CLOSED_ROSTER:
            with self.subTest(pr=n):
                refs=self.refs()
                refs["refs/tags/" + mod.PR_ARCHIVE_TAGS[n]]="f"*40
                with self.assertRaisesRegex(RuntimeError,"PR_RETENTION_ARCHIVE_MISSING_OR_CHANGED"):
                    self.verify(refs)

    def test_confirmed_closed_receipt_matches_individual_live_readbacks(self):
        self.assertEqual(mod.PR_CONFIRMED_CLOSED_UNMERGED, set(mod.PR_CLOSED_ROSTER))

    def test_closed_security_pr_is_not_an_archival_candidate(self):
        with self.assertRaisesRegex(RuntimeError, "UNARCHIVABLE_CLOSED_PR"):
            self.verify(self.refs(), closed=set(mod.PR_CLOSED_ROSTER) | {238})

    def test_altered_historical_pin_is_not_accepted(self):
        pins = copy.deepcopy(mod.PR_HEAD_PINS)
        pins[175][1] = "f" * 40
        with self.assertRaisesRegex(RuntimeError, "PR_RETENTION_PIN_DRIFT"):
            mod.verify_pr_head_retention(pins, self.refs(), set(mod.PR_CLOSED_ROSTER))

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
