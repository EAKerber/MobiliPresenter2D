#!/usr/bin/env python3
"""Read-only historical PR retention contracts (October/November 2026).

Frozen pins are evidence for lineage tests, never the current branch inventory.
No CLI, branch/tag creation, deletion, or retirement authorization.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

REPO = "EAKerber/MobiliPresenter2D"
MAIN_SHA = "221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
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
PR_ARCHIVE_MANIFEST = Path("ops/development-pr-branch-archive-manifest.json")
PR_CLOSURE_TRANSITION = Path("ops/development-pr-branch-transition.json")
PR_ARCHIVE_EVIDENCE = "docs/work/DEVELOPMENT_PR_BRANCH_ARCHIVE_2026-11-01.md"
PR_ARCHIVE_TAGS = {
  34: "archive/m2d/pr34-exposed-sides-glass-20040da8",
  175: "archive/m2d/cppublic-pr175-c81d357d",
  178: "archive/m2d/cppublic-pr178-f0c79239",
  179: "archive/m2d/cppublic-pr179-44b1d6a9",
  180: "archive/m2d/cppublic-pr180-82d85674",
  182: "archive/m2d/cppublic-pr182-config-read-guard-0b398618",
  184: "archive/m2d/cppublic-pr184-failclosed-bootstrap-d1305ff",
  185: "archive/m2d/cppublic-pr185-buyer-projection-7a0d919d",
  186: "archive/m2d/cppublic-pr186-email-access-40d4b65f",
  196: "archive/m2d/cppublic-pr196-auth-boundary-43d5fb9c",
  231: "archive/m2d/p-token-02b-contextual-copy-afb80965",
  238: "archive/m2d/ci-baseline-01-isolated-auth-3ccce161"
}
PR_CLOSED_ROSTER = [34, 175, 178, 179, 180, 182, 184, 185, 186, 196, 231, 238]
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


def verify_open_pr_roster(prs, tags, fetch_pr=api, refs=None):
    """Require the exact live PR roster and preserve closed heads losslessly.

    A closed PR must be CLOSED/UNMERGED at its original SHA with an immutable
    archive tag before its branch ref is removed. During a bounded retirement
    wave, a missing tag is acceptable only while the exact pinned branch ref
    still exists. No other PR may close, move, merge, or change HEAD.
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
        or transition.get("authoritativeArchive") != PR_ARCHIVE_MANIFEST.as_posix()
        or transition.get("batchId") != "dev-20261101-public-pr-archive-aw"
        or allowed != PR_CLOSED_ROSTER
        or transition.get("remainingCandidatesFrozenOpen") != expected_frozen
        or transition.get("closureMethod") != "closed-unmerged-only"
        or transition.get("successorEvidence") != PR_ARCHIVE_EVIDENCE
        or transition.get("provenanceEvidence") != PR_ARCHIVE_EVIDENCE):
        raise RuntimeError("PR_TRANSITION_MANIFEST_DRIFT")
    # Existing tags must always match. A missing tag is acceptable only while
    # the full-roster check below still finds that closed PR's exact branch.
    for n, tag in PR_ARCHIVE_TAGS.items():
        if tag in tags and tags[tag] != PR_HEAD_PINS[n][1]:
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
        tag = PR_ARCHIVE_TAGS.get(n)
        branch, sha = PR_HEAD_PINS[n]
        if (not tag or (tags.get(tag) != sha
                        and (refs or {}).get(branch) != sha)):
            raise RuntimeError("PR_ARCHIVE_TAG_MISSING_OR_BRANCH_UNPINNED:"+str(n))
    return set(actual)


# CLOSED/UNMERGED roster is still verified live by the protected workflow before every mutation.
# Offline tests use this pinned receipt only for pure retention logic, never as live authority.
# Remote mutation always uses verify_open_pr_roster and its fresh API readback.
PR_CONFIRMED_CLOSED_UNMERGED = frozenset(PR_CLOSED_ROSTER)


def local_pr_refs():
    """Read full local ref identities; a matching tag must not mask branch drift."""
    refs = {}
    for line in git("for-each-ref", "--format=%(refname) %(objectname)",
                    "refs/remotes/origin/", "refs/tags/").splitlines():
        name, sha = line.split(" ", 1)
        refs[name] = sha
    return refs


def verify_pr_head_retention(pins, refs, closed_pr_numbers):
    """Require every open head branch; only closed public PRs may use exact tags.

    The caller must supply already verified closed/unmerged PR numbers. Offline
    tests pass the recorded closure receipt; the live probe passes the roster
    verified independently against GitHub. This function makes no network calls.
    """
    closed = set(closed_pr_numbers)
    if not closed.issubset(PR_ARCHIVE_TAGS):
        raise RuntimeError("UNARCHIVABLE_CLOSED_PR")
    for n, (branch, sha) in pins.items():
        if PR_HEAD_PINS.get(n) != [branch, sha]:
            raise RuntimeError("PR_RETENTION_PIN_DRIFT:" + str(n))
        actual = refs.get("refs/remotes/origin/" + branch)
        if actual is not None and actual != sha:
            raise RuntimeError("PR_RETENTION_BRANCH_DRIFT:" + str(n))
        if n in closed:
            tag_sha = refs.get("refs/tags/" + PR_ARCHIVE_TAGS[n])
            if tag_sha is not None and tag_sha != sha:
                raise RuntimeError("PR_RETENTION_ARCHIVE_MISSING_OR_CHANGED:" + str(n))
            if actual is None and tag_sha != sha:
                raise RuntimeError("PR_RETENTION_ARCHIVE_MISSING_OR_CHANGED:" + str(n))
        elif actual is None:
            raise RuntimeError("OPEN_PR_BRANCH_MISSING:" + str(n))
    return True


