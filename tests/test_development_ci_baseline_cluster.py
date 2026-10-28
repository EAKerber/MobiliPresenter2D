"""Historical CI family, source-locked and no remote probe replay."""
import hashlib,json,subprocess,unittest
from pathlib import Path
M=Path("docs/reconciliation/ci-baseline/manifest.json")
def blob(p):
    b=Path(p).read_bytes()
    return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
def git(*args):return subprocess.check_output(["git",*args],text=True).strip()
class CICluster(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.m=json.loads(M.read_text())
    def test_six_heads_and_fifteen_source_exact_artifacts(self):
        m=self.m
        self.assertEqual(m["schema"],"M2DCIBaselineDiagnosticFamily/0.1")
        self.assertEqual(len(m["sources"]),6)
        self.assertEqual(len(m["artifacts"]),15)
        shas={s["id"]:s["sha"] for s in m["sources"]}
        self.assertEqual(len(shas),6)
        self.assertEqual(len(set(a["snapshotPath"] for a in m["artifacts"])),15)
        for a in m["artifacts"]:
            p=a["snapshotPath"]
            self.assertEqual(blob(p),a["blob"],p)
            self.assertEqual(git("rev-parse",shas[a["source"]]+":"+a["originalPath"]),a["blob"],p)
            self.assertEqual(git("rev-parse","HEAD:"+p),a["blob"],p)
    def test_public_projection_is_exactly_present_and_source_identical(self):
        m=self.m
        projection=next(a for a in m["artifacts"] if a["source"]=="projection" and a["originalPath"]=="tests/public-module-projection.test.cjs")
        self.assertEqual(blob("tests/public-module-projection.test.cjs"),projection["blob"])
        for a in m["currentContracts"]:
            self.assertEqual(blob(a["path"]),a["blob"],a["path"])
    def test_diagnostic_probes_are_not_reactivated(self):
        a=self.m
        self.assertEqual(a["status"],"HISTORICAL_NON_EXECUTABLE")
        for p in ["package.json","netlify.toml","app/package.json"]:
            body=Path(p).read_text()
            self.assertNotIn("docs/reconciliation/ci-baseline",body)
            self.assertNotIn("ci-baseline-config-readiness-diagnostic.mjs",body)
        assert "historical readiness and local diagnostic scripts never run" in a["liveMode"]
        for s in a["sources"]:
            self.assertNotEqual(s["retirement"],"approved")
    def test_current_endpoint_and_isolation_guards_not_replaced(self):
        policy=Path("netlify/access/identity-policy.mjs").read_text()
        endpoint=Path("netlify/functions/buyer-configuration.mjs").read_text()
        projection=Path("app/core/public-module-projection.js").read_text()
        self.assertIn("canManageAdministration",policy)
        self.assertIn("getUser",endpoint)
        self.assertIn("project",projection)
        self.assertIn("schemaVersion",projection)
        # Historical test fixtures must never be imported into current endpoint.
        for s in ("docs/reconciliation/ci-baseline","ci-baseline-config-readiness-diagnostic.mjs","config-auth-isolation.test.mjs"):
            self.assertNotIn(s,endpoint)
if __name__=="__main__":unittest.main()
