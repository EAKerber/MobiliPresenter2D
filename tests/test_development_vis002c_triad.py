"""VIS-002C/ARC-03C read-only provenance, generated-output, and semantic contracts."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import unittest

MAIN = "221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
DEV = "b0d6f676f0cc0189b4a0430922ec00c5bda4f7c6"
PR231 = "afb80965336083209eac93e2729de77170524ee5"
TOKEN = "34a305c1ddb9850dc194f68b16fa097c6691c06b"
CONSOLIDATED = "c239012c126c9b3e2c477778ea4b2d37b74c963f"
SUPPORT = "a285a2dc6f543f33f45615ba653a296236f8b3ac"
OLD_REFS = (TOKEN, CONSOLIDATED, SUPPORT)
ARC_REFS = (MAIN, CONSOLIDATED, SUPPORT)
ARC_MAP = (
    ("/", "architecture/pages/root.page.html", "app/index.html"),
    ("/about/", "architecture/pages/about.page.html", "app/about/index.html"),
    ("/how-it-works/", "architecture/pages/how-it-works.page.html", "app/how-it-works/index.html"),
)
FRAGMENT = "architecture/fragments/primary-header.fragment.html"
ROUTES = "architecture/fragments/primary-header.routes.json"
MANIFEST = "architecture/generated/primary-pages.manifest.json"
COMPILER = "scripts/compile-primary-pages.mjs"
OLD_MAP = "design-system/pins/vis-002/context-v0.2.0/contextual-mapping.json"
OLD_CSS = "app/design-system/approved-contextual-support-text-v2.css"
OLD_PIN = "design-system/pins/vis-002/context-v0.2.0/PIN.json"
NEW_MAP = "design-system/pins/vis-002/context-v0.3.0/contextual-mapping.json"
NEW_CSS = "app/design-system/vis002c-long-copy-light-v0.3.0.css"
NEW_PIN = "design-system/pins/vis-002/context-v0.3.0/PIN.json"
SLOT = "<!-- ARC03_PRIMARY_HEADER -->"

def git(*args):
    return subprocess.check_output(["git", *args], stderr=subprocess.PIPE, text=True).strip()

def show(ref, path):
    return subprocess.check_output(["git", "show", f"{ref}:{path}"], stderr=subprocess.PIPE).decode("utf-8")

def blob(value):
    raw = value.encode("utf-8")
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\x00" + raw).hexdigest()

def exists(ref, path):
    return subprocess.run(["git", "cat-file", "-e", f"{ref}:{path}"],
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE).returncode == 0

class Markup(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.imgs = set()
        self.economy = set()
        self.headings = []
        self._h = None
        self._chunks = []
    def handle_starttag(self, tag, attrs):
        props = dict(attrs)
        if props.get("id"):
            self.ids.add(props["id"])
        if tag == "img" and props.get("src"):
            self.imgs.add(props["src"])
        if tag == "button" and props.get("data-economy"):
            self.economy.add(props["data-economy"])
        if tag in ("h1", "h2", "h3"):
            self._h = tag
            self._chunks = []
    def handle_data(self, data):
        if self._h:
            self._chunks.append(data)
    def handle_endtag(self, tag):
        if self._h == tag:
            self.headings.append(" ".join(" ".join(self._chunks).split()))
            self._h = None

class VIS002CTrio(unittest.TestCase):
    def test_git_sources_pinned_and_pr_direction(self):
        for sha in (MAIN, DEV, PR231, *OLD_REFS):
            self.assertEqual(git("rev-parse", sha + "^{commit}"), sha)
        self.assertEqual(git("merge-base", PR231, TOKEN), PR231)
        self.assertEqual(git("rev-list", "--count", PR231 + ".." + TOKEN), "5")
        self.assertEqual(git("rev-list", "--count", TOKEN + ".." + PR231), "0")
        self.assertFalse(exists(TOKEN, MANIFEST))
        self.assertFalse(exists(TOKEN, "architecture/pages/root.page.html"))

    def test_v02_same_three_sources_and_exact_subset_of_v03(self):
        old_pins = {
            OLD_MAP: "717b400da8d5590a03118e4ce58f07fcbababc48",
            OLD_CSS: "39591876eb0a563553214dcd64062258c7eb35c0",
            OLD_PIN: "b157e15fed3eb097eb147784bc31cc275c27d49a",
        }
        for file, sha in old_pins.items():
            for ref in OLD_REFS:
                with self.subTest(ref=ref[:9], file=file):
                    self.assertEqual(git("rev-parse", ref + ":" + file), sha)
                    self.assertEqual(blob(show(ref, file)), sha)
        m02 = json.loads(show(TOKEN, OLD_MAP))
        m03 = json.loads(show(MAIN, NEW_MAP))
        self.assertEqual(m02["schema"], "M2DApprovedContextualTextMapping/0.2")
        self.assertEqual(m03["schema"], "M2DApprovedContextualTextMapping/0.3")
        self.assertEqual(m02["sourceDecisionGitBlob"], m03["sourceDecisionGitBlob"])
        self.assertEqual(m02["theme"], m03["theme"] == "light" and "light")
        self.assertEqual(m02["roleRef"], "VIS-002.approvedPalette.colors.textSecondary.light")
        self.assertEqual(m03["roleRef"], "VIS-002.approvedPalette.colors.textPrimary.light")
        self.assertEqual(len(m02["contexts"]), 8)
        self.assertEqual(len(m03["contexts"]), 10)
        old = {(e["route"], e["selector"], e["background"]) for e in m02["contexts"]}
        new = {(e["route"], e["selector"], e["background"]) for e in m03["contexts"]}
        self.assertEqual(len(old), 8)
        self.assertEqual(len(new), 10)
        self.assertTrue(old < new)
        for e in (m02, m03):
            self.assertFalse(e["constraints"]["globalUsage"])
            self.assertTrue(e["constraints"]["darkThemeMustStayUnchanged"])
        self.assertIn("--ds-vis002-approved-support-text-light: #705C4B", show(TOKEN, OLD_CSS))
        self.assertIn("--ds-vis002c-long-copy-light: #292723", show(MAIN, NEW_CSS))
        self.assertNotIn(":root", show(MAIN, NEW_CSS))
        self.assertEqual(git("rev-parse", MAIN + ":" + NEW_CSS),
                         "9e7f243039a717d02f897d7320a4c383856f8fa0")
        self.assertEqual(git("rev-parse", DEV + ":" + NEW_CSS),
                         "9e7f243039a717d02f897d7320a4c383856f8fa0")

    def test_all_arc03c_manifests_match_sources_outputs_and_compiler(self):
        compiler_sha = "0ce09d056e8c59a8703c12ed6b1e2ca6e1eb8023"
        header_sha = "25712fa6f2423372f076d041f9a7253ced088040"
        routes_sha = "7d2027e4701c80e93b4b940730e34756fe94fc12"
        for ref in ARC_REFS:
            with self.subTest(ref=ref[:10]):
                self.assertEqual(git("rev-parse", ref + ":" + COMPILER), compiler_sha)
                self.assertEqual(git("rev-parse", ref + ":" + FRAGMENT), header_sha)
                self.assertEqual(git("rev-parse", ref + ":" + ROUTES), routes_sha)
                m = json.loads(show(ref, MANIFEST))
                self.assertEqual(m["schema"], "M2DARC03CPublishedPages/1")
                self.assertEqual(m["authority"], "architecture/pages")
                self.assertEqual(m["fragment"]["gitBlobSha"], header_sha)
                self.assertEqual(m["routesConfig"]["gitBlobSha"], routes_sha)
                routes = json.loads(show(ref, ROUTES))["routes"]
                fragment = show(ref, FRAGMENT)
                self.assertEqual(len(m["pages"]), 3)
                for i, (route, source, output) in enumerate(ARC_MAP):
                    record = m["pages"][i]
                    self.assertEqual((record["route"],record["source"],record["output"]),
                                     (route,source,output))
                    raw = show(ref, source)
                    published = show(ref, output)
                    self.assertEqual(raw.count(SLOT), 1)
                    self.assertEqual(blob(raw), record["sourceGitBlobSha"])
                    self.assertEqual(blob(published), record["outputGitBlobSha"])
                    self.assertEqual(git("rev-parse", ref + ":" + source), blob(raw))
                    self.assertEqual(git("rev-parse", ref + ":" + output), blob(published))
                    self.assertEqual(routes[i]["route"], route)
                    values = {**{k: routes[i][k] for k in
                                 ("brandHref","ambientesHref","howHref","aboutHref")},
                              "ambientesCurrent": ' aria-current="page"' if routes[i]["current"] == "ambientes" else "",
                              "howCurrent": ' aria-current="page"' if routes[i]["current"] == "how" else "",
                              "aboutCurrent": ' aria-current="page"' if routes[i]["current"] == "about" else "",
                              "whatsAppIconAriaHidden": ' aria-hidden="true"' if routes[i]["whatsAppIconAriaHidden"] else ""}
                    h = re.sub(r"\{\{([^{}]+)\}\}", lambda match: values[match.group(1)], fragment).strip()
                    self.assertEqual(raw.replace(SLOT, h), published,
                                     "The historic generated HTML must be reversible from its source")

    def test_public_structure_preserved_and_newer_fixes_not_reverted(self):
        for ref in (CONSOLIDATED, SUPPORT):
            for route, source, output in ARC_MAP:
                with self.subTest(ref=ref[:9], route=route):
                    old, current = show(ref, source), show(MAIN, source)
                    self.assertIn("approved-contextual-support-text-v2.css", old)
                    self.assertNotIn("approved-contextual-support-text-v2.css", current)
                    self.assertIn("landing/landing.css", current)
                    a,b=Markup(),Markup()
                    a.feed(old)
                    b.feed(current)
                    self.assertTrue(a.ids <= b.ids, "An old anchor was lost in main")
                    self.assertTrue(a.imgs <= b.imgs, "An old image was lost in main")
                    self.assertTrue(a.economy <= b.economy, "Economy controls were lost")
                    self.assertTrue(set(a.headings) <= set(b.headings),
                                    "A historical content heading was lost from main")
                    self.assertTrue(git("rev-parse", MAIN+":"+source) ==
                                    git("rev-parse", DEV+":"+source))
                    self.assertTrue(git("rev-parse", MAIN+":"+output) ==
                                    git("rev-parse", DEV+":"+output))
        h = show(MAIN, "architecture/pages/how-it-works.page.html")
        self.assertGreaterEqual(h.count("data-image-fallback"), 16)
        self.assertIn("/core/image-fallback.js?v=public-image-fallback-v1", h)
        self.assertIn('tabindex="-1"', show(MAIN, "architecture/pages/about.page.html"))
        self.assertIn("/landing/header-menu.js?v=p-comp-01",
                      show(MAIN, "architecture/pages/root.page.html"))
        self.assertNotIn("data-image-fallback",
                         show(CONSOLIDATED,"architecture/pages/how-it-works.page.html"))

    def test_unique_historical_paths_exclude_auth_db_and_unrelated_runtime(self):
        sources = ((TOKEN, PR231), (CONSOLIDATED, "8ab231761e"),
                   (SUPPORT, "5ccb2a8dde6dd16e136f03387dc833aab828c5cf"))
        for head, ancestor in sources:
            with self.subTest(ref=head[:8]):
                changed = git("diff", "--name-only", ancestor, head).splitlines()
                self.assertTrue(changed)
                for p in changed:
                    self.assertTrue(p.startswith((
                        "app/index.html", "app/landing/", "app/about/", "app/how-it-works/",
                        "app/design-system/", "architecture/pages/", "architecture/generated/",
                        "design-system/", "docs/", "scripts/verify-", "tests/",
                        ".github/workflows/"
                    )), "Unexpected historical auth, build, DB or other runtime file: " + p)
                self.assertNotIn("netlify.toml", changed)
                self.assertFalse(any(p.startswith(("app/config/", "app/viewer/", "netlify/", "app/access/"))
                                     for p in changed))

    def test_current_product_unchanged_and_offline_only(self):
        self.assertEqual(git("diff","--name-only",DEV,"HEAD","--",
                             "app","netlify","architecture","design-system","scripts"),"")
        wf = Path(".github/workflows/development-vis002c-arc03c-triad.yml").read_text()
        self.assertIn("compile-primary-pages.mjs --check", wf)
        self.assertIn("verify-vis002c-product-pin-v03.mjs", wf)
        for forbidden in ("deploy", "CI_STAGING_DATABASE_URL", "config-auth-isolated-browser.mjs",
                          "npm install", "playwright"):
            self.assertNotIn(forbidden, wf.lower() if forbidden=="deploy" else wf)

if __name__ == "__main__":
    unittest.main()
