"""Read-only historical authentication provenance. NEVER run or import legacy auth."""
import subprocess
import unittest
from pathlib import Path

MAIN = "221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
DEV = "1b1cd4f9d85b4169ade134c7074ff313188dc5c5"
PR238 = "3ccce161235df925c5b708bf6feefbe6f4b10103"
AUTHBASE = "fd61a37a11dd63b3e537d3d76a2303bfdfc4f06a"
OLDSESSION = "cb0ae8b1e05bc9b5d96c51e2027732aff12577c3"
OLDLOCAL = "5ce7327a9e4c8c11483163507d29af4bb8b1312a"
OLDGLOBAL = "cacd0e9160437285c41302d0dd13d9664001186e"

CORE = {
    "netlify/functions/access-check.mjs": "52cd26f391f73ea5ce326c4aee9b37aad7954e33",
    "netlify/functions/access-grants.mjs": "06c910428b9da0801681f36d395b6f730811e0d8",
    "netlify/functions/access-redeem.mjs": "5154209a07d30c6daecf71ef286ae3a102c5c0c4",
    "netlify/functions/access-session-logout.mjs": "82f40a1c7fa6d158b315e473b3c05e384e91bd85",
    "netlify/functions/access-session-status.mjs": "aca87d744e342a792f0aa2e9d935a637fa697020",
    "netlify/functions/buyer-configuration.mjs": "aaace7bc2187aca4b1c484962f239ae00b20de80"
}
PR_FILES = {
    ".github/workflows/ci-baseline-01-anonymous.yml",
    ".github/workflows/ci-baseline-01-isolated-authenticated.yml",
    ".github/workflows/stone-browser.yml",
    "app/app.js", "app/styles.css",
    "docs/handoffs/CI_BASELINE_01_ISOLATED_AUTH_FIXTURE_2026-10-24.md",
    "netlify.toml",
    "netlify/access/migrations/20261024120000_ci_config_fixture_role.sql",
    "netlify/plugins/ci-v5-fixture/index.mjs",
    "netlify/plugins/ci-v5-fixture/manifest.yml",
    "netlify/plugins/ci-v5-fixture/package.json",
    "scripts/build-ci-preview-fixture.mjs",
    "tests/ci/build-ci-preview-fixture.test.mjs",
    "tests/ci/config-auth-anonymous-browser.mjs",
    "tests/ci/config-auth-isolated-browser.mjs",
    "tests/ci/config-auth-isolation.mjs",
    "tests/ci/config-auth-isolation.test.mjs",
    "tests/ci/config-authenticated-v5-suites.mjs",
    "tests/flow-layout-browser.cjs", "tests/keyboard-browser.cjs"
}

def git(*args):
    return subprocess.check_output(["git", *args], text=True, stderr=subprocess.PIPE).strip()

class AuthLineage(unittest.TestCase):
    def test_pinned_commits_and_pr_ancestry(self):
        for sha in (MAIN, DEV, PR238, AUTHBASE, OLDSESSION, OLDLOCAL, OLDGLOBAL):
            with self.subTest(sha=sha):
                self.assertEqual(git("rev-parse", sha + "^{commit}"), sha)
        subprocess.run(["git", "merge-base", "--is-ancestor", AUTHBASE, PR238],
                       check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.assertEqual(git("merge-base", MAIN, PR238),
                         "5ccb2a8dde6dd16e136f03387dc833aab828c5cf")

    def test_shared_access_functions_have_no_unmerged_pr_implementation(self):
        for path, sha in CORE.items():
            with self.subTest(path=path):
                for base in (MAIN, DEV, PR238):
                    self.assertEqual(git("rev-parse", base + ":" + path), sha)

    def test_configuration_remains_distinct_and_not_overwritten(self):
        path = "netlify/functions/configuration.mjs"
        original = "13c6997c7818189edfddcc529582941c7d2b5af5"
        candidate = "5189f7465bca2dec4ff1361e2ef9a3d82f822b36"
        self.assertEqual(git("rev-parse", MAIN + ":" + path), original)
        self.assertEqual(git("rev-parse", PR238 + ":" + path), original)
        self.assertEqual(git("rev-parse", DEV + ":" + path), candidate)
        self.assertEqual(git("rev-parse", "HEAD:" + path), candidate)

    def test_old_isolation_policy_is_not_silently_restored(self):
        path = "tests/ci/config-auth-isolation.mjs"
        self.assertEqual(git("rev-parse", OLDSESSION + ":" + path),
                         "97c014e91ce57fcac7aa696dbaf9b4a9caa4450d")
        self.assertEqual(git("rev-parse", PR238 + ":" + path),
                         "b2aa8ae78736ce7df7f0d70d502389c25cc36056")
        old = git("show", OLDSESSION + ":" + path)
        newer = git("show", PR238 + ":" + path)
        self.assertIn("FORBIDDEN_PRIMARY_DB_REF", old)
        self.assertNotIn("ALLOWED_INTERNAL_CI_DB_REF", old)
        self.assertIn("ALLOWED_INTERNAL_CI_DB_REF", newer)
        self.assertIn("database role must be the project-scoped", newer)
        self.assertIn("only the dedicated test site", newer)
        # The unexecuted old fixture may not become a new policy authority.
        self.assertNotIn("FORBIDDEN_PRIMARY_DB_REF", newer)

    def test_current_pr_is_not_equivalent_to_all_old_auth_browsers(self):
        p = "tests/ci/config-auth-isolated-browser.mjs"
        self.assertEqual(git("rev-parse", OLDSESSION + ":" + p)[:10],
                         "35cdc24126")
        self.assertEqual(git("rev-parse", PR238 + ":" + p)[:10],
                         "b4cc427e9a")
        self.assertNotEqual(git("rev-parse", OLDSESSION + ":" + p),
                            git("rev-parse", PR238 + ":" + p))
        common = "tests/ci/config-auth-anonymous-browser.mjs"
        self.assertEqual(git("rev-parse", OLDSESSION + ":" + common),
                         git("rev-parse", PR238 + ":" + common))

    def test_pr_file_scope_and_active_runtime_conflicts(self):
        changed = set(git("diff", "--name-only", MAIN + "..." + PR238).splitlines())
        self.assertEqual(changed, PR_FILES)
        self.assertEqual(len(changed), 20)
        self.assertTrue({"app/app.js", "app/styles.css", "netlify.toml"}.issubset(changed))

    def test_sql_role_security_guards_are_present_in_pr_only(self):
        path = "netlify/access/migrations/20261024120000_ci_config_fixture_role.sql"
        self.assertEqual(git("rev-parse", PR238 + ":" + path),
                         "a9e474885a98db9a9f5e46d69bd8841f8475377e")
        source = git("show", PR238 + ":" + path)
        for rule in ("NOINHERIT NOSUPERUSER", "NOBYPASSRLS", "SECURITY DEFINER SET search_path=''",
                     "interval '5 minutes'", "TO access_ci_fixture"):
            self.assertIn(rule, source)
        self.assertEqual(source.count("SECURITY DEFINER SET search_path=''"), 2)
        self.assertEqual(source.count("REVOKE ALL ON FUNCTION"), 2)
        self.assertEqual(source.count("GRANT EXECUTE ON FUNCTION"), 2)

    def test_existing_synthetic_marker_guard_and_no_code_transfer(self):
        self.assertEqual(git("rev-parse", "HEAD:tests/ci/preview-identity-attestation.mjs"),
                         "eca74f1c70a9e3bda616c9b568da6f8a8d768901")
        self.assertEqual(git("rev-parse", "HEAD:tests/ci/preview-identity-attestation.test.mjs"),
                         "110ea7c72baa2a62861f3979954da2103150c2e9")
        delta = git("diff", "--name-only", DEV, "HEAD", "--", "app", "netlify")
        self.assertEqual(delta, "", "security audit may not alter app/netlify code")
        wf = Path(".github/workflows/development-ci-auth-lineage.yml").read_text()
        self.assertIn("node --test tests/ci/preview-identity-attestation.test.mjs", wf)
        for denied in ("config-auth-isolated-browser.mjs", "config-authenticated-v5-suites.mjs",
                       "NETLIFY_SITE_ID", "CI_STAGING_DATABASE_URL", "npm run build"):
            self.assertNotIn(denied, wf)

if __name__ == "__main__":
    unittest.main()
