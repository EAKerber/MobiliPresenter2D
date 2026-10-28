"""Main-authority CP-UX/V5 supersession: byte-exact Git evidence, no old endpoints activated."""
import hashlib, json, subprocess, unittest
from pathlib import Path
DOC=Path("docs/reconciliation/cpux-main-v5/manifest.json")
def git(*x):return subprocess.check_output(["git",*x],text=True).strip()
def sha(p):
    b=Path(p).read_bytes()
    return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
class Family(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.m=json.loads(DOC.read_text())
    def test_original_revisions_and_fourteen_unmodified_blobs(self):
        m=self.m
        self.assertEqual(len(m["sources"]),4)
        self.assertEqual(len(m["artifacts"]),14)
        sources={s["id"]:s["sha"] for s in m["sources"]}
        for x in m["artifacts"]:
            self.assertEqual(sha(x["archive"]),x["sha"],x["archive"])
            self.assertEqual(git("rev-parse",sources[x["source"]]+":"+x["path"]),x["sha"])
            self.assertEqual(git("rev-parse","HEAD:"+x["archive"]),x["sha"])
    def test_main_authority_and_gated_development_exception(self):
        m=self.m
        self.assertEqual(git("rev-parse",m["mainSha"]),m["mainSha"])
        for x in m["canonical"]:
            self.assertEqual(git("rev-parse",m["mainSha"]+":"+x["path"]),x["mainSha"])
            self.assertEqual(sha(x["path"]),x["developmentSha"],x["path"])
        endpoint=next(x for x in m["canonical"] if x["path"]=="netlify/functions/configuration.mjs")
        self.assertNotEqual(endpoint["mainSha"],endpoint["developmentSha"])
    def test_both_modern_endpoints_reject_legacy_post(self):
        m=self.m
        mainendpoint=subprocess.check_output(["git","show",m["mainSha"]+":netlify/functions/configuration.mjs"],text=True)
        dev=Path("netlify/functions/configuration.mjs").read_text()
        for content in (mainendpoint,dev):
            self.assertIn('request.method !== "GET" && request.method !== "PUT"',content)
            self.assertIn("v5_migration_retired",content)
            self.assertIn("canManageAdministration",content)
            self.assertIn("savePublishedV5",content)
            self.assertNotIn('request.method === "POST"',content)
        self.assertIn("identity_unavailable",dev)
        self.assertNotIn("identity_unavailable",mainendpoint)
        older={s["id"]:s["sha"] for s in m["sources"]}
        for source in ("preparation","v4"):
            old=subprocess.check_output(["git","show",older[source]+":netlify/functions/configuration.mjs"],text=True)
            self.assertIn('"POST"',old)
    def test_conservative_retirement_without_pr_and_holds(self):
        m=self.m
        self.assertEqual(m["currentDecision"],"ARCHIVE_ONLY_NO_LEGACY_ENDPOINT_ACTIVATION")
        self.assertTrue(m["noRuntimeChanges"])
        self.assertEqual(len(m["retirementCandidates"]),2)
        self.assertEqual(len(m["holdSources"]),2)
        self.assertTrue(all(s["archiveTag"].startswith("archive/m2d/") for s in m["sources"] if s["branch"] in m["retirementCandidates"]))
        self.assertFalse(set(m["retirementCandidates"]) & set(m["holdSources"]))
if __name__=="__main__":unittest.main()
