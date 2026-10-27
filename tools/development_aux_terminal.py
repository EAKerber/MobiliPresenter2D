#!/usr/bin/env python3
"""One-shot exact-SHA terminal retirement after dev A1/A2, never general hygiene."""
import argparse,json,os,re,subprocess
from pathlib import Path
from urllib.request import Request,urlopen
REPO="EAKerber/MobiliPresenter2D"
MANIFEST="ops/development-aux-terminal.json"
INVENTORY="docs/work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json"
PR_IDS={34,175,178,179,180,182,184,185,186,196,231,238}
OP="integration/01-aux-retire-gate-20261027"
def git(*args):
    return subprocess.run(["git",*args],check=True,capture_output=True,text=True).stdout.strip()
def remote():
    rows=git("ls-remote","--heads","origin").splitlines()
    refs={}
    for line in rows:
        sha,ref=line.split("\t",1)
        if ref in refs or not re.fullmatch("[0-9a-f]{40}",sha):
            raise RuntimeError("BAD_REMOTE_REF")
        refs[ref.removeprefix("refs/heads/")]=sha
    return refs
def api(path):
    token=os.getenv("GITHUB_TOKEN")
    if not token:raise RuntimeError("TOKEN_MISSING")
    request=Request("https://api.github.com/repos/"+REPO+"/"+path,headers={
        "Authorization":"Bearer "+token,"Accept":"application/vnd.github+json",
        "X-GitHub-Api-Version":"2022-11-28","User-Agent":"M2D-dev-terminal"})
    with urlopen(request,timeout=30) as response:return json.load(response)
def attest(manifest,inventory,refs,dev):
    if (manifest.get("schemaVersion")!="M2DDevAuxTerminal/0.1"
        or manifest.get("repository")!=REPO
        or manifest.get("operational")!=OP
        or manifest.get("mainSha")!="221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
        or manifest.get("developmentBaseSha")!="2ea9627ed315430586adccf269594a1769169d89"
        or manifest.get("operationalSha")!="8bc69de89f977b9e82960c5b0c950c6fe6854fc1"
        or inventory.get("baseSha")!=manifest["mainSha"]
        or inventory.get("totals",{}).get("branches")!=60):
        raise RuntimeError("BAD_TERMINAL_CONTEXT")
    old=inventory.get("rows",[])
    historical={x["branch"]:x["sha"] for x in old}
    if (len(old)!=60 or len(historical)!=60
        or any(not re.fullmatch("[0-9a-f]{40}",s) for s in historical.values())):
        raise RuntimeError("INVALID_ORIGINAL_HISTORY")
    exp={**historical,"main":manifest["mainSha"],"development":dev,
         OP:manifest["operationalSha"]}
    if refs!=exp:raise RuntimeError("UNEXPECTED_REMOTE_HEADS")
    return exp
def inspect(manifest,original):
    sha=os.getenv("GITHUB_SHA","")
    if (os.getenv("GITHUB_REPOSITORY")!=REPO or os.getenv("GITHUB_EVENT_NAME")!="push"
        or os.getenv("GITHUB_REF")!="refs/heads/development"
        or not re.fullmatch("[0-9a-f]{40}",sha)
        or git("rev-parse","HEAD")!=sha):
        raise RuntimeError("ONLY_DEVELOPMENT_EXACT_PUSH")
    refs=remote()
    exp=attest(manifest,original,refs,sha)
    git("fetch","--no-tags","origin","development")
    for ancestor in [manifest["developmentBaseSha"],manifest["operationalSha"]]:
        if subprocess.run(["git","merge-base","--is-ancestor",ancestor,sha]).returncode:
            raise RuntimeError("ANCESTRY_FAILED")
    if git("cat-file","-t",manifest["operationalSha"])!="commit":
        raise RuntimeError("OP_NOT_COMMIT")
    prs=api("pulls?state=open&per_page=100")
    if {p.get("number") for p in prs}!=PR_IDS:raise RuntimeError("PR_INVENTORY_CHANGED")
    if any(OP in [p.get("head",{}).get("ref"),p.get("base",{}).get("ref")] for p in prs):
        raise RuntimeError("OP_HAS_OPEN_PR")
    info=api("branches/"+OP)
    if info.get("protected") is not False or (info.get("commit") or {}).get("sha")!=manifest["operationalSha"]:
        raise RuntimeError("OP_PROTECTED_OR_SHA_CHANGED")
    if api("rulesets?per_page=100"):raise RuntimeError("RULESET_CHANGED")
    for f in list(Path(".github/workflows").glob("*.yml"))+list(Path(".github/workflows").glob("*.yaml")):
        if OP in f.read_text():
            raise RuntimeError("OP_USED_BY_ACTIVE_WORKFLOW:"+str(f))
    for number,original_sha in [(40544066545,"071c9ed266c060aa55b2c646ebc3552d3e29ed33"),
                                (40546084945,"8bc69de89f977b9e82960c5b0c950c6fe6854fc1")]:
        run=api("actions/runs/"+str(number))
        if run.get("conclusion")!="success" or run.get("head_sha")!=original_sha:
            raise RuntimeError("PREVIOUS_WAVE_NOT_PROVED")
    return exp
def main(mode):
    m=json.loads(Path(MANIFEST).read_text())
    old=json.loads(Path(INVENTORY).read_text())
    before=inspect(m,old)
    receipt={"schemaVersion":"M2DDevAuxTerminalReceipt/0.1","mode":mode,
      "devSha":before["development"],"deleted":[],"status":"AUDIT_PASS" if mode=="audit" else "PENDING"}
    file=Path("development-aux-terminal-receipt.json")
    file.write_text(json.dumps(receipt,indent=2)+"\n")
    if mode=="audit":
        print(json.dumps(receipt));return
    if remote()!=before:raise RuntimeError("IMMEDIATE_PRE_DELETE_REF_DRIFT")
    expected=before.copy()
    del expected[OP]
    subprocess.run(["git","push","origin",
      "--force-with-lease=refs/heads/"+OP+":"+m["operationalSha"],":refs/heads/"+OP],check=True)
    if remote()!=expected:raise RuntimeError("POST_DELETE_READBACK_FAILED")
    receipt.update({"deleted":[{"branch":OP,"sha":m["operationalSha"]}],
       "status":"PASS","remainingBranches":len(expected),"readback":"PASS"})
    file.write_text(json.dumps(receipt,indent=2)+"\n")
    print(json.dumps(receipt))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--mode",choices=["audit","apply"],required=True)
    main(p.parse_args().mode)
