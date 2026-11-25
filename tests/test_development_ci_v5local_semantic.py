import subprocess, unittest
from pathlib import Path
SRC="5ce7327a9e4c8c11483163507d29af4bb8b1312a"
MAIN="221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
DEVELOPMENT_BASE="5f8c3161f3177ae28e30adf5236dbe822db7b590"
TST006="c1f3be2be89c1e7f5843f568cf0d3ae38adf3541"
VIS="9aca354f3ed9641fcb268d3a515df73365135588"
PATH="docs/reconciliation/ci-v5local/legacy/tests/ci/config-local-visibility-probe.mjs"
SERVER="tests/ci/local-buyer-config-server.mjs"
def git(*args):
 return subprocess.check_output(["git",*args],text=True).strip()
class V5LocalSemantic(unittest.TestCase):
 def test_exact_snapshot_of_original_visibility_probe(self):
  self.assertEqual(git("rev-parse",SRC+":tests/ci/config-local-visibility-probe.mjs"),VIS)
  self.assertEqual(git("rev-parse","HEAD:"+PATH),VIS)
 def test_main_source_pins_and_development_no_runtime_change(self):
  self.assertEqual(git("rev-parse",MAIN+":"+SERVER),
                   "1b75eb62cf41112041b1dbce753753aa415d36c8")
  self.assertEqual(git("rev-parse",DEVELOPMENT_BASE+":"+SERVER),
                   "9c37286eb9eafccf0c57e1dd055f5d09df146245")
  self.assertEqual(git("rev-parse","HEAD:"+SERVER),
                   "9c37286eb9eafccf0c57e1dd055f5d09df146245")
  self.assertEqual(git("rev-parse",SRC+":"+SERVER),
                   "678a1fc2ea9a0d50f32cb17860cc1b20f02b4adb")
  changed=git("diff","--name-only","5f8c3161f3177ae28e30adf5236dbe822db7b590.."+TST006).splitlines()
  self.assertTrue(changed)
  self.assertFalse(any(p.startswith(("app/","netlify/")) for p in changed))
 def test_dto_and_visibility_gates_are_new_pure_sources(self):
  a=Path("tests/ci/legacy-v5local-dto-parity.test.cjs").read_text()
  b=Path("tests/ci/v5-local-hit-target-semantic.cjs").read_text()
  w=Path(".github/workflows/development-ci-v5local-semantic.yml").read_text()
  self.assertIn("inspectPublishedRaw",a)
  self.assertIn("legacy-v5local-dto-parity.test.cjs",w)
  self.assertIn("browser-local-only:",w)
  self.assertIn("elementFromPoint",b)
  self.assertIn("127.0.0.1:8123",b)
  self.assertNotIn("NETLIFY_",w)
  self.assertNotIn("SUPABASE_",w)
  self.assertNotIn("tests/ci/config-auth-isolation",w)
 def test_main_authority_report_not_retired(self):
  d=Path("docs/work/DEVELOPMENT_CI_V5LOCAL_SEMANTIC_2026-10-28.md").read_text()
  self.assertIn("permanece HOLD",d)
  self.assertIn("main@"+MAIN,d)
if __name__=="__main__": unittest.main()
