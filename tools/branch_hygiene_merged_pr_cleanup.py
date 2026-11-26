#!/usr/bin/env python3
"""Exact same-repository merged PR cleanup under a trusted, pre-approved policy.

No semantic or terminal dispositions are inferred. Reuse the bounded executor's
proofs, dependency gates, ruleset guard and lease/readback primitive.
"""
from __future__ import annotations
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from branch_hygiene_observe import api_get, observe
from branch_hygiene_plan import build_plan, load_json
from branch_hygiene_apply import (AUTH_ENV, remote_refs, verify_squash_merge,
    verify_no_workflow_dependency, verify_control_workflow_dependencies,
    verify_no_rulesets, delete_exact_ref)
from branch_hygiene_consumption import (
    reserve_operation, pin_marker, write_pin_marker, mark_applied,
)


def merged_head_identity(event: dict[str, Any], repository: str) -> dict[str, Any]:
    if event.get("action") != "closed":
        raise RuntimeError("PR_EVENT_NOT_CLOSED")
    pr = event.get("pull_request")
    if not isinstance(pr, dict) or pr.get("merged") is not True or pr.get("state") != "closed":
        raise RuntimeError("PR_EVENT_NOT_MERGED")
    number = pr.get("number")
    head, base = pr.get("head") or {}, pr.get("base") or {}
    branch, sha, control = head.get("ref"), head.get("sha"), base.get("ref")
    merge = pr.get("merge_commit_sha")
    if (type(number) is not int or number <= 0
            or (base.get("repo") or {}).get("full_name") != repository
            or (head.get("repo") or {}).get("full_name") != repository
            or control not in {"main", "development"}
            or not isinstance(branch, str) or not branch
            or branch in {"main", "development"} or branch.startswith("archive/")
            or not re.fullmatch(r"[a-zA-Z0-9._/-]+", branch)
            or ".." in branch or "//" in branch or branch.startswith("-")
            or not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{40}", sha)
            or not isinstance(merge, str) or not re.fullmatch(r"[0-9a-f]{40}", merge)):
        raise RuntimeError("PR_EVENT_IDENTITY_INVALID")
    return {"number": number, "branch": branch, "sha": sha,
            "mergeSha": merge, "controlBranch": control}


def cleanup(event_path: Path, receipt_path: Path) -> dict[str, Any]:
    if (os.environ.get(AUTH_ENV) != "1" or
            os.environ.get("GITHUB_EVENT_NAME") != "pull_request_target"):
        raise RuntimeError("MERGED_CLEANUP_AUTHORIZATION_MISSING")
    token, repository = os.environ.get("GITHUB_TOKEN"), os.environ.get("GITHUB_REPOSITORY")
    if not token or not repository:
        raise RuntimeError("GITHUB_CONTEXT_MISSING")
    identity = merged_head_identity(json.loads(event_path.read_text()), repository)
    branch, sha, control = identity["branch"], identity["sha"], identity["controlBranch"]
    pr = api_get(repository, f"pulls/{identity['number']}", token)
    head, base = pr.get("head") or {}, pr.get("base") or {}
    if (pr.get("state") != "closed" or not pr.get("merged_at")
            or pr.get("merge_commit_sha") != identity["mergeSha"]
            or head.get("ref") != branch or head.get("sha") != sha
            or (head.get("repo") or {}).get("full_name") != repository
            or base.get("ref") != control
            or (base.get("repo") or {}).get("full_name") != repository):
        raise RuntimeError("MERGED_PR_API_IDENTITY_MISMATCH")
    receipt = {"schemaVersion":"MergedPrHeadCleanupReceipt 0.1",
               "repository":repository, "pullRequest":identity["number"],
               **identity, "deleted":False, "readback":"NOT_APPLIED"}
    def finish(result, reason=None, remaining=None):
        receipt.update(status="PASS", result=result)
        if reason:
            receipt["reason"] = reason
        if remaining is not None:
            receipt["remainingBranchCount"] = remaining
        receipt_path.write_text(json.dumps(receipt, indent=2)+"\n", encoding="utf-8")
        return receipt
    observed = observe(repository, control, token)
    inventory = {item["name"]:item["sha"] for item in observed["branches"]}
    trusted = subprocess.run(["git", "rev-parse", "HEAD"], text=True,
                             capture_output=True, check=True).stdout.strip()
    if inventory.get("main") != trusted or remote_refs() != inventory:
        raise RuntimeError("TRUSTED_MAIN_OR_INVENTORY_DRIFT")
    if subprocess.run(["git","merge-base","--is-ancestor",identity["mergeSha"],
                       observed["controlSha"]], check=False).returncode != 0:
        raise RuntimeError("MERGE_COMMIT_NOT_ON_CONTROL")
    operation_identity = {
        "pullRequest": identity["number"], "mergeSha": identity["mergeSha"],
        "controlBranch": control, "branch": branch, "headSha": sha,
    }
    run_id = os.environ.get("GITHUB_RUN_ID")
    pin = {"branch": branch, "sha": sha}
    if branch not in inventory:
        key, applied_marker = reserve_operation(
            repository, "merged-pr-cleanup", operation_identity, run_id or "", trusted
        )
        if applied_marker is not None:
            receipt["readback"] = "PASS"
            return finish("ALREADY_ABSENT", remaining=len(inventory))
        intent = pin_marker(key, "intent", pin)
        done = pin_marker(key, "done", pin)
        if intent is not None and done is None:
            write_pin_marker(
                key, "done", repository, "merged-pr-cleanup", operation_identity,
                run_id or "", trusted, pin,
            )
        if remote_refs() != inventory:
            raise RuntimeError("CONCURRENT_INVENTORY_DRIFT")
        mark_applied(
            key, repository, "merged-pr-cleanup", operation_identity, run_id or "", trusted
        )
        receipt["readback"] = "PASS"
        return finish("ALREADY_ABSENT", remaining=len(inventory))
    if inventory[branch] != sha:
        return finish("PRESERVED", "SOURCE_BRANCH_HEAD_MOVED", len(inventory))
    disposition_path = Path("ops/branch-dispositions-development.json" if control == "development"
                            else "ops/branch-dispositions.json")
    plan = build_plan(observed, load_json(disposition_path))
    entry = next(x for x in plan["entries"] if x["branch"] == branch)
    if entry["protections"]:
        return finish("PRESERVED", ",".join(entry["protections"]), len(inventory))
    # Both an exact PR identity and preservation proof are mandatory.
    if not any(e["kind"] == "ancestor-of-control" for e in entry["evidence"]):
        entry["squashMerge"] = {"pullRequest":identity["number"],"mergeCommit":identity["mergeSha"]}
    try:
        verify_no_rulesets(repository, token)
        verify_no_workflow_dependency(branch)
        verify_control_workflow_dependencies(branch, inventory)
        proof = verify_squash_merge(repository,token,entry,observed["controlSha"],control)
    except RuntimeError as error:
        if str(error).startswith(("RULESETS_REQUIRE_REVIEW","ACTIVE_WORKFLOW_REF:",
                                    "ACTIVE_CONTROL_WORKFLOW_REF:","SQUASH_TREE_MISMATCH:",
                                    "SQUASH_ANCESTRY_MISMATCH:","SQUASH_NOT_SINGLE_PARENT:")):
            return finish("PRESERVED", str(error), len(inventory))
        raise
    receipt["proof"] = proof or {"proof":"ANCESTOR_OF_CONTROL","controlSha":observed["controlSha"]}
    fresh = observe(repository,control,token)
    fresh_inventory = {x["name"]:x["sha"] for x in fresh["branches"]}
    if fresh_inventory != inventory or fresh["controlSha"] != observed["controlSha"]:
        raise RuntimeError("CONCURRENT_INVENTORY_DRIFT")
    live = next(x for x in fresh["branches"] if x["name"] == branch)
    if live["protected"] or branch in fresh["openPrHeads"] or branch in fresh["openPrBases"]:
        return finish("PRESERVED","NEW_PROTECTION_OR_OPEN_PR",len(inventory))
    verify_no_rulesets(repository,token)
    verify_no_workflow_dependency(branch)
    verify_control_workflow_dependencies(branch,fresh_inventory)
    verify_squash_merge(repository,token,entry,fresh["controlSha"],control)
    key, applied_marker = reserve_operation(
        repository, "merged-pr-cleanup", operation_identity, run_id or "", trusted
    )
    if applied_marker is not None:
        return finish("PRESERVED", "CONSUMED_HEAD_RECREATED", len(fresh_inventory))
    if pin_marker(key, "done", pin) is not None:
        return finish("PRESERVED", "CONSUMED_HEAD_RECREATED", len(fresh_inventory))
    if pin_marker(key, "intent", pin) is not None:
        return finish("PRESERVED", "INTENT_HEAD_PRESENT_AMBIGUOUS", len(fresh_inventory))
    write_pin_marker(
        key, "intent", repository, "merged-pr-cleanup", operation_identity,
        run_id or "", trusted, pin,
    )
    expected = delete_exact_ref(branch,sha,fresh_inventory)
    write_pin_marker(
        key, "done", repository, "merged-pr-cleanup", operation_identity,
        run_id or "", trusted, pin,
    )
    if remote_refs() != expected:
        raise RuntimeError("FINAL_INVENTORY_DRIFT")
    mark_applied(
        key, repository, "merged-pr-cleanup", operation_identity, run_id or "", trusted
    )
    receipt.update(deleted=True,readback="PASS")
    return finish("DELETED",remaining=len(expected))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--event",type=Path,required=True)
    parser.add_argument("--receipt",type=Path,required=True)
    args = parser.parse_args()
    print(json.dumps(cleanup(args.event,args.receipt),sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
