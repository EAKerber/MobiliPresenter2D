"""Offline CP-PUBLIC PR roster and legacy terminal-DAG provenance gate.

Do not execute historical buyer/session code, contact Netlify, or access DB.
"""
import subprocess
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("pr_retention_guard", ROOT / "tools/development_retirement_batch.py")
guard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(guard)

REPO = "EAKerber/MobiliPresenter2D"
MAIN = "221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
DEV = "895127d89b518a0a5c9a6856691442988d51407e"
OLD_TERMINAL = "68362325972a4a2db8acbdb475a1d686dd6663b4"
FORK = "bf30e008a81b7bc9cc34573e3d60a953810a9e72"
OPEN_PR_HEADS = {
  175: ("work/cp-public-01-donor-staging-20261008", "c81d357df3aa78c3e8f804b6334b2da35b3a75c8"),
  178: ("work/cp-public-02a-public-module-projection-20261008", "f0c792397036836105dcb53a45f89780e10b6348"),
  179: ("work/cp-public-02b-public-read-endpoint-20261008", "44b1d6a94c06a17b73405755e03c787780e7a455"),
  180: ("work/cp-public-02c-integrated-preview-20261008", "82d85674595280a7c878848d0d5f09df29492e92"),
  182: ("work/cp-public-03a1-configuration-read-guard-20261008", "0b398618f7f2eff23da7f782d53d86ba3ee6411b"),
  184: ("work/cp-public-03a2-0-failclosed-bootstrap-20261008", "d1305ffdd8302fa06b37d3676f08d802a92e7d97"),
  185: ("work/cp-public-03a2-1-buyer-projection-20261008", "7a0d919d4e27853c50cff8afde0cdcc066e0aa0c"),
  186: ("work/cp-public-03a2-2-email-access-core-20261008", "40d4b65f9e7e16e0810c2308e9b947840371cbe7"),
  196: ("docs/cp-public-auth-boundary-20261011", "43d5fb9c5c2749c0541b99d49ee1c048d6a9a96a"),
  231: ("architecture/p-token-02b-contextual-copy-20261022", "afb80965336083209eac93e2729de77170524ee5"),
  238: ("ci/ci-baseline-01-isolated-auth-extraction-20261024", "3ccce161235df925c5b708bf6feefbe6f4b10103"),
   34: ("feat/exposed-sides-and-glass", "20040da835d6da66b03f73642c0c44db109dd6e8"),
}
PROJECTION = "app/core/public-module-projection.js"
PUBLIC_API = "netlify/functions/public-modules.mjs"
BUYER_ENDPOINT = "netlify/functions/buyer-configuration.mjs"
CONFIG_ENDPOINT = "netlify/functions/configuration.mjs"
BUYER_PROJECTION = "app/core/published-buyer-projection.js"
OLD_BUYER = "app/core/buyer-configuration-projection.js"

def git(*args):
    return subprocess.check_output(["git", *args], text=True, stderr=subprocess.PIPE).strip()
def show(ref, path):
    return git("show", ref + ":" + path)
def blob(ref, path):
    return git("rev-parse", ref + ":" + path)
def has_blob(ref, path):
    return subprocess.run(["git","cat-file","-e",ref+":"+path],stdout=subprocess.PIPE,stderr=subprocess.PIPE).returncode == 0
def ancestor(a,b):
    return subprocess.run(["git","merge-base","--is-ancestor",a,b],
                          stdout=subprocess.PIPE,stderr=subprocess.PIPE).returncode == 0

class CPPublicLineage(unittest.TestCase):
    def test_full_12_historical_pr_pins_and_legacy_source_unheaded(self):
        guard.verify_pr_head_retention(OPEN_PR_HEADS, guard.local_pr_refs(),
                                       guard.PR_CONFIRMED_CLOSED_UNMERGED)
        self.assertEqual(len(OPEN_PR_HEADS), 12)
        self.assertEqual(len(set(n for n,_ in OPEN_PR_HEADS.values())), 12)
        for n,(name,sha) in OPEN_PR_HEADS.items():
            with self.subTest(pr=n):
                self.assertEqual(git("rev-parse",sha+"^{commit}"),sha)
        for sha in (OLD_TERMINAL, MAIN, DEV):
            self.assertEqual(git("rev-parse",sha+"^{commit}"),sha)
        source_name = "work/cp-public-03a2-3-contract-integration-20261008"
        source_branch = "refs/remotes/origin/" + source_name
        archived_ref = "refs/tags/archive/m2d/cp-public-03a2-3-68362325"
        has_source = subprocess.run(["git","show-ref","--verify","--quiet",source_branch]).returncode == 0
        has_archive = subprocess.run(["git","show-ref","--verify","--quiet",archived_ref]).returncode == 0
        self.assertTrue(has_source or has_archive, "old source must be reachable from its branch or exact archive tag")
        if has_source:
            self.assertEqual(git("rev-parse", source_branch), OLD_TERMINAL)
        if has_archive:
            self.assertEqual(git("rev-parse", archived_ref), OLD_TERMINAL)
        self.assertNotIn(source_name,{v[0] for v in OPEN_PR_HEADS.values()})

    def test_not_a_fake_ancestor_of_pr186_or_current_main(self):
        pr186=OPEN_PR_HEADS[186][1]
        self.assertEqual(git("merge-base",OLD_TERMINAL,pr186),FORK)
        self.assertEqual(git("merge-base",OLD_TERMINAL,MAIN),FORK)
        self.assertEqual(git("rev-list","--count",FORK+".."+OLD_TERMINAL),"41")
        self.assertEqual(git("rev-list","--count",FORK+".."+pr186),"42")
        self.assertFalse(ancestor(OLD_TERMINAL,pr186))
        self.assertFalse(ancestor(pr186,OLD_TERMINAL))
        self.assertFalse(ancestor(OLD_TERMINAL,MAIN))
        self.assertFalse(ancestor(OLD_TERMINAL,DEV))
        self.assertFalse(ancestor(MAIN,OLD_TERMINAL))

    def test_public_projection_endpoint_are_newer_and_dev_candidate_retained(self):
        self.assertEqual(blob(OPEN_PR_HEADS[178][1],PROJECTION),
                         "5cea0fcb2eb2ed24cc5c93026984047ab70bae4b")
        self.assertEqual(blob(MAIN,PROJECTION),"fff325e9699f806f0e4d599b05374aa7c3d2c43f")
        self.assertEqual(blob(DEV,PROJECTION),blob(MAIN,PROJECTION))
        self.assertEqual(blob(OPEN_PR_HEADS[179][1],PUBLIC_API),
                         "3d76dabec6aeda124934e78b0d240c5390c362ff")
        self.assertEqual(blob(MAIN,PUBLIC_API),"62e80a0dee12b5b306c1ef33a4337e5d6822fe4c")
        self.assertEqual(blob(DEV,PUBLIC_API),"d89b2654149d27bdb04e57e03f713b60d8a4e3b3")
        self.assertNotEqual(blob(MAIN,PUBLIC_API),blob(DEV,PUBLIC_API))
        self.assertEqual(blob(OLD_TERMINAL,PUBLIC_API),
                         blob(OPEN_PR_HEADS[179][1],PUBLIC_API))
        for ref in (MAIN,DEV):
            txt=show(ref,PUBLIC_API)
            self.assertIn("public_modules_unavailable",txt)
            self.assertIn("project(",txt)
            self.assertIn("return",txt)
        modern=show(DEV,PUBLIC_API)
        for term in ("PRICED_SCHEMA","PUBLIC_SCHEMA","onlyKeys"):
            self.assertIn(term,modern)

    def test_buyer_v01_and_v1_current_are_not_interchangeable(self):
        self.assertEqual(blob(OLD_TERMINAL, OLD_BUYER),
                         "d618da54275304a56de16b222a2dc3870799da02")
        self.assertEqual(blob(OPEN_PR_HEADS[185][1],OLD_BUYER),
                         blob(OLD_TERMINAL,OLD_BUYER))
        old=show(OLD_TERMINAL,OLD_BUYER)
        self.assertIn('BuyerConfiguration2D 0.1',old)
        self.assertEqual(blob(MAIN,BUYER_ENDPOINT),blob(DEV,BUYER_ENDPOINT))
        self.assertEqual(blob(MAIN,BUYER_PROJECTION),
                         "4a3818187f577b0056ccba4c39f24f1881bdb0e2")
        self.assertEqual(blob(DEV,BUYER_PROJECTION),
                         "c1f8e099f2dce29bd003577e8c0a724d7b6475fa")
        self.assertNotEqual(blob(MAIN,BUYER_PROJECTION),blob(DEV,BUYER_PROJECTION))
        for ref in (MAIN, DEV):
            new=show(ref,BUYER_PROJECTION)
            self.assertIn('BuyerConfiguratorPayload 1.0',new)
        self.assertIn("normalizeFlow",show(DEV,BUYER_PROJECTION))
        endpoint=show(DEV,BUYER_ENDPOINT)
        for name in ("canUseConfigurator","getUser","findActiveSession","buyerProjection.project"):
            self.assertIn(name,endpoint)
        self.assertFalse(has_blob(MAIN,OLD_BUYER),"old v01 client helper must not be resurrected")

    def test_full_config_admin_auth_and_v5_dev_are_distinct(self):
        self.assertEqual(blob(DEV,CONFIG_ENDPOINT),"5189f7465bca2dec4ff1361e2ef9a3d82f822b36")
        self.assertEqual(blob(MAIN,CONFIG_ENDPOINT),"13c6997c7818189edfddcc529582941c7d2b5af5")
        self.assertNotEqual(blob(MAIN,CONFIG_ENDPOINT),blob(DEV,CONFIG_ENDPOINT))
        for ref in (MAIN,DEV):
            endpoint=show(ref,CONFIG_ENDPOINT)
            self.assertIn("getUser()",endpoint)
            self.assertIn("canManageAdministration(user)",endpoint)
            self.assertIn('request.method === "GET"',endpoint)
        self.assertTrue(has_blob(OLD_TERMINAL,"netlify/lib/configuration-access.cjs"))
        self.assertFalse(has_blob(MAIN,"netlify/lib/configuration-access.cjs"))
        self.assertFalse(has_blob(DEV,"netlify/lib/configuration-access.cjs"))
        self.assertTrue(has_blob(OPEN_PR_HEADS[186][1],"netlify/access-migrations/001_access_tickets_sessions.sql"))
        self.assertTrue(has_blob(MAIN,"netlify/functions/access-redeem.mjs"))
        self.assertTrue(has_blob(MAIN,"netlify/functions/access-session-status.mjs"))
        self.assertTrue(has_blob(MAIN,"netlify/functions/access-grants.mjs"))
        self.assertFalse(has_blob(MAIN,"netlify/access-migrations/001_access_tickets_sessions.sql"))

    def test_public_root_and_config_new_path_no_implicit_e2e_claims(self):
        old=show(OLD_TERMINAL,"app/index.html")
        self.assertIn('data-configuration-access-state="loading"',old)
        self.assertIn('<main class="workspace" hidden inert>',old)
        self.assertTrue(has_blob(MAIN,"app/config/index.html"))
        self.assertTrue(has_blob(DEV,"app/config/index.html"))
        self.assertEqual(blob(MAIN,"app/config/index.html"),
                         blob(DEV,"app/config/index.html"))
        main_landing=show(MAIN,"app/index.html")
        self.assertIn("hero-description",main_landing)
        self.assertNotIn('data-configuration-access-state="loading"',main_landing)
        self.assertFalse(has_blob(OLD_TERMINAL,"app/config/index.html"))
        # Static existence is not a browser/real auth test.
        doc=Path("docs/work/DEVELOPMENT_CP_PUBLIC_PR_LINEAGE_2026-10-28.md").read_text()
        for p in ["não", "12 PRs", "HOLD", "archive/m2d/cp-public-03a2-3-68362325"]:
            self.assertIn(p,doc)

    def test_unchanged_runtime_and_no_preview_or_database(self):
        self.assertEqual(git("diff","--name-only",DEV,"HEAD","--",
                             "app","netlify","scripts","architecture","design-system"),"")
        workflow=Path(".github/workflows/development-cp-public-lineage.yml").read_text()
        for forbidden in ("npm install","netlify deploy","playwright","DATABASE_URL",
                          "SUPABASE_SERVICE_ROLE_KEY","access-postgres-integration.cjs"):
            self.assertNotIn(forbidden,workflow)
        self.assertIn("unittest discover",workflow)

if __name__ == "__main__":
    unittest.main()
