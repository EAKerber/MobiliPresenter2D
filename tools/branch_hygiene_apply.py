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

from branch_hygiene_observe import observe, api_get
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



def verify_squash_merge(repository: str, token: str, entry: dict,
                        control_sha: str) -> dict | None:
    """Verify an opt-in squash proof against real PR metadata and Git objects.

    Both the original head and the already-merged commit must resolve to the
    *identical full tree*. A stale PR, missing ref or live workflow dependency
    aborts. The planner never promotes this to general auto-delete eligibility.
    """
    proof = entry.get("squashMerge")
    if proof is None:
        return None
    name, head_sha = entry["branch"], entry["sha"]
    pr_number, merge_sha = proof["pullRequest"], proof["mergeCommit"]
    pr = api_get(repository, f"pulls/{pr_number}", token)
    pr_head, pr_base = pr.get("head") or {}, pr.get("base") or {}
    if (pr.get("state") != "closed" or not pr.get("merged_at")
            or pr.get("merge_commit_sha") != merge_sha
            or pr_head.get("ref") != name or pr_head.get("sha") != head_sha
            or (pr_head.get("repo") or {}).get("full_name") != repository
            or pr_base.get("ref") != "main"
            or (pr_base.get("repo") or {}).get("full_name") != repository):
        raise RuntimeError("SQUASH_PR_IDENTITY_MISMATCH:" + name)

    # A real squash merge has exactly one parent. Its resulting tree must be
    # identical to the PR head; the merge and its base must belong to main.
    merge_parents = subprocess.run(
        ["git", "rev-list", "--parents", "-n", "1", merge_sha],
        text=True, capture_output=True, check=True,
    ).stdout.strip().split()
    if len(merge_parents) != 2 or merge_parents[0] != merge_sha:
        raise RuntimeError("SQUASH_NOT_SINGLE_PARENT:" + name)
    merged_into_main = subprocess.run(
        ["git", "merge-base", "--is-ancestor", merge_sha, control_sha],
        check=False,
    ).returncode == 0
    original_base_present = subprocess.run(
        ["git", "merge-base", "--is-ancestor", merge_parents[1], head_sha],
        check=False,
    ).returncode == 0
    if not merged_into_main or not original_base_present:
        raise RuntimeError("SQUASH_ANCESTRY_MISMATCH:" + name)

    def tree(sha: str) -> str:
        return subprocess.run(["git", "show", "-s", "--format=%T", sha],
                              text=True, capture_output=True, check=True).stdout.strip()

    original_tree, merged_tree = tree(head_sha), tree(merge_sha)
    if (original_tree != merged_tree
            or original_tree != entry.get("treeSha")
            or len(original_tree) != 40):
        raise RuntimeError("SQUASH_TREE_MISMATCH:" + name)

    # Do not retire an old branch while a live workflow still names it.
    workflow_dir = Path(".github/workflows")
    if workflow_dir.exists() and any(
        name in item.read_text(encoding="utf-8")
        for item in workflow_dir.glob("*.yml")
    ):
        raise RuntimeError("SQUASH_ACTIVE_WORKFLOW_REF:" + name)
    return {
        "branch": name, "sha": head_sha, "pullRequest": pr_number,
        "mergeCommit": merge_sha, "treeSha": original_tree,
        "controlSha": control_sha, "proof": "SQUASH_TREE_IDENTICAL",
    }


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

    squash_proofs = [
        result for item in selected
        if (result := verify_squash_merge(repository, token, item, fresh_plan["controlSha"])) is not None
    ]

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
        "squashProofs": squash_proofs,
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
        # GitHub REST can briefly lag Git refs after the previous deletion.
        # Retry only cross-provider synchronization, never a changed inventory.
        import time
        for attempt in range(5):
            try:
                observed = observe(repository, fresh_plan["controlBranch"], token)
                break
            except RuntimeError as error:
                transient = str(error).lower().startswith((
                    "branch inventory mismatch", "branch sha mismatch"
                ))
                if not transient or attempt == 4:
                    raise
                time.sleep(2)
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
        # Recheck PR identity and exact tree *immediately* before mutation.
        verify_squash_merge(repository, token, entry, fresh_plan["controlSha"])

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
