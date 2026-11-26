#!/usr/bin/env python3
"""Append-only Git-tag receipts that prevent replay of destructive branch grants."""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import uuid
from typing import Any


SCHEMA = "BranchHygieneConsumption 0.1"


def _git(*args: str, input_text: str | None = None, check: bool = True) -> str:
    proc = subprocess.run(
        ["git", *args], input=input_text, text=True, capture_output=True, check=False
    )
    if check and proc.returncode:
        raise RuntimeError("CONSUMPTION_GIT_FAILED:" + " ".join(args))
    return proc.stdout.strip()


def operation_key(repository: str, flow: str, identity: dict[str, Any]) -> str:
    canonical = json.dumps(
        {"repository": repository, "flow": flow, "identity": identity},
        sort_keys=True, separators=(",", ":"), ensure_ascii=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _tag_ref(key: str, stage: str, pin: dict[str, str] | None = None) -> str:
    suffix = ""
    if pin is not None:
        pin_hash = hashlib.sha256(json.dumps(
            pin, sort_keys=True, separators=(",", ":")
        ).encode("utf-8")).hexdigest()
        suffix = "/" + pin_hash
    if stage not in {"reservation", "intent", "done", "applied"}:
        raise ValueError("INVALID_CONSUMPTION_STAGE")
    return f"refs/tags/branch-hygiene/consumption/v1/{key}/{stage}{suffix}"


def read_marker(key: str, stage: str, pin: dict[str, str] | None = None) -> dict[str, Any] | None:
    remote_ref = _tag_ref(key, stage, pin)
    rows = _git("ls-remote", "--refs", "origin", remote_ref).splitlines()
    if not rows:
        return None
    if len(rows) != 1:
        raise RuntimeError("CONSUMPTION_MARKER_READBACK_INVALID")
    object_sha, found_ref = rows[0].split("\t", 1)
    if found_ref != remote_ref or not re.fullmatch(r"[0-9a-f]{40}", object_sha):
        raise RuntimeError("CONSUMPTION_MARKER_READBACK_INVALID")
    local_ref = "refs/codex-hygiene/consumption/read/" + object_sha
    _git("fetch", "--no-tags", "origin", remote_ref + ":" + local_ref)
    raw = _git("cat-file", "-p", local_ref)
    header, separator, message = raw.partition("\n\n")
    fields = dict(line.split(" ", 1) for line in header.splitlines() if " " in line)
    if not separator or fields.get("type") != "commit":
        raise RuntimeError("CONSUMPTION_MARKER_NOT_ANNOTATED")
    try:
        value = json.loads(message)
    except json.JSONDecodeError as error:
        raise RuntimeError("CONSUMPTION_MARKER_INVALID_JSON") from error
    if (value.get("schemaVersion") != SCHEMA or value.get("key") != key
            or value.get("stage") != stage or value.get("commitSha") != fields.get("object")
            or (pin is not None and value.get("pin") != pin)):
        raise RuntimeError("CONSUMPTION_MARKER_IDENTITY_MISMATCH")
    return value


def write_marker(
    key: str, stage: str, repository: str, flow: str, identity: dict[str, Any],
    run_id: str, commit_sha: str, pin: dict[str, str] | None = None,
) -> dict[str, Any]:
    if not re.fullmatch(r"[0-9a-f]{40}", commit_sha):
        raise ValueError("INVALID_CONSUMPTION_COMMIT")
    remote_ref = _tag_ref(key, stage, pin)
    expected = {
        "schemaVersion": SCHEMA, "key": key, "repository": repository, "flow": flow,
        "identity": identity, "runId": run_id, "commitSha": commit_sha,
        "stage": stage,
    }
    if pin is not None:
        expected["pin"] = pin
    existing = read_marker(key, stage, pin)
    if existing is not None:
        if existing != expected:
            raise RuntimeError("CONSUMPTION_MARKER_CONFLICT:" + stage)
        return existing

    local_tag = "codex-consumption-" + key[:16] + "-" + stage + "-" + uuid.uuid4().hex[:12]
    message = json.dumps(expected, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    _git("tag", "-a", local_tag, "-m", message, commit_sha)
    try:
        proc = subprocess.run(
            ["git", "push", "--force-with-lease=" + remote_ref + ":", "origin",
             "refs/tags/" + local_tag + ":" + remote_ref],
            text=True, capture_output=True, check=False,
        )
        if proc.returncode:
            # A concurrent writer may have created the identical marker.
            existing = read_marker(key, stage, pin)
            if existing != expected:
                raise RuntimeError("CONSUMPTION_MARKER_CREATE_FAILED")
    finally:
        _git("tag", "-d", local_tag, check=False)
    recorded = read_marker(key, stage, pin)
    if recorded != expected:
        raise RuntimeError("CONSUMPTION_MARKER_READBACK_FAILED:" + stage)
    return recorded


def reserve_operation(
    repository: str, flow: str, identity: dict[str, Any], run_id: str, commit_sha: str,
) -> tuple[str, dict[str, Any] | None]:
    if not isinstance(run_id, str) or not run_id:
        raise RuntimeError("CONSUMPTION_RUN_ID_MISSING")
    key = operation_key(repository, flow, identity)
    applied = read_marker(key, "applied")
    if applied is not None:
        return key, applied
    reservation = read_marker(key, "reservation")
    if reservation is not None and reservation.get("runId") != run_id:
        raise RuntimeError("CONSUMPTION_RESERVED_BY_OTHER_RUN")
    if reservation is None:
        write_marker(key, "reservation", repository, flow, identity, run_id, commit_sha)
    return key, None


def pin_marker(
    key: str, stage: str, pin: dict[str, str] | None = None,
) -> dict[str, Any] | None:
    if stage not in {"intent", "done"}:
        raise ValueError("INVALID_PIN_STAGE")
    return read_marker(key, stage, pin)


def write_pin_marker(
    key: str, stage: str, repository: str, flow: str, identity: dict[str, Any],
    run_id: str, commit_sha: str, pin: dict[str, str],
) -> dict[str, Any]:
    if stage not in {"intent", "done"}:
        raise ValueError("INVALID_PIN_STAGE")
    return write_marker(key, stage, repository, flow, identity, run_id, commit_sha, pin)


def mark_applied(
    key: str, repository: str, flow: str, identity: dict[str, Any],
    run_id: str, commit_sha: str,
) -> dict[str, Any]:
    return write_marker(key, "applied", repository, flow, identity, run_id, commit_sha)
