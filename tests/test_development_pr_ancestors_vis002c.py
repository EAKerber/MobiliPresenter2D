"""Offline full-DAG/semantic gate for PR ancestor ref retirement; never runs old scripts."""
import json
import subprocess
import unittest
from pathlib import Path

MAIN = "221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
DEV = "5c6e0be9a0d3530d08477e15e09374c2afc264bc"
PR238 = "3ccce161235df925c5b708bf6feefbe6f4b10103"
NAV = "dbfbd9a7bca0e9f581e5d8ac4a765e01829d6ce9"
PR231 = "afb80965336083209eac93e2729de77170524ee5"
VIS = "34a305c1ddb9850dc194f68b16fa097c6691c06b"
CONSOLIDATED = "c239012c126c9b3e2c477778ea4b2d37b74c963f"
SUPPORT = "a285a2dc6f543f33f45615ba653a296236f8b3ac"

OLD_PIN = "design-system/pins/vis-002/context-v0.2.0/PIN.json"
NEW_PIN = "design-system/pins/vis-002/context-v0.3.0/PIN.json"
OLD_CSS = "app/design-system/approved-contextual-support-text-v2.css"
NEW_CSS = "app/design-system/vis002c-long-copy-light-v0.3.0.css"

def git(*args):
    return subprocess.check_output(["git", *args], text=True, stderr=subprocess.PIPE).strip()

def ancestor(base, head):
    return subprocess.run(["git", "merge-base", "--is-ancestor", base, head],
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE).returncode == 0

class PinTwoAncestors(unittest.TestCase):
    def test_full_sha_identity_and_independent_pr_ancestry(self):
        for source in (MAIN, DEV, PR238, NAV, PR231, VIS, CONSOLIDATED, SUPPORT):
            with self.subTest(sha=source):
                self.assertEqual(git("rev-parse", source + "^{commit}"), source)
        for source, head, distance in ((NAV, PR238, "4"), (VIS, PR231, "5")):
            with self.subTest(source=source):
                self.assertTrue(ancestor(source, head))
                self.assertNotEqual(source, head)
                self.assertEqual(git("merge-base", source, head), source)
                self.assertEqual(git("rev-list", "--count", source + ".." + head), distance)
                self.assertEqual(git("rev-list", "--count", head + ".." + source), "0")
        self.assertFalse(ancestor(VIS, PR238), "cross-PR ancestry is not approved")
        self.assertFalse(ancestor(NAV, PR231), "cross-PR ancestry is not approved")

    def test_current_v03_pins_and_prod_css_unchanged(self):
        expected = {
            NEW_PIN: "696487a0d497d7272f7237522599f34d88639968",
            NEW_CSS: "9e7f243039a717d02f897d7320a4c383856f8fa0",
            "design-system/pins/vis-002/context-v0.3.0/contextual-mapping.json":
                "e8f42f76e2732cbcf3e9a68d1dc8f82ea79dd73d",
            "design-system/pins/vis-002/context-v0.3.0/manifest.json":
                "7389f7d4ba87b772c43a53836fc336b61a61acb7",
            "app/landing/landing.css": "edccb1714040",
            "app/index.html": "75f3351ae256",
            "app/about/about.css": "c1d0b0c01bc2",
            "app/how-it-works/how-it-works.css": "c38677d7950b",
        }
        for path, prefix in expected.items():
            with self.subTest(path=path):
                for ref in (MAIN, DEV, "HEAD"):
                    self.assertTrue(git("rev-parse", ref + ":" + path).startswith(prefix))
        pin = json.loads(git("show", MAIN + ":" + NEW_PIN))
        self.assertEqual(pin["schema"], "M2DProductContextualTextPin/0.3")
        self.assertEqual(pin["allowedSelectorsCount"], 10)
        self.assertEqual(pin["theme"], "light")
        self.assertEqual(pin["runtimeStatus"], "PREVIEW_PENDING")
        css = git("show", MAIN + ":" + NEW_CSS)
        self.assertIn("#292723", css)
        self.assertEqual(css.count("--ds-vis002c-long-copy-light:"), 1)
        self.assertNotIn("#705C4B", css)
        self.assertNotIn(":root", css)

    def test_old_v02_is_preserved_but_not_reactivated(self):
        self.assertEqual(git("rev-parse", VIS + ":" + OLD_PIN),
                         "b157e15fed3eb097eb147784bc31cc275c27d49a")
        self.assertEqual(git("rev-parse", VIS + ":" + OLD_CSS),
                         "39591876eb0a563553214dcd64062258c7eb35c0")
        p = json.loads(git("show", VIS + ":" + OLD_PIN))
        self.assertEqual(p["schema"], "M2DApprovedContextualTextPin/0.2")
        self.assertEqual(p["allowedSelectorsCount"], 8)
        self.assertEqual(p["runtimeStatus"], "NOT_RELEASED")
        css = git("show", VIS + ":" + OLD_CSS)
        self.assertIn("#705C4B", css)
        self.assertNotIn("#292723", css)
        self.assertNotIn(":root", css)
        v01 = "design-system/pins/vis-002/v0.1.0/PIN.json"
        self.assertEqual(git("rev-parse", VIS + ":" + v01),
                         git("rev-parse", DEV + ":" + v01))
        # PR231 is a descendant, not necessarily a retained copy of old v02 files.
        self.assertNotEqual(git("rev-parse", MAIN + ":" + NEW_CSS),
                            git("rev-parse", VIS + ":" + OLD_CSS))

    def test_other_two_visual_sources_remain_divergent_and_held(self):
        for s in (CONSOLIDATED, SUPPORT):
            with self.subTest(ref=s):
                self.assertFalse(ancestor(s, VIS))
                self.assertFalse(ancestor(VIS, s))
                self.assertNotEqual(git("merge-base", s, VIS), s)
        doc = Path("docs/work/DEVELOPMENT_PR_ANCESTORS_VIS002C_2026-10-28.md").read_text()
        for item in (CONSOLIDATED, SUPPORT, "HOLD", "archive/m2d/config-nav-grid-pr238-dbfbd9a7",
                     "archive/m2d/vis002c-token-v02-pr231-34a305c1"):
            self.assertIn(item, doc)

    def test_no_product_change_or_legacy_execution(self):
        self.assertEqual(git("diff", "--name-only", DEV, "HEAD", "--", "app", "netlify",
                             "architecture", "design-system", "scripts"), "")
        workflow = Path(".github/workflows/development-pr-ancestors-vis002c.yml").read_text()
        for forbidden in ("npm install", "npm run build", "netlify deploy", "CI_STAGING_DATABASE_URL",
                          "playwright", "config-auth-isolated-browser.mjs"):
            self.assertNotIn(forbidden, workflow)
        self.assertIn("unittest discover", workflow)

if __name__ == "__main__":
    unittest.main()
