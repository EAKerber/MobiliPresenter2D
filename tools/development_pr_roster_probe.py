#!/usr/bin/env python3
"""Live GitHub PR/tag roster probe. Read-only; no PR/branch changes."""
import json
import development_retirement_batch as guard

if __name__ == "__main__":
    tags = guard.archive_tags()
    prs = guard.api("pulls?state=open&per_page=100")
    current = guard.verify_open_pr_roster(prs, tags)
    print(json.dumps({"status":"PASS","openPRs":len(current),"ids":sorted(current),
                      "archivedCandidateTags":4,"fullPRPins":len(guard.PR_HEAD_PINS)}))
