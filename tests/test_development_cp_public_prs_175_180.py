"""CP-PUBLIC public PR 175/178/179/180: offline DAG + runtime parity evidence.

Read historical Git objects only; do not execute legacy preview plugins or HTTP tests.
"""
from pathlib import Path
import re
import subprocess
import unittest

MAIN = "221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
DEV = "bea73af76bfd6e5b638497ad000e14de611bb183"
PR = {
    175: ("work/cp-public-01-donor-staging-20261008","c81d357df3aa78c3e8f804b6334b2da35b3a75c8"),
    178: ("work/cp-public-02a-public-module-projection-20261008","f0c792397036836105dcb53a45f89780e10b6348"),
    179: ("work/cp-public-02b-public-read-endpoint-20261008","44b1d6a94c06a17b73405755e03c787780e7a455"),
    180: ("work/cp-public-02c-integrated-preview-20261008","82d85674595280a7c878848d0d5f09df29492e92"),
}
ENDPOINT = "netlify/functions/public-modules.mjs"
PROJECTION = "app/core/public-module-projection.js"
TEST_PROJECTION = "tests/public-module-projection.test.cjs"
PREVIEW_ONLY = [
    "netlify/plugins/cp-public-02c-preview/index.js",
    "netlify/plugins/cp-public-02c-preview/manifest.yml",
    "scripts/seed-public-preview-v5.cjs",
    "tests/public-modules-http-smoke.cjs",
]
OLD_LANDING = [
    "app/landing/index.html",
    "app/landing/como-funciona/index.html",
    "app/landing/quem-somos/index.html",
]

def git(*args):
    return subprocess.check_output(["git",*args],text=True,stderr=subprocess.PIPE).strip()
def rev(ref, path):
    return git("rev-parse",ref+":"+path)
def show(ref, path):
    return subprocess.check_output(["git","show",ref+":"+path],stderr=subprocess.PIPE).decode("utf-8")
def tree(ref):
    raw=subprocess.check_output(["git","ls-tree","-r","-z",ref])
    result={}
    for item in raw.split(b"\x00"):
        if not item:
            continue
        head,name=item.split(b"\t",1)
        mode,type_,sha=head.split(b" ")
        if type_==b"blob":
            result[name.decode("utf-8")]=sha.decode("ascii")
    return result
def selected(path):
    return (path.startswith(("app/landing/","app/viewer/","netlify/plugins/cp-public-"))
            or path in (PROJECTION,"app/core/scene-component.js",ENDPOINT)
            or path.startswith("tests/public-")
            or path.startswith("scripts/seed-public-")
            or path.startswith("app/tools/test-public-modules-"))
def is_ancestor(base,head):
    return subprocess.run(["git","merge-base","--is-ancestor",base,head],
                          stdout=subprocess.PIPE,stderr=subprocess.PIPE).returncode==0

class PublicPRs(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.trees={k:tree(sha) for k,(name,sha) in PR.items()}
        cls.main=tree(MAIN)
        cls.dev=tree(DEV)

    def test_pins_and_four_distinct_open_pr_head_branches(self):
        self.assertEqual(len(PR),4)
        for n,(branch,sha) in PR.items():
            with self.subTest(pr=n):
                self.assertEqual(git("rev-parse",sha+"^{commit}"),sha)
                self.assertEqual(git("rev-parse","refs/remotes/origin/"+branch),sha)
        self.assertEqual(git("rev-parse",MAIN+"^{commit}"),MAIN)
        self.assertEqual(git("rev-parse",DEV+"^{commit}"),DEV)
        self.assertFalse(any(is_ancestor(sha,MAIN) for _,sha in PR.values()),
                         "No reviewed PR head was actually merged to main verbatim")

    def test_actual_graph_not_a_fictional_linear_pr_chain(self):
        a=PR[179][1]
        b=PR[180][1]
        self.assertTrue(is_ancestor(a,b))
        self.assertEqual(git("merge-base",a,b),a)
        self.assertEqual(git("rev-list","--count",a+".."+b),"24")
        r178=PR[178][1]
        self.assertFalse(is_ancestor(r178,a))
        self.assertFalse(is_ancestor(a,r178))
        self.assertEqual(git("merge-base",r178,a),"f1f3a5e285c6b06fcb951b4fecb10c8917915f2f")
        self.assertEqual(git("rev-list","--count",r178+".."+a),"10")
        self.assertEqual(git("rev-list","--count",a+".."+r178),"4")
        r175=PR[175][1]
        self.assertFalse(is_ancestor(r175,b))
        self.assertFalse(is_ancestor(b,r175))
        self.assertEqual(git("merge-base",r175,b),"1e872eeb6839b1ecf4223b7634c41cb1e68d5000")

    def test_exact_asset_and_code_inventory_categories(self):
        expected={175:(42,16,3,23),178:(2,0,0,2),179:(4,0,0,4),180:(51,17,7,27)}
        for n,files in self.trees.items():
            paths=[path for path in files if selected(path)]
            equal=sum(self.main.get(path)==files[path] for path in paths)
            absent=sum(path not in self.main for path in paths)
            different=sum(path in self.main and self.main[path]!=files[path] for path in paths)
            with self.subTest(pr=n):
                self.assertEqual((len(paths),equal,absent,different),expected[n])
                self.assertEqual(len(paths),equal+absent+different)
                self.assertEqual(len(self.dev),len(self.dev)) # no mutation
        for path in PREVIEW_ONLY:
            self.assertIn(path,self.trees[180])
            self.assertNotIn(path,self.main)
            self.assertNotIn(path,self.dev)
        for path in OLD_LANDING:
            self.assertIn(path,self.trees[175])
            self.assertIn(path,self.trees[180])
            self.assertNotIn(path,self.main)
            self.assertNotIn(path,self.dev)

    def test_redirects_canonical_routes_and_not_reintroduce_staging(self):
        config=show(MAIN,"netlify.toml")
        self.assertEqual(config,show(DEV,"netlify.toml"))
        for old,target in (("/landing","/"),("/landing/","/"),
                           ("/landing/index.html","/"),
                           ("/landing/como-funciona/","/how-it-works/"),
                           ("/landing/quem-somos/","/about/")):
            self.assertIn('from = "'+old+'"',config)
            self.assertIn('to = "'+target+'"',config)
        for path in ("app/index.html","app/about/index.html","app/how-it-works/index.html"):
            self.assertEqual(rev(MAIN,path),rev(DEV,path))
        self.assertEqual(rev(PR[180][1],"tests/public-pages-integrated.cjs"),
                         rev(MAIN,"tests/public-pages-integrated.cjs"))
        obsolete=show(PR[180][1],"tests/public-pages-integrated.cjs")
        self.assertIn("Módulo 01 — homologação PR 180",obsolete)
        self.assertIn("Destaque exclusivo do preview 180",obsolete)

    def test_preview_fixture_removed_not_restored_or_run(self):
        plugin=show(PR[180][1],PREVIEW_ONLY[0])
        seed=show(PR[180][1],PREVIEW_ONLY[2])
        self.assertIn("onPostBuild",plugin)
        self.assertIn("getDeployStore",plugin)
        self.assertIn("store.setJSON",plugin)
        self.assertIn('REVIEW_ID === "180"',plugin)
        self.assertIn("deploy-preview-180--mobilipresenter2d.netlify.app",seed)
        self.assertNotIn("cp-public-02c-preview",show(DEV,"netlify.toml"))
        self.assertIn("getDeployStore",show(DEV,ENDPOINT))
        self.assertNotIn("seed-public-preview-v5",show(DEV,ENDPOINT))

    def test_seven_projection_tests_preserved_and_schema_added(self):
        earlier=show(PR[178][1],TEST_PROJECTION)
        later=show(PR[179][1],TEST_PROJECTION)
        current=show(DEV,TEST_PROJECTION)
        self.assertEqual(rev(PR[178][1],TEST_PROJECTION),
                         rev(PR[179][1],TEST_PROJECTION))
        self.assertNotEqual(rev(PR[178][1],TEST_PROJECTION),
                            rev(DEV,TEST_PROJECTION))
        titles=lambda text: re.findall(r'\btest\(["\x27]([^"\x27]+)',text)
        self.assertEqual(len(titles(earlier)),7)
        self.assertEqual(titles(earlier),titles(later))
        self.assertEqual(titles(earlier),titles(current))
        self.assertEqual(rev(MAIN,TEST_PROJECTION),rev(DEV,TEST_PROJECTION))
        self.assertEqual(rev(PR[178][1],PROJECTION),
                         "5cea0fcb2eb2ed24cc5c93026984047ab70bae4b")
        self.assertEqual(rev(DEV,PROJECTION),
                         "fff325e9699f806f0e4d599b05374aa7c3d2c43f")
        self.assertEqual(rev(MAIN,PROJECTION),rev(DEV,PROJECTION))
        self.assertIn("PublicModulePresentation2D 0.1",show(DEV,PROJECTION))
        self.assertIn("PublicModulePresentation2D 0.2",show(DEV,PROJECTION))
        self.assertIn("viewerEntities",show(DEV,PROJECTION))

    def test_179_http_dev_semantics_are_newer_and_not_raw_read(self):
        self.assertEqual(rev(PR[179][1],ENDPOINT),
                         "3d76dabec6aeda124934e78b0d240c5390c362ff")
        self.assertEqual(rev(MAIN,ENDPOINT),
                         "62e80a0dee12b5b306c1ef33a4337e5d6822fe4c")
        self.assertEqual(rev(DEV,ENDPOINT),
                         "d89b2654149d27bdb04e57e03f713b60d8a4e3b3")
        self.assertNotEqual(rev(MAIN,ENDPOINT),rev(DEV,ENDPOINT))
        dev_api=show(DEV,ENDPOINT)
        for needle in ("getDeployStore","readPrimaryPublicProjection",
                       "public_modules_unavailable","unsupported_query",
                       "X-Public-Modules-Source","requestedVersion",
                       "PRICED_SCHEMA","PUBLIC_SCHEMA","onlyKeys",
                       "publicModules.forLegacyViewer"):
            self.assertIn(needle,dev_api)
        viewer=show(DEV,"app/viewer/public-data.js")
        self.assertIn("X-Public-Modules-Version",viewer)
        self.assertIn("PublicModulePresentation2D 0.1",viewer)
        self.assertIn("PublicModulePresentation2D 0.2",viewer)
        self.assertNotIn("GET /api/configuration",dev_api)

    def test_no_product_changes_or_external_preview_operations(self):
        self.assertEqual(git("diff","--name-only",DEV,"HEAD","--",
                             "app","netlify","architecture","design-system","scripts"),"")
        workflow=Path(".github/workflows/development-cp-public-prs-175-180.yml").read_text()
        self.assertIn("unittest discover",workflow)
        self.assertIn("app/tools/test-public-modules-endpoint.js",workflow)
        self.assertIn("app/viewer/scene-adapters.test.mjs",workflow)
        for forbidden in ("npm install","npm run build","netlify deploy",
                          "PUBLIC_PAGES_URL","tests/public-pages-integrated.cjs",
                          "seed-public-preview-v5.cjs","CI_STAGING_DATABASE_URL"):
            self.assertNotIn(forbidden,workflow)
        doc=Path("docs/work/DEVELOPMENT_CP_PUBLIC_PRS_175_180_2026-10-28.md").read_text()
        for expected in ("#175","#178","#179","#180","HOLD","archive",
                         "c81d357df3aa78c3e8f804b6334b2da35b3a75c8"):
            self.assertIn(expected,doc)

if __name__ == "__main__":
    unittest.main()
