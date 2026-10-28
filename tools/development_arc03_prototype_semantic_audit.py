#!/usr/bin/env python3
"""Read-only provenance and contract check for the ARC03/03B preview-only compiler."""
import json, subprocess
from pathlib import Path
MAIN="221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
OLD="e459b9bd85c4e9c8bb96813ae6758789de75dc13"
FRAGMENT="architecture/fragments/primary-header.fragment.html"
SOURCE_PATHS={
".github/workflows/arc03-primary-header-prototype-gate.yml",
".github/workflows/arc03b-authored-pages-browser-gate.yml",
FRAGMENT,"architecture/fragments/primary-header.routes.json",
"architecture/pages/about.page.html","architecture/pages/how-it-works.page.html",
"architecture/pages/root.page.html","scripts/compile-primary-header-prototype.mjs",
"scripts/compile-primary-pages.mjs","tests/arc03-primary-header-prototype.test.mjs",
"tests/arc03b-primary-header-browser-differential.mjs",
"tests/arc03b-static-pages.test.mjs",
}
def git(*a):
    p=subprocess.run(["git",*a],capture_output=True,text=True)
    if p.returncode: raise RuntimeError("GIT_PROOF_FAILED "+" ".join(a)+": "+p.stderr[:260])
    return p.stdout.strip()
def require(v,msg):
    if not v: raise RuntimeError(msg)
def main():
    require(git("rev-parse","origin/main")==MAIN,"MAIN_DRIFT")
    require(git("cat-file","-t",OLD)=="commit","OLD_COMMIT_MISSING")
    base=git("merge-base",MAIN,OLD)
    changed=set(git("diff","--name-only",base,OLD).splitlines())
    require(changed==SOURCE_PATHS,"HISTORIC_SCOPE_CHANGED:"+repr(sorted(changed)))
    frag_old=git("rev-parse",OLD+":"+FRAGMENT)
    frag_new=git("rev-parse","HEAD:"+FRAGMENT)
    require(frag_old==frag_new=="25712fa6f2423372f076d041f9a7253ced088040",
            "PRIMARY_HEADER_FRAGMENT_CHANGED")
    old_routes=json.loads(git("show",OLD+":architecture/fragments/primary-header.routes.json"))
    new_routes=json.loads(Path("architecture/fragments/primary-header.routes.json").read_text())
    require(old_routes["status"]=="EXPERIMENTAL_BUILD_TIME_ONLY_NOT_PUBLISHED",
            "LEGACY_EXPERIMENT_STATUS_CHANGED")
    require(new_routes["status"]=="BUILD_AUTHORITATIVE_ARC03C",
            "CURRENT_AUTHORITATIVE_STATUS_CHANGED")
    require(new_routes["scope"]["mayModifyNetlifyBuild"] is True
            and old_routes["scope"]["mayModifyNetlifyBuild"] is False,
            "BUILD_AUTHORITY_PRECEDENCE_CHANGED")
    require(old_routes["scope"]["doesNotInclude"]==new_routes["scope"]["doesNotInclude"],
            "VIEWER_SCOPE_REGRESSION")
    cur=Path("scripts/compile-primary-pages.mjs").read_text()
    old=git("show",OLD+":scripts/compile-primary-pages.mjs")
    require("STAGING_ONLY" in old and "artifacts/arc03b/pages" in old,
            "LEGACY_BUILD_NOT_EXPERIMENTAL")
    for s in ('assert.equal(config.status,"BUILD_AUTHORITATIVE_ARC03C")',
              "Generated HTML drift","Generated manifest drift",
              "Unsafe static link","Exactly one header slot required",
              "NAV-005 excluded","Duplicate authorial header"):
        require(s in cur,"LATEST_COMPILER_GUARD_MISSING:"+s)
    t=Path("tests/arc03c-historical-prototype-guards.test.mjs").read_text()
    for s in ("unsafe-link","invalid/injected","duplicate header slots",
              "illegal Viewer header","experimental staging status"):
        # No need for the defunct preview compiler. Its security intents
        # must be carried into the current output-contract tests.
        require(s in t,"HISTORIC_NEGATIVE_TEST_MISSING:"+s)
    old_test=git("show",OLD+":tests/arc03-primary-header-prototype.test.mjs")
    require("malformed source" in old_test and "Unsafe" not in old_test,
            "HISTORIC_TEST_DRIFT")
    return {"schema":"M2DARC03PrototypeSupersession/0.1","status":"STATIC_PROVENANCE_PASS",
            "historicalSha":OLD,"sourcePaths":sorted(changed),
            "fragmentBlob":frag_old,
            "sourceStatus":old_routes["status"],"destinationStatus":new_routes["status"],
            "newCompiler":"scripts/compile-primary-pages.mjs",
            "uniqueLegacyNegativeTests":"restored as isolated fixture guard tests",
            "runtimeChanged":False,
            "limitation":"Requires fixture and browser gates; no earlier branch removal until archive tag"}
if __name__=="__main__":
    print(json.dumps(main(),indent=2,ensure_ascii=False))
