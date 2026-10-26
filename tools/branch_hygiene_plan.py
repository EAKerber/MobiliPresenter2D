#!/usr/bin/env python3
"""Pure planner for evidence-based branch hygiene.

The planner performs no network access and no mutation. It consumes one
materialized observation plus explicit terminal dispositions and emits a
canonical, hashed plan. Branch names/prefixes are never deletion evidence.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

SCHEMA = "BranchHygienePlan 0.1"


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"expected object: {path}")
    return value


def dispositions_by_branch(dispositions: dict[str, Any]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for item in dispositions.get("terminalBranches", []):
        if not isinstance(item, dict):
            continue
        branch = item.get("branch")
        if isinstance(branch, str) and branch:
            result[branch] = item
    return result


def build_plan(observation: dict[str, Any], dispositions: dict[str, Any]) -> dict[str, Any]:
    if observation.get("schemaVersion") != "BranchObservation 0.1":
        raise ValueError("unsupported observation schema")
    if dispositions.get("schemaVersion") != "BranchDispositionSet 0.1":
        raise ValueError("unsupported disposition schema")

    control_branch = observation.get("controlBranch")
    control_sha = observation.get("controlSha")
    if control_branch != dispositions.get("controlBranch"):
        raise ValueError("control branch mismatch")
    if not isinstance(control_branch, str) or not isinstance(control_sha, str):
        raise ValueError("invalid control identity")
    if observation.get("complete") is not True:
        raise ValueError("observation incomplete")

    preserve = set(dispositions.get("preserveBranches", []))
    terminal = dispositions_by_branch(dispositions)
    open_heads = set(observation.get("openPrHeads", []))
    open_bases = set(observation.get("openPrBases", []))

    entries: list[dict[str, Any]] = []
    refs = observation.get("branches")
    if not isinstance(refs, list):
        raise ValueError("branches missing")

    for branch in sorted(refs, key=lambda item: str(item.get("name"))):
        name = branch.get("name")
        sha = branch.get("sha")
        if not isinstance(name, str) or not isinstance(sha, str):
            raise ValueError("invalid branch record")

        protections: list[str] = []
        if name == control_branch:
            protections.append("control-branch")
        if branch.get("protected") is True:
            protections.append("github-protected")
        if name in preserve:
            protections.append("explicit-preserve")
        if name in open_heads:
            protections.append("open-pr-head")
        if name in open_bases:
            protections.append("open-pr-base")

        evidence: list[dict[str, Any]] = []
        if branch.get("ancestorOfControl") is True and name != control_branch:
            evidence.append({"kind": "ancestor-of-control", "controlSha": control_sha})

        terminal_record = terminal.get(name)
        if terminal_record:
            expected_sha = terminal_record.get("sha")
            if expected_sha == sha and terminal_record.get("allowDelete") is True:
                evidence.append({
                    "kind": "explicit-terminal-disposition",
                    "reason": terminal_record.get("reason"),
                    "recordedSha": expected_sha,
                })

        delete_candidate = bool(evidence) and not protections
        entries.append({
            "branch": name,
            "sha": sha,
            "treeSha": branch.get("treeSha"),
            "action": "delete-candidate" if delete_candidate else "keep",
            "autoDeleteEligible": delete_candidate,
            "protections": protections,
            "evidence": evidence,
        })

    payload = {
        "schemaVersion": SCHEMA,
        "repository": observation.get("repository"),
        "controlBranch": control_branch,
        "controlSha": control_sha,
        "observedAt": observation.get("observedAt"),
        "observationHash": observation.get("observationHash"),
        "entries": entries,
    }
    hash_payload = {key: value for key, value in payload.items() if key != "observedAt"}
    payload["planHash"] = hashlib.sha256(canonical_json(hash_payload).encode("utf-8")).hexdigest()
    return payload


def select_bounded_batch(plan: dict[str, Any], batch: dict[str, Any]) -> list[dict[str, Any]]:
    """Fail-closed selection; the broader planner never authorizes an entire batch."""
    import re

    if batch.get("schemaVersion") != "BranchHygieneBatch 0.1":
        raise ValueError("BATCH_SCHEMA_MISMATCH")
    if batch.get("repository") != plan.get("repository") or plan.get("controlBranch") != "main":
        raise ValueError("BATCH_REPOSITORY_MISMATCH")
    entries = batch.get("branches")
    if not isinstance(entries, list) or not 1 <= len(entries) <= 3:
        raise ValueError("BATCH_SIZE_NOT_1_TO_3")

    by_name = {item["branch"]: item for item in plan["entries"]}
    if len(by_name) != len(plan["entries"]):
        raise ValueError("PLAN_DUPLICATE_BRANCH")
    result = []
    seen = set()
    for ref in entries:
        if not isinstance(ref, dict):
            raise ValueError("BATCH_ENTRY_NOT_OBJECT")
        name, sha = ref.get("branch"), ref.get("sha")
        if (not isinstance(name, str) or name in seen or name == "main"
                or not re.fullmatch(r"[a-zA-Z0-9._/-]+", name)
                or ".." in name or "//" in name or name.startswith("-")
                or not isinstance(sha, str) or not re.fullmatch("[0-9a-f]{40}", sha)):
            raise ValueError("INVALID_OR_DUPLICATE_PINNED_REF")
        seen.add(name)
        entry = by_name.get(name)
        # A squash head may diverge in commit history while having the *same
        # entire Git tree* as the integrated merge commit. This is only a
        # request for a second, runtime-verified proof; never auto-classify it
        # as generally deletable in the plan.
        proof = ref.get("squashMerge")
        valid_proof_shape = (
            isinstance(proof, dict)
            and set(proof) == {"pullRequest", "mergeCommit"}
            and type(proof["pullRequest"]) is int
            and proof["pullRequest"] > 0
            and isinstance(proof["mergeCommit"], str)
            and re.fullmatch(r"[0-9a-f]{40}", proof["mergeCommit"]) is not None
        )
        ancestor_proven = (
            entry is not None
            and entry.get("action") == "delete-candidate"
            and entry.get("autoDeleteEligible") is True
            and any(e.get("kind") == "ancestor-of-control" for e in entry.get("evidence", []))
        )
        if (not entry or entry["sha"] != sha or entry.get("protections")
                or (proof is not None and not valid_proof_shape)
                or not (ancestor_proven or valid_proof_shape)):
            raise ValueError("UNSAFE_OR_MOVED_BRANCH:" + name)
        result.append({**entry, "squashMerge": proof} if valid_proof_shape else entry)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--observation", type=Path, required=True)
    parser.add_argument("--dispositions", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    plan = build_plan(load_json(args.observation), load_json(args.dispositions))
    text = json.dumps(plan, indent=2, ensure_ascii=False, sort_keys=True) + "\n"
    if args.output:
        args.output.write_text(text, encoding="utf-8")
    print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
