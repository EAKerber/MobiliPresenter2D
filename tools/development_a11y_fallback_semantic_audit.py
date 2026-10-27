#!/usr/bin/env python3
"""Fail-closed, read-only proof: 2026-10-25 image fallback is already superseded.

All historical commits remain retained until a separate hygiene gate archives
the original SHA. This script never writes or calls a network endpoint.
"""
from __future__ import annotations
import json
import subprocess
from pathlib import Path

OLD = "6840d8986e44a7860b541e6becb3b5373ef48c09"
MAIN = "221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
SRC_PATH = "app/how-it-works/how-it-works.js"
GENERIC_PATH = "app/core/image-fallback.js"
EXPECTED = {
    "app/how-it-works/how-it-works.css",
    "app/how-it-works/how-it-works.js",
    "app/how-it-works/index.html",
    "architecture/generated/primary-pages.manifest.json",
    "architecture/pages/how-it-works.page.html",
}

def git(*args: str) -> str:
    process = subprocess.run(["git", *args], capture_output=True, text=True)
    if process.returncode:
        raise RuntimeError("GIT_FAILED " + " ".join(args) + " " + process.stderr[:250])
    return process.stdout.strip()

def require(ok: bool, message: str) -> None:
    if not ok:
        raise RuntimeError(message)

def verify() -> dict:
    require(git("rev-parse", "origin/main") == MAIN, "MAIN_PIN_DRIFT")
    require(git("cat-file", "-t", OLD) == "commit", "SOURCE_COMMIT_MISSING")
    merge = git("merge-base", MAIN, OLD)
    touched = set(git("diff", "--name-only", merge, OLD).splitlines())
    require(touched == EXPECTED, "HISTORIC_SCOPE_CHANGED:" + repr(sorted(touched)))
    old_js = git("show", OLD + ":" + SRC_PATH) + "\n"
    actual = Path(SRC_PATH).read_text(encoding="utf-8")
    require(old_js.startswith("/* Scoped interactive explanation panel. */\n(function(){\n"), "SOURCE_START_CHANGED")
    split = "  const explanations={"
    first, div, trailing = old_js.partition(split)
    require(div == split and actual == "/* Scoped interactive explanation panel. */\n(function(){\n" + split + trailing,
            "LEGACY_PAGE_HANDLER_NOT_ONLY_ADDITION")
    for token in ("document.querySelectorAll(\"[data-image-fallback]\")",
                  'figure.querySelector(".study-space-illustration")',
                  'figure.querySelector(".image-fallback")',
                  'image.addEventListener("error",showFallback,{once:true})',
                  "image.complete&&image.naturalWidth===0",
                  'image.hidden=true', 'fallback.hidden=false', 'fallback.setAttribute("aria-label"'):
        require(token in first, "LEGACY_CONTRACT_MISSING:" + token)
    generic = Path(GENERIC_PATH).read_text(encoding="utf-8")
    for token in ('document.querySelectorAll("[data-image-fallback]")',
                  'frame.querySelectorAll("img[alt]")', 'ensureFallback(frame)',
                  'image.addEventListener("error", showFallback)',
                  'image.addEventListener("load", restoreImage)',
                  'image.complete && image.naturalWidth === 0',
                  'image.hidden = true', 'fallback.hidden = false',
                  'fallback.setAttribute("role", "img")',
                  'fallback.setAttribute("aria-label", label + ": " + alt)',
                  'description.textContent = alt',
                  'if (frame.dataset.imageFallbackBound === "true") return'):
        require(token in generic, "CURRENT_GENERIC_CONTRACT_MISSING:" + token)
    old_page = git("show", OLD + ":architecture/pages/how-it-works.page.html")
    current_page = Path("architecture/pages/how-it-works.page.html").read_text(encoding="utf-8")
    current_generated = Path("app/how-it-works/index.html").read_text(encoding="utf-8")
    # Legacy attached the fallback to <figure>; current shared handler attaches
    # it to the inner media frame so failure does not obscure figcaption.
    require('class="study-art" data-image-fallback' in old_page, "LEGACY_STUDY_SCOPE_CHANGED")
    for page in (current_page, current_generated):
        require('class="study-art"><div class="study-art-media image-fallback-frame" data-image-fallback>' in page,
                "CURRENT_MEDIA_FRAME_SCOPE_CHANGED")
    for page in (old_page, current_page, current_generated):
        require('class="study-space-illustration"' in page, "STUDY_IMG_NOT_PRESENT")
    require(current_page.count("data-image-fallback") == 18, "CURRENT_FRAME_COUNT_NOT_18")
    require(current_generated.count("data-image-fallback") == 18, "GENERATED_FRAME_COUNT_NOT_18")
    script = '<script src="/core/image-fallback.js?v=public-image-fallback-v1"></script>'
    require(script in current_page and script in current_generated,
            "GENERIC_SCRIPT_NOT_LOADED_ON_PUBLISHED_PAGE")
    require(current_generated.index(script) > current_generated.index('<script src="how-it-works.js"></script>'),
            "GENERIC_SCRIPT_ORDER_CHANGED")
    for p in ["tests/public-image-fallback.test.mjs", "tests/public-image-fallback-browser.mjs"]:
        require(Path(p).is_file(), "GENERIC_COVERAGE_MISSING:" + p)
    return {"schemaVersion":"M2DA11yImageFallbackSemanticReconciliation/0.1",
      "historicalBranch":"a11y/image-failure-scalable-placeholder-20261025",
      "historicalSha":OLD,"mainSha":MAIN,
      "historicalChangedPaths":sorted(touched),
      "legacyHandlerRemovedFromPage":True,
      "currentGenericRuntime":GENERIC_PATH,
      "currentPageFrames":18,"landingPageFrames":1,
      "coveredContract":["error", "cached-404", "aria-label-alt", "hidden-img",
                         "restore-on-load", "idempotent-scan", "decorative-skip"],
      "status":"SEMANTIC_SUPERSET_STATIC_CONTRACT_PASS",
      "qualification":"Browser gate separately validates 152 render/error/recovery cases. No changes to runtime and no claim of real-device manual review."}

if __name__ == "__main__":
    result=verify()
    print(json.dumps(result, ensure_ascii=False, indent=2))
