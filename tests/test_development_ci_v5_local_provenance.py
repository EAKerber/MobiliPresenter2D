import subprocess
import unittest
from pathlib import Path

SOURCE = "5ce7327a9e4c8c11483163507d29af4bb8b1312a"
MAIN = "221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
DEVELOPMENT_BASE = "5f8c3161f3177ae28e30adf5236dbe822db7b590"
TST006 = "c1f3be2be89c1e7f5843f568cf0d3ae38adf3541"
OLD = {
    "tests/ci/v5-local-navigation-probe.mjs": "c6f889903e3013dffe5473fad414048975837678",
    ".github/workflows/ci-baseline-01-local-diagnostic.yml": "1c04f12949b137ea6f4a98b9bdb5063e5611cedd",
    "tests/ci/config-unlocked-local-diagnostic.mjs": "0dda59980950186190b45a7a8892f90e884b338d",
    "tests/ci/local-buyer-config-server.mjs": "678a1fc2ea9a0d50f32cb17860cc1b20f02b4adb",
    "tests/ci/config-local-visibility-probe.mjs": "9aca354f3ed9641fcb268d3a515df73365135588",
    "tests/ci/config-auth-isolation.mjs": "97c014e91ce57fcac7aa696dbaf9b4a9caa4450d",
}
MODERN_MAIN = {
    "tests/ci/config-unlocked-local-diagnostic.mjs": "74c3eab7ccfa6bd124e7133b04e793b94340edd3",
}
DEVELOPMENT_CONFIG_UNLOCKED = "53eb4b850d58a9058d7015c82ca997dea6600823"

def git(*args):
    return subprocess.check_output(["git", *args], text=True, stderr=subprocess.PIPE).strip()

class CIv5LocalHistory(unittest.TestCase):
    def test_source_commit_and_main_pins(self):
        self.assertEqual(git("rev-parse", SOURCE + "^{commit}"), SOURCE)
        self.assertEqual(git("rev-parse", MAIN + "^{commit}"), MAIN)

    def test_historical_blobs_are_exact(self):
        for path, sha in OLD.items():
            with self.subTest(path=path):
                self.assertEqual(git("rev-parse", SOURCE + ":" + path), sha)

    def test_existing_snapshots_unchanged(self):
        for path, oldpath in [
            ("tests/ci/v5-local-navigation-probe.mjs",
             "docs/reconciliation/ci-baseline/legacy/v5local/tests/ci/v5-local-navigation-probe.mjs"),
            (".github/workflows/ci-baseline-01-local-diagnostic.yml",
             "docs/reconciliation/ci-baseline/legacy/v5local/.github/workflows/ci-baseline-01-local-diagnostic.yml"),
        ]:
            with self.subTest(path=path):
                self.assertEqual(git("rev-parse", "HEAD:" + oldpath), OLD[path])

    def test_modern_main_contracts_not_replaced(self):
        for path, sha in MODERN_MAIN.items():
            with self.subTest(path=path):
                self.assertEqual(git("rev-parse", MAIN + ":" + path), sha)
        config = "tests/ci/config-unlocked-local-diagnostic.mjs"
        self.assertEqual(git("rev-parse", TST006 + ":" + config), DEVELOPMENT_CONFIG_UNLOCKED)
        self.assertEqual(git("rev-parse", "HEAD:" + config), DEVELOPMENT_CONFIG_UNLOCKED)
        server = "tests/ci/local-buyer-config-server.mjs"
        development_server = "9c37286eb9eafccf0c57e1dd055f5d09df146245"
        self.assertEqual(git("rev-parse", MAIN + ":" + server),
                         "1b75eb62cf41112041b1dbce753753aa415d36c8")
        self.assertEqual(git("rev-parse", DEVELOPMENT_BASE + ":" + server), development_server)
        self.assertEqual(git("rev-parse", "HEAD:" + server), development_server)

    def test_development_only_dynamic_nav_is_not_misclassified_as_main(self):
        path = "tests/ci/nav-flow-responsive-crossbrowser.cjs"
        self.assertEqual(git("rev-parse", MAIN + ":" + path), "84434cdde4576076ac2eadbecd064be543810dec")
        self.assertEqual(git("rev-parse", "HEAD:" + path), "8a4e200863f5d631c0799ba1501021451f07e00d")

    def test_workflow_does_not_execute_legacy_or_live_auth(self):
        flow = Path(".github/workflows/development-ci-v5local-provenance.yml").read_text()
        self.assertIn("python3 -m unittest", flow)
        self.assertNotIn("tests/ci/config-auth-isolated-browser", flow)
        self.assertNotIn("ci-baseline-01-local-diagnostic.yml", flow)
        self.assertNotIn("NETLIFY_", flow)
        self.assertNotIn("SUPABASE_", flow)
        self.assertNotIn("curl ", flow)

    def test_modern_dynamic_navigation_and_local_separation(self):
        nav = Path("tests/ci/nav-flow-responsive-crossbrowser.cjs").read_text()
        self.assertIn("getNormalizedFlow", nav)
        self.assertIn("local-validated-v5-not-authenticated-preview", nav)
        old_browser = git("show", SOURCE + ":tests/ci/local-buyer-config-server.mjs")
        current = Path("tests/ci/local-buyer-config-server.mjs").read_text()
        self.assertIn("administrationV5.upgrade(", old_browser)
        self.assertIn("createLocalBuyerFixture(", current)
        self.assertNotIn("const v5=administrationV5.upgrade(", current)

if __name__ == "__main__":
    unittest.main()
