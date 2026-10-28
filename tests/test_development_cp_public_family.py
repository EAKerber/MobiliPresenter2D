"""Source-locked CP-PUBLIC historical DTO and auth-boundary reconciliation."""
import hashlib,json,subprocess,unittest
from pathlib import Path
M=Path("docs/reconciliation/cp-public/family.json")
def git(*x):return subprocess.check_output(["git",*x],text=True).strip()
def blob(p):
    b=Path(p).read_bytes()
    return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
class Family(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.m=json.loads(M.read_text())
    def test_exact_eight_sources_twenty_two_historical_artifacts(self):
        m=self.m
        self.assertEqual(m["schema"],"M2DCPPublicReconciliation/0.1")
        self.assertEqual(len(m["sources"]),8)
        self.assertEqual(len(m["archivedArtifacts"]),22)
        shas={x["id"]:x["sha"] for x in m["sources"]}
        self.assertEqual(len(shas),8)
        self.assertEqual(len({a["snapshotPath"] for a in m["archivedArtifacts"]}),22)
        for x in m["archivedArtifacts"]:
            p=x["snapshotPath"]
            self.assertEqual(blob(p),x["blob"],p)
            self.assertEqual(git("rev-parse",shas[x["source"]]+":"+x["sourcePath"]),x["blob"],p)
            self.assertEqual(git("rev-parse","HEAD:"+p),x["blob"],p)
    def test_low_risk_documentary_sources_are_already_exact_in_development(self):
        m=self.m
        for a in m["archivedArtifacts"]:
            if a["source"] in ("security","plan"):
                self.assertEqual(blob(a["sourcePath"]),a["blob"],a["sourcePath"])
        for id in ("security","plan"):
            self.assertEqual(next(x for x in m["sources"] if x["id"]==id)["retirement"],"candidate-exact-docs-no-pr")
    def test_current_v5_authority_and_auth_before_read(self):
        m=self.m
        for x in m["currentAuthority"]:
            self.assertEqual(blob(x["path"]),x["sha"],x["path"])
        buyer=Path("netlify/functions/buyer-configuration.mjs").read_text()
        admin=Path("netlify/functions/configuration.mjs").read_text()
        self.assertIn('request.method !== "GET"',buyer)
        self.assertIn("canUseConfigurator",buyer)
        self.assertIn("findActiveSession",buyer)
        self.assertIn("publishedReader.readRawPublished",buyer)
        self.assertLess(buyer.index("canUseConfigurator({"),buyer.index("publishedReader.readRawPublished"))
        self.assertIn("published-buyer-projection.js",buyer)
        self.assertNotIn("buyer-configuration-projection.js",buyer)
        self.assertIn("canManageAdministration",admin)
        self.assertIn("v5NormalSave.savePublishedV5",admin)
        self.assertIn("v5_migration_retired",admin)
        self.assertNotIn("authorized-buyer-read.cjs",buyer)
    def test_different_public_and_authenticated_projections(self):
        m=self.m
        self.assertEqual(m["status"],"DOCUMENTARY_NOT_PUBLISHED")
        pub=Path("app/core/public-module-projection.js").read_text()
        private=Path("app/core/published-buyer-projection.js").read_text()
        self.assertIn("PublicModulePresentation2D 0.1",pub)
        self.assertIn("BuyerConfiguratorPayload 1.0",private)
        self.assertIn("BUYER_SETTING_FIELDS",private)
        self.assertNotIn("docs/reconciliation/cp-public",pub)
        for route in m["approvedDomains"]["adminOnly"]:
            self.assertNotIn(route,m["approvedDomains"]["anonymous"])
        self.assertTrue(any(x["retirement"]=="pr185-hold" for x in m["sources"]))
if __name__=="__main__":unittest.main()
