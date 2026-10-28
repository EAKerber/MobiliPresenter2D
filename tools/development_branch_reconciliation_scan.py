#!/usr/bin/env python3
"""Read-only, complete SHA-pinned historical-branch equivalence scan for development.

Compare each historical branch's *contributed paths* from its merge-base with
main, using Git blob identity against development; do not mistake full-tree
differences (which include unrelated newer work) for its actual contribution.
No deletion permissions. Candidate flag is a review hint, not authorization.
"""
from __future__ import annotations

import json
import os
import subprocess
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

# Share strict, archived CLOSED/UNMERGED PR roster validation with bounded hygiene.
import development_retirement_batch as retirement_guard

REPOSITORY = "EAKerber/MobiliPresenter2D"
INVENTORY = Path("docs/work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json")
HISTORY = Path("ops/development-retirement-history.json")
OUTPUT = Path("artifacts/development-branch-reconciliation/scan.json")
PROTECTED_BY_POLICY = {
    "artifacts/ds02-imagens-originais-20261015",
    "feat/exposed-sides-and-glass",
}


def git(*args):
    p = subprocess.run(["git", *args], check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode:
        raise RuntimeError("git failed: " + " ".join(args) + ": " +
                           p.stderr.decode("utf-8", errors="replace")[:500])
    return p.stdout


def rows_from_tree(ref):
    rows = git("ls-tree", "-r", "-z", ref).split(b"\0")
    blobs = {}
    for row in rows:
        if not row:
            continue
        meta, name = row.split(b"\t", 1)
        mode, kind, sha = meta.split()
        if kind == b"blob":
            blobs[name.decode("utf-8", errors="surrogateescape")] = sha.decode("ascii")
    return blobs


def changed_paths(base, branch):
    raw = git("diff", "--name-only", "-z", base, branch)
    return sorted({x.decode("utf-8", errors="surrogateescape") for x in raw.split(b"\0") if x})


def open_prs():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise RuntimeError("GITHUB_TOKEN missing")
    req = Request("https://api.github.com/repos/" + REPOSITORY + "/pulls?state=open&per_page=100",
                  headers={"Authorization": "Bearer " + token,
                           "Accept": "application/vnd.github+json",
                           "X-GitHub-Api-Version": "2022-11-28",
                           "User-Agent": "M2D-readonly-reconciliation"})
    with urlopen(req, timeout=30) as response:
        data = json.load(response)
    if not isinstance(data, list) or len(data) >= 100:
        raise RuntimeError("PR inventory incomplete")
    result = defaultdict(list)
    for pr in data:
        head = pr.get("head") or {}
        if (head.get("repo") or {}).get("full_name") == REPOSITORY:
            result[head.get("ref")].append(pr["number"])
        result[(pr.get("base") or {}).get("ref")].append("base-" + str(pr["number"]))
    return result, sorted(p["number"] for p in data), data


def scan():
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    history = json.loads(HISTORY.read_text(encoding="utf-8"))
    if (inventory.get("baseSha") != "221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
        or len(inventory.get("rows", [])) != 60
        or history.get("schemaVersion") != "M2DDevRetirementHistory/0.1"):
        raise RuntimeError("baseline inventory mismatch")
    retired = {z["branch"]: z["sha"] for wave in history["waves"] for z in wave["retired"]}
    if not 0 <= len(retired) <= 60:
        raise RuntimeError("invalid count of prior retirements")
    originals = {z["branch"]: z for z in inventory["rows"]}
    if len(originals) != 60:
        raise RuntimeError("duplicate historical entry")
    for name, sha in retired.items():
        if originals.get(name, {}).get("sha") != sha:
            raise RuntimeError("retired ref mismatch")
    expected = {n: z["sha"] for n, z in originals.items() if n not in retired}
    main = git("rev-parse", "origin/main").decode().strip()
    dev = git("rev-parse", "HEAD").decode().strip()
    if main != inventory["baseSha"] or dev != git("rev-parse", "origin/development").decode().strip():
        raise RuntimeError("main/development head drift")
    remote = {}
    for line in git("ls-remote", "--heads", "origin").decode().splitlines():
        sha, name = line.split("\t", 1)
        name = name.removeprefix("refs/heads/")
        if name in remote:
            raise RuntimeError("duplicate Git remote branch")
        remote[name] = sha
    if remote != {**expected, "main": main, "development": dev}:
        raise RuntimeError("REMOTE_ROSTER_MISMATCH")
    pr_heads, pr_ids, pr_objects = open_prs()
    # Never relax roster by setting a smaller constant. CLOSED/UNMERGED PRs
    # must be individually pinned to their original SHA and exact archive tag;
    # all other PRs are required to remain open on main.
    approved_open = retirement_guard.verify_open_pr_roster(
        pr_objects, retirement_guard.archive_tags()
    )
    if set(pr_ids) != approved_open:
        raise RuntimeError("OPEN_PR_SET_CHANGED")
    dev_tree = rows_from_tree("HEAD")
    results = []
    for name, info in sorted(originals.items()):
        if name in retired:
            continue
        branch_ref = "refs/remotes/origin/" + name
        actual = git("rev-parse", branch_ref).decode().strip()
        if actual != info["sha"]:
            raise RuntimeError("LOCAL_REF_MISMATCH:" + name)
        base = git("merge-base", main, actual).decode().strip()
        touched = changed_paths(base, actual)
        branch_tree = rows_from_tree(actual)
        same, differs, absent, deletes = [], [], [], []
        for path in touched:
            source_blob = branch_tree.get(path)
            current_blob = dev_tree.get(path)
            if source_blob is None:
                deletes.append(path)
            elif source_blob == current_blob:
                same.append(path)
            elif current_blob is None:
                absent.append(path)
            else:
                differs.append(path)
        source_unique = int(git("rev-list", "--count", main + ".." + actual).decode().strip())
        protections = []
        if name in pr_heads:
            protections.append("open-pr")
        if name in PROTECTED_BY_POLICY:
            protections.append("explicit-hold")
        if any(path.startswith(("netlify/", "app/access/", "app/admin/", "app/config/"))
               or path == "netlify.toml" for path in touched):
            protections.append("sensitive-runtime")
        if any(path.endswith((".png", ".webp", ".jpg", ".svg")) for path in touched):
            protections.append("visual-artifacts")
        if not touched:
            label = "NO_SOURCE_PATH_CHANGES"
        elif not differs and not absent and not deletes:
            label = "ALL_CONTRIBUTED_BLOBS_EQUAL_DEVELOPMENT"
        elif not differs and not absent:
            label = "ONLY_EQUAL_BLOBS_AND_DELETIONS"
        elif not same:
            label = "NO_IDENTICAL_CONTRIBUTED_BLOBS"
        else:
            label = "PARTIALLY_RECONCILED"
        results.append({
            "branch": name, "sha": actual, "cluster": info.get("cluster"),
            "sourceUniqueCommitsVsMain": source_unique,
            "contributedPathsVsCommonAncestor": len(touched),
            "sameBlobCount": len(same), "differentBlobCount": len(differs),
            "historicalOnlyCount": len(absent), "deletedInSourceCount": len(deletes),
            "sameBlobPaths": same[:150], "differentBlobPaths": differs[:150],
            "historicalOnlyPaths": absent[:150], "deletedInSourcePaths": deletes[:150],
            "openPrRelations": pr_heads.get(name, []),
            "protections": sorted(set(protections)),
            "comparison": label,
            "candidateReviewOnly": label == "ALL_CONTRIBUTED_BLOBS_EQUAL_DEVELOPMENT"
                 and not protections,
        })
    counts = Counter(x["comparison"] for x in results)
    eligible = [x["branch"] for x in results if x["candidateReviewOnly"]]
    result = {
        "schemaVersion": "M2DDevelopmentBranchSemanticScan/0.1",
        "repository": REPOSITORY,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "mainSha": main, "developmentSha": dev,
        "historicalTotal": 60, "retiredPrevious": len(retired),
        "scanned": len(results), "openPRNumbers": pr_ids,
        "interpretation": "Equivalence only means all paths changed since the source merge-base have identical current blob SHAs. No automatic retirement, no whole-branch semantic approval.",
        "comparisonCounts": dict(sorted(counts.items())),
        "reviewCandidates": eligible, "branches": results,
    }
    if len(results) != 60 - len(retired):
        raise RuntimeError("SCAN_INCOMPLETE")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({key: result[key] for key in ("schemaVersion", "mainSha", "developmentSha",
               "scanned", "comparisonCounts", "reviewCandidates")}, ensure_ascii=False, indent=2))
    for entry in results:
        print("{cluster} {comparison} {branch} same={sameBlobCount} diff={differentBlobCount} absent={historicalOnlyCount} sourceDeletes={deletedInSourceCount} protected={protections}".format(**entry))


if __name__ == "__main__":
    scan()
