#!/usr/bin/env python3
"""Sequential 1..3-ref development squash retirement, fail closed and SHA-pinned."""
import argparse
import json
import os
import re
from pathlib import Path
from branch_hygiene_observe import observe
from branch_hygiene_plan import build_plan, load_json
from branch_hygiene_apply import apply

def split_waves(manifest, repository):
    if (manifest.get("schemaVersion") != "BranchHygieneSeries 0.1"
            or manifest.get("repository") != repository
            or manifest.get("controlBranch") != "development"
            or manifest.get("approvedRetirement") is not True
            or manifest.get("auditOnly") is True):
        raise ValueError("INVALID_SERIES_IDENTITY")
    waves = manifest.get("waves")
    if not isinstance(waves, list) or not 1 <= len(waves) <= 3:
        raise ValueError("INVALID_SERIES_SIZE")
    branches_seen, ids_seen, batches = set(), set(), []
    for wave in waves:
        if not isinstance(wave, dict) or set(wave) != {"id", "branches"}:
            raise ValueError("INVALID_WAVE_STRUCTURE")
        ident, refs = wave["id"], wave["branches"]
        if (not isinstance(ident, str) or not re.fullmatch(r"batch-[1-3]", ident)
                or ident in ids_seen or not isinstance(refs, list)
                or not 1 <= len(refs) <= 3):
            raise ValueError("INVALID_WAVE_BOUNDS")
        ids_seen.add(ident)
        for ref in refs:
            if (not isinstance(ref, dict) or set(ref) != {"branch", "sha", "squashMerge"}
                    or not isinstance(ref.get("branch"), str)
                    or ref["branch"] in {"main", "development"}
                    or ref["branch"] in branches_seen
                    or not isinstance(ref.get("sha"), str)
                    or not re.fullmatch(r"[0-9a-f]{40}", ref["sha"])
                    or not isinstance(ref.get("squashMerge"), dict)):
                raise ValueError("UNSAFE_SERIES_REF")
            branches_seen.add(ref["branch"])
        batches.append({"schemaVersion":"BranchHygieneBatch 0.1",
                        "repository":repository,"approvedRetirement":True,"branches":refs})
    return batches

def run(manifest, receipts, audit_only):
    repo, token = os.environ.get("GITHUB_REPOSITORY"), os.environ.get("GITHUB_TOKEN")
    if not repo or not token:
        raise RuntimeError("GITHUB_CONTEXT_MISSING")
    batches = split_waves(load_json(manifest), repo)
    receipts.mkdir(parents=True, exist_ok=True)
    total_deleted, total_proofs = 0, 0
    for i, batch in enumerate(batches, 1):
        obs = observe(repo, "development", token)
        plan = build_plan(obs, load_json(Path("ops/branch-dispositions-development.json")))
        plan_path, batch_path, receipt_path = (receipts / f"{prefix}-{i}.json"
            for prefix in ("plan", "batch", "receipt"))
        plan_path.write_text(json.dumps(plan, indent=2) + "\n")
        batch_path.write_text(json.dumps(batch, indent=2) + "\n")
        result = apply(plan_path, Path("ops/branch-dispositions-development.json"),
                       plan["planHash"], batch_path, receipt_path, audit_only)
        if result.get("status") != "PASS":
            raise RuntimeError("WAVE_FAILED:" + str(i))
        total_deleted += len(result["deleted"])
        total_proofs += len(result["squashProofs"])
    print(json.dumps({"status":"PASS","waves":len(batches),
        "mode":"audit" if audit_only else "apply",
        "deleted":total_deleted,"proofs":total_proofs},sort_keys=True))

if __name__ == "__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--manifest",type=Path,required=True)
    p.add_argument("--receipts",type=Path,required=True)
    p.add_argument("--audit-only",action="store_true")
    a=p.parse_args()
    run(a.manifest,a.receipts,a.audit_only)
