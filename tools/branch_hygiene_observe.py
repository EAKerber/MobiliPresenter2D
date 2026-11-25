#!/usr/bin/env python3
"""Materialize GitHub branch observations without depending on `gh`.

Transport is isolated here: git supplies ancestry/tree identity and GitHub REST
supplies branch protection plus current open-PR relationships. The planner does
not import this module and stays provider-neutral.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from branch_hygiene_plan import canonical_json


def run(*args: str, check: bool = True) -> str:
    proc = subprocess.run(args, text=True, capture_output=True, check=False)
    if check and proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout).strip() or "command failed")
    return proc.stdout.strip()


def api_get(repository: str, path: str, token: str) -> Any:
    url = f"https://api.github.com/repos/{repository}/{path}"
    req = Request(url, headers={
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "MobiliPresenter2D-branch-hygiene",
    })
    with urlopen(req, timeout=30) as response:
        return json.load(response)


def paginate(repository: str, endpoint: str, token: str) -> list[Any]:
    result: list[Any] = []
    for page in range(1, 21):
        separator = "&" if "?" in endpoint else "?"
        payload = api_get(repository, f"{endpoint}{separator}{urlencode({'per_page': 100, 'page': page})}", token)
        if not isinstance(payload, list):
            raise RuntimeError(f"unexpected payload for {endpoint}")
        result.extend(payload)
        if len(payload) < 100:
            return result
    raise RuntimeError(f"pagination limit exceeded for {endpoint}")


def observe(repository: str, control_branch: str, token: str) -> dict[str, Any]:
    run("git", "fetch", "--prune", "origin", "+refs/heads/*:refs/remotes/origin/*")
    branch_api = paginate(repository, "branches", token)
    prs = paginate(repository, "pulls?state=open", token)

    protection = {
        item.get("name"): bool(item.get("protected"))
        for item in branch_api
        if isinstance(item, dict) and isinstance(item.get("name"), str)
    }
    api_shas = {
        item.get("name"): ((item.get("commit") or {}).get("sha"))
        for item in branch_api
        if isinstance(item, dict) and isinstance(item.get("name"), str)
    }

    refs_text = run("git", "for-each-ref", "--format=%(refname:strip=3) %(objectname)", "refs/remotes/origin")
    refs: dict[str, str] = {}
    for line in refs_text.splitlines():
        if not line.strip() or line.startswith("HEAD "):
            continue
        name, sha = line.split(" ", 1)
        refs[name] = sha

    if set(refs) != set(api_shas):
        raise RuntimeError("branch inventory mismatch between git and GitHub API")
    for name, sha in refs.items():
        if api_shas.get(name) != sha:
            raise RuntimeError(f"branch SHA mismatch: {name}")

    control_sha = refs.get(control_branch)
    if not control_sha:
        raise RuntimeError("control branch missing")

    branches: list[dict[str, Any]] = []
    for name, sha in sorted(refs.items()):
        ancestor = subprocess.run(
            ["git", "merge-base", "--is-ancestor", sha, control_sha],
            capture_output=True,
            check=False,
        ).returncode == 0
        tree_sha = run("git", "show", "-s", "--format=%T", sha)
        branches.append({
            "name": name,
            "sha": sha,
            "treeSha": tree_sha,
            "protected": protection.get(name, False),
            "ancestorOfControl": ancestor,
        })

    open_heads: set[str] = set()
    open_bases: set[str] = set()
    for pr in prs:
        if not isinstance(pr, dict):
            continue
        head = pr.get("head") or {}
        base = pr.get("base") or {}
        if isinstance(head.get("ref"), str):
            open_heads.add(head["ref"])
        if isinstance(base.get("ref"), str):
            open_bases.add(base["ref"])

    payload = {
        "schemaVersion": "BranchObservation 0.1",
        "repository": repository,
        "controlBranch": control_branch,
        "controlSha": control_sha,
        "observedAt": datetime.now(timezone.utc).isoformat(),
        "complete": True,
        "branches": branches,
        "openPrHeads": sorted(open_heads),
        "openPrBases": sorted(open_bases),
    }
    semantic_payload = {key: value for key, value in payload.items() if key != "observedAt"}
    payload["observationHash"] = hashlib.sha256(canonical_json(semantic_payload).encode("utf-8")).hexdigest()
    return payload


def discover_merged_heads(observation: dict[str, Any], token: str) -> dict[str, Any]:
    """Read-only factual correlation, not authorization or an apply manifest."""
    repository = observation["repository"]
    control = observation["controlBranch"]
    control_sha = observation["controlSha"]
    refs = {item["name"]: item for item in observation["branches"]}
    protected = set(observation["openPrHeads"]) | set(observation["openPrBases"])
    closed = paginate(repository, "pulls?state=closed", token)
    facts = {name: [] for name in refs}
    import re

    def ancestor(a: str, b: str) -> bool:
        result = subprocess.run(["git", "merge-base", "--is-ancestor", a, b],
                                capture_output=True, check=False).returncode
        if result not in (0, 1):
            raise RuntimeError("DISCOVERY_ANCESTRY_UNAVAILABLE")
        return result == 0

    for pr in closed:
        head, base = pr.get("head") or {}, pr.get("base") or {}
        name = head.get("ref")
        if name not in refs or (head.get("repo") or {}).get("full_name") != repository:
            continue
        if (base.get("repo") or {}).get("full_name") != repository:
            continue
        item = refs[name]
        exact = head.get("sha") == item["sha"]
        fact = {"pullRequest": pr["number"], "base": base.get("ref"),
                "headSha": head.get("sha"), "exactHead": exact,
                "merged": bool(pr.get("merged_at")),
                "title": pr.get("title"), "mergeCommit": pr.get("merge_commit_sha")}
        facts[name].append(fact)
        merge = fact["mergeCommit"]
        if (not exact or not fact["merged"] or fact["base"] != control
                or name in protected or item.get("protected")
                or name in {"main", "development"} or name.startswith("archive/")
                or not isinstance(merge, str) or not re.fullmatch(r"[0-9a-f]{40}", merge)):
            continue
        # Missing historical objects are insufficient evidence, never approval.
        if subprocess.run(["git", "cat-file", "-e", merge+"^{commit}"],
                          capture_output=True, check=False).returncode:
            fact["proofFailure"] = "MERGE_OBJECT_UNAVAILABLE"
            continue
        parents = run("git", "rev-list", "--parents", "-n", "1", merge).split()
        fact["mergeReachable"] = ancestor(merge, control_sha)
        fact["treeEqual"] = run("git", "show", "-s", "--format=%T", merge) == item["treeSha"]
        fact["singleParent"] = len(parents) == 2 and parents[0] == merge
        fact["originalBaseReachable"] = (fact["singleParent"]
                                        and ancestor(parents[1], item["sha"]))
        if all(fact[k] for k in ("mergeReachable", "treeEqual", "singleParent",
                                  "originalBaseReachable")):
            fact["squashMerge"] = {"pullRequest": pr["number"], "mergeCommit": merge}
    # Match the same observation identity; do not plan against a stale inventory.
    current = run("git", "ls-remote", "--heads", "origin")
    remote = {line.split()[1].removeprefix("refs/heads/"): line.split()[0]
              for line in current.splitlines() if line.strip()}
    if remote != {name: item["sha"] for name, item in refs.items()}:
        raise RuntimeError("DISCOVERY_INVENTORY_DRIFT")
    return {"schemaVersion": "BranchMergedHeadEvidence 0.1",
            "repository": repository, "controlBranch": control,
            "observationHash": observation["observationHash"],
            "facts": {name: sorted(items, key=lambda x: x["pullRequest"])
                      for name, items in sorted(facts.items())}}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repository", default=os.environ.get("GITHUB_REPOSITORY"))
    parser.add_argument("--control", default="main")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--merged-head-evidence", type=Path,
                        help="Optional read-only closed-PR correlation, separate from apply observation")
    args = parser.parse_args()
    token = os.environ.get("GITHUB_TOKEN")
    if not args.repository or not token:
        raise SystemExit("GITHUB_REPOSITORY and GITHUB_TOKEN are required")
    payload = observe(args.repository, args.control, token)
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    if args.merged_head_evidence:
        evidence = discover_merged_heads(payload, token)
        args.merged_head_evidence.write_text(json.dumps(evidence, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS",
        "branches": len(payload["branches"]),
        "controlSha": payload["controlSha"],
        "observationHash": payload["observationHash"],
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
