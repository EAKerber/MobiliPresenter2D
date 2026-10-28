#!/usr/bin/env python3
"""Exact-HEAD, tag-only preservation of superseded CP-PUBLIC PRs, max 2 per wave.

No PR state mutation, no branch deletion, no preview, no content change.
AUDIT performs no writes; APPLY is allowed on development push only.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

R = "EAKerber/MobiliPresenter2D"
MAIN = "221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
MANIFEST = Path("ops/development-pr-archive-manifest.json")
INVENTORY = Path("docs/work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json")
RETIRED = Path("ops/development-retirement-batch.json")
RECEIPT = Path("artifacts/development-pr-archive/receipt.json")
PR_HEADS = {
  34: ("feat/exposed-sides-and-glass","20040da835d6da66b03f73642c0c44db109dd6e8"),
  175: ("work/cp-public-01-donor-staging-20261008","c81d357df3aa78c3e8f804b6334b2da35b3a75c8"),
  178: ("work/cp-public-02a-public-module-projection-20261008","f0c792397036836105dcb53a45f89780e10b6348"),
  179: ("work/cp-public-02b-public-read-endpoint-20261008","44b1d6a94c06a17b73405755e03c787780e7a455"),
  180: ("work/cp-public-02c-integrated-preview-20261008","82d85674595280a7c878848d0d5f09df29492e92"),
  182: ("work/cp-public-03a1-configuration-read-guard-20261008","0b398618f7f2eff23da7f782d53d86ba3ee6411b"),
  184: ("work/cp-public-03a2-0-failclosed-bootstrap-20261008","d1305ffdd8302fa06b37d3676f08d802a92e7d97"),
  185: ("work/cp-public-03a2-1-buyer-projection-20261008","7a0d919d4e27853c50cff8afde0cdcc066e0aa0c"),
  186: ("work/cp-public-03a2-2-email-access-core-20261008","40d4b65f9e7e16e0810c2308e9b947840371cbe7"),
  196: ("docs/cp-public-auth-boundary-20261011","43d5fb9c5c2749c0541b99d49ee1c048d6a9a96a"),
  231: ("architecture/p-token-02b-contextual-copy-20261022","afb80965336083209eac93e2729de77170524ee5"),
  238: ("ci/ci-baseline-01-isolated-auth-extraction-20261024","3ccce161235df925c5b708bf6feefbe6f4b10103")
}
CANDIDATE_TAGS = {
    175: "archive/m2d/cppublic-pr175-c81d357d",
    178: "archive/m2d/cppublic-pr178-f0c79239",
    179: "archive/m2d/cppublic-pr179-44b1d6a9",
    180: "archive/m2d/cppublic-pr180-82d85674",
}
AUX = "integration/38-cppublic-pr-archive-20261028"
SHA = re.compile(r"[0-9a-f]{40}\Z")

def git(*args):
    return subprocess.check_output(["git", *args], text=True, stderr=subprocess.PIPE).strip()

def api(path):
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise RuntimeError("MISSING_GITHUB_TOKEN")
    req = Request("https://api.github.com/repos/" + R + "/" + path, headers={
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "M2D-dev-PR-tag-archive",
    })
    with urlopen(req, timeout=30) as response:
        return json.load(response)

def remote_refs(selector):
    result = {}
    for line in git("ls-remote", selector, "origin").splitlines():
        sha, ref = line.split("\t", 1)
        if ref.endswith("^{}"):
            continue
        prefix = "refs/heads/" if selector == "--heads" else "refs/tags/"
        if not ref.startswith(prefix) or not SHA.fullmatch(sha):
            raise RuntimeError("INVALID_REMOTE_REF")
        name = ref[len(prefix):]
        if name in result:
            raise RuntimeError("DUPLICATE_REMOTE_REF")
        result[name] = sha
    return result

def checked_manifest():
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if (m.get("schemaVersion") != "M2DDevPublicPRArchive/0.1"
        or m.get("repository") != R or m.get("controlBranch") != "development"
        or m.get("mainSha") != MAIN
        or m.get("snapshotPath") != "docs/work/DEVELOPMENT_CP_PUBLIC_PR_CLOSURE_2026-10-28.md"
        or not re.fullmatch(r"dev-20261028-public-pr-archive-[a-z]{2}",m.get("batchId",""))
        or m.get("expectedOpenPRs") != [[k,*v] for k,v in sorted(PR_HEADS.items())]
        or m.get("candidateTags") != [[k,v] for k,v in sorted(CANDIDATE_TAGS.items())]):
        raise RuntimeError("PR_ARCHIVE_MANIFEST_DRIFT")
    targets, previous = m.get("targets"),m.get("previousTagged")
    if (not isinstance(targets,list) or not 1 <= len(targets) <= 2
        or any(type(n) is not int or n not in CANDIDATE_TAGS for n in targets)
        or len(set(targets)) != len(targets)
        or not isinstance(previous,list)
        or any(type(n) is not int or n not in CANDIDATE_TAGS for n in previous)
        or len(set(previous)) != len(previous)
        or set(previous) & set(targets)):
        raise RuntimeError("INVALID_BOUNDED_PR_TAG_BATCH")
    doc = Path(m["snapshotPath"]).read_text(encoding="utf-8")
    for n in targets+previous:
        branch,sha = PR_HEADS[n]
        if branch+"@"+sha not in doc or CANDIDATE_TAGS[n] not in doc:
            raise RuntimeError("MISSING_EXACT_ARCHIVE_PROVENANCE")
    return m,targets,previous

def check_state(mode):
    m,targets,previous = checked_manifest()
    head=git("rev-parse","HEAD")
    env_sha=os.environ.get("GITHUB_SHA")
    ref=os.environ.get("GITHUB_REF")
    if (os.environ.get("GITHUB_REPOSITORY") != R
        or os.environ.get("GITHUB_EVENT_NAME") != "push"
        or env_sha != head or not SHA.fullmatch(head)):
        raise RuntimeError("NOT_EXACT_GITHUB_PUSH")
    if ref not in ("refs/heads/development","refs/heads/"+AUX):
        raise RuntimeError("UNTRUSTED_CONTROL_REF")
    if mode == "apply" and ref != "refs/heads/development":
        raise RuntimeError("PR_TAG_APPLY_NOT_FROM_DEVELOPMENT")
    refs=remote_refs("--heads")
    if refs.get("main") != MAIN:
        raise RuntimeError("MAIN_AUTHORITY_DRIFT")
    inventory=json.loads(INVENTORY.read_text(encoding="utf-8"))
    retired=json.loads(RETIRED.read_text(encoding="utf-8"))
    if inventory.get("totals",{}).get("branches") != 60 or len(inventory.get("rows",[])) != 60:
        raise RuntimeError("ORIGINAL_INVENTORY_NOT_60")
    retired_names={r["branch"] for r in retired.get("retired",[])}
    if len(retired_names)!=36:
        raise RuntimeError("HISTORICAL_RETIREMENT_DRIFT")
    original={r["branch"]:r["sha"] for r in inventory["rows"] if r["branch"] not in retired_names}
    if len(original)!=24:
        raise RuntimeError("ORIGINAL_BRANCH_COUNT_DRIFT")
    expected={**original,"main":MAIN,"development":refs.get("development")}
    if AUX in refs:
        expected[AUX]=refs[AUX]
        if (ref=="refs/heads/"+AUX and refs[AUX]!=head
            or ref=="refs/heads/development" and subprocess.run(
                ["git","merge-base","--is-ancestor",refs[AUX],head],
                stdout=subprocess.PIPE,stderr=subprocess.PIPE).returncode):
            raise RuntimeError("AUXILIARY_LINEAGE_DRIFT")
    if refs!=expected or (ref=="refs/heads/development" and refs["development"]!=head):
        raise RuntimeError("FULL_26_OR_27_BRANCH_ROSTER_DRIFT")
    prs=api("pulls?state=open&per_page=100")
    if {p.get("number") for p in prs} != set(PR_HEADS):
        raise RuntimeError("OPEN_12_PR_ROSTER_DRIFT")
    for p in prs:
        n=p["number"]
        if ((p.get("head") or {}).get("ref"),(p.get("head") or {}).get("sha")) != PR_HEADS[n]:
            raise RuntimeError("OPEN_PR_HEAD_DRIFT:"+str(n))
        if p.get("state")!="open" or p.get("merged_at"):
            raise RuntimeError("OPEN_PR_STATE_DRIFT")
    if api("rulesets?per_page=100"):
        raise RuntimeError("RULESETS_PRESENT")
    tags=remote_refs("--tags")
    for n in previous:
        if tags.get(CANDIDATE_TAGS[n])!=PR_HEADS[n][1]:
            raise RuntimeError("PREVIOUS_ARCHIVE_NOT_RECOVERABLE")
    for n in targets:
        branch,sha=PR_HEADS[n]
        if refs.get(branch)!=sha:
            raise RuntimeError("TARGET_BRANCH_PIN_DRIFT:"+str(n))
        status=api("branches/"+quote(branch,safe=""))
        if status.get("protected") is not False or (status.get("commit") or {}).get("sha")!=sha:
            raise RuntimeError("TARGET_BRANCH_PROTECTION_OR_HEAD_DRIFT")
        git("cat-file","-e",sha+"^{commit}")
        if tags.get(CANDIDATE_TAGS[n]) not in (None,sha):
            raise RuntimeError("TARGET_TAG_COLLISION")
    return m,targets,refs,tags

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--mode",choices=["audit","apply"],required=True)
    args=parser.parse_args()
    manifest,targets,refs,tags=check_state(args.mode)
    receipt={
      "schemaVersion":"M2DDevPublicPRArchiveReceipt/0.1",
      "batchId":manifest["batchId"],"mode":args.mode,
      "developmentSha":refs["development"],
      "targets":[{"pr":n,"branch":PR_HEADS[n][0],"sha":PR_HEADS[n][1],"tag":CANDIDATE_TAGS[n]} for n in targets],
      "created":[],"status":"AUDIT_PASS" if args.mode=="audit" else "APPLY_STARTED"
    }
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
    if args.mode=="audit":
        print(json.dumps({"status":"AUDIT_PASS","batch":manifest["batchId"],"count":len(targets)}))
        return
    if os.environ.get("M2D_PR_ARCHIVE_AUTHORIZED")!="1":
        raise RuntimeError("PR_TAG_APPLY_AUTHORIZATION_MISSING")
    for n in targets:
        # Each tag operation is guarded by exact 12-PR and full branch-roster recheck.
        manifest2,targets2,ref2,tags2=check_state("apply")
        if manifest2["batchId"]!=manifest["batchId"] or targets2!=targets or ref2!=refs:
            raise RuntimeError("PR_ARCHIVE_BATCH_OR_REFS_DRIFT")
        tag,sha=CANDIDATE_TAGS[n],PR_HEADS[n][1]
        if tag not in tags2:
            git("push","origin",sha+":refs/tags/"+tag)
            receipt["created"].append({"pr":n,"tag":tag,"sha":sha})
        if remote_refs("--tags").get(tag)!=sha:
            raise RuntimeError("ARCHIVE_PR_TAG_READBACK_FAILED:"+str(n))
        RECEIPT.write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
    receipt.update(status="PASS",readback="PASS")
    RECEIPT.write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":"PASS","batch":manifest["batchId"],"tagged":targets,"newTags":len(receipt["created"])}))

if __name__=="__main__":
    main()
