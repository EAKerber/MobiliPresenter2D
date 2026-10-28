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
PR_HEAD_PINS = {
    34: [
    "feat/exposed-sides-and-glass",
    "20040da835d6da66b03f73642c0c44db109dd6e8"
  ],
    175: [
    "work/cp-public-01-donor-staging-20261008",
    "c81d357df3aa78c3e8f804b6334b2da35b3a75c8"
  ],
    178: [
    "work/cp-public-02a-public-module-projection-20261008",
    "f0c792397036836105dcb53a45f89780e10b6348"
  ],
    179: [
    "work/cp-public-02b-public-read-endpoint-20261008",
    "44b1d6a94c06a17b73405755e03c787780e7a455"
  ],
    180: [
    "work/cp-public-02c-integrated-preview-20261008",
    "82d85674595280a7c878848d0d5f09df29492e92"
  ],
    182: [
    "work/cp-public-03a1-configuration-read-guard-20261008",
    "0b398618f7f2eff23da7f782d53d86ba3ee6411b"
  ],
    184: [
    "work/cp-public-03a2-0-failclosed-bootstrap-20261008",
    "d1305ffdd8302fa06b37d3676f08d802a92e7d97"
  ],
    185: [
    "work/cp-public-03a2-1-buyer-projection-20261008",
    "7a0d919d4e27853c50cff8afde0cdcc066e0aa0c"
  ],
    186: [
    "work/cp-public-03a2-2-email-access-core-20261008",
    "40d4b65f9e7e16e0810c2308e9b947840371cbe7"
  ],
    196: [
    "docs/cp-public-auth-boundary-20261011",
    "43d5fb9c5c2749c0541b99d49ee1c048d6a9a96a"
  ],
    231: [
    "architecture/p-token-02b-contextual-copy-20261022",
    "afb80965336083209eac93e2729de77170524ee5"
  ],
    238: [
    "ci/ci-baseline-01-isolated-auth-extraction-20261024",
    "3ccce161235df925c5b708bf6feefbe6f4b10103"
  ]
} 
PR_NUMBERS = frozenset(PR_HEAD_PINS)
PR_ARCHIVE_MANIFEST = Path("ops/development-pr-archive-manifest.json")
PR_CLOSURE_TRANSITION = Path("ops/development-pr-closure-transition.json")
PR_ARCHIVE_TAGS = {
  175: "archive/m2d/cppublic-pr175-c81d357d",
  178: "archive/m2d/cppublic-pr178-f0c79239",
  179: "archive/m2d/cppublic-pr179-44b1d6a9",
  180: "archive/m2d/cppublic-pr180-82d85674"
}

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


def verify_open_pr_roster(prs, tags, fetch_pr=api):
    """PR closure allows only exact documented 2-at-a-time transitions.

    A closed PR must be CLOSED/UNMERGED at its original SHA with an immutable
    archive tag. No other PR is allowed to close, move, merge, or change HEAD.
    This is intentionally stricter than merely changing PR_NUMBERS from 12 to 8.
    """
    archive = json.loads(PR_ARCHIVE_MANIFEST.read_text(encoding="utf-8"))
    transition = json.loads(PR_CLOSURE_TRANSITION.read_text(encoding="utf-8"))
    if (archive.get("schemaVersion") != "M2DDevPublicPRArchive/0.1"
        or archive.get("repository") != REPO
        or archive.get("mainSha") != MAIN_SHA
        or archive.get("expectedOpenPRs") != [[n, *PR_HEAD_PINS[n]] for n in sorted(PR_HEAD_PINS)]
        or archive.get("candidateTags") != [[n, PR_ARCHIVE_TAGS[n]] for n in sorted(PR_ARCHIVE_TAGS)]):
        raise RuntimeError("PR_ARCHIVE_PINNED_INVENTORY_DRIFT")
    allowed_keys = {"schemaVersion", "repository", "mainSha", "authoritativeArchive",
                    "batchId", "allowedClosedOrOpen", "remainingCandidatesFrozenOpen",
                    "closureMethod", "successorEvidence", "provenanceEvidence"}
    allowed = transition.get("allowedClosedOrOpen")
    expected_frozen = [n for n in PR_ARCHIVE_TAGS if n not in (allowed or [])]
    if (not isinstance(transition, dict) or set(transition) != allowed_keys
        or transition.get("schemaVersion") != "M2DPublicPRRosterTransition/0.1"
        or transition.get("repository") != REPO
        or transition.get("mainSha") != MAIN_SHA
        or transition.get("authoritativeArchive") != str(PR_ARCHIVE_MANIFEST)
        or transition.get("batchId") not in
            ("dev-20261028-cppublic-pr-close-ai", "dev-20261028-cppublic-pr-close-aj")
        or allowed not in ([175, 178], [175, 178, 179, 180])
        or transition.get("remainingCandidatesFrozenOpen") != expected_frozen
        or transition.get("closureMethod") != "closed-unmerged-only"
        or transition.get("successorEvidence") !=
             "docs/work/DEVELOPMENT_CP_PUBLIC_PRS_175_180_2026-10-28.md"
        or transition.get("provenanceEvidence") !=
             "docs/work/DEVELOPMENT_CP_PUBLIC_PR_CLOSURE_2026-10-28.md"):
        raise RuntimeError("PR_TRANSITION_MANIFEST_DRIFT")
    if ((transition["batchId"].endswith("-ai") and allowed != [175,178])
        or (transition["batchId"].endswith("-aj") and allowed != [175,178,179,180])):
        raise RuntimeError("PR_TRANSITION_WAVE_DRIFT")
    # Even still-open public PRs must retain complete original DAGs, so an
    # accidental deletion of any of these tags shuts down future hygiene.
    for n, tag in PR_ARCHIVE_TAGS.items():
        if tags.get(tag) != PR_HEAD_PINS[n][1]:
            raise RuntimeError("PR_ARCHIVE_TAG_MISSING_OR_CHANGED:"+str(n))
    if not isinstance(prs, list):
        raise RuntimeError("PR_OPEN_INVENTORY_NOT_LIST")
    actual = {p.get("number"): p for p in prs}
    if len(actual) != len(prs) or set(actual) - PR_NUMBERS:
        raise RuntimeError("PR_OPEN_INVENTORY_UNEXPECTED")
    for n,p in actual.items():
        head=p.get("head") or {}
        if (p.get("state")!="open"
            or (head.get("ref"),head.get("sha")) != tuple(PR_HEAD_PINS[n])
            or ((p.get("base") or {}).get("ref"))!="main"
            or p.get("merged_at")):
            raise RuntimeError("PR_OPEN_IDENTITY_DRIFT:"+str(n))
    missing=PR_NUMBERS-set(actual)
    if not missing.issubset(set(allowed)):
        raise RuntimeError("UNAUTHORIZED_PR_CLOSURE:"+repr(sorted(missing)))
    for n in sorted(missing):
        p=fetch_pr("pulls/"+str(n))
        head=p.get("head") or {}
        if (p.get("number")!=n or p.get("state")!="closed" or p.get("merged")
            or p.get("merged_at") or not p.get("closed_at")
            or (head.get("ref"),head.get("sha"))!=tuple(PR_HEAD_PINS[n])
            or ((p.get("base") or {}).get("ref"))!="main"):
            raise RuntimeError("PR_CLOSED_UNMERGED_PIN_MISMATCH:"+str(n))
    return set(actual)


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
    aux_rows = batch.get("auxiliaryRefs", [])
    if not isinstance(aux_rows, list) or len(aux_rows) > 3:
        raise ValueError("INVALID_AUXILIARY_ROSTER")
    aux_pins = {}
    for ref in aux_rows:
        if not isinstance(ref, dict) or set(ref) != {"branch", "sha"}:
            raise ValueError("INVALID_AUXILIARY_PIN")
        name, sha = ref["branch"], ref["sha"]
        if (not safe_name(name) or not name.startswith("integration/")
            or name in original or name in aux_pins
            or not isinstance(sha, str) or not SHA_RE.fullmatch(sha)):
            raise ValueError("AUXILIARY_PIN_NOT_ISOLATED")
        aux_pins[name] = sha
    seen = set()
    for item in entries:
        if not isinstance(item, dict):
            raise ValueError("INVALID_TARGET")
        name, sha, kind = item.get("branch"), item.get("sha"), item.get("kind")
        if not safe_name(name) or name in seen or name in ("main", "development"):
            raise ValueError("INVALID_OR_DUPLICATE_TARGET")
        if name in seen_retired:
            raise ValueError("TARGET_NOT_IN_PINNED_INVENTORY")
        seen.add(name)
        if kind == "auxiliary-ancestor-development":
            if (set(item) != {"branch", "sha", "kind"} or aux_pins.get(name) != sha):
                raise ValueError("UNPINNED_AUXILIARY_TARGET")
            continue
        if name not in original or original[name] != sha:
            raise ValueError("TARGET_NOT_IN_PINNED_INVENTORY")
        if kind == "ancestor-main":
            if set(item) != {"branch", "sha", "kind"}:
                raise ValueError("UNEXPECTED_ANCESTOR_FIELDS")
        elif kind == "archive-diverged":
            allowed = {"branch", "sha", "kind", "archiveTag", "snapshotPath", "sourcePath", "sourceBlobSha", "equalBlobPath", "equalBlobSha", "semanticGate"}
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
            with_equal = "equalBlobPath" in item or "equalBlobSha" in item
            with_gate = "semanticGate" in item
            if with_source and with_equal:
                raise ValueError("MIXED_ARCHIVE_PROOF_MODES")
            if sum((with_source, with_equal, with_gate)) != 1:
                raise ValueError("EXACTLY_ONE_ARCHIVE_PROOF_REQUIRED")
            if with_gate:
                gate = item["semanticGate"]
                if (not isinstance(gate, dict)
                    or set(gate) != {"runId", "headSha", "workflowName"}
                    or type(gate["runId"]) is not int or gate["runId"] <= 0
                    or not isinstance(gate["headSha"], str)
                    or not SHA_RE.fullmatch(gate["headSha"])
                    or not isinstance(gate["workflowName"], str)
                    or not 12 <= len(gate["workflowName"]) <= 180):
                    raise ValueError("INVALID_SEMANTIC_GATE")
            if with_source and (not isinstance(item.get("sourcePath"), str)
                or not item["sourcePath"].startswith("docs/")
                or ".." in Path(item["sourcePath"]).parts
                or not SHA_RE.fullmatch(str(item.get("sourceBlobSha")))):
                raise ValueError("INVALID_ARCHIVE_IDENTITY")
            if with_equal and (not isinstance(item.get("equalBlobPath"), str)
                or not item["equalBlobPath"].startswith("app/")
                or ".." in Path(item["equalBlobPath"]).parts
                or not SHA_RE.fullmatch(str(item.get("equalBlobSha")))):
                raise ValueError("INVALID_EQUAL_BLOB_PROOF")
        else:
            raise ValueError("UNSUPPORTED_DISPOSITION")
    if {z["branch"] for z in entries if z["kind"] == "auxiliary-ancestor-development"} != set(aux_pins):
        raise ValueError("UNACCOUNTED_AUXILIARY_PIN")
    return {**{name: sha for name, sha in original.items() if name not in seen_retired},
            **aux_pins}, entries


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
    if "semanticGate" in target:
        gate = target["semanticGate"]
        run = api("actions/runs/" + str(gate["runId"]))
        if (run.get("conclusion") != "success" or run.get("status") != "completed"
            or run.get("head_sha") != gate["headSha"]
            or run.get("name") != gate["workflowName"]
            or run.get("event") != "push"):
            raise RuntimeError("SEMANTIC_GATE_NOT_PROVED")
        if subprocess.run(["git", "merge-base", "--is-ancestor",
                           gate["headSha"], git("rev-parse", "HEAD")]).returncode:
            raise RuntimeError("SEMANTIC_GATE_HEAD_NOT_ON_DEVELOPMENT")
        return {"snapshotPath": target["snapshotPath"],
                "semanticGateRun": gate["runId"], "semanticGateSha": gate["headSha"]}
    if "equalBlobPath" in target:
        path, sha = target["equalBlobPath"], target["equalBlobSha"]
        base = git("merge-base", MAIN_SHA, target["sha"])
        changed = git("diff", "--name-only", "-z", base, target["sha"]).split("\x00")
        if [p for p in changed if p] != [path]:
            raise RuntimeError("EQUAL_BLOB_SOURCE_SCOPE_DRIFT")
        if (git("rev-parse", target["sha"] + ":" + path) != sha
            or git("rev-parse", "HEAD:" + path) != sha):
            raise RuntimeError("EQUAL_BLOB_NOT_IDENTICAL_TO_DEVELOPMENT")
        return {"snapshotPath": target["snapshotPath"], "sameBlobSha": sha, "exactPaths": [path]}
    if "sourcePath" not in target:
        raise RuntimeError("UNPROVEN_ARCHIVE_DISPOSITION")
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
    verify_open_pr_roster(prs, tags_before)
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
        elif item["kind"] == "auxiliary-ancestor-development":
            # This operation archives no new tag because the auxiliary commit
            # is already permanently reachable from the development HEAD.
            if subprocess.run(["git", "merge-base", "--is-ancestor", sha, env_sha]).returncode:
                raise RuntimeError("AUXILIARY_NOT_REACHABLE_FROM_DEVELOPMENT:" + name)
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
        verify_open_pr_roster(fresh_prs, archive_tags())
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
