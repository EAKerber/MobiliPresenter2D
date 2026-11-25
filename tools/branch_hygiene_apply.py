#!/usr/bin/env python3
"""Apply only an explicit exact-SHA batch using existing GitHub branch hygiene evidence.

PR reviews are audit-only. No implicit 'delete all eligible' mode exists.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from pathlib import Path

from branch_hygiene_observe import observe, api_get, paginate
from branch_hygiene_plan import build_plan, load_json, select_bounded_batch

AUTH_ENV = "MOBILIPRESENTER2D_BRANCH_HYGIENE_AUTHORIZED"
DEV_AUTH_ENV = "MOBILIPRESENTER2D_DEVELOPMENT_HYGIENE_AUTHORIZED"


def verify_no_workflow_dependency(branch: str,
                                  workflow_dir: Path = Path(".github/workflows")) -> list[str]:
    """Conservative literal reference check for the candidate checkout."""
    matches = []
    for pattern in ("*.yml", "*.yaml"):
        for item in workflow_dir.glob(pattern):
            if branch in item.read_text(encoding="utf-8"):
                matches.append(str(item))
    if matches:
        raise RuntimeError("ACTIVE_WORKFLOW_REF:" + branch + ":" + ",".join(matches))
    return matches


def verify_control_workflow_dependencies(branch: str, inventory: dict[str, str]) -> None:
    """Inspect immutable live control trees; never rely on checkout alone."""
    for control in ("main", "development"):
        sha = inventory.get(control)
        if not sha:
            raise RuntimeError("CONTROL_REF_MISSING:" + control)
        proc = subprocess.run(
            ["git", "grep", "-F", "-l", "-e", branch, sha, "--",
             ":(glob).github/workflows/*.yml", ":(glob).github/workflows/*.yaml"],
            text=True, capture_output=True, check=False,
        )
        if proc.returncode == 0:
            raise RuntimeError("ACTIVE_CONTROL_WORKFLOW_REF:" + branch + ":" + control)
        if proc.returncode != 1:
            raise RuntimeError("CONTROL_WORKFLOW_SCAN_FAILED:" + control)


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
                        control_sha: str, control_branch: str = "main") -> dict | None:
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
            or pr_base.get("ref") != control_branch
            or (pr_base.get("repo") or {}).get("full_name") != repository):
        raise RuntimeError("SQUASH_PR_IDENTITY_MISMATCH:" + name)

    # A real squash merge has exactly one parent. Its resulting tree must be
    # identical to the PR head; the merge and its base must belong to the control branch.
    merge_parents = subprocess.run(
        ["git", "rev-list", "--parents", "-n", "1", merge_sha],
        text=True, capture_output=True, check=True,
    ).stdout.strip().split()
    if len(merge_parents) != 2 or merge_parents[0] != merge_sha:
        raise RuntimeError("SQUASH_NOT_SINGLE_PARENT:" + name)
    merged_into_control = subprocess.run(
        ["git", "merge-base", "--is-ancestor", merge_sha, control_sha],
        check=False,
    ).returncode == 0
    original_base_present = subprocess.run(
        ["git", "merge-base", "--is-ancestor", merge_parents[1], head_sha],
        check=False,
    ).returncode == 0
    if not merged_into_control or not original_base_present:
        raise RuntimeError("SQUASH_ANCESTRY_MISMATCH:" + name)

    def tree(sha: str) -> str:
        return subprocess.run(["git", "show", "-s", "--format=%T", sha],
                              text=True, capture_output=True, check=True).stdout.strip()

    original_tree, merged_tree = tree(head_sha), tree(merge_sha)
    if (original_tree != merged_tree
            or original_tree != entry.get("treeSha")
            or len(original_tree) != 40):
        raise RuntimeError("SQUASH_TREE_MISMATCH:" + name)

    verify_no_workflow_dependency(name)
    return {
        "branch": name, "sha": head_sha, "pullRequest": pr_number,
        "mergeCommit": merge_sha, "treeSha": original_tree,
        "controlSha": control_sha, "controlBranch": control_branch,
        "proof": "SQUASH_TREE_IDENTICAL",
    }


def verify_no_rulesets(repository: str, token: str) -> None:
    """Preserve the historical fail-closed rule until applicable rules are modeled."""
    if paginate(repository, "rulesets?includes_parents=true", token):
        raise RuntimeError("RULESETS_REQUIRE_REVIEW")


def archive_proof(entry: dict, create: bool = False) -> dict | None:
    """Exact terminal disposition only; never overwrite an existing archive tag."""
    terminal = next((e for e in entry["evidence"]
                     if e["kind"] == "explicit-terminal-disposition"), None)
    ancestry = any(e["kind"] == "ancestor-of-control" for e in entry["evidence"])
    if (ancestry or entry.get("squashMerge")) and not (terminal or {}).get("archiveTransfer"):
        return None
    if not terminal:
        raise RuntimeError("ARCHIVE_DISPOSITION_MISSING:" + entry["branch"])
    tag, sha = terminal.get("archiveTag"), entry["sha"]
    import re
    if (not isinstance(tag, str) or not re.fullmatch(r"archive/m2d/[a-z0-9][a-z0-9._/-]*", tag)
            or subprocess.run(["git", "check-ref-format", "refs/tags/"+tag],
                              capture_output=True, check=False).returncode):
        raise RuntimeError("ARCHIVE_TAG_REQUIRED:" + entry["branch"])
    ref = "refs/tags/" + tag

    def read_tag():
        proc = subprocess.run(["git", "ls-remote", "--tags", "origin", ref, ref+"^{}"],
                              text=True, capture_output=True, check=True)
        refs = dict((name, value) for value, name in
                    (line.split() for line in proc.stdout.splitlines() if line.strip()))
        if ref not in refs:
            if refs:
                raise RuntimeError("ARCHIVE_TAG_READBACK_INVALID:" + tag)
            return None
        return refs.get(ref+"^{}", refs[ref])

    value = read_tag()
    if value is not None and value != sha:
        raise RuntimeError("ARCHIVE_TAG_COLLISION:" + tag)
    if value is None and create:
        subprocess.run(["git", "push", f"--force-with-lease={ref}:", "origin", f"{sha}:{ref}"], check=True)
        value = read_tag()
        if value != sha:
            raise RuntimeError("ARCHIVE_TAG_READBACK_FAILED:" + tag)
    return {"branch": entry["branch"], "sha": sha, "tag": tag,
            "status": "VERIFIED" if value == sha else "WOULD_CREATE"}


def delete_exact_ref(branch: str, sha: str, inventory: dict[str, str]) -> dict[str, str]:
    """Shared mutating primitive. Callers must independently prove eligibility."""
    if branch in {"main", "development"} or inventory.get(branch) != sha or remote_refs() != inventory:
        raise RuntimeError("REF_DRIFT_BEFORE_DELETE:" + branch)
    subprocess.run(["git", "push", f"--force-with-lease=refs/heads/{branch}:{sha}",
                    "origin", f":refs/heads/{branch}"], check=True)
    expected = {name: value for name, value in inventory.items() if name != branch}
    if remote_refs() != expected:
        raise RuntimeError("REF_READBACK_FAILED:" + branch)
    return expected


def retry_selection(observation: dict, dispositions: dict, batch: dict) -> list[dict]:
    """Re-prove absent pins on a retry, never put them in the live inventory.

    The original bounded manifest remains the authority. An absent pin is
    not a deletion receipt. The caller must verify preservation independently
    before applying any remaining live pin.
    """
    refs = batch.get("branches")
    if (batch.get("schemaVersion") != "BranchHygieneBatch 0.1"
            or batch.get("repository") != observation["repository"]
            or not isinstance(refs, list) or not 1 <= len(refs) <= 3):
        raise ValueError("INVALID_RETRY_BATCH")
    known = {item["name"] for item in observation["branches"]}
    absent = []
    for pin in refs:
        if not isinstance(pin, dict):
            raise ValueError("INVALID_RETRY_PIN")
        name, sha = pin.get("branch"), pin.get("sha")
        if (not isinstance(name, str) or not re.fullmatch(r"[a-zA-Z0-9._/-]+", name)
                or ".." in name or "//" in name or name.startswith("-")
                or name in {"main", "development"}
                or not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{40}", sha)):
            raise ValueError("INVALID_RETRY_PIN")
        if name in known:
            continue
        if subprocess.run(["git", "cat-file", "-e", sha+"^{commit}"],
                          capture_output=True, check=False).returncode:
            # A squashed or archived original may not be in a fresh clone.
            subprocess.run(["git", "fetch", "--no-tags", "origin", sha], check=True)
        tree = subprocess.run(["git", "show", "-s", "--format=%T", sha],
                              text=True, capture_output=True, check=True).stdout.strip()
        ancestry = subprocess.run(["git", "merge-base", "--is-ancestor", sha,
                                  observation["controlSha"]], check=False).returncode
        if ancestry not in (0, 1):
            raise RuntimeError("RETRY_ANCESTRY_UNAVAILABLE:" + name)
        absent.append({"name":name, "sha":sha, "treeSha":tree,
                       "protected":False, "ancestorOfControl":ancestry == 0})
    # This proof-only plan is not used for hashes, inventory or deletion.
    proof_plan = build_plan({**observation, "branches":observation["branches"]+absent},
                            dispositions)
    return select_bounded_batch(proof_plan, batch)


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
    control = supplied.get("controlBranch")
    if not audit_only and control not in {"main", "development"}:
        raise RuntimeError("CONTROL_BRANCH_NOT_AUTHORIZED")
    if not audit_only and control == "development":
        if os.environ.get(DEV_AUTH_ENV) != "1":
            raise RuntimeError("DEVELOPMENT_RETIREMENT_AUTHORIZATION_MISSING")
        approved = load_json(batch_path)
        if approved.get("approvedRetirement") is not True or approved.get("auditOnly") is True:
            raise RuntimeError("DEVELOPMENT_RETIREMENT_MANIFEST_NOT_APPROVED")

    dispositions = load_json(dispositions_path)
    fresh = observe(repository, supplied["controlBranch"], token)
    fresh_plan = build_plan(fresh, dispositions)
    if fresh_plan["planHash"] != expected_plan:
        raise RuntimeError("PLAN_DRIFT_REOBSERVATION_REQUIRED")
    batch = load_json(batch_path)
    # Only GitHub's retry of the same authorized main push may reconcile absence.
    # New PR audits and new first-attempt manifests keep their strict live-pin gate.
    retry = (not audit_only and os.environ.get("GITHUB_ACTIONS") == "true"
             and os.environ.get("GITHUB_EVENT_NAME") == "push"
             and os.environ.get("GITHUB_REF") == "refs/heads/main"
             and os.environ.get("GITHUB_RUN_ATTEMPT", "1").isdigit()
             and int(os.environ.get("GITHUB_RUN_ATTEMPT", "1")) > 1
             and bool(os.environ.get("GITHUB_RUN_ID")))
    selected = (retry_selection(fresh, dispositions, batch) if retry
                else select_bounded_batch(fresh_plan, batch))
    if not audit_only and control == "development" and any(
        "squashMerge" not in item for item in selected
    ):
        raise RuntimeError("DEVELOPMENT_REQUIRES_SQUASH_PROOF")
    inventory = {entry["branch"]: entry["sha"] for entry in fresh_plan["entries"]}
    if remote_refs() != inventory:
        raise RuntimeError("REF_INVENTORY_DRIFT_INITIAL")

    verify_no_rulesets(repository, token)
    for item in selected:
        verify_no_workflow_dependency(item["branch"])
        verify_control_workflow_dependencies(item["branch"], inventory)

    squash_proofs = [
        result for item in selected
        if (result := verify_squash_merge(repository, token, item, fresh_plan["controlSha"], fresh_plan["controlBranch"])) is not None
    ]

    archive_proofs = [proof for item in selected if (proof := archive_proof(item)) is not None]
    absent = [item for item in selected if item["branch"] not in inventory]
    for item in absent:
        archived = next((p for p in archive_proofs if p["branch"] == item["branch"]), None)
        if archived is not None and archived["status"] != "VERIFIED":
            raise RuntimeError("RETRY_ARCHIVE_NOT_VERIFIED:" + item["branch"])
    # Missing pins must have passed the same ancestry/squash/archive checks,
    # but must never be counted as a deletion performed by this attempt.
    live_selected = [item for item in selected if item["branch"] in inventory]

    if not audit_only:
        if (os.environ.get("GITHUB_EVENT_NAME") != "push"
                or os.environ.get("GITHUB_REF") != "refs/heads/main"):
            raise RuntimeError("APPLY_REQUIRES_MAIN_PUSH")
        head = subprocess.run(["git", "rev-parse", "HEAD"], text=True,
                              capture_output=True, check=True).stdout.strip()
        if head != os.environ.get("GITHUB_SHA"):
            raise RuntimeError("WORKFLOW_HEAD_DRIFT")
        if control == "main":
            if head != fresh_plan["controlSha"]:
                raise RuntimeError("MAIN_HEAD_DRIFT")
        elif remote_refs().get("main") != head:
            raise RuntimeError("MAIN_HEAD_DRIFT")

    receipt = {
        "schemaVersion": "BranchHygieneBatchReceipt 0.1",
        "repository": repository,
        "planHash": expected_plan,
        "controlSha": fresh_plan["controlSha"],
        "batch": batch_path.name,
        "approvedPins": [{"branch": x["branch"], "sha": x["sha"]} for x in selected],
        "squashProofs": squash_proofs,
        "archiveProofs": archive_proofs,
        "mode": "audit" if audit_only else "apply",
        "deleted": [],
        "alreadyAbsent": [{"branch": x["branch"], "sha": x["sha"]} for x in absent],
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
    for entry in live_selected:
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
        verify_no_rulesets(repository, token)
        verify_no_workflow_dependency(branch)
        verify_control_workflow_dependencies(branch, live_inventory)
        # Recheck PR identity and exact tree *immediately* before mutation.
        verify_squash_merge(repository, token, entry, fresh_plan["controlSha"], fresh_plan["controlBranch"])

        archived = archive_proof(entry, create=True)
        if archived is not None:
            if archived["status"] != "VERIFIED":
                raise RuntimeError("ARCHIVE_NOT_VERIFIED:" + branch)
            receipt["archiveProofs"] = [p for p in receipt["archiveProofs"] if p["branch"] != branch] + [archived]
            save()
        expected_inventory = delete_exact_ref(branch, sha, expected_inventory)
        if archived is not None and archive_proof(entry)["status"] != "VERIFIED":
            raise RuntimeError("ARCHIVE_TAG_LOST:" + branch)
        receipt["deleted"].append({"branch": branch, "sha": sha})
        save()

    if remote_refs() != expected_inventory:
        raise RuntimeError("FINAL_INVENTORY_DRIFT")
    for item in absent:
        archived = archive_proof(item)
        if archived is not None and archived["status"] != "VERIFIED":
            raise RuntimeError("RETRY_ARCHIVE_LOST:" + item["branch"])
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
        "alreadyAbsent": len(receipt["alreadyAbsent"]),
        "batch": receipt["batch"],
        "readback": receipt["readback"],
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
