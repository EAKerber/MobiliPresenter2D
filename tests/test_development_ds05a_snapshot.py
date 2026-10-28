"""DS-05A historical review snapshot: content-only, no visual authority."""
import hashlib, json, subprocess, unittest
from pathlib import Path

ROOT=Path("docs/design-system/review-lab")
SOURCE="6120a294e0de4b018b18b1b50f20411ce44cce09"
TREE="d98e16e5bbd563c8bb1f19a6a0597fddc6021296"

def git(*args):
    return subprocess.check_output(["git",*args],text=True).strip()

class Snapshot(unittest.TestCase):
    def test_subtree_byte_exact_to_historical_source(self):
        self.assertEqual(git("rev-parse",SOURCE+":"+ROOT.as_posix()),TREE)
        self.assertEqual(git("rev-parse","HEAD:"+ROOT.as_posix()),TREE)

    def test_inventory_19_files_and_sha256(self):
        provenance=json.loads((ROOT/"PROVENANCE.json").read_text())
        self.assertEqual(provenance["schema"],"M2D.DocumentaryPersistence.1")
        recorded=provenance["files"]
        self.assertEqual(len(recorded),19)
        expected={x["path"] for x in recorded}|{"PROVENANCE.json"}
        actual={x.relative_to(ROOT).as_posix() for x in ROOT.rglob("*") if x.is_file()}
        self.assertEqual(actual,expected)
        for row in recorded:
            data=(ROOT/row["path"]).read_bytes()
            self.assertEqual(len(data),row["size"],row["path"])
            self.assertEqual(hashlib.sha256(data).hexdigest(),row["sha256"],row["path"])

    def test_historical_authority_is_not_deployed(self):
        source=(ROOT/"README.md").read_text()
        self.assertIn("NÃO alterar",source)
        self.assertIn("não é homologação",source.lower())
        self.assertIn("DS-05A",source)

    def test_two_png_evidence_are_still_png(self):
        for name in ("laboratorio-390.png","laboratorio-1366.png"):
            data=(ROOT/"evidence"/name).read_bytes()
            self.assertTrue(data.startswith(bytes.fromhex("89504e470d0a1a0a")),name)

if __name__=="__main__":
    unittest.main()
