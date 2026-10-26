#!/usr/bin/env python3
"""Apply only an explicit exact-SHA batch using existing GitHub branch hygiene evidence.

PR reviews are audit-only. No implicit 'delete all eligible' mode exists.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
from pathlib import Path

from branch_hygiene_observe import observe
from branch_hygiene_plan import build_plan, load_json, select_bounded_batch

AUTH_ENV = "MOBILIPRESENTER2D_BRANCH_HYGIENE_AUTHORIZED"


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


def apply(plan_path: Path, dispositions_path: Path, expected_plan: str,
          batch_path: Path, receipt_path: Path, audit_only: bool) -> dict:
    if not audit_only and os.environ.get(AUTH_ENV) != "1":
        raise RuntimeError("DESTRUCTIVE_AUTHORIZATION_MISSING")
    token = os.environ.get("GITHUB_TOKEN")
    repository = os.environ.get("GITHUB_REPOSITORY")
    if not token or not repository:
        raise RuntimeError("GITHUB_CONTEXT_MISSING")
    supplied = load_json(plan_path)
    if supplied.get("planHash") != expected_plan:
        raise RuntimeError("EXPECTED_PLAN_MISMATCH")

    dispositions = load_json(dispositions_path)
    fresh = observe(repository, supplied["controlBranch"], token)
    fresh_plan = build_plan(fresh, dispositions)
    if fresh_plan["planHash"] != expected_plan:
        raise RuntimeError("PLAN_DRIFT_REOBSERVATION_REQUIRED")
    selected = select_bounded_batch(fresh_plan, load_json(batch_path))
    inventory = {entry["branch"]: entry["sha"] for entry in fresh_plan["entries"]}
    if remote_refs() != inventory:
        raise RuntimeError("REF_INVENTORY_DRIFT_INITIAL")

    if not audit_only:
        if (os.environ.get("GITHUB_EVENT_NAME") != "push"
                or os.environ.get("GITHUB_REF") != "refs/heads/main"):
            raise RuntimeError("APPLY_REQUIRES_MAIN_PUSH")
        head = subprocess.run(["git", "rev-parse", "HEAD"], text=True,
                              capture_output=True, check=True).stdout.strip()
        if head != os.environ.get("GITHUB_SHA") or head != fresh_plan["controlSha"]:
            raise RuntimeError("MAIN_HEAD_DRIFT")

    receipt = {
        "schemaVersion": "BranchHygieneBatchReceipt 0.1",
        "repository": repository,
        "planHash": expected_plan,
        "controlSha": fresh_plan["controlSha"],
        "batch": batch_path.name,
        "approvedPins": [{"branch": x["branch"], "sha": x["sha"]} for x in selected],
        "mode": "audit" if audit_only else "apply",
        "deleted": [],
        "readback": "NOT_APPLIED" if audit_only else "PENDING",
    }

    def save() -> None:
        receipt_path.write_text(
            json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )

    save()
    if audit_only:
        receipt["status"] = "PASS"
        save()
        return receipt

    expected_inventory = inventory.copy()
    for entry in selected:
        branch, sha = entry["branch"], entry["sha"]
        # Re-observe the full inventory, PRs and protection for every candidate.
        observed = observe(repository, fresh_plan["controlBranch"], token)
        live_inventory = {x["name"]: x["sha"] for x in observed["branches"]}
        if live_inventory != expected_inventory:
            raise RuntimeError("CONCURRENT_INVENTORY_DRIFT:" + branch)
        if observed["controlSha"] != fresh_plan["controlSha"]:
            raise RuntimeError("CONTROL_HEAD_DRIFT:" + branch)
        if branch in observed["openPrHeads"] or branch in observed["openPrBases"]:
            raise RuntimeError("NEW_OPEN_PR:" + branch)
        live = next((x for x in observed["branches"] if x["name"] == branch), None)
        if live is None or live.get("protected"):
            raise RuntimeError("NEW_PROTECTION_OR_MISSING_REF:" + branch)
        if remote_refs() != expected_inventory or expected_inventory.get(branch) != sha:
            raise RuntimeError("REF_DRIFT_BEFORE_DELETE:" + branch)

        subprocess.run([
            "git", "push", f"--force-with-lease=refs/heads/{branch}:{sha}",
            "origin", f":refs/heads/{branch}"
        ], check=True)
        expected_inventory.pop(branch)
        if remote_refs() != expected_inventory:
            raise RuntimeError("REF_READBACK_FAILED:" + branch)
        receipt["deleted"].append({"branch": branch, "sha": sha})
        save()

    receipt["readback"] = "PASS"
    receipt["status"] = "PASS"
    receipt["remainingBranchCount"] = len(expected_inventory)
    save()
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--dispositions", type=Path, required=True)
    parser.add_argument("--expected-plan", required=True)
    parser.add_argument("--batch", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    parser.add_argument("--audit-only", action="store_true")
    args = parser.parse_args()
    receipt = apply(args.plan, args.dispositions, args.expected_plan,
                    args.batch, args.receipt, args.audit_only)
    print(json.dumps({
        "status": receipt["status"],
        "mode": receipt["mode"],
        "count": len(receipt["deleted"]),
        "batch": receipt["batch"],
        "readback": receipt["readback"],
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
