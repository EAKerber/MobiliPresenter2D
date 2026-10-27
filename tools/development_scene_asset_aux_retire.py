#!/usr/bin/env python3
"""One-shot retirement of the 07-asset-provenance auxiliary; do not re-run or repurpose."""
import argparse
import json
import os
import re
import subprocess
from pathlib import Path
from urllib.request import Request, urlopen

REPO = "EAKerber/MobiliPresenter2D"
BRANCH = "integration/07-asset-provenance-20261027"
SOURCE = "fa3780e3bf4dfe659cf12d0f4cf53625094eff31"
MAIN_SHA = "221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
VERIFIED_DEVELOPMENT_GATE = 40571761061
EXPECTED_PRS = {34, 175, 178, 179, 180, 182, 184, 185, 186, 196, 231, 238}
INVENTORY = "docs/work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json"
RECEIPT = "asset-provenance-aux-retirement-receipt.json"
HEX40 = re.compile(r"^[0-9a-f]{40}$")


def git(*args):
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout.strip()


def api(path):
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise RuntimeError("MISSING_GITHUB_TOKEN")
    request = Request(
        f"https://api.github.com/repos/{REPO}/{path}",
        headers={
            "Authorization": "Bearer " + token,
            "User-Agent": "m2d-asset-provenance-one-shot",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def remote_refs():
    result = {}
    for line in git("ls-remote", "--heads", "origin").splitlines():
        sha, ref = line.split("\t", 1)
        branch = ref.removeprefix("refs/heads/")
        if branch in result or not HEX40.fullmatch(sha):
            raise RuntimeError("DUPLICATE_OR_INVALID_REF")
        result[branch] = sha
    return result


def expected_roster(inventory, development):
    if (inventory.get("baseSha") != MAIN_SHA
        or inventory.get("totals", {}).get("branches") != 60
        or len(inventory.get("rows", [])) != 60
        or not HEX40.fullmatch(development)):
        raise RuntimeError("INVALID_INVENTORY_OR_DEVELOPMENT")
    historical = {x["branch"]: x["sha"] for x in inventory["rows"]}
    if (len(historical) != 60
        or set(historical) & {"main", "development", BRANCH}
        or any(not HEX40.fullmatch(sha) for sha in historical.values())):
        raise RuntimeError("INVALID_HISTORICAL_HEADS")
    return {**historical, "main": MAIN_SHA, "development": development, BRANCH: SOURCE}


def preflight(inventory):
    if (os.getenv("GITHUB_EVENT_NAME") != "push"
        or os.getenv("GITHUB_REF") != "refs/heads/development"
        or os.getenv("GITHUB_REPOSITORY") != REPO
        or not HEX40.fullmatch(os.getenv("GITHUB_SHA", ""))
        or os.getenv("GITHUB_SHA") != git("rev-parse", "HEAD")):
        raise RuntimeError("UNEXPECTED_RUN_CONTEXT")
    expected = expected_roster(inventory, os.environ["GITHUB_SHA"])
    if remote_refs() != expected:
        raise RuntimeError("EXPECTED_63_REF_ROSTER_CHANGED")
    git("fetch", "--no-tags", "origin", "development")
    if subprocess.run(["git", "merge-base", "--is-ancestor", SOURCE, os.environ["GITHUB_SHA"]]).returncode:
        raise RuntimeError("AUX_NOT_ANCESTOR_OF_DEVELOPMENT")
    action = api("actions/runs/" + str(VERIFIED_DEVELOPMENT_GATE))
    if (action.get("conclusion") != "success"
        or action.get("head_sha") != SOURCE
        or action.get("head_branch") != "development"):
        raise RuntimeError("PINNED_DESTINATION_GATE_NOT_SUCCESS")
    prs = api("pulls?state=open&per_page=100")
    if {pr.get("number") for pr in prs} != EXPECTED_PRS:
        raise RuntimeError("OPEN_PR_ROSTER_CHANGED")
    if any(BRANCH in (pr.get("head", {}).get("ref"), pr.get("base", {}).get("ref")) for pr in prs):
        raise RuntimeError("AUX_REFERENCED_BY_OPEN_PR")
    if api("rulesets?per_page=100"):
        raise RuntimeError("RULESETS_CHANGED")
    details = api("branches/" + BRANCH)
    if details.get("protected") is not False or details.get("commit", {}).get("sha") != SOURCE:
        raise RuntimeError("AUX_PROTECTED_OR_MOVED")
    # No workflows may continue triggering on the auxiliary after retirement.
    for path in list(Path(".github/workflows").glob("*.yml")) + list(Path(".github/workflows").glob("*.yaml")):
        if BRANCH in path.read_text(encoding="utf8"):
            raise RuntimeError("WORKFLOW_STILL_REFERENCES_AUX:" + str(path))
    return expected


def main(mode):
    inventory = json.loads(Path(INVENTORY).read_text(encoding="utf8"))
    original = preflight(inventory)
    receipt = {
        "schemaVersion": "M2DAssetProvenanceAuxOneShotReceipt/0.1",
        "mode": mode, "source": BRANCH, "sourceSha": SOURCE,
        "developmentSha": original["development"],
        "mainSha": MAIN_SHA, "historicalCount": 60,
        "prCount": len(EXPECTED_PRS), "removed": [],
        "status": "AUDIT_PASS" if mode == "audit" else "STARTED"
    }
    Path(RECEIPT).write_text(json.dumps(receipt, indent=2) + "\n")
    if mode == "audit":
        print(json.dumps(receipt))
        return
    if remote_refs() != original:
        raise RuntimeError("REMOTE_REF_DRIFT_BEFORE_APPLY")
    subprocess.run(["git", "push", "origin",
        "--force-with-lease=refs/heads/" + BRANCH + ":" + SOURCE,
        ":refs/heads/" + BRANCH], check=True)
    expected = dict(original)
    del expected[BRANCH]
    if remote_refs() != expected:
        raise RuntimeError("POST_DELETE_FULL_ROSTER_READBACK_FAILED")
    receipt.update({
        "removed": [{"branch": BRANCH, "sha": SOURCE}],
        "status": "PASS", "readback": "PASS",
        "remainingBranches": len(expected)
    })
    Path(RECEIPT).write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", required=True, choices=["audit", "apply"])
    main(parser.parse_args().mode)
