#!/usr/bin/env python3
"""Safe exact-SHA retirement of three already-merged development auxiliaries.
No generic deletion facility; audit is read-only; apply requires a dev push.
"""
import argparse,json,os,re,subprocess
from pathlib import Path
from urllib.request import Request,urlopen
REPO="EAKerber/MobiliPresenter2D"
BASE="docs/work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json"
PROPOSAL="docs/work/DEVELOPMENT_AUX_RETIREMENT_PLAN_2026-10-27.json"
BATCH="ops/development-aux-retirement-batch-a2.json"
OP="integration/01-aux-retire-gate-20261027"
PR_IDS={34,175,178,179,180,182,184,185,186,196,231,238}
SHA=re.compile(r"[0-9a-f]{40}\Z")
def git(*args):
    return subprocess.run(["git",*args],check=True,capture_output=True,text=True).stdout.strip()
def api(path):
    t=os.getenv("GITHUB_TOKEN")
    if not t:raise RuntimeError("GITHUB_TOKEN_MISSING")
    req=Request("https://api.github.com/repos/"+REPO+"/"+path,headers={
        "Authorization":"Bearer "+t,"Accept":"application/vnd.github+json",
        "X-GitHub-Api-Version":"2022-11-28","User-Agent":"M2D-aux-exact-retirement"})
    with urlopen(req,timeout=30) as response:return json.load(response)
def remote():
    result={}
    for line in git("ls-remote","--heads","origin").splitlines():
        sha,ref=line.split("\t")
        if ref in result or not SHA.fullmatch(sha):raise RuntimeError("DUPLICATE_OR_BAD_REMOTE")
        result[ref.removeprefix("refs/heads/")]=sha
    return result
def validate(m,p,o):
    if (m.get("schemaVersion")!="M2DDevelopmentAuxBatch/0.1"
        or m.get("wave")!="M2D-DEV-AUX-A2-20261027"
        or m.get("repository")!=REPO or m.get("control")!="development"
        or m.get("mainSha")!=p.get("stableMainSha")
        or m.get("baseline")!="665729876e6536c96f1c5cde9a9023bedeb1369d"
        or p.get("controlSha")!="994d7f613db144cbb07d638b05754820170a20a4"
        or m.get("operational")!=OP or p.get("status")!="PROPOSAL_ONLY_NO_DELETE"
        or p.get("authorizedDeletions")!=0 or o.get("baseSha")!=m.get("mainSha")
        or o.get("totals",{}).get("branches")!=60):
        raise RuntimeError("CONTEXT_MISMATCH")
    six=p.get("allAuxiliaries")
    targets=m.get("targets")
    if (not isinstance(six,list) or len(six)!=6
        or not isinstance(targets,list) or targets!=six[3:]
        or len({x.get("branch") for x in six})!=6
        or len(o.get("rows",[]))!=60):
        raise RuntimeError("STRICT_BATCH_SHAPE")
    old={z["branch"]:z["sha"] for z in o["rows"]}
    aux={z["branch"]:z["sha"] for z in six}
    if (len(old)!=60 or set(old)&set(aux)
        or any(z in ("main","development",OP) for z in aux)
        or any(not SHA.fullmatch(s) for s in list(old.values())+list(aux.values()))):
        raise RuntimeError("INVALID_PINNED_HISTORY")
    return old,aux
def verify_roster(refs,old,aux,main,dev,oper):
    expected={**old,**{k:v for k,v in aux.items() if k in list(aux)[3:]},"main":main,"development":dev,OP:oper}
    if refs!=expected:raise RuntimeError("REMOTE_INVENTORY_DRIFT")
    return expected
def assert_safe(m,old,aux,mode):
    refs=remote()
    head=os.getenv("GITHUB_SHA")
    if (os.getenv("GITHUB_REPOSITORY")!=REPO or not SHA.fullmatch(head or "")
        or git("rev-parse","HEAD")!=head):
        raise RuntimeError("INVALID_GITHUB_CONTEXT")
    if mode=="audit":
        if (os.getenv("GITHUB_REF")!="refs/heads/"+OP
            or refs.get(OP)!=head or refs.get("development")!=m["baseline"]):
            raise RuntimeError("AUDIT_NOT_AUX_BASE")
    elif (os.getenv("GITHUB_EVENT_NAME")!="push"
          or os.getenv("GITHUB_REF")!="refs/heads/development"
          or refs.get("development")!=head or refs.get(OP)!=head):
        raise RuntimeError("APPLY_NOT_EXACT_DEV_FAST_FORWARD")
    if refs.get("main")!=m["mainSha"]:raise RuntimeError("MAIN_CHANGED")
    inventory=verify_roster(refs,old,aux,m["mainSha"],refs["development"],refs[OP])
    git("fetch","--no-tags","origin","development")
    if subprocess.run(["git","merge-base","--is-ancestor",
                       "994d7f613db144cbb07d638b05754820170a20a4",m["baseline"]]).returncode:
        raise RuntimeError("PROPOSAL_SHA_NOT_ANCESTOR_OF_BASE")
    if subprocess.run(["git","merge-base","--is-ancestor",m["baseline"],refs["development"]]).returncode:
        raise RuntimeError("DEV_BASE_NOT_ANCESTOR")
    for name,sha in aux.items():
        if (git("cat-file","-t",sha)!="commit"
            or subprocess.run(["git","merge-base","--is-ancestor",sha,refs["development"]]).returncode):
            raise RuntimeError("AUX_NOT_REACHABLE:"+name)
    prs=api("pulls?state=open&per_page=100")
    if {p.get("number") for p in prs}!=PR_IDS:raise RuntimeError("PR_DRIFT")
    inuse={x.get("ref") for p in prs for x in (p.get("head") or {},p.get("base") or {})}
    if inuse&set(aux):raise RuntimeError("AUX_HAS_OPEN_PR")
    proof=api("actions/runs/40544066545")
    if (proof.get("conclusion")!="success"
        or proof.get("head_sha")!="071c9ed266c060aa55b2c646ebc3552d3e29ed33"):
        raise RuntimeError("A1_RECEIPT_NOT_VERIFIED")
    if api("rulesets?per_page=100"):raise RuntimeError("NEW_RULESET")
    for path in list(Path(".github/workflows").glob("*.yml"))+list(Path(".github/workflows").glob("*.yaml")):
        s=path.read_text()
        if any(name in s for name in aux):
            raise RuntimeError("WORKFLOW_REF_NOT_RETIRED:"+str(path))
    for row in m["targets"]:
        name,sha=row["branch"],row["sha"]
        p=api("branches/"+name)
        if p.get("protected") is not False or (p.get("commit") or {}).get("sha")!=sha:
            raise RuntimeError("TARGET_PROTECTED_OR_CHANGED:"+name)
    return inventory
def main(mode):
    m=json.loads(Path(BATCH).read_text())
    old,aux=validate(m,json.loads(Path(PROPOSAL).read_text()),json.loads(Path(BASE).read_text()))
    expected=assert_safe(m,old,aux,mode)
    receipt={"schema":"M2DDevAuxRetirementReceipt/0.1","wave":m["wave"],"mode":mode,
             "development":expected["development"],"targetPins":m["targets"],
             "deleted":[],"status":"AUDIT_PASS" if mode=="audit" else "STARTED"}
    dest=Path("development-aux-retirement-receipt.json")
    dest.write_text(json.dumps(receipt,indent=2)+"\n")
    if mode=="audit":
        print(json.dumps(receipt));return
    for row in m["targets"]:
        name,sha=row["branch"],row["sha"]
        if remote()!=expected:raise RuntimeError("REF_DRIFT_BEFORE_DELETE")
        prs=api("pulls?state=open&per_page=100")
        if {p.get("number") for p in prs}!=PR_IDS:raise RuntimeError("PR_DRIFT_BEFORE_DELETE")
        if api("rulesets?per_page=100"):raise RuntimeError("RULESET_DRIFT")
        detail=api("branches/"+name)
        if detail.get("protected") is not False or (detail.get("commit") or {}).get("sha")!=sha:
            raise RuntimeError("SHA_OR_PROTECTION_DRIFT")
        if subprocess.run(["git","merge-base","--is-ancestor",sha,expected["development"]]).returncode:
            raise RuntimeError("DEVELOPMENT_ANCESTRY_DRIFT")
        subprocess.run(["git","push","origin",
            "--force-with-lease=refs/heads/"+name+":"+sha,":refs/heads/"+name],check=True)
        expected.pop(name)
        if remote()!=expected:raise RuntimeError("READBACK_DRIFT_AFTER_DELETE")
        receipt["deleted"].append(row)
        dest.write_text(json.dumps(receipt,indent=2)+"\n")
    receipt["status"]="PASS";receipt["readback"]="PASS"
    receipt["remainingBranches"]=len(expected)
    dest.write_text(json.dumps(receipt,indent=2)+"\n")
    print(json.dumps(receipt))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--mode",choices=["audit","apply"],required=True)
    main(p.parse_args().mode)
