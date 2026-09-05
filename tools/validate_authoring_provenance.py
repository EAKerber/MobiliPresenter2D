#!/usr/bin/env python3
"""Validate that authored candidates came through the canonical full-frame delta workflow."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
HEX64 = re.compile(r"^[0-9a-f]{64}$")


class AuthoringProvenanceError(RuntimeError):
    def __init__(self, code: str, detail: str):
        super().__init__(detail)
        self.code = code
        self.detail = detail


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def metadata_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*.json") if path.name != "extraction-report.json" and not path.name.startswith("_"))


def require_repo_relative(relative: str) -> Path:
    path = (REPO_ROOT / relative).resolve()
    path.relative_to(REPO_ROOT.resolve())
    return path


def validate_record(metadata_path: Path, roles_doc: dict[str, Any], contracts_doc: dict[str, Any]) -> dict[str, Any]:
    metadata = load_json(metadata_path)
    role_id = metadata.get("role")
    roles = {role["id"]: role for role in roles_doc["roles"]}
    role = roles.get(role_id)
    if role is None:
        raise AuthoringProvenanceError("AUTHORING_ROLE_UNKNOWN", repr(role_id))
    contract_id = role.get("authoringContractId")
    if not contract_id:
        return {"id": metadata.get("id"), "role": role_id, "status": "NOT_REQUIRED"}

    contracts = {item["id"]: item for item in contracts_doc["contracts"]}
    contract = contracts.get(contract_id)
    if contract is None:
        raise AuthoringProvenanceError("AUTHORING_CONTRACT_UNKNOWN", contract_id)
    if contract.get("role") != role_id or contract.get("targetVariant") != metadata.get("targetVariant"):
        raise AuthoringProvenanceError("AUTHORING_CONTRACT_SCOPE_MISMATCH", contract_id)
    if contract.get("mode") != "edit-existing-canonical-frame" or contract.get("deltaExtractionRequired") is not True:
        raise AuthoringProvenanceError("AUTHORING_CONTRACT_MODE_INVALID", contract_id)

    provenance = metadata.get("provenance") or {}
    if provenance.get("method") != "image-edit":
        raise AuthoringProvenanceError("AUTHORING_METHOD_INVALID", repr(provenance.get("method")))
    if provenance.get("authoringContractId") != contract_id:
        raise AuthoringProvenanceError("AUTHORING_CONTRACT_BINDING_MISMATCH", repr(provenance.get("authoringContractId")))
    if provenance.get("deltaExtractionRequired") is not True:
        raise AuthoringProvenanceError("AUTHORING_DELTA_EXTRACTION_NOT_DECLARED", contract_id)

    refs = provenance.get("sourceReferences") or []
    missing_refs = [item for item in contract.get("requiredSourceReferences", []) if item not in refs]
    if missing_refs:
        raise AuthoringProvenanceError("AUTHORING_SOURCE_REFERENCE_MISSING", ", ".join(missing_refs))
    for field in ("sourceFrameSha256", "editedFrameSha256"):
        value = provenance.get(field)
        if not isinstance(value, str) or not HEX64.fullmatch(value):
            raise AuthoringProvenanceError("AUTHORING_FRAME_HASH_INVALID", f"{field}={value!r}")

    report_rel = provenance.get("extractionReport")
    if not isinstance(report_rel, str):
        raise AuthoringProvenanceError("AUTHORING_EXTRACTION_REPORT_MISSING", repr(report_rel))
    report_path = require_repo_relative(report_rel)
    if not report_path.exists():
        raise AuthoringProvenanceError("AUTHORING_EXTRACTION_REPORT_MISSING", report_rel)
    report = load_json(report_path)
    if report.get("schemaVersion") != "CandidateDeltaExtractionReport 0.1" or report.get("status") != "PASS":
        raise AuthoringProvenanceError("AUTHORING_EXTRACTION_REPORT_INVALID", report_rel)
    expected = {
        "role": role_id,
        "targetVariant": metadata.get("targetVariant"),
        "authoringContractId": contract_id,
        "sourceFrameSha256": provenance["sourceFrameSha256"],
        "editedFrameSha256": provenance["editedFrameSha256"]
    }
    for key, value in expected.items():
        if report.get(key) != value:
            raise AuthoringProvenanceError("AUTHORING_EXTRACTION_REPORT_MISMATCH", f"{key}: {report.get(key)!r} != {value!r}")
    if report.get("outsideAuthorizedRoiChangedPixelCount") != 0 or report.get("roundtripMismatchPixelCount") != 0:
        raise AuthoringProvenanceError("AUTHORING_EXTRACTION_GATE_NOT_CLEAN", report_rel)

    image_rel = metadata.get("imagePath")
    if not isinstance(image_rel, str):
        raise AuthoringProvenanceError("AUTHORING_IMAGE_PATH_INVALID", repr(image_rel))
    image_path = require_repo_relative(image_rel)
    actual_candidate_sha = sha256_file(image_path)
    if report.get("candidateSha256") != actual_candidate_sha:
        raise AuthoringProvenanceError("AUTHORING_CANDIDATE_HASH_MISMATCH", actual_candidate_sha)
    if metadata.get("expectedImageSha256") != actual_candidate_sha:
        raise AuthoringProvenanceError("AUTHORING_METADATA_HASH_MISMATCH", actual_candidate_sha)

    return {
        "id": metadata.get("id"),
        "role": role_id,
        "status": "PASS",
        "authoringContractId": contract_id,
        "candidateSha256": actual_candidate_sha,
        "sourceFrameSha256": provenance["sourceFrameSha256"],
        "editedFrameSha256": provenance["editedFrameSha256"]
    }


def validate_all(candidate_root: Path, roles_path: Path, contracts_path: Path) -> dict[str, Any]:
    roles_doc = load_json(roles_path)
    contracts_doc = load_json(contracts_path)
    if contracts_doc.get("schemaVersion") != "CandidateAuthoringContracts 0.1":
        raise AuthoringProvenanceError("AUTHORING_CONTRACT_SCHEMA_UNSUPPORTED", repr(contracts_doc.get("schemaVersion")))
    records = []
    for path in metadata_files(candidate_root):
        try:
            records.append(validate_record(path, roles_doc, contracts_doc))
        except AuthoringProvenanceError as exc:
            records.append({"metadataPath": str(path), "status": "FAIL", "errorCode": exc.code, "detail": exc.detail})
    failures = [item for item in records if item["status"] == "FAIL"]
    return {
        "schemaVersion": "CandidateAuthoringProvenanceReport 0.1",
        "status": "FAIL" if failures else "PASS",
        "code": "NO_CANDIDATES" if not records else None,
        "candidateCount": len(records),
        "failureCount": len(failures),
        "records": records
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate-root", type=Path, default=REPO_ROOT / "review-assets" / "candidates")
    parser.add_argument("--roles", type=Path, default=REPO_ROOT / "review-assets" / "roles.json")
    parser.add_argument("--contracts", type=Path, default=REPO_ROOT / "review-assets" / "authoring-contracts.json")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        report = validate_all(args.candidate_root.resolve(), args.roles.resolve(), args.contracts.resolve())
    except (OSError, KeyError, json.JSONDecodeError, AuthoringProvenanceError) as exc:
        code = exc.code if isinstance(exc, AuthoringProvenanceError) else "AUTHORING_PROVENANCE_ERROR"
        detail = exc.detail if isinstance(exc, AuthoringProvenanceError) else str(exc)
        report = {"schemaVersion": "CandidateAuthoringProvenanceReport 0.1", "status": "FAIL", "code": code, "detail": detail, "candidateCount": 0, "failureCount": 1, "records": []}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "code": report.get("code"), "candidateCount": report.get("candidateCount", 0), "failureCount": report.get("failureCount", 0)}, sort_keys=True))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
