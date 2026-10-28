"""Source-locked reconciliation of five legacy VIS-002 references; no runtime mutations."""
import json, hashlib, subprocess, unittest
from pathlib import Path
ROOT=Path("docs/reconciliation/vis002")
MANIFEST=ROOT/"cluster.json"
def git(*args):
    return subprocess.check_output(["git",*args],text=True).strip()
def blob(data):
    return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
class Cluster(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m=json.loads(MANIFEST.read_text())
    def test_exact_5_sources_and_fourteen_blob_archives(self):
        m=self.m
        self.assertEqual(m["schema"],"M2DVis002HistoricalCluster/0.1")
        self.assertEqual(len(m["sourceBranches"]),5)
        self.assertEqual(len(m["archivedArtifacts"]),14)
        pins={x["id"]:x["sha"] for x in m["sourceBranches"]}
        self.assertEqual(len(pins),5)
        for a in m["archivedArtifacts"]:
            p=Path(a["archivePath"])
            self.assertTrue(p.is_file(),str(p))
            self.assertEqual(blob(p.read_bytes()),a["sha"],str(p))
            self.assertEqual(git("rev-parse",pins[a["source"]]+":"+a["sourcePath"]),a["sha"],str(p))
            self.assertEqual(git("rev-parse","HEAD:"+str(p)),a["sha"],str(p))
    def test_old_v02_contexts_are_retained_in_current_v03_without_color_rollback(self):
        m=self.m
        old=next(x for x in m["archivedArtifacts"] if x["source"]=="v2" and x["sourcePath"].endswith("contextual-mapping.json"))
        oldmap=json.loads(Path(old["archivePath"]).read_text())
        cur=json.loads(Path(m["current"]["mappingPath"]).read_text())
        self.assertEqual(oldmap["version"],"0.2.0")
        self.assertEqual(cur["version"],"0.3.0")
        self.assertEqual(cur["value"],"#292723")
        self.assertEqual(len(oldmap["contexts"]),8)
        self.assertEqual(len(cur["contexts"]),10)
        oldpair={(x["route"],x["selector"]) for x in oldmap["contexts"]}
        newpair={(x["route"],x["selector"]) for x in cur["contexts"]}
        self.assertTrue(oldpair.issubset(newpair),"v0.2 mapped selector silently lost")
        self.assertEqual(len(newpair-oldpair),2)
        css=Path(m["current"]["cssPath"]).read_text()
        self.assertEqual(blob(Path(m["current"]["cssPath"]).read_bytes()),m["current"]["cssBlob"])
        self.assertIn('--ds-vis002c-long-copy-light: #292723;',css)
        self.assertNotIn('#705C4B;',css)
        for route,selector in newpair:
            self.assertIn('html[data-theme="light"] '+selector,css)
        for excluded in [".feature-availability",".finish-signature",".about-closing__signature"]:
            self.assertNotIn('html[data-theme="light"] '+excluded+',',css)
        self.assertNotIn('html[data-theme="dark"]',css)
    def test_archives_not_imported_from_live_app(self):
        for path in ["app/index.html","app/about/index.html","app/how-it-works/index.html"]:
            text=Path(path).read_text()
            self.assertNotIn("reconciliation/vis002",text)
            self.assertNotIn("approved-contextual-support-text-v2.css",text)
            self.assertNotIn("public-text-contrast-candidate-v1.css",text)
        for path in ["app/landing/landing.css","app/about/about.css","app/how-it-works/how-it-works.css"]:
            self.assertNotIn('approved-contextual-support-text-v2.css',Path(path).read_text())
    def test_draft_pr231_not_considered_retired(self):
        self.assertTrue(any("PR #231" in x for x in self.m["hold"]))
if __name__=="__main__":
    unittest.main()
