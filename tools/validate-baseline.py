#!/usr/bin/env python3
"""Validate the canonical R0 baseline manifest.

This script is deliberately fail-closed. Before exact baseline bytes are imported,
it exits with code 2 and reports BASELINE_SOURCE_MISSING rather than treating the
historical description as a valid baseline.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "reference" / "baseline-manifest.json"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def fail(code: str, detail: str, exit_code: int = 2) -> int:
    print(json.dumps({"status": "BLOCKED", "code": code, "detail": detail}, ensure_ascii=False))
    return exit_code


def main() -> int:
    if not MANIFEST.exists():
        return fail("BASELINE_MANIFEST_MISSING", str(MANIFEST))

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return fail("BASELINE_MANIFEST_INVALID", str(exc))

    if manifest.get("schemaVersion") != "BaselineManifest 0.1":
        return fail("BASELINE_SCHEMA_UNSUPPORTED", repr(manifest.get("schemaVersion")))

    if manifest.get("status") != "READY":
        reason = manifest.get("intendedSource", {}).get("reason") or "BASELINE_NOT_READY"
        return fail(reason, "Exact canonical baseline bytes have not been materialized.")

    canvas = manifest.get("canvas") or {}
    if (canvas.get("width"), canvas.get("height")) != (1536, 1024):
        return fail("BASELINE_CANVAS_INVALID", repr(canvas))

    golden = manifest.get("golden")
    if not isinstance(golden, dict) or not golden.get("path") or not golden.get("sha256"):
        return fail("BASELINE_GOLDEN_INVALID", repr(golden))

    errors: list[str] = []
    records = [golden, *(manifest.get("assets") or [])]
    for record in records:
        rel = record.get("path")
        expected = record.get("sha256")
        if not isinstance(rel, str) or not isinstance(expected, str):
            errors.append(f"invalid-record:{record!r}")
            continue
        path = ROOT / rel
        if not path.is_file():
            errors.append(f"missing:{rel}")
            continue
        actual = sha256(path)
        if actual != expected:
            errors.append(f"sha256:{rel}:{actual}!={expected}")

    if errors:
        return fail("BASELINE_VALIDATION_FAILED", "; ".join(errors), 1)

    print(json.dumps({"status": "PASS", "assets": len(records) - 1, "golden": golden["path"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
