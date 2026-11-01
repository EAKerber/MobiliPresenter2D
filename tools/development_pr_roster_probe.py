#!/usr/bin/env python3
"""Live GitHub PR/tag roster probe. Read-only; no PR/branch changes."""
import json
import development_retirement_batch as guard

if __name__ == "__main__":
    tags = guard.archive_tags()
    prs = guard.api("pulls?state=open&per_page=100")
    branches = guard.remote_refs()
    current = guard.verify_open_pr_roster(prs, tags, refs=branches)
    refs = {"refs/remotes/origin/" + name: sha for name, sha in branches.items()}
    refs.update({"refs/tags/" + name: sha for name, sha in tags.items()})
    guard.verify_pr_head_retention(guard.PR_HEAD_PINS, refs, guard.PR_NUMBERS - current)
    print(json.dumps({"status":"PASS","openPRs":len(current),"ids":sorted(current),
                      "archivedCandidateTags":len(tags),"fullPRPins":len(guard.PR_HEAD_PINS)}))
