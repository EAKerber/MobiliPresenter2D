#!/usr/bin/env python3
"""Apply one exact branch-hygiene plan with CAS-style reobservation/readback."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
from pathlib import Path

from branch_hygiene_observe import observe
from branch_hygiene_plan import build_plan, load_json

AUTH_ENV = "MOBILIPRESENTER2D_BRANCH_HYGIENE_AUTHORIZED"


def remote_refs() -> dict[str, str]:
    proc = subprocess.run(
        ["git", "ls-remote", "--heads", "origin"],
        text=True,
        capture_output=True,
        check=True,
    )
    result: dict[str, str] = {}
    for line in proc.stdout.splitlines():
        sha, ref = line.split("\t", 1)
        result[ref.removeprefix("refs/heads/")] = sha
    return result


def apply(plan_path: Path, dispositions_path: Path, expected_plan: str) -> dict:
    if os.environ.get(AUTH_ENV) != "1":
        raise RuntimeError("DESTRUCTIVE_AUTHORIZATION_MISSING")
    token = os.environ.get("GITHUB_TOKEN")
    repository = os.environ.get("GITHUB_REPOSITORY")
    if not token or not repository:
        raise RuntimeError("GITHUB_CONTEXT_MISSING")

    supplied = load_json(plan_path)
    if supplied.get("planHash") != expected_plan:
        raise RuntimeError("EXPECTED_PLAN_MISMATCH")

    dispositions = load_json(dispositions_path)
    fresh_observation = observe(repository, supplied["controlBranch"], token)
    fresh_plan = build_plan(fresh_observation, dispositions)
    if fresh_plan.get("planHash") != expected_plan:
        raise RuntimeError("PLAN_DRIFT_REOBSERVATION_REQUIRED")

    expected_inventory = {item["branch"]: item["sha"] for item in fresh_plan["entries"]}
    if remote_refs() != expected_inventory:
        raise RuntimeError("REF_INVENTORY_DRIFT_INITIAL")

    deleted: list[dict[str, str]] = []
    for entry in fresh_plan["entries"]:
        if entry["action"] != "delete-candidate" or entry["autoDeleteEligible"] is not True:
            continue
        branch = entry["branch"]
        sha = entry["sha"]

        current = remote_refs()
        if current != expected_inventory:
            raise RuntimeError(f"REF_INVENTORY_DRIFT_BEFORE:{branch}")
        if current.get(branch) != sha:
            raise RuntimeError(f"BRANCH_HEAD_DRIFT:{branch}")
        if current.get(fresh_plan["controlBranch"]) != fresh_plan["controlSha"]:
            raise RuntimeError(f"CONTROL_HEAD_DRIFT:{branch}")

        subprocess.run(["git", "push", "origin", "--delete", branch], check=True)
        expected_inventory.pop(branch)
        if remote_refs() != expected_inventory:
            raise RuntimeError(f"REF_READBACK_FAILED:{branch}")
        deleted.append({"branch": branch, "sha": sha})

    return {
        "schemaVersion": "BranchHygieneApplyReceipt 0.1",
        "repository": repository,
        "planHash": expected_plan,
        "controlSha": fresh_plan["controlSha"],
        "deleted": deleted,
        "deletedCount": len(deleted),
        "remainingBranchCount": len(expected_inventory),
        "readback": "PASS",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--dispositions", type=Path, required=True)
    parser.add_argument("--expected-plan", required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    args = parser.parse_args()
    receipt = apply(args.plan, args.dispositions, args.expected_plan)
    args.receipt.write_text(json.dumps(receipt, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(receipt, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
