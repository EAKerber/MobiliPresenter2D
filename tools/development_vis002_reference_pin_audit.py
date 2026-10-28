#!/usr/bin/env python3
"""Read-only provenance check for the VIS-002 approved-palette reference-only pin.

Never infers a new visual approval, maps tokens to live components, or writes to app/.
"""
import json
import subprocess
from pathlib import Path
MAIN="221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
OLD="854cc05896523567e503f42af2b8e209c7591b31"
SOURCE_FILES={
 ".github/workflows/p-token-01b-reference-pin-gate.yml",
 ".github/workflows/p-token-02a-css-readonly-browser.yml",
 "design-system/P_TOKEN_01B_PIN_AND_CONSUMER_AUDIT_2026-10-22.md",
 "design-system/audits/p-token-01b-current-css-literal-observations.json",
 "design-system/pins/vis-002/v0.1.0/PIN.json",
 "design-system/pins/vis-002/v0.1.0/approved-palette-reference.css",
 "design-system/pins/vis-002/v0.1.0/approved-palette-reference.manifest.json",
 "scripts/verify-design-system-reference-pin.mjs",
 "tests/design-system-computed-style-readonly-audit.mjs",
 "tests/design-system-reference-pin.test.mjs"
}
PINNED_FILES=SOURCE_FILES-{".github/workflows/p-token-01b-reference-pin-gate.yml",
 ".github/workflows/p-token-02a-css-readonly-browser.yml","tests/design-system-reference-pin.test.mjs"}
def git(*args):
 p=subprocess.run(["git",*args],capture_output=True,text=True)
 if p.returncode:raise RuntimeError("GIT_FAILED "+" ".join(args)+" "+p.stderr[:400])
 return p.stdout.strip()
def req(cond,message):
 if not cond:raise RuntimeError(message)
def audit():
 req(git("rev-parse","origin/main")==MAIN,"MAIN_PIN_CHANGED")
 req(git("cat-file","-t",OLD)=="commit","HISTORIC_DAG_NOT_FETCHED")
 base=git("merge-base",MAIN,OLD)
 changed=set(git("diff","--name-only",base,OLD).splitlines())
 req(changed==SOURCE_FILES,"HISTORIC_SCOPE_CHANGED: "+repr(sorted(changed)))
 copied=[]
 for path in sorted(PINNED_FILES):
  sha=git("rev-parse",OLD+":"+path)
  req(git("rev-parse","HEAD:"+path)==sha,"COPIED_REFERENCE_NOT_BYTE_IDENTICAL: "+path)
  copied.append({"path":path,"blob":sha})
 pin=json.loads(Path("design-system/pins/vis-002/v0.1.0/PIN.json").read_text())
 req(pin["status"]=="REFERENCE_ONLY_NOT_LINKED","PIN_NOT_REFERENCE_ONLY")
 req(pin["product"]["activated"] is False and pin["product"]["cssImportAllowed"] is False,
     "UNAPPROVED_RUNTIME_ACTIVATION")
 req(pin["product"]["componentMappingsApproved"]==[],"UNAPPROVED_COMPONENT_MAPPINGS")
 req(pin["designSystem"]["commit"]=="70f0eabf609b5b4391459c426d6f7ecaeac070c8","PIN_ORIGIN_DRIFT")
 src=git("show",OLD+":tests/design-system-reference-pin.test.mjs")
 cur=Path("tests/design-system-reference-pin.test.mjs").read_text()
 req("assert.equal(observed,54)" in src,"HISTORIC_LEXICAL_ASSERTION_CHANGED")
 req("currentLiteralMatches" in cur and "historicLiteralMatches:54" in cur,
     "CURRENT_LEXICAL_MUST_BE_REMEASURED")
 req("assert.equal(observed,54)" not in cur,
     "STALE_HISTORIC_CSS_COUNT_IMPOSED_ON_LIVE_APP")
 return {"schema":"M2DVis002ReferenceProvenance/0.1","status":"STATIC_REFERENCE_ONLY_PASS",
         "historicSha":OLD,"historicalPaths":sorted(changed),
         "copiedExact":copied,"replacedOldWorkflows":"single development-only read-only CI",
         "historicalLexicalCount":54,"currentLexicalCount":"remeasured in Node tests",
         "runtimeActivated":False,"limitation":"Does not approve CSS role mappings or publish VIS-002C"}
if __name__=="__main__":print(json.dumps(audit(),ensure_ascii=False,indent=2))
