#!/usr/bin/env python3
"""Read-only, exact-ref provenance audit of original DS-02 imagery and legacy scene overlays.

No file mutation in the Git repository, no network calls, no build, no deployment.
The audit is deliberately strict about what an archive branch *does not* authorize:
a different original image does not imply that the current image should be replaced.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

REPOSITORY = "EAKerber/MobiliPresenter2D"
ORIGINALS_SHA = "e9c405bfc0189baed8b4b679a1113c37b6ddbd21"
ORIGINALS_ARCHIVE_TAG = "archive/m2d/ds02-imagens-originais-e9c405bf"
SCENE_SHA = "20040da835d6da66b03f73642c0c44db109dd6e8"
SCENE_ARCHIVE_TAG = "archive/m2d/pr34-exposed-sides-glass-20040da8"
EXPECTED_CHANGED_PATHS = {
    f"app/landing/assets/icons/{size}/{room}.webp"
    for size in ("large", "small")
    for room in ("cozinha", "escritorio", "lavanderia", "quarto", "sala")
}
SHA40 = re.compile(r"^[0-9a-f]{40}$")


def verify_archive_tags(refs):
    expected = {
        "refs/tags/" + ORIGINALS_ARCHIVE_TAG: ORIGINALS_SHA,
        "refs/tags/" + SCENE_ARCHIVE_TAG: SCENE_SHA,
    }
    for ref, sha in expected.items():
        if refs.get(ref) != sha:
            raise RuntimeError("PINNED_ARCHIVE_TAG_MISSING_OR_MOVED:" + ref)
    return expected


def git(*args):
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout.strip()


def object_sha(ref, path):
    if not path or path.startswith("/") or ".." in Path(path).parts or "\\x00" in path:
        raise ValueError("unsafe git path")
    result = subprocess.run(["git", "rev-parse", "--verify", f"{ref}:{path}"],
                            capture_output=True, text=True)
    if result.returncode != 0:
        return None
    sha = result.stdout.strip()
    if not SHA40.fullmatch(sha):
        raise RuntimeError("invalid git object id")
    return sha


def classify(manifest, archive_map, current_map):
    if (manifest.get("repository") != REPOSITORY
        or manifest.get("active_count") != 36
        or manifest.get("legacy_count") != 4
        or manifest.get("file_count") != 40
        or not isinstance(manifest.get("files"), list)
        or len(manifest["files"]) != 40):
        raise RuntimeError("DS02_MANIFEST_INCOMPATIBLE")
    results = []
    archived = set()
    sources = set()
    for row in manifest["files"]:
        path = row["source_path"]
        archive = row["archive_path"]
        category = row["category"]
        sha = row["git_blob_sha"]
        if (category not in {"used", "legacy"}
            or archive != ("originais_em_uso/" if category == "used" else "legados_para_consulta/") + path
            or not SHA40.fullmatch(sha)
            or path in sources or archive in archived
            or not path.startswith("app/")):
            raise RuntimeError("DS02_ENTRY_INVALID_OR_DUPLICATE:" + path)
        sources.add(path)
        archived.add(archive)
        if archive_map.get(archive) != sha:
            raise RuntimeError("DS02_ARCHIVE_HASH_MISMATCH:" + path)
        current = current_map.get(path)
        status = ("missing" if current is None else
                  "identical" if current == sha else "changed")
        results.append({
            "sourcePath": path, "archivePath": archive, "category": category,
            "archiveBlob": sha, "currentBlob": current, "status": status,
            "bytes": row["size_bytes"]
        })
    if sum(row["category"] == "used" for row in results) != 36:
        raise RuntimeError("DS02_ACTIVE_COUNT_MISMATCH")
    if sum(row["category"] == "legacy" for row in results) != 4:
        raise RuntimeError("DS02_LEGACY_COUNT_MISMATCH")
    changed = {row["sourcePath"] for row in results if row["status"] == "changed"}
    if changed != EXPECTED_CHANGED_PATHS:
        raise RuntimeError("DS02_CHANGED_PATH_SET_DRIFT:" + repr(sorted(changed)))
    if any(row["status"] == "missing" for row in results):
        raise RuntimeError("DS02_SOURCE_PATH_MISSING")
    return results


def tree_map(ref):
    # Pinned tree identity: a branch name is never an adequate content proof.
    data = git("ls-tree", "-r", "--full-tree", ref).splitlines()
    out = {}
    for line in data:
        meta, name = line.split("\t", 1)
        sha = meta.split()[2]
        if name in out or not SHA40.fullmatch(sha):
            raise RuntimeError("INVALID_GIT_TREE")
        out[name] = sha
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="artifacts/asset-provenance/report.json")
    args = parser.parse_args()
    head = git("rev-parse", "HEAD")
    refs = {}
    for line in git("for-each-ref", "--format=%(refname) %(objectname)", "refs/tags").splitlines():
        ref, sha = line.split(" ", 1)
        refs[ref] = sha
    for ref, sha in verify_archive_tags(refs).items():
        git("cat-file", "-e", sha + "^{commit}")
    original_tree = tree_map(ORIGINALS_SHA)
    current_tree = tree_map(head)
    old_scene_tree = tree_map(SCENE_SHA)
    manifest_blob = git("show", ORIGINALS_SHA + ":manifest.json")
    manifest = json.loads(manifest_blob)
    files = classify(manifest, original_tree, current_tree)
    # Ensure archival branch contains only the declared 40 originals plus metadata.
    if set(original_tree) != {row["archivePath"] for row in files} | {"README.txt", "manifest.json"}:
        raise RuntimeError("DS02_ARCHIVE_UNDECLARED_FILES")

    overlaps = sorted(set(old_scene_tree) & set(current_tree))
    old_only = sorted(set(old_scene_tree) - set(current_tree))
    different = sorted(path for path in overlaps if old_scene_tree[path] != current_tree[path])
    identical = sorted(path for path in overlaps if old_scene_tree[path] == current_tree[path])

    # Specific binary deltas require human scene-review, not automatic copying.
    scene_assets = [
        {"path": path, "sourceBlob": old_scene_tree[path],
         "destinationBlob": current_tree.get(path),
         "classification": ("historic_only" if path not in current_tree else
                            "identical" if current_tree[path] == old_scene_tree[path] else "different")}
        for path in sorted(old_scene_tree)
        if path.startswith("app/assets/kitchen/")
    ]
    summary = {
        "schemaVersion": "M2DAssetProvenance/0.1",
        "repository": REPOSITORY,
        "developmentSha": head,
        "archive": {"tag": ORIGINALS_ARCHIVE_TAG, "sha": ORIGINALS_SHA,
                    "files": len(files), "identical": sum(x["status"] == "identical" for x in files),
                    "changed": sum(x["status"] == "changed" for x in files),
                    "missing": sum(x["status"] == "missing" for x in files),
                    "originalBytes": sum(x["bytes"] for x in files)},
        "scene": {"tag": SCENE_ARCHIVE_TAG, "sha": SCENE_SHA,
                  "samePathIdentical": len(identical),
                  "samePathDifferent": len(different),
                  "historicOnlyPaths": len(old_only)},
        "originals": files,
        "sceneAssets": scene_assets,
        "decision": {
            "archive": "RETAIN_PINNED; do not merge ZIP distribution branch or replace changed icons",
            "scene": "HOLD_VISUAL; compare occlusion, masks, pixel fidelity, and user decisions before any binary promotion",
            "writes": "NO_PRODUCTION_OR_ASSET_WRITES"
        }
    }
    if summary["archive"]["identical"] != 30 or summary["archive"]["changed"] != 10:
        raise RuntimeError("DS02_EXPECTED_PARITY_DRIFT")
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(json.dumps({
        "developmentSha": head,
        "archive": summary["archive"],
        "scene": summary["scene"],
        "sceneBinaryDifferences": [x["path"] for x in scene_assets if x["classification"] != "identical"],
        "status": "PASS_READ_ONLY"
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
