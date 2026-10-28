"""Source provenance with stable main authority over historical public prototypes."""
import hashlib,json,subprocess,unittest
from pathlib import Path
P=Path("docs/reconciliation/main-authority/public-family.json")
POL=Path("ops/development-main-authority-policy.json")
def sha(p):
    b=Path(p).read_bytes()
    return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
def git(*a):return subprocess.check_output(["git",*a],text=True).strip()
class MainAuthority(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=json.loads(P.read_text())
        cls.policy=json.loads(POL.read_text())
    def test_source_shas_and_fourteen_historic_blobs(self):
        d=self.data
        self.assertEqual(len(d["sources"]),4)
        self.assertEqual(len(d["artifacts"]),14)
        refs={x["id"]:x["sha"] for x in d["sources"]}
        for f in d["artifacts"]:
            self.assertEqual(sha(f["archive"]),f["blob"],f["archive"])
            self.assertEqual(git("rev-parse",refs[f["source"]]+":"+f["path"]),f["blob"])
            self.assertEqual(git("rev-parse","HEAD:"+f["archive"]),f["blob"])
    def test_stable_main_and_development_public_contracts_are_bit_identical(self):
        d=self.data
        self.assertEqual(git("rev-parse",d["mainSha"]),d["mainSha"])
        for f in d["currentMainContracts"]:
            self.assertEqual(git("rev-parse",d["mainSha"]+":"+f["path"]),f["sha"],f["path"])
            self.assertEqual(sha(f["path"]),f["sha"],f["path"])
        self.assertEqual(
          next(a for a in d["artifacts"] if a["source"]=="viewer-price" and a["path"]=="tests/viewer-base-price-publication.test.cjs")["blob"],
          sha("tests/viewer-base-price-publication.test.cjs"))
        self.assertEqual(
          next(a for a in d["artifacts"] if a["source"]=="viewer-price" and a["path"]=="tests/viewer-price-v5-save.test.cjs")["blob"],
          sha("tests/viewer-price-v5-save.test.cjs"))
    def test_precedence_is_explicit_and_pr_protected_branches_hold(self):
        self.assertEqual(self.policy["schema"],"M2DMainAuthorityPolicy/0.1")
        self.assertEqual(self.policy["main"]["sha"],self.data["mainSha"])
        self.assertEqual(len(self.data["candidateRefs"]),2)
        self.assertEqual(len(self.data["holdRefs"]),2)
        self.assertFalse(set(self.data["candidateRefs"]) & set(self.data["holdRefs"]))
        for s in self.data["sources"]:
            self.assertIn(s["status"],["HOLD_UNIQUE_BEHAVIOR","HOLD_UNIQUE_ARCHITECTURE","RETIRE_CANDIDATE_FULL_DAG_TAG"])
        self.assertIn("security/auth/DTO",self.policy["precedence"][-1].lower().replace("security/auth/dto","security/auth/DTO"))
    def test_retirement_does_not_change_main_or_public_runtime(self):
        self.assertEqual(self.data["phase"],"ARCHIVE_ONLY_NO_RUNTIME_CUTOVER")
        self.assertEqual(len(self.data["archiveTags"]),2)
        for a in self.data["archiveTags"]:
            self.assertIn(a["branch"],self.data["candidateRefs"])
            self.assertTrue(a["tag"].startswith("archive/m2d/"))
        self.assertEqual(self.policy["development"]["baseline"],self.data["mainSha"])
if __name__=="__main__":unittest.main()
