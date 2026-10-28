import hashlib,json,subprocess,unittest
from pathlib import Path
P=Path("docs/reconciliation/ci-v5-nav-clean/family.json")
def git(*args):return subprocess.check_output(["git",*args],text=True).strip()
def blob(path):
    b=Path(path).read_bytes()
    return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
class LegacyDiagnostics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.m=json.loads(P.read_text())
    def test_original_files_are_byte_identical_and_main_pinned(self):
        p=self.m
        self.assertEqual(len(p["artifacts"]),8)
        self.assertEqual(git("rev-parse",p["mainSha"]),p["mainSha"])
        for a in p["artifacts"]:
            self.assertEqual(git("rev-parse",p["source"]["sha"]+":"+a["path"]),a["blob"])
            self.assertEqual(blob(a["snapshot"]),a["blob"])
            self.assertEqual(git("rev-parse","HEAD:"+a["snapshot"]),a["blob"])
    def test_old_css_visual_diff_is_not_silently_discarded(self):
        p=self.m
        self.assertEqual(p["classification"],"HOLD_UNTIL_DIFFERENTIAL_VISUAL_INTENT_VERIFIED")
        self.assertFalse(p["runtimeChanged"])
        names=[a["path"] for a in p["artifacts"]]
        self.assertIn("tests/ci/nav-css-visual-differential.mjs",names)
        self.assertIn("tests/ci/nav-label-width-boundary.mjs",names)
        self.assertIn("tests/ci/nav-flow-profile-crossbrowser.mjs",names)
        old=Path("docs/reconciliation/ci-v5-nav-clean/source/tests/ci/nav-css-visual-differential.mjs").read_text()
        self.assertIn("readFileSync",old)
        current=Path("tests/ci/nav-flow-responsive-crossbrowser.cjs").read_text()
        self.assertIn("CI_NAV_RESPONSIVE_COMPLETE",current)
        self.assertIn("local-validated-v5-not-authenticated-preview",current)
if __name__=="__main__":unittest.main()
