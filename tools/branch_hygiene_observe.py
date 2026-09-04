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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repository", default=os.environ.get("GITHUB_REPOSITORY"))
    parser.add_argument("--control", default="main")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    token = os.environ.get("GITHUB_TOKEN")
    if not args.repository or not token:
        raise SystemExit("GITHUB_REPOSITORY and GITHUB_TOKEN are required")
    payload = observe(args.repository, args.control, token)
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS",
        "branches": len(payload["branches"]),
        "controlSha": payload["controlSha"],
        "observationHash": payload["observationHash"],
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
