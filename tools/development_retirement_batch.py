#!/usr/bin/env python3
"""Development branch retirement: explicit bounded batches, no prefix heuristics.

Audit never writes. Apply requires exact development push and independently
verifies every SHA, the full original 60-ref inventory, PRs, protection,
rulesets, archive lineage, and remote readback before/after every deletion.
A divergent branch must first be retained by a Git tag at the ORIGINAL commit.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

REPO = "EAKerber/MobiliPresenter2D"
MAIN_SHA = "221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
INVENTORY = Path("docs/work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json")
MANIFEST = Path("ops/development-retirement-batch.json")
RECEIPT = Path("artifacts/development-retirement/receipt.json")
PR_NUMBERS = frozenset([34, 175, 178, 179, 180, 182, 184, 185, 186, 196, 231, 238])
SHA_RE = re.compile(r"[0-9a-f]{40}\Z")
BRANCH_RE = re.compile(r"[A-Za-z0-9._/-]+\Z")
TAG_RE = re.compile(r"archive/m2d/[a-z0-9][a-z0-9._/-]*\Z")


def git(*args: str, check: bool = True) -> str:
    p = subprocess.run(["git", *args], capture_output=True, text=True)
    if check and p.returncode:
        raise RuntimeError("GIT_ERROR: " + (p.stderr or p.stdout).strip())
    return p.stdout.strip()


def api(path: str):
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise RuntimeError("MISSING_GITHUB_TOKEN")
    req = Request("https://api.github.com/repos/" + REPO + "/" + path, headers={
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "M2D-development-bounded-hygiene",
    })
    with urlopen(req, timeout=30) as response:
        return json.load(response)


def remote_refs():
    result = {}
    for row in git("ls-remote", "--heads", "origin").splitlines():
        sha, ref = row.split("\t", 1)
        if not ref.startswith("refs/heads/") or not SHA_RE.fullmatch(sha):
            raise RuntimeError("BAD_REMOTE_ROW")
        name = ref.removeprefix("refs/heads/")
        if name in result:
            raise RuntimeError("DUPLICATE_REMOTE_REF")
        result[name] = sha
    return result


def archive_tags():
    result = {}
    for row in git("ls-remote", "--tags", "origin").splitlines():
        sha, ref = row.split("\t", 1)
        if ref.endswith("^{}"):
            continue
        if not ref.startswith("refs/tags/") or not SHA_RE.fullmatch(sha):
            raise RuntimeError("BAD_REMOTE_TAG")
        name = ref.removeprefix("refs/tags/")
        if name in result:
            raise RuntimeError("DUPLICATE_REMOTE_TAG")
        result[name] = sha
    return result


def safe_name(name):
    return (isinstance(name, str) and BRANCH_RE.fullmatch(name) is not None
            and ".." not in name and "//" not in name and not name.startswith("-")
            and not name.startswith("/") and not name.endswith("/")
            and not name.endswith(".lock"))


def canonical_targets(batch, inventory):
    if (not isinstance(batch, dict) or batch.get("schemaVersion") != "M2DDevRetirementBatch/0.1"
        or batch.get("repository") != REPO
        or batch.get("controlBranch") != "development"
        or batch.get("mainSha") != MAIN_SHA
        or not isinstance(batch.get("batchId"), str)
        or not re.fullmatch(r"dev-[a-z0-9-]{8,64}", batch["batchId"])):
        raise ValueError("INVALID_BATCH_CONTRACT")
    entries = batch.get("targets")
    if not isinstance(entries, list) or not 1 <= len(entries) <= 3:
        raise ValueError("BATCH_SIZE_1_TO_3")
    if inventory.get("baseSha") != MAIN_SHA or inventory.get("totals", {}).get("branches") != 60:
        raise ValueError("ORIGINAL_INVENTORY_MISMATCH")
    rows = inventory.get("rows")
    if not isinstance(rows, list) or len(rows) != 60:
        raise ValueError("INCOMPLETE_ORIGINAL_INVENTORY")
    original = {}
    for row in rows:
        branch, sha = row.get("branch"), row.get("sha")
        if not safe_name(branch) or not isinstance(sha, str) or not SHA_RE.fullmatch(sha):
            raise ValueError("INVALID_ORIGINAL_REF")
        if branch in original:
            raise ValueError("ORIGINAL_DUPLICATE_REF")
        original[branch] = sha
    retired = batch.get("retired", [])
    if not isinstance(retired, list) or len(retired) > 60:
        raise ValueError("INVALID_RETIRED_REGISTRY")
    seen_retired = set()
    for record in retired:
        if not isinstance(record, dict):
            raise ValueError("INVALID_RETIRED_ENTRY")
        name, sha, kind = record.get("branch"), record.get("sha"), record.get("kind")
        if (not safe_name(name) or name in seen_retired
            or name not in original or original[name] != sha):
            raise ValueError("RETIRED_ORIGINAL_PIN_MISMATCH")
        if kind == "ancestor-main":
            if set(record) != {"branch", "sha", "kind"}:
                raise ValueError("BAD_PREVIOUS_ANCESTOR")
        elif kind == "archive-diverged":
            tag = record.get("archiveTag")
            if (set(record) != {"branch", "sha", "kind", "archiveTag"}
                or not isinstance(tag, str) or not TAG_RE.fullmatch(tag)
                or ".." in tag or "//" in tag or tag.endswith("/")):
                raise ValueError("BAD_PREVIOUS_ARCHIVE")
        else:
            raise ValueError("UNSUPPORTED_PREVIOUS_DISPOSITION")
        seen_retired.add(name)
    seen = set()
    for item in entries:
        if not isinstance(item, dict):
            raise ValueError("INVALID_TARGET")
        name, sha, kind = item.get("branch"), item.get("sha"), item.get("kind")
        if (not safe_name(name) or name in seen or name in ("main", "development")
            or name in seen_retired or name not in original or original[name] != sha):
            raise ValueError("TARGET_NOT_IN_PINNED_INVENTORY")
        seen.add(name)
        if kind == "ancestor-main":
            if set(item) != {"branch", "sha", "kind"}:
                raise ValueError("UNEXPECTED_ANCESTOR_FIELDS")
        elif kind == "archive-diverged":
            allowed = {"branch", "sha", "kind", "archiveTag", "snapshotPath", "sourcePath", "sourceBlobSha"}
            required = {"branch", "sha", "kind", "archiveTag", "snapshotPath"}
            if not required.issubset(item) or not set(item).issubset(allowed):
                raise ValueError("INVALID_ARCHIVE_FIELDS")
            tag, path = item["archiveTag"], item["snapshotPath"]
            if (not isinstance(tag, str) or not TAG_RE.fullmatch(tag)
                or ".." in tag or "//" in tag or tag.endswith("/")
                or not isinstance(path, str) or not path.startswith("docs/")
                or ".." in Path(path).parts):
                raise ValueError("INVALID_ARCHIVE_IDENTITY")
            with_source = "sourcePath" in item or "sourceBlobSha" in item
            if with_source and (not isinstance(item.get("sourcePath"), str)
                or not item["sourcePath"].startswith("docs/")
                or ".." in Path(item["sourcePath"]).parts
                or not SHA_RE.fullmatch(str(item.get("sourceBlobSha")))):
                raise ValueError("INVALID_ARCHIVE_IDENTITY")
        else:
            raise ValueError("UNSUPPORTED_DISPOSITION")
    return {name: sha for name, sha in original.items() if name not in seen_retired}, entries


def prove_snapshot(target):
    """A diverged ref is never removed without a human-readable pinned record.

    An optional exact 23 Oct source delta additionally verifies literal content;
    generic future batches may preserve arbitrary DAGs using a full Git tag and
    exact pinned documentary note, rather than reusing this specific delta format.
    """
    copy = Path(target["snapshotPath"]).read_text(encoding="utf-8")
    if (target["branch"] + "@" + target["sha"] not in copy
        or target["archiveTag"] not in copy):
        raise RuntimeError("ARCHIVE_PROVENANCE_RECORD_MISSING")
    if "sourcePath" not in target:
        return {"snapshotPath": target["snapshotPath"], "fullCommitRetainedByTag": True}
    old = git("show", target["sha"] + ":" + target["sourcePath"])
    current = git("show", "HEAD:" + target["sourcePath"])
    marker_a = "<!-- BEGIN-ARCHIVED-20261023-EXACT-26-LINES -->\n"
    marker_b = "\n<!-- END-ARCHIVED-20261023-EXACT-26-LINES -->"
    if (copy.count(marker_a) != 1 or copy.count(marker_b) != 1
        or git("rev-parse", target["sha"] + ":" + target["sourcePath"]) != target["sourceBlobSha"]):
        raise RuntimeError("HISTORICAL_COPY_MARKER_OR_BLOB_DRIFT")
    original_lines, current_lines = old.splitlines(), current.splitlines()
    archive = copy.split(marker_a, 1)[1].split(marker_b, 1)[0].split("\n")
    if (len(original_lines) != 100 or len(current_lines) != 74
        or archive != original_lines[2:28]
        or original_lines[:2] + original_lines[28:] != current_lines):
        raise RuntimeError("ARCHIVE_MISSING_OR_NOT_EXACT")
    return {"snapshotPath": target["snapshotPath"], "sourceBlobSha": target["sourceBlobSha"],
            "archivedLines": len(archive)}


def verify_context(batch, inventory, mode):
    original, targets = canonical_targets(batch, inventory)
    env_sha = os.environ.get("GITHUB_SHA", "")
    if (os.environ.get("GITHUB_REPOSITORY") != REPO
        or os.environ.get("GITHUB_REF") != "refs/heads/development"
        or os.environ.get("GITHUB_EVENT_NAME") != "push"
        or not SHA_RE.fullmatch(env_sha)
        or git("rev-parse", "HEAD") != env_sha):
        raise RuntimeError("NOT_EXACT_DEVELOPMENT_PUSH")
    refs = remote_refs()
    previous = batch.get("retired", [])
    tags_before = archive_tags()
    for row in previous:
        if row["kind"] == "ancestor-main":
            if subprocess.run(["git", "merge-base", "--is-ancestor", row["sha"], MAIN_SHA]).returncode:
                raise RuntimeError("PREVIOUS_ANCESTOR_NOT_RECOVERABLE")
        elif tags_before.get(row["archiveTag"]) != row["sha"]:
            raise RuntimeError("PREVIOUS_ARCHIVE_TAG_NOT_RECOVERABLE")
    expected = {**original, "main": MAIN_SHA, "development": env_sha}
    if refs != expected:
        raise RuntimeError("FULL_REF_ROSTER_DRIFT")
    prs = api("pulls?state=open&per_page=100")
    if not isinstance(prs, list) or {p.get("number") for p in prs} != PR_NUMBERS:
        raise RuntimeError("OPEN_PR_INVENTORY_DRIFT")
    used = {value.get("ref") for p in prs for value in (p.get("head") or {}, p.get("base") or {})}
    if set(item["branch"] for item in targets) & used:
        raise RuntimeError("TARGET_HAS_OPEN_PR")
    if api("rulesets?per_page=100"):
        raise RuntimeError("RULESETS_PRESENT")
    for item in targets:
        name, sha = item["branch"], item["sha"]
        branch = api("branches/" + quote(name, safe=""))
        if branch.get("protected") is not False or (branch.get("commit") or {}).get("sha") != sha:
            raise RuntimeError("PROTECTED_OR_CHANGED:" + name)
        for workflow in list(Path(".github/workflows").glob("*.yml")) + list(Path(".github/workflows").glob("*.yaml")):
            if name in workflow.read_text(encoding="utf-8"):
                raise RuntimeError("ACTIVE_WORKFLOW_DEPENDENCY:" + name)
        git("cat-file", "-e", sha + "^{commit}")
        if item["kind"] == "ancestor-main":
            if subprocess.run(["git", "merge-base", "--is-ancestor", sha, MAIN_SHA]).returncode:
                raise RuntimeError("NOT_MAIN_ANCESTOR:" + name)
        else:
            prove_snapshot(item)
    tags = archive_tags()
    for item in targets:
        if item["kind"] == "archive-diverged":
            tag = item["archiveTag"]
            if tag in tags and tags[tag] != item["sha"]:
                raise RuntimeError("ARCHIVE_TAG_COLLISION:" + tag)
            if mode == "audit" and tag in tags:
                # An existing correct tag is fine: a previous interrupted run
                # may have already safely preserved the commit.
                pass
    return refs, targets, tags


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["audit", "apply"], required=True)
    args = parser.parse_args()
    batch = json.loads(MANIFEST.read_text(encoding="utf-8"))
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    before, targets, tags = verify_context(batch, inventory, args.mode)
    receipt = {"schemaVersion": "M2DDevRetirementReceipt/0.1",
               "batchId": batch["batchId"], "mode": args.mode,
               "developmentSha": before["development"],
               "targetPins": targets, "archivalTags": [],
               "deleted": [], "status": "AUDIT_PASS" if args.mode == "audit" else "APPLY_STARTED"}
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    if args.mode == "audit":
        print(json.dumps({"status": "AUDIT_PASS", "batch": batch["batchId"], "count": len(targets)}))
        return
    if os.environ.get("M2D_DEVELOPMENT_RETIRE_AUTHORIZED") != "1":
        raise RuntimeError("APPLY_AUTHORIZATION_MISSING")
    # Archive before removing any branch, and verify exact remote readback.
    for item in targets:
        if item["kind"] != "archive-diverged":
            continue
        name, sha = item["archiveTag"], item["sha"]
        if archive_tags().get(name) is None:
            if remote_refs() != before:
                raise RuntimeError("REF_DRIFT_BEFORE_ARCHIVE")
            git("push", "origin", sha + ":refs/tags/" + name)
        if archive_tags().get(name) != sha:
            raise RuntimeError("ARCHIVE_TAG_READBACK_FAILED")
        receipt["archivalTags"].append({"tag": name, "sha": sha})
    RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    expected = before.copy()
    for item in targets:
        # Re-check all mutable external safety conditions for every deletion.
        if remote_refs() != expected:
            raise RuntimeError("REF_DRIFT_BEFORE_DELETE")
        fresh_prs = api("pulls?state=open&per_page=100")
        if {p.get("number") for p in fresh_prs} != PR_NUMBERS:
            raise RuntimeError("PR_DRIFT_BEFORE_DELETE")
        active = {v.get("ref") for p in fresh_prs for v in (p.get("head") or {}, p.get("base") or {})}
        if item["branch"] in active or api("rulesets?per_page=100"):
            raise RuntimeError("PR_OR_RULESET_DRIFT")
        detail = api("branches/" + quote(item["branch"], safe=""))
        if detail.get("protected") is not False or (detail.get("commit") or {}).get("sha") != item["sha"]:
            raise RuntimeError("BRANCH_PROTECTION_OR_SHA_DRIFT")
        if item["kind"] == "archive-diverged" and archive_tags().get(item["archiveTag"]) != item["sha"]:
            raise RuntimeError("ARCHIVE_TAG_DRIFT_BEFORE_DELETE")
        git("push", "origin",
            "--force-with-lease=refs/heads/" + item["branch"] + ":" + item["sha"],
            ":refs/heads/" + item["branch"])
        expected.pop(item["branch"])
        if remote_refs() != expected:
            raise RuntimeError("REF_READBACK_AFTER_DELETE_FAILED")
        receipt["deleted"].append({"branch": item["branch"], "sha": item["sha"]})
        RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    for item in targets:
        if item["kind"] == "archive-diverged" and archive_tags().get(item["archiveTag"]) != item["sha"]:
            raise RuntimeError("FINAL_ARCHIVE_TAG_DRIFT")
    receipt.update(status="PASS", remainingBranches=len(expected), readback="PASS")
    RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": receipt["status"], "batch": receipt["batchId"],
                      "deleted": receipt["deleted"], "remainingBranches": len(expected)}))


if __name__ == "__main__":
    main()
