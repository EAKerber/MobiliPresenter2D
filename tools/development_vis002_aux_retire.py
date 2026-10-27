#!/usr/bin/env python3
"""Retire ONE verified, already-merged development navigation auxiliary.
This file is single-use, never a generic deletion interface.
"""
import argparse,json,os,re,subprocess
from pathlib import Path
from urllib.request import Request,urlopen
REPO="EAKerber/MobiliPresenter2D"
BRANCH="integration/04-vis002-context-audit-20261027"
SOURCE="e977dbe97439d56fdcd494e3d86d3f55faf1e513"
STABLE="221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
RUN_ID=40556552629
EXPECTED_PRS={34,175,178,179,180,182,184,185,186,196,231,238}
INVENTORY="docs/work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json"
def sh(*args):
    return subprocess.run(["git",*args],check=True,capture_output=True,text=True).stdout.strip()
def api(path):
    tok=os.getenv("GITHUB_TOKEN")
    if not tok:raise RuntimeError("MISSING_TOKEN")
    q=Request("https://api.github.com/repos/"+REPO+"/"+path,headers={
        "Authorization":"Bearer "+tok,"User-Agent":"m2d-development-vis002-one-shot",
        "Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"})
    with urlopen(q,timeout=30) as resp:return json.load(resp)
def refs():
    result={}
    for item in sh("ls-remote","--heads","origin").splitlines():
        sha,ref=item.split("\t",1);name=ref.removeprefix("refs/heads/")
        if name in result or not re.fullmatch(r"[0-9a-f]{40}",sha):
            raise RuntimeError("DUPLICATE_OR_INVALID_REMOTE_REF")
        result[name]=sha
    return result
def expected_roster(inventory,development):
    items=inventory.get("rows",[])
    if (inventory.get("baseSha")!=STABLE
        or inventory.get("totals",{}).get("branches")!=60
        or len(items)!=60):raise RuntimeError("INVENTORY_INVALID")
    old={x["branch"]:x["sha"] for x in items}
    if (len(old)!=60 or any(not re.fullmatch(r"[0-9a-f]{40}",z) for z in old.values())
        or set(old)&{BRANCH,"main","development"}):raise RuntimeError("INVENTORY_INVALID")
    return {**old,"main":STABLE,"development":development,BRANCH:SOURCE}
def preflight(inventory):
    if (os.getenv("GITHUB_EVENT_NAME")!="push"
        or os.getenv("GITHUB_REPOSITORY")!=REPO
        or os.getenv("GITHUB_REF")!="refs/heads/development"
        or not re.fullmatch(r"[0-9a-f]{40}",os.getenv("GITHUB_SHA",""))
        or os.getenv("GITHUB_SHA")!=sh("rev-parse","HEAD")):
        raise RuntimeError("GITHUB_CONTEXT_INVALID")
    actual=refs()
    dev=os.environ["GITHUB_SHA"]
    wanted=expected_roster(inventory,dev)
    if actual!=wanted:raise RuntimeError("EXACT_63_REF_READBACK_FAILED")
    sh("fetch","--no-tags","origin","development")
    if subprocess.run(["git","merge-base","--is-ancestor",SOURCE,dev]).returncode:
        raise RuntimeError("SOURCE_NOT_ANCESTOR_OF_DEVELOPMENT")
    run=api("actions/runs/"+str(RUN_ID))
    if (run.get("conclusion")!="success"
        or run.get("head_sha")!=SOURCE
        or run.get("head_branch")!="development"):
        raise RuntimeError("DEVELOPMENT_BROWSER_GATE_NOT_VERIFIED")
    prs=api("pulls?state=open&per_page=100")
    if {p.get("number") for p in prs}!=EXPECTED_PRS:
        raise RuntimeError("PR_INVENTORY_CHANGED")
    if any(BRANCH in [p.get("head",{}).get("ref"),p.get("base",{}).get("ref")] for p in prs):
        raise RuntimeError("AUX_HAS_OPEN_PR")
    if api("rulesets?per_page=100"):raise RuntimeError("RULESET_CHANGED")
    b=api("branches/"+BRANCH)
    if b.get("protected") is not False or (b.get("commit") or {}).get("sha")!=SOURCE:
        raise RuntimeError("BRANCH_PROTECTED_OR_MOVED")
    for filename in list(Path(".github/workflows").glob("*.yml"))+list(Path(".github/workflows").glob("*.yaml")):
        if BRANCH in filename.read_text(encoding="utf8"):
            raise RuntimeError("ACTIVE_WORKFLOW_REF_STILL_PRESENT:"+str(filename))
    return wanted
def run(mode):
    inventory=json.loads(Path(INVENTORY).read_text(encoding="utf8"))
    original=preflight(inventory)
    receipt={"schemaVersion":"M2DVis002AuxOneShotReceipt/0.1",
             "source":BRANCH,"sourceSha":SOURCE,"developmentSha":original["development"],
             "mode":mode,"status":"AUDIT_PASS" if mode=="audit" else "STARTED",
             "historicalBranches":60,"removed":[]}
    file=Path("vis002-aux-retire-receipt.json")
    file.write_text(json.dumps(receipt,indent=2)+"\n")
    if mode=="audit":
        print(json.dumps(receipt));return
    if refs()!=original:raise RuntimeError("REMOTE_DRIFT_IMMEDIATE_PRE_DELETE")
    subprocess.run(["git","push","origin",
        "--force-with-lease=refs/heads/"+BRANCH+":"+SOURCE,
        ":refs/heads/"+BRANCH],check=True)
    expected=original.copy();del expected[BRANCH]
    if refs()!=expected:raise RuntimeError("POST_DELETE_FULL_READBACK_FAILED")
    receipt.update({"removed":[{"branch":BRANCH,"sha":SOURCE}],
        "status":"PASS","readback":"PASS","remainingBranchCount":len(expected)})
    file.write_text(json.dumps(receipt,indent=2)+"\n")
    print(json.dumps(receipt))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--mode",required=True,choices=["audit","apply"])
    run(p.parse_args().mode)
