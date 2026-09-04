#!/usr/bin/env python3
from __future__ import annotations
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "reference" / "baseline-manifest.json"


def emit(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True))


def fail(code: str, detail: str) -> int:
    emit({"status": "FAIL", "code": code, "detail": detail})
    return 1


def main() -> int:
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return fail("BASELINE_MANIFEST_MISSING", str(MANIFEST))
    except (OSError, json.JSONDecodeError) as exc:
        return fail("BASELINE_MANIFEST_INVALID", str(exc))

    if manifest.get("schemaVersion") != "BaselineManifest 0.1":
        return fail("BASELINE_SCHEMA_UNSUPPORTED", repr(manifest.get("schemaVersion")))

    canvas = manifest.get("canvas") or {}
    if (canvas.get("width"), canvas.get("height"), canvas.get("origin")) != (1536, 1024, [0, 0]):
        return fail("BASELINE_CANVAS_CONTRACT_INVALID", repr(canvas))

    status = manifest.get("status")
    if status == "UNMATERIALIZED":
        source = manifest.get("intendedSource") or {}
        if source.get("exactBytesRequired") is not True or source.get("sourceLocated") is not False:
            return fail("BASELINE_BLOCKER_CONTRACT_INVALID", repr(source))
        if source.get("reason") != "BASELINE_SOURCE_MISSING":
            return fail("BASELINE_BLOCKER_REASON_INVALID", repr(source.get("reason")))
        payload = {
            "status": "BLOCKED_EXPECTED",
            "code": "BASELINE_SOURCE_MISSING",
            "detail": "R0 contract is coherent; exact checkpoint bytes are still required."
        }
        emit(payload)
        if os.getenv("GITHUB_ACTIONS") == "true":
            print("::warning title=R0 baseline blocked::Exact v3.3.0 source bytes are not materialized; contract checks passed, baseline validation did not run.")
        return 0

    if status != "READY":
        return fail("BASELINE_STATUS_INVALID", repr(status))

    validator = ROOT / "tools" / "validate-baseline.py"
    completed = subprocess.run([sys.executable, str(validator)], cwd=ROOT)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
