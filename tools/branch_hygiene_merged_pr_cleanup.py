#!/usr/bin/env python3
"""Retire only the exact source branch of a merged PR that changed this workflow.

The GitHub closed/merged event supplies the PR identity. The script rechecks that
identity through the API, observes the complete live inventory and protections,
then deletes only the exact event head with a force-with-lease and full readback.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any

try:
    from .branch_hygiene_observe import api_get, observe
except ImportError:
    from branch_hygiene_observe import api_get, observe


def merged_head_identity(event: dict[str, Any], repository: str) -> dict[str, Any]:
    if event.get("action") != "closed":
        raise RuntimeError("PR_EVENT_NOT_CLOSED")
    pr = event.get("pull_request")
    if not isinstance(pr, dict) or pr.get("merged") is not True or pr.get("state") != "closed":
        raise RuntimeError("PR_EVENT_NOT_MERGED")
    number = pr.get("number")
    head, base = pr.get("head") or {}, pr.get("base") or {}
    head_repo = (head.get("repo") or {}).get("full_name")
    base_repo = (base.get("repo") or {}).get("full_name")
    branch, sha = head.get("ref"), head.get("sha")
    merge_sha = pr.get("merge_commit_sha")
    if (type(number) is not int or number <= 0
            or base_repo != repository or base.get("ref") != "main"
            or head_repo != repository
            or not isinstance(branch, str) or not branch or branch == "main"
            or not isinstance(sha, str) or re.fullmatch(r"[0-9a-f]{40}", sha) is None
            or not isinstance(merge_sha, str) or re.fullmatch(r"[0-9a-f]{40}", merge_sha) is None):
        raise RuntimeError("PR_EVENT_IDENTITY_INVALID")
    return {"number": number, "branch": branch, "sha": sha, "mergeSha": merge_sha}


def remote_refs() -> dict[str, str]:
    proc = subprocess.run(
        ["git", "ls-remote", "--heads", "origin"],
        text=True, capture_output=True, check=True,
    )
    result = {}
    for line in proc.stdout.splitlines():
        sha, ref = line.split("\t", 1)
        result[ref.removeprefix("refs/heads/")] = sha
    return result


def cleanup(event_path: Path, receipt_path: Path) -> dict[str, Any]:
    token = os.environ.get("GITHUB_TOKEN")
    repository = os.environ.get("GITHUB_REPOSITORY")
    if not token or not repository:
        raise RuntimeError("GITHUB_CONTEXT_MISSING")
    event = json.loads(event_path.read_text(encoding="utf-8"))
    identity = merged_head_identity(event, repository)

    pr = api_get(repository, f"pulls/{identity['number']}", token)
    head, base = pr.get("head") or {}, pr.get("base") or {}
    if (pr.get("state") != "closed" or not pr.get("merged_at")
            or pr.get("merge_commit_sha") != identity["mergeSha"]
            or head.get("ref") != identity["branch"]
            or head.get("sha") != identity["sha"]
            or (head.get("repo") or {}).get("full_name") != repository
            or base.get("ref") != "main"
            or (base.get("repo") or {}).get("full_name") != repository):
        raise RuntimeError("MERGED_PR_API_IDENTITY_MISMATCH")

    observed = observe(repository, "main", token)
    if subprocess.run(
        ["git", "merge-base", "--is-ancestor", identity["mergeSha"], observed["controlSha"]],
        check=False,
    ).returncode != 0:
        raise RuntimeError("MERGE_COMMIT_NOT_ON_MAIN")

    inventory = {item["name"]: item["sha"] for item in observed["branches"]}
    if remote_refs() != inventory:
        raise RuntimeError("REF_INVENTORY_DRIFT_INITIAL")
    receipt: dict[str, Any] = {
        "schemaVersion": "MergedPrHeadCleanupReceipt 0.1",
        "repository": repository,
        "pullRequest": identity["number"],
        "mergeSha": identity["mergeSha"],
        "branch": identity["branch"],
        "sha": identity["sha"],
        "deleted": False,
        "readback": "NOT_APPLIED",
    }

    current_sha = inventory.get(identity["branch"])
    if current_sha is None:
        receipt["status"] = "PASS"
        receipt["result"] = "ALREADY_ABSENT"
        receipt["readback"] = "PASS"
        receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        return receipt
    if current_sha != identity["sha"]:
        raise RuntimeError("SOURCE_BRANCH_HEAD_MOVED")
    live = next(item for item in observed["branches"] if item["name"] == identity["branch"])
    if live.get("protected"):
        raise RuntimeError("SOURCE_BRANCH_PROTECTED")
    if identity["branch"] in observed["openPrHeads"] or identity["branch"] in observed["openPrBases"]:
        raise RuntimeError("SOURCE_BRANCH_HAS_OPEN_PR")
    if remote_refs() != inventory:
        raise RuntimeError("REF_DRIFT_BEFORE_DELETE")

    subprocess.run([
        "git", "push",
        f"--force-with-lease=refs/heads/{identity['branch']}:{identity['sha']}",
        "origin", f":refs/heads/{identity['branch']}",
    ], check=True)
    inventory.pop(identity["branch"])
    if remote_refs() != inventory:
        raise RuntimeError("REF_READBACK_FAILED")
    receipt["deleted"] = True
    receipt["readback"] = "PASS"
    receipt["status"] = "PASS"
    receipt["remainingBranchCount"] = len(inventory)
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--event", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    args = parser.parse_args()
    receipt = cleanup(args.event, args.receipt)
    print(json.dumps({
        "status": receipt["status"],
        "result": receipt.get("result", "DELETED" if receipt["deleted"] else "NOOP"),
        "branch": receipt["branch"],
        "sha": receipt["sha"],
        "readback": receipt["readback"],
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
