#!/usr/bin/env python3
"""Pinned read-only audit of experimental and P-COMP-01 public menu histories."""
import json, subprocess
from pathlib import Path

MAIN="221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
SOURCES={
 "experiment/shared-public-header-controller-20261020":{
  "sha":"fdeb931af285f6cf76795ccdd50a8b75d0f25aef",
  "files":{".github/workflows/public-header-controller-isolated.yml","app/about/index.html","app/how-it-works/how-it-works.js","app/how-it-works/index.html","app/index.html","app/landing/header-menu.js","app/landing/landing.js","tests/public-header-controller-gate.mjs"},
  "controller_commit":"5b741a7734663105bc2cde66c33846bc4edd8db0",
 },
 "architecture/p-comp-01-public-menu-20261021":{
  "sha":"4ba9384733a8cb46ad8a6c7c8ef3b9aebe25cd93",
  "files":{".github/workflows/p-comp-01-public-menu-gate.yml","app/about/index.html","app/how-it-works/how-it-works.js","app/how-it-works/index.html","app/index.html","app/landing/header-menu.js","app/landing/landing.js","app/viewer/index.html","tests/public-header-controller-gate.mjs"},
  "controller_commit":"e36bf73eb3b3d6041473ea8c0c174c1802d1736e",
 }
}
def git(*args):
    p=subprocess.run(["git",*args],capture_output=True,text=True)
    if p.returncode:
        raise RuntimeError("GIT_COMMAND_FAILED: "+" ".join(args)+" "+p.stderr[:300])
    return p.stdout.strip()
def require(flag,msg):
    if not flag: raise RuntimeError(msg)

def main():
    require(git("rev-parse","origin/main")==MAIN,"MAIN_SHA_CHANGED")
    current=Path("app/landing/header-menu.js").read_text()
    test=Path("tests/public-header-controller-gate.mjs").read_text()
    semantic=Path("tests/ci/public-navigation-semantic-browser.mjs").read_text()
    routes=json.loads(Path("architecture/fragments/primary-header.routes.json").read_text())
    require(routes["status"]=="BUILD_AUTHORITATIVE_ARC03C","LATEST_ROUTE_AUTHORITY_LOST")
    require(len(routes["routes"])==3 and "/viewer/" in routes["scope"]["doesNotInclude"],
            "PUBLIC_HEADER_SCOPE_BROKEN")
    require('const toggle = document.getElementById("menuToggle")' in current,"MENU_TOGGLE_LOST")
    require('const nav = document.getElementById("primaryNav")' in current,"MENU_NAV_LOST")
    for snippet in ('aria-expanded','aria-label','event.detail === 0','Escape',
                    'toggle.focus()','pointerdown','nav.querySelectorAll("a")'):
        require(snippet in current,"LATEST_CONTROLLER_MISSING:"+snippet)
    require("PNG.sync.read" in test and "withinRasterTolerance" in test,
            "NEWER_PCOMP_PIXEL_DIFFERENTIAL_LOST")
    require('outerHTML.replace(/>\\s+</g, "><")' in test,
            "LATER_ARC03C_HTML_NORMALIZATION_LOST")
    for snippet in ("keyboard activation focuses first link","Escape returns focus",
                    "pointer outside closes","link closes without navigation",
                    "one controller, not double-initialized","Viewer Ambientes precedes theme",
                    'const WIDTHS=[390,768,1366]'):
        require(snippet in semantic,"CURRENT_SEMANTIC_GATE_LOST:"+snippet)
    for path in ("app/index.html","app/about/index.html",
                 "app/how-it-works/index.html","app/viewer/index.html"):
        html=Path(path).read_text()
        require(html.count("/landing/header-menu.js")==1,
                "PUBLIC_CONTROLLER_NOT_UNIQUE_IN:"+path)
    result={}
    latest_date=git("show","-s","--format=%aI","2b6dd39b609a11137cc440ae3936ea8b6141620e")
    for name,info in SOURCES.items():
        sha=info["sha"]
        require(git("cat-file","-t",sha)=="commit","HISTORIC_SHA_NOT_FETCHED:"+name)
        merge=git("merge-base",MAIN,sha)
        contributed=set(git("diff","--name-only",merge,sha).splitlines())
        require(contributed==info["files"],"HISTORIC_SCOPE_MISMATCH:"+name+":"+repr(sorted(contributed)))
        old_controller=git("show",sha+":app/landing/header-menu.js")
        old_test=git("show",sha+":tests/public-header-controller-gate.mjs")
        require('aria-expanded' in old_controller and "Escape" in old_controller
                and 'pointerdown' in old_controller,"OLD_MENU_HAS_UNMAPPED_BEHAVIOR:"+name)
        require("PNG.sync.read" in old_test and "withinRasterTolerance" in old_test
                if "p-comp" in name else "Escape" in old_test,
                "HISTORIC_TEST_CONTRACT_DRIFT:"+name)
        historical_date=git("show","-s","--format=%aI",info["controller_commit"])
        require(latest_date>historical_date,"NEWER_CONTROLLER_PROVENANCE_INVALID:"+name)
        result[name]={
            "headSha":sha,"contributedPaths":sorted(contributed),
            "historicControllerCommit":info["controller_commit"],
            "historicControllerDate":historical_date,
            "newerDevelopmentControllerDate":latest_date,
            "oldTestBytes":len(old_test),"currentTestBytes":len(test),
        }
    return {
      "schema":"M2DPublicMenuSemanticReconciliation/0.1",
      "status":"STATIC_PRECEDENCE_PASS",
      "newerController":"2b6dd39b609a11137cc440ae3936ea8b6141620e",
      "latestIntent":"P-COMP shared controller, ARC03C authored public headers, NAV005 separated Viewer",
      "runtimeChanged":False,
      "sources":result,
      "limitation":"Browser gates are separate prerequisites; static proof does not authorize removal.",
    }
if __name__=="__main__":
    print(json.dumps(main(),indent=2,ensure_ascii=False))
