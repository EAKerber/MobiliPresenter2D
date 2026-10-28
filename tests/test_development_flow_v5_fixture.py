"""Prove 04a V3-only harness was superseded without silently dropping behavior."""
import hashlib,json,re,subprocess,unittest
from pathlib import Path
M=Path("docs/reconciliation/flow-v5-fixture/equivalence.json")
def git(*args): return subprocess.check_output(["git",*args],text=True).strip()
def blob(path):
    b=Path(path).read_bytes()
    return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
def assertions(src):
    return [s.strip() for s in src.splitlines() if re.match(r"^\s*assert(?:\.[A-Za-z0-9_]+)?\s*\(",s)]
class FixtureDifferential(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m=json.loads(M.read_text())
        cls.old=Path(cls.m["source"]["archivedPath"]).read_text()
        cls.current=Path(cls.m["current"]["path"]).read_text()
    def test_source_blob_is_exact_original_and_main_is_authority(self):
        m=self.m
        self.assertEqual(git("rev-parse",m["source"]["sha"]+":"+m["source"]["path"]),m["source"]["blobSha"])
        self.assertEqual(blob(m["source"]["archivedPath"]),m["source"]["blobSha"])
        self.assertEqual(git("rev-parse","HEAD:"+m["source"]["archivedPath"]),m["source"]["blobSha"])
        self.assertEqual(git("rev-parse",m["mainSha"]+":"+m["current"]["path"]),m["current"]["mainBlobSha"])
        self.assertEqual(blob(m["current"]["path"]),m["current"]["developmentBlobSha"])
        self.assertEqual(m["source"]["archiveTag"],"archive/m2d/legacy-cp-public-flow-v3-fixture-9503ad1c")
    def test_every_relevant_browser_assertion_preserved_byte_for_byte(self):
        old,new=assertions(self.old),assertions(self.current)
        self.assertEqual((len(old),len(new)),(218,216))
        self.assertEqual(old[:2],[
          "assert.equal(legacyFixture.schemaVersion, configuration.SCHEMA);",
          "assert(legacyFixture.stages.every(stage => Array.isArray(stage.items)));"
        ])
        self.assertEqual(old[2:],new,
          "The V5 buyer browser must preserve all 216 legacy functional assertion calls IN ORDER")
        self.assertNotIn("const legacyFixture =",self.current)
        self.assertIn("CI_FLOW_V5_FIXTURE_INVALID",self.current)
        self.assertIn("CI_EXPECT_PUBLISHED_V5",self.current)
        self.assertIn("projectFixtureToV5Buyer",self.current)
        self.assertIn("buyerProjection.project(v5,",self.current)
    def test_all_nine_migrated_interception_scenarios_exist(self):
        orig,new=self.old,self.current
        self.assertEqual(orig.count('route("**/api/configuration"'),10)
        self.assertEqual(new.count('route("**/api/buyer-configuration"'),9)
        self.assertEqual(new.count("body: JSON.stringify(projectFixtureToV5Buyer("),9)
        self.assertNotIn('route("**/api/configuration"',new)
        self.assertIn('await page.goto(targetUrl',new)
        names=["renamedPage","reorderPage","negativePage","lightingNegativePage",
               "frontsNegativePage","handlesNegativePage","cabinetNegativePage",
               "stoneNegativePage","skirtingNegativePage"]
        for name in names:
            self.assertIn("const "+name+" = await browser.newPage(",orig)
            self.assertIn("const "+name+" = await browser.newPage(",new)
        self.assertIn("getFlowLayoutErrors()",new)
        self.assertIn('"flow layout browser: PASS"',new)
    def test_other_old_cpux_browser_geometry_is_explicitly_held(self):
        m=self.m
        other=m["adjacentHold"]
        old=subprocess.check_output(["git","show",other["sha"]+":tests/flow-layout-browser.cjs"],text=True)
        self.assertEqual(git("rev-parse",other["sha"]+":tests/flow-layout-browser.cjs"),other["oldBrowserBlob"])
        original=assertions(old)
        current=assertions(self.current)
        missing=[a for a in original if a not in current]
        self.assertEqual(len(original),29)
        self.assertEqual(len(missing),6)
        self.assertTrue(all(any(word in a for word in ("detailDesktop","listDesktop","lighting","additional","noOverflow","listMobile")) for a in missing))
        self.assertEqual(other["decision"],"HOLD pending newer-layout intentional-behavior review")
        self.assertTrue(m["constraints"]["noRuntimeChange"])
if __name__=="__main__":unittest.main()
