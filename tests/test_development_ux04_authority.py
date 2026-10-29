"""Hold UX04 until old geometry and keyboard contracts have honest main/V5 evidence."""
import json,re,subprocess,unittest
from pathlib import Path
M=Path("docs/reconciliation/ux04-main-authority/evidence.json")
def git(*xs):return subprocess.check_output(["git",*xs],text=True).strip()
def blob(p):
    return git("hash-object","--path="+p,p)
def assertions(src):
    return [s.strip() for s in src.splitlines() if re.match(r"^\s*assert(?:\.\w+)?\s*\(",s)]
class LegacyUX04(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.p=json.loads(M.read_text(encoding="utf-8"))
    def test_exact_original_blobs_all_thirteen(self):
        p=self.p
        self.assertEqual(len(p["historicalBlobs"]),13)
        for f in p["historicalBlobs"]:
            self.assertEqual(git("rev-parse",p["source"]["sha"]+":"+f["path"]),f["blob"])
            self.assertEqual(blob(f["archive"]),f["blob"])
            self.assertEqual(git("rev-parse","HEAD:"+f["archive"]),f["blob"])
    def test_main_and_development_baseline_remain_exact(self):
        p=self.p
        self.assertEqual(git("rev-parse",p["mainSha"]),p["mainSha"])
        baseline=p.get("candidate",{}).get("baseDevelopmentSha","HEAD")
        self.assertEqual(git("rev-parse",baseline),baseline)
        for f in p["current"]:
            self.assertEqual(git("rev-parse",p["mainSha"]+":"+f["path"]),f["mainSha"])
            self.assertEqual(git("rev-parse",baseline+":"+f["path"]),f["developmentSha"])
        for f in p.get("candidate",{}).get("files",[]):
            self.assertEqual(blob(f["path"]),f["blob"])
        promoted=p.get("candidate",{}).get("promotedDevelopmentSha")
        if promoted:
            self.assertEqual(git("rev-parse",promoted),promoted)
            for f in p["candidate"]["files"]:
                self.assertEqual(git("rev-parse",promoted+":"+f["path"]),f["blob"])
    def test_six_geometry_assertions_are_replaced_intentionally_not_copied(self):
        p=self.p
        old=assertions(Path("docs/reconciliation/ux04-main-authority/legacy/tests/flow-layout-browser.cjs").read_text(encoding="utf-8"))
        now=assertions(Path("tests/flow-layout-browser.cjs").read_text(encoding="utf-8"))
        missing=[x for x in old if x not in now]
        self.assertEqual((len(old),len(now),len(missing)),(29,216,6))
        self.assertTrue(any("desktop module detail and list start on the same row" in x for x in missing))
        self.assertTrue(any("wide Services renders peer sections on one row" in x for x in missing))
        self.assertTrue(any("narrow Modules collapses detail then list vertically" in x for x in missing))
        current="\\n".join(now)
        for goal in (
            "while controls are beside the scene, Modules uses one internal column",
            "while controls are beside the scene, Services uses one internal column",
            "stacked workspace gives Modules two peer columns",
            "stacked workspace restores the two-column Services composition",
            "compact replace hides Modules list while a detail is open",
            "narrow Modules does not overflow horizontally"
        ):
            self.assertIn(goal,current)
    def test_minimal_keyboard_focus_restoration_is_main_exception(self):
        main=subprocess.check_output(["git","show",self.p["mainSha"]+":app/app.js"],text=True,encoding="utf-8")
        dev=Path("app/app.js").read_text(encoding="utf-8")
        self.assertIn('activateSection?.("handles", handleIndex, false);',main)
        self.assertNotIn('activateSection?.("handles", handleIndex, false);',dev)
        self.assertIn('const restoreHandleFocus = document.activeElement === button;',dev)
        self.assertIn('if (restoreHandleFocus) {\n      requestAnimationFrame(() => {\n        global.CASA_KEYBOARD_SHORTCUTS?.activateSection?.("section:handles", handleIndex, true);\n      });\n    }',dev)
        self.assertIn('id: `section:${modelSection.id}`',Path("app/core/keyboard-shortcuts.js").read_text(encoding="utf-8"))
        self.assertIn("selected handle regains focus after redraw",Path("tests/keyboard-browser.cjs").read_text(encoding="utf-8"))
    def test_keyboard_preserves_historical_contract_and_requires_focus_gate(self):
        old=assertions(Path("docs/reconciliation/ux04-main-authority/legacy/tests/keyboard-browser.cjs").read_text(encoding="utf-8"))
        current=assertions(Path("tests/keyboard-browser.cjs").read_text(encoding="utf-8"))
        missing=[x for x in old if x not in current]
        self.assertEqual((len(old),len(current),len(missing)),(74,102,2))
        self.assertEqual(sum(x in current for x in old),72)
        self.assertTrue(any("selected handle regains focus after redraw" in x for x in current))
        self.assertTrue(any("last-section navigation aligns the final section" in x for x in missing))
        self.assertTrue(any("reduced motion reaches the same final section geometry" in x for x in missing))
        self.assertTrue(any("above the persistent dock" in x for x in current))
        self.assertTrue(any("reduced-motion section navigation stays above the dock" in x for x in current))
        self.assertEqual(self.p["semanticDecision"]["mode"],"GATE_PASSED_RETIRE_CANDIDATE")
        self.assertEqual(self.p["candidate"]["status"],"PROMOTED")
if __name__=="__main__":unittest.main()
