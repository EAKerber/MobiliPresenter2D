"""Pin old CSS and today's MAIN and explain query-container relocation without image claims."""
import hashlib,json,subprocess,unittest
from pathlib import Path
P=Path("docs/reconciliation/ci-v5-nav-clean/css-causality.json")
def git(*args):return subprocess.check_output(["git",*args],text=True).strip()
def sha(path):
    data=Path(path).read_bytes()
    return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
class CSSCausal(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.m=json.loads(P.read_text())
    def test_sha_pins_and_current_css_is_main(self):
        m=self.m
        old=m["older"];main=m["stableMain"];current=m["present"]
        self.assertEqual(git("rev-parse",old["sha"]+":app/styles.css"),old["cssBlob"])
        self.assertEqual(sha(old["cssArchive"]),old["cssBlob"])
        self.assertEqual(git("rev-parse","HEAD:"+old["cssArchive"]),old["cssBlob"])
        self.assertEqual(git("rev-parse",main["sha"]+":app/styles.css"),main["cssBlob"])
        self.assertEqual(sha("app/styles.css"),current["cssBlob"])
        self.assertEqual(current["cssBlob"],main["cssBlob"])
    def test_queries_target_distinct_containers_exactly(self):
        m=self.m
        old=Path(m["older"]["cssArchive"]).read_text()
        current=Path("app/styles.css").read_text()
        self.assertIn(".controls { display: flex; flex-direction: column; gap: 16px; container: flow-steps / inline-size; }",old)
        self.assertIn(".controls { display: flex; flex-direction: column; gap: 16px; }",current)
        self.assertIn("container-name: flow-steps;",current)
        self.assertIn("container-type: inline-size;",current)
        self.assertNotIn("container-name: flow-steps;",old)
        for x in [old,current]:
            self.assertIn("@container flow-steps (max-width: 500px)",x)
    def test_no_main_or_production_mutations(self):
        m=self.m
        self.assertEqual(m["decision"],"HOLD_OLD_BRANCH_PENDING_BEHAVIORAL_DIFFERENTIAL")
        self.assertTrue(m["noRuntimeEdits"] and m["noDeploy"])
        self.assertEqual(len(m["test"]["widths"]),10)
        self.assertEqual(m["test"]["engines"],["chromium","webkit"])
if __name__=="__main__":unittest.main()
