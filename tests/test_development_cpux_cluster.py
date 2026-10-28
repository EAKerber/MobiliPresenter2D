"""CP-UX four-branch reconciliation: strict blob provenance and v5 write-boundary guards."""
import hashlib,json,subprocess,unittest
from pathlib import Path
ROOT=Path("docs/reconciliation/cp-ux")
def git(*a):return subprocess.check_output(["git",*a],text=True).strip()
def blob(path):
    data=Path(path).read_bytes()
    return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
class Cluster(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.m=json.loads((ROOT/"manifest.json").read_text())
    def test_four_sources_exact_eleven_archived_blobs(self):
        m=self.m
        self.assertEqual(m["schema"],"M2DCPUXHistoricalCluster/0.1")
        self.assertEqual(len(m["sourceBranches"]),4)
        self.assertEqual(len(m["archives"]),11)
        shas={x["id"]:x["sha"] for x in m["sourceBranches"]}
        self.assertEqual(len(shas),4)
        self.assertEqual(len({x["snapshotPath"] for x in m["archives"]}),11)
        for a in m["archives"]:
            p=a["snapshotPath"]
            self.assertEqual(blob(p),a["blob"],p)
            self.assertEqual(git("rev-parse",shas[a["source"]]+":"+a["originalPath"]),a["blob"],p)
            self.assertEqual(git("rev-parse","HEAD:"+p),a["blob"],p)
    def test_current_authority_is_newer_schema(self):
        a=self.m["authority"]
        for k,path in (("currentRoadmapBlob",a["currentRoadmap"]),
                       ("adminBlob",a["currentAdmin"]),("functionBlob",a["currentFunction"])):
            self.assertEqual(blob(path),a[k],path)
        admin=Path(a["currentAdmin"]).read_text()
        self.assertIn('ConfiguratorAdministration2D 5.0',admin)
        self.assertIn('hierarchy-administration.js',admin)
        roadmap=Path(a["currentRoadmap"]).read_text()
        self.assertIn("CP-UX-05A0 remains authenticated-execution pending",roadmap)
        self.assertIn("schema-driven-ui-consolidation-roadmap",roadmap)
    def test_configuration_live_does_not_reenable_old_publication(self):
        text=Path(self.m["authority"]["currentFunction"]).read_text()
        self.assertIn('request.method !== "GET" && request.method !== "PUT"',text)
        self.assertIn('canManageAdministration(user)',text)
        self.assertIn('v5_migration_retired',text)
        self.assertIn('v5_preflight_retired',text)
        self.assertIn('readPublished(store)',text)
        self.assertIn('stored_configuration_invalid',text)
        self.assertIn('v5NormalSave.savePublishedV5',text)
        self.assertIn('hierarchy_publication_required',text)
        self.assertNotIn('prepare-hierarchy',text)
        self.assertNotIn('publish-v4',text)
        self.assertNotIn('request.method === "POST"',text)
        self.assertLess(text.index('canManageAdministration(user)'),text.index('getConfigurationStore(context);'))
    def test_historical_server_functions_not_used_by_live_imports(self):
        for p in ("netlify/functions/configuration.mjs","app/app.js","app/core/administration-v5.js"):
            data=Path(p).read_text()
            self.assertNotIn('docs/reconciliation/cp-ux/legacy',data)
            self.assertNotIn('netlify/lib/hierarchy-publication.mjs',data)
        self.assertEqual(self.m["status"],"HISTORICAL_V3_V4_NOT_RUNTIME")
if __name__=="__main__":unittest.main()
