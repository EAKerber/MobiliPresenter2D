"""Prove old CI nav probe can be archived without losing stable navigation obligations."""
import hashlib,json,re,subprocess,unittest
from pathlib import Path
M=Path("docs/reconciliation/ci-nav-legacy/family.json")
def git(*args):return subprocess.check_output(["git",*args],text=True).strip()
def blob(p):
    b=Path(p).read_bytes()
    return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
class LegacyNav(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.p=json.loads(M.read_text())
    def test_original_provenance_and_seven_immutable_blobs(self):
        p=self.p;self.assertEqual(len(p["artifacts"]),7)
        for f in p["artifacts"]:
            self.assertEqual(git("rev-parse",p["source"]["sha"]+":"+f["path"]),f["blob"])
            self.assertEqual(blob(f["archive"]),f["blob"])
            self.assertEqual(git("rev-parse","HEAD:"+f["archive"]),f["blob"])
    def test_current_main_and_development_are_distinct_pinned_contracts(self):
        p=self.p
        self.assertEqual(git("rev-parse",p["mainSha"]),p["mainSha"])
        self.assertEqual(git("rev-parse",p["mainSha"]+":"+p["modern"]["path"]),p["modern"]["mainBlob"])
        self.assertEqual(blob(p["modern"]["path"]),p["modern"]["developmentBlob"])
        self.assertNotEqual(p["modern"]["mainBlob"],p["modern"]["developmentBlob"])
    def test_current_browser_covers_all_historical_widths_plus_700(self):
        p=self.p
        old=Path(next(f["archive"] for f in p["artifacts"] if f["path"].endswith("nav-flow-profile-crossbrowser.mjs"))).read_text()
        now=Path(p["modern"]["path"]).read_text()
        oldwidths=[int(x) for x in re.search(r"const widths=\[([\d,]+)\]",old).group(1).split(",")]
        current=[int(x) for x in re.findall(r"^\s+\[(\d+),\s*\"(?:compact|stacked|side-rail)\"\]",now,re.M)]
        self.assertEqual(oldwidths,p["modern"]["oldCrossBrowserWidthSet"])
        self.assertEqual(current,p["modern"]["currentWidthSet"])
        self.assertEqual(set(oldwidths)-set(current),set())
        self.assertIn(700,current)
        self.assertIn('["chromium", chromium]',now)
        self.assertIn('["light", "dark"]',now)
        self.assertIn("getNormalizedFlow",now)
        self.assertIn("published stage IDs must survive responsive transition",now)
        self.assertNotIn("assert.equal(state.steps.length,4",now)
    def test_diagnostic_experiments_preserved_not_represented_as_production(self):
        p=self.p
        self.assertEqual(len(p["modern"]["archivalOnly"]),2)
        self.assertTrue(p["source"]["tag"].startswith("archive/m2d/"))
        self.assertIn("no Netlify authenticated session",p["modern"]["scope"])
        self.assertIn("CSS causality",p["modern"]["archivalOnly"][1])
if __name__=="__main__":unittest.main()
