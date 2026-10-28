#!/usr/bin/env python3
"""Fail-closed, read-only semantic precedence audit for historic Viewer NAV-005.

The 2026-10-21 source placed the contextual Ambientes link in the brand
cluster. The later user-approved layout requires it on the right immediately
before theme and menu. No deploy and no source modifications.
"""
from __future__ import annotations
import json
import re
import subprocess
from pathlib import Path

REPO="EAKerber/MobiliPresenter2D"
SOURCE="10445ad8c20ac1a415f4ba463345eda83bd7e9a6"
MAIN="221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
SCOPE={
    ".github/workflows/viewer-secondary-header-isolated.yml",
    "app/core/ui-theme.js",
    "app/viewer/index.html",
    "app/viewer/viewer.css",
    "tests/viewer-secondary-header-browser-gate.mjs",
}

def git(*args: str)->str:
    p=subprocess.run(["git",*args],capture_output=True,text=True)
    if p.returncode: raise RuntimeError("GIT_FAILED " + " ".join(args) + " " + p.stderr[:300])
    return p.stdout.strip()

def require(check:bool, msg:str)->None:
    if not check: raise RuntimeError(msg)

def verify()->dict:
    require(git("rev-parse","origin/main")==MAIN,"MAIN_PIN_DRIFT")
    require(git("cat-file","-t",SOURCE)=="commit","HISTORIC_SHA_NOT_AVAILABLE")
    base=git("merge-base",MAIN,SOURCE)
    changed=set(git("diff","--name-only",base,SOURCE).splitlines())
    require(changed==SCOPE,"HISTORIC_SCOPE_DRIFT:"+repr(sorted(changed)))
    theme="app/core/ui-theme.js"
    require(git("rev-parse",SOURCE+":"+theme)==git("rev-parse","HEAD:"+theme),
            "SHARED_THEME_CONTROLLER_NOT_BYTE_IDENTICAL")
    old_html=git("show",SOURCE+":app/viewer/index.html")
    html=Path("app/viewer/index.html").read_text()
    old_css=git("show",SOURCE+":app/viewer/viewer.css")
    css=Path("app/viewer/viewer.css").read_text()
    old_test=git("show",SOURCE+":tests/viewer-secondary-header-browser-gate.mjs")
    new_test=Path("tests/viewer-secondary-header-browser-gate.mjs").read_text()
    public_test=Path("tests/ci/public-navigation-semantic-browser.mjs").read_text()
    routes=json.loads(Path("architecture/fragments/primary-header.routes.json").read_text())
    require(routes["scope"]["doesNotInclude"].__contains__("/viewer/"),
            "ARC03C_MUST_EXCLUDE_VIEWER")
    require(routes["status"]=="BUILD_AUTHORITATIVE_ARC03C","PUBLIC_SOURCE_AUTHORITY_DRIFT")
    require('class="site-header"' not in html and 'class="viewer-header"' in html,
            "VIEWER_MUST_USE_SEPARATE_DEPTH2_HEADER")
    require('<div class="viewer-header__context">' in old_html
            and '<a href="/#ambientes" class="back-link">← Ambientes</a>' in old_html,
            "HISTORIC_CONTEXT_LAYOUT_CHANGED")
    old_header=old_html.split('<header class="viewer-header">',1)[1].split("</header>",1)[0]
    current_header=html.split('<header class="viewer-header">',1)[1].split("</header>",1)[0]
    require(old_header.index('class="back-link"') < old_header.index('class="viewer-header__actions header-actions"'),
            "HISTORIC_LINK_NOT_IN_BRAND_CLUSTER")
    require(current_header.index('class="back-link"') > current_header.index('class="viewer-header__actions header-actions"'),
            "CURRENT_LINK_NOT_IN_ACTION_CLUSTER")
    require(current_header.count('class="back-link"')==1
            and current_header.count('id="menuToggle"')==1,
            "VIEWER_DUPLICATE_RETURN_OR_MENU")
    require('aria-current="page"' not in current_header,
            "VIEWER_MUST_NOT_MARK_AMBIENTES_CURRENT")
    require('class="viewer-header__actions header-actions"' in current_header,
            "VIEWER_ACTION_CLUSTER_MISSING")
    require(".viewer-header__context .back-link" in old_css
            and ".viewer-header__actions .back-link" in css,
            "RESPONSIVE_CSS_TARGET_NOT_MIGRATED")
    for term in (
        "navCurrent,0", "return must immediately precede theme selector",
        "theme must immediately precede hamburger",
        "logo.left<initial.back.left",
        "rootScrollWidth<=width+1",
        "header.height<=94",
        'widths=[320,390,486,768,1366]', 'themes=["light","dark"]',
        "menu must be visible when settled",
        'await page.keyboard.press("Escape")',
        'VIEWER_NAV005_RESULT PASS ',
    ):
        require(term in new_test,"VIEWER_NEW_TEST_CONTRACT_LOST:"+term)
    require('VIEWER_NAV005_RESULT PASS ' in old_test
            and len(new_test)>len(old_test),
            "LATEST_VIEWER_TEST_MUST_ADD_GUARDS")
    require("Viewer Ambientes precedes theme" in public_test
            and 'Viewer theme precedes menu' in public_test
            and 'const WIDTHS=[390,768,1366]' in public_test,
            "PUBLIC_NAV_TEST_MUST_INCLUDE_VIEWER")
    return {
      "schemaVersion":"M2DNav005SemanticPrecedence/0.1",
      "historicSha":SOURCE,
      "historicalPaths":sorted(changed),
      "byteIdenticalThemeController":git("rev-parse","HEAD:"+theme),
      "history":"brand + Ambientes in same cluster",
      "current":"logo left; Ambientes + theme + menu on right",
      "primaryFragmentScope":"3 public authored routes, Viewer excluded",
      "semanticIntent":"latest approved Viewer depth-2 header NAV-005",
      "runtimeCodeChanged":False,
      "sourceDisposition":"SEMANTIC_SUPERSEDED_CANDIDATE",
      "status":"STATIC_CONTRACT_PASS",
      "qualification":"Requires passing 48-route and 20-viewer browser scenarios, archive tag before retirement",
    }

if __name__=="__main__":
    print(json.dumps(verify(),indent=2,ensure_ascii=False))
