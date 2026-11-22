#!/usr/bin/env python3
"""Build a deterministic, review-first inventory of HTML text and JavaScript text sinks."""

from __future__ import annotations

import argparse
import hashlib
import json
import posixpath
import re
import shlex
import subprocess
import sys
from collections import Counter, defaultdict, deque
from html import unescape as html_unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit


ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "app"
TOOL_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT = ROOT / "architecture" / "arc13" / "ui-text-candidates.json"
PRIMARY_PAGE_MANIFEST = ROOT / "architecture" / "generated" / "primary-pages.manifest.json"
PRIMARY_PAGE_COMPILER = ROOT / "scripts" / "compile-primary-pages.mjs"
PRIMARY_FRAGMENT = "architecture/fragments/primary-header.fragment.html"
PRIMARY_ROUTES = "architecture/fragments/primary-header.routes.json"
PRIMARY_COPY = "app/core/ui-copy.js"
PRIMARY_MAP_SCHEMA = "M2DARC03CProvenanceMap/2"
PRIMARY_PAGES = {
    "app/index.html": {"route": "/", "source": "architecture/pages/root.page.html"},
    "app/about/index.html": {"route": "/about/", "source": "architecture/pages/about.page.html"},
    "app/how-it-works/index.html": {
        "route": "/how-it-works/",
        "source": "architecture/pages/how-it-works.page.html",
    },
}
TEXT_ATTRIBUTES = {
    "alt",
    "title",
    "placeholder",
    "aria-label",
    "aria-description",
    "aria-placeholder",
    "aria-roledescription",
    "aria-valuetext",
}
REFERENCE_ATTRIBUTES = {
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "aria-errormessage",
    "aria-controls",
    "aria-owns",
    "aria-flowto",
    "for",
}
SCRIPT_TYPES = {
    "",
    "module",
    "text/javascript",
    "application/javascript",
    "text/ecmascript",
    "application/ecmascript",
}
VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data.replace(b"\r\n", b"\n")).hexdigest()


def decode_source_map_text(data: bytes) -> str:
    """Decode source-map text in a platform-independent LF coordinate space."""
    return data.decode("utf-8").replace("\r\n", "\n")


def git_blob_sha(data: bytes) -> str:
    canonical = data.replace(b"\r\n", b"\n")
    return hashlib.sha1(b"blob " + str(len(canonical)).encode("ascii") + b"\0" + canonical).hexdigest()


def offset_location(text: str, offset: int) -> tuple[int, int]:
    offset = max(0, min(offset, len(text)))
    line = text.count("\n", 0, offset) + 1
    previous_newline = text.rfind("\n", 0, offset)
    return line, offset - previous_newline


def json_pointer_value(document: object, pointer: str) -> object:
    if not pointer.startswith("/"):
        raise ValueError("source-map JSON pointer must be absolute")
    value = document
    for raw_part in pointer[1:].split("/"):
        part = raw_part.replace("~1", "/").replace("~0", "~")
        if isinstance(value, list):
            if not part.isdigit():
                raise ValueError("source-map JSON pointer has a non-index list part")
            value = value[int(part)]
        elif isinstance(value, dict):
            value = value[part]
        else:
            raise ValueError("source-map JSON pointer crosses a scalar")
    return value


def _source_map_template(fragment: str, template: object, route_index: int) -> str:
    if not isinstance(template, dict) or template.get("path") != PRIMARY_FRAGMENT:
        raise ValueError("source-map template must point to the shared header fragment")
    source_range = template.get("range")
    if not isinstance(source_range, dict):
        raise ValueError("source-map template range is missing")
    start, end = source_range.get("start"), source_range.get("end")
    if not isinstance(start, int) or isinstance(start, bool) or not isinstance(end, int) or isinstance(end, bool):
        raise ValueError("source-map template offsets must be integers")
    if start < 0 or end <= start or end > len(fragment):
        raise ValueError("source-map template range is outside the fragment")
    placeholder = fragment[start:end]
    match = re.fullmatch(r"\{\{([A-Za-z0-9]+)\}\}", placeholder)
    if not match:
        raise ValueError("source-map template range does not identify one placeholder")
    return "/routes/" + str(route_index) + "/" + match.group(1)


def _source_map_template_key(fragment: str, template: object) -> str:
    if not isinstance(template, dict) or template.get("path") != PRIMARY_FRAGMENT:
        raise ValueError("source-map template must point to the shared header fragment")
    source_range = template.get("range")
    if not isinstance(source_range, dict):
        raise ValueError("source-map template range is missing")
    start, end = source_range.get("start"), source_range.get("end")
    if not isinstance(start, int) or isinstance(start, bool) or not isinstance(end, int) or isinstance(end, bool):
        raise ValueError("source-map template offsets must be integers")
    if start < 0 or end <= start or end > len(fragment):
        raise ValueError("source-map template range is outside the fragment")
    placeholder = fragment[start:end]
    match = re.fullmatch(r"\{\{(copy\.[A-Za-z0-9.]+)\}\}", placeholder)
    if not match:
        raise ValueError("source-map template range does not identify one catalog key")
    return match.group(1)


def _load_copy_catalog() -> dict:
    script = "const c=require(process.argv[1]);process.stdout.write(JSON.stringify(c));"
    result = subprocess.run(
        ["node", "-e", script, str(ROOT / PRIMARY_COPY)],
        check=True, capture_output=True, text=True, encoding="utf-8",
    )
    catalog = json.loads(result.stdout)
    if not isinstance(catalog, dict) or catalog.get("schema") != "M2DUIStringCatalog/1":
        raise ValueError("shared UI copy catalog schema is invalid")
    return catalog


def _escape_catalog_html(value: str) -> str:
    return (value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;").replace("'", "&#39;"))


def _validated_primary_page_context(
    manifest: dict,
    manifest_sha256: str,
    output_path: str,
    route_index: int,
    route_config: dict,
    copy_catalog: dict,
    shared_texts: dict[str, str],
) -> dict:
    expected = PRIMARY_PAGES[output_path]
    matches = [page for page in manifest.get("pages", []) if page.get("output") == output_path]
    if len(matches) != 1:
        raise ValueError("manifest must contain exactly one page for " + output_path)
    page = matches[0]
    if page.get("route") != expected["route"] or page.get("source") != expected["source"]:
        raise ValueError("manifest route/source pairing differs for " + output_path)
    source_bytes = (ROOT / expected["source"]).read_bytes()
    output_bytes = (ROOT / output_path).read_bytes()
    if git_blob_sha(source_bytes) != page.get("sourceGitBlobSha"):
        raise ValueError("source Git blob hash mismatch for " + expected["source"])
    if git_blob_sha(output_bytes) != page.get("outputGitBlobSha"):
        raise ValueError("output Git blob hash mismatch for " + output_path)
    source_text = decode_source_map_text(source_bytes)
    output_text = decode_source_map_text(output_bytes)
    source_map = page.get("sourceMap")
    segments = source_map.get("segments") if isinstance(source_map, dict) else None
    if not isinstance(segments, list):
        raise ValueError("source-map segments missing for " + output_path)

    known_sources = {expected["source"], PRIMARY_FRAGMENT, PRIMARY_ROUTES, PRIMARY_COPY}
    cursor = 0
    output_length = len(output_text)
    fragment = shared_texts[PRIMARY_FRAGMENT]
    for segment in segments:
        if not isinstance(segment, dict):
            raise ValueError("source-map segment is not an object")
        output_range = segment.get("output")
        if not isinstance(output_range, dict):
            raise ValueError("source-map output range missing")
        start, end = output_range.get("start"), output_range.get("end")
        if (
            not isinstance(start, int) or isinstance(start, bool)
            or not isinstance(end, int) or isinstance(end, bool)
            or start != cursor or end <= start or end > output_length
        ):
            raise ValueError("source-map output ranges have a gap, overlap, or invalid boundary")
        transform = segment.get("transform")
        origin = segment.get("origin")
        if not isinstance(origin, dict):
            raise ValueError("source-map origin missing")
        kind = origin.get("kind")
        if kind in {"page", "shared-fragment"}:
            path = origin.get("path")
            source_range = origin.get("range")
            allowed = expected["source"] if kind == "page" else PRIMARY_FRAGMENT
            if path != allowed or path not in known_sources or transform != "copy":
                raise ValueError("source-map copy origin is outside its expected source")
            if not isinstance(source_range, dict):
                raise ValueError("source-map copy range missing")
            source_start, source_end = source_range.get("start"), source_range.get("end")
            source_content = source_text if path == expected["source"] else fragment
            if (
                not isinstance(source_start, int) or isinstance(source_start, bool)
                or not isinstance(source_end, int) or isinstance(source_end, bool)
                or source_start < 0 or source_end <= source_start or source_end > len(source_content)
                or source_end - source_start != end - start
            ):
                raise ValueError("source-map copy source range is invalid")
            if output_text[start:end] != source_content[source_start:source_end]:
                raise ValueError("source-map copy content does not match its positional source range")
        elif kind == "route-config":
            pointer = origin.get("pointer")
            if origin.get("path") != PRIMARY_ROUTES or transform != "route-placeholder-substitution":
                raise ValueError("route-config origin or transform is invalid")
            expected_pointer = _source_map_template(fragment, origin.get("template"), route_index)
            if pointer != expected_pointer:
                raise ValueError("route-config pointer does not match its template placeholder")
            value = json_pointer_value(route_config, pointer)
            if not isinstance(value, str):
                raise ValueError("route-config placeholder must resolve to a string")
            if output_text[start:end] != value:
                raise ValueError("route-config output does not match its declared pointer value")
        elif kind == "catalog-key":
            pointer = origin.get("pointer")
            if origin.get("path") != PRIMARY_COPY or transform != "catalog-key-substitution":
                raise ValueError("catalog-key origin or transform is invalid")
            key = _source_map_template_key(fragment, origin.get("template"))
            expected_pointer = "/" + key.removeprefix("copy.").replace(".", "/")
            if pointer != expected_pointer:
                raise ValueError("catalog pointer does not match its template key")
            if manifest.get("copyCatalog", {}).get("schema") != copy_catalog.get("schema"):
                raise ValueError("UI copy catalog schema differs from the manifest")
            if manifest.get("copyCatalog", {}).get("locale") != copy_catalog.get("locale"):
                raise ValueError("UI copy catalog locale differs from the manifest")
            value = json_pointer_value(copy_catalog, pointer)
            if not isinstance(value, str) or not value.strip():
                raise ValueError("catalog key must resolve to a nonblank string")
            if output_text[start:end] != _escape_catalog_html(value):
                raise ValueError("catalog-key output does not match its declared key")
        elif kind == "generator-rule":
            if transform != "conditional-attribute-generation":
                raise ValueError("generator-rule transform is invalid")
            template_pointer = _source_map_template(fragment, origin.get("template"), route_index)
            placeholder_key = template_pointer.rsplit("/", 1)[1]
            pointer = (
                "/routes/" + str(route_index) + "/current"
                if placeholder_key in {"ambientesCurrent", "howCurrent", "aboutCurrent"}
                else template_pointer
            )
            inputs = origin.get("inputs")
            if not isinstance(inputs, list) or len(inputs) != 1:
                raise ValueError("generator-rule must declare one input")
            item = inputs[0]
            if not isinstance(item, dict) or item.get("kind") != "route-config":
                raise ValueError("generator-rule input must identify route configuration")
            if item.get("path") != PRIMARY_ROUTES or item.get("pointer") != pointer:
                raise ValueError("generator-rule input does not match its template placeholder")
            value = json_pointer_value(route_config, pointer)
            placeholder_key = template_pointer.rsplit("/", 1)[1]
            generated_rules = {
                "ambientesCurrent": ("current-route-to-ambientes-aria-current", "ambientes"),
                "howCurrent": ("current-route-to-how-aria-current", "how"),
                "aboutCurrent": ("current-route-to-about-aria-current", "about"),
                "whatsAppIconAriaHidden": ("true-config-flag-to-aria-hidden", None),
            }
            expected_rule = generated_rules.get(placeholder_key)
            if expected_rule is None or origin.get("rule") != expected_rule[0]:
                raise ValueError("generator-rule name does not match its template placeholder")
            if placeholder_key == "whatsAppIconAriaHidden":
                if not isinstance(value, bool):
                    raise ValueError("aria-hidden rule input must be a boolean")
                expected_output = ' aria-hidden="true"' if value else ""
            else:
                current = json_pointer_value(route_config, "/routes/" + str(route_index) + "/current")
                if not isinstance(current, str):
                    raise ValueError("current-route rule input must be a string")
                expected_output = ' aria-current="page"' if current == expected_rule[1] else ""
            if output_text[start:end] != expected_output:
                raise ValueError("generator-rule output does not match its declared input and rule")
        else:
            raise ValueError("source-map origin kind is unsupported")
        cursor = end
    if cursor != output_length:
        raise ValueError("source-map does not cover the complete generated output")
    page_texts = dict(shared_texts)
    page_texts[expected["source"]] = source_text
    return {
        "segments": segments,
        "texts": page_texts,
        "manifestSha256": manifest_sha256,
        "outputLength": output_length,
        "reason": None,
    }


def load_primary_page_contexts() -> dict[str, dict]:
    contexts = {
        output: {"segments": None, "texts": {}, "reason": "primary-page-manifest-unavailable"}
        for output in PRIMARY_PAGES
    }
    try:
        manifest_bytes = PRIMARY_PAGE_MANIFEST.read_bytes()
        manifest_sha256 = sha256(manifest_bytes)
        manifest = json.loads(manifest_bytes.decode("utf-8"))
        if manifest.get("schema") != "M2DARC03CPublishedPages/3":
            raise ValueError("primary-page manifest schema is not /3")
        source_map = manifest.get("sourceMap")
        if not isinstance(source_map, dict) or source_map.get("schema") != PRIMARY_MAP_SCHEMA:
            raise ValueError("primary-page source-map schema is unsupported")
        if source_map.get("offsetUnit") != "unicode-codepoints":
            raise ValueError("primary-page source-map offset unit is unsupported")
        generator = source_map.get("generator")
        if not isinstance(generator, dict) or generator.get("path") != "scripts/compile-primary-pages.mjs":
            raise ValueError("primary-page source-map generator identity is invalid")
        if git_blob_sha(PRIMARY_PAGE_COMPILER.read_bytes()) != generator.get("gitBlobSha"):
            raise ValueError("primary-page compiler Git blob hash mismatch")
        fragment_bytes = (ROOT / PRIMARY_FRAGMENT).read_bytes()
        route_bytes = (ROOT / PRIMARY_ROUTES).read_bytes()
        if git_blob_sha(fragment_bytes) != manifest.get("fragment", {}).get("gitBlobSha"):
            raise ValueError("primary header fragment Git blob hash mismatch")
        if git_blob_sha(route_bytes) != manifest.get("routesConfig", {}).get("gitBlobSha"):
            raise ValueError("primary route configuration Git blob hash mismatch")
        if manifest.get("fragment", {}).get("path") != PRIMARY_FRAGMENT:
            raise ValueError("primary header fragment path mismatch")
        if manifest.get("routesConfig", {}).get("path") != PRIMARY_ROUTES:
            raise ValueError("primary route configuration path mismatch")
        copy_record = manifest.get("copyCatalog")
        if not isinstance(copy_record, dict) or copy_record.get("path") != PRIMARY_COPY:
            raise ValueError("UI copy catalog identity is missing from the manifest")
        copy_bytes = (ROOT / PRIMARY_COPY).read_bytes()
        if git_blob_sha(copy_bytes) != copy_record.get("gitBlobSha"):
            raise ValueError("UI copy catalog Git blob hash mismatch")
        catalog = _load_copy_catalog()
        if (copy_record.get("schema"), copy_record.get("locale")) != (catalog.get("schema"), catalog.get("locale")):
            raise ValueError("UI copy catalog metadata differs from the manifest")
        fragment = decode_source_map_text(fragment_bytes)
        route_config = json.loads(route_bytes.decode("utf-8"))
        shared_texts = {PRIMARY_FRAGMENT: fragment}
        for index, output in enumerate(PRIMARY_PAGES):
            contexts[output] = _validated_primary_page_context(
                manifest, manifest_sha256, output, index, route_config, catalog, shared_texts
            )
    except Exception as error:
        reason = "primary-page-provenance-invalid: " + str(error)
        for output in PRIMARY_PAGES:
            if contexts[output].get("reason") is not None:
                contexts[output] = {"segments": None, "texts": {}, "reason": reason}
    return contexts


def authoring_at_offset(context: dict, offset: int | None, end_offset: int | None = None) -> dict:
    if context.get("reason"):
        return {"status": "unresolved", "reason": context["reason"]}
    if not isinstance(offset, int):
        return {"status": "unresolved", "reason": "raw-source-offset-unavailable"}
    if end_offset is None:
        end_offset = offset
    if not isinstance(end_offset, int) or end_offset < offset:
        return {"status": "unresolved", "reason": "raw-source-range-invalid"}
    if end_offset == offset:
        return {"status": "unresolved", "reason": "raw-source-range-empty"}
    else:
        matches = [
            segment for segment in context["segments"]
            if segment["output"]["start"] <= offset
            and end_offset <= segment["output"]["end"]
        ]
    if len(matches) != 1:
        return {"status": "unresolved", "reason": "sink-crosses-source-map-segments-or-gap"}
    segment = matches[0]
    origin = dict(segment["origin"])
    result = {
        "status": "mapped",
        "origin": {"kind": origin["kind"]},
        "transform": segment["transform"],
        "evidence": {
            "manifest": "architecture/generated/primary-pages.manifest.json",
            "manifestSha256": context["manifestSha256"],
            "outputOffset": offset,
            "offsetUnit": "unicode-codepoints",
        },
    }
    if origin["kind"] in {"page", "shared-fragment"}:
        source_offset = origin["range"]["start"] + offset - segment["output"]["start"]
        line, column = offset_location(context["texts"][origin["path"]], source_offset)
        result["origin"].update({
            "path": origin["path"],
            "offset": source_offset,
            "line": line,
            "column": column,
        })
    elif origin["kind"] == "route-config":
        result["origin"].update({"path": origin["path"], "pointer": origin["pointer"]})
        result["template"] = origin["template"]
    elif origin["kind"] == "catalog-key":
        result["origin"].update({"path": origin["path"], "pointer": origin["pointer"]})
        result["template"] = origin["template"]
    else:
        result["origin"].update({"rule": origin["rule"], "inputs": origin["inputs"]})
        result["template"] = origin["template"]
    return result


def raw_start_tag_attribute_offsets(raw_tag: str) -> list[tuple[str, int | None, int | None]] | None:
    if not raw_tag.startswith("<"):
        return None
    index, length = 1, len(raw_tag)
    while index < length and raw_tag[index].isspace():
        index += 1
    tag_start = index
    while index < length and not raw_tag[index].isspace() and raw_tag[index] not in "/>":
        index += 1
    if index == tag_start:
        return None
    result: list[tuple[str, int | None, int | None]] = []
    while index < length:
        while index < length and raw_tag[index].isspace():
            index += 1
        if index >= length or raw_tag[index] in "/>":
            break
        name_start = index
        while index < length and not raw_tag[index].isspace() and raw_tag[index] not in "=/>":
            index += 1
        if index == name_start:
            return None
        name = raw_tag[name_start:index].lower()
        while index < length and raw_tag[index].isspace():
            index += 1
        value_start: int | None = None
        value_end: int | None = None
        if index < length and raw_tag[index] == "=":
            index += 1
            while index < length and raw_tag[index].isspace():
                index += 1
            if index < length and raw_tag[index] in {'"', "'"}:
                quote = raw_tag[index]
                index += 1
                value_start = index
                end_quote = raw_tag.find(quote, index)
                if end_quote < 0:
                    return None
                value_end = end_quote
                index = end_quote + 1
            else:
                value_start = index
                while index < length and not raw_tag[index].isspace() and raw_tag[index] != ">":
                    index += 1
                value_end = index
        result.append((name, value_start, value_end))
    return result


def route_for_html(path: Path) -> str:
    relative = path.relative_to(APP).as_posix()
    if relative == "index.html":
        return "/"
    if relative == "admin.html":
        return "/admin"
    if relative == "access/manage.html":
        return "/access/manage"
    if relative == "access/index.html":
        return "/access/"
    if relative.endswith("/index.html"):
        prefix = relative[: -len("/index.html")]
        return "/" if not prefix else "/" + prefix.strip("/") + "/"
    stem = posixpath.splitext(relative)[0]
    return "/" + stem.strip("/") + "/"


def owner_for_source(source: str) -> str:
    source = source.split("#", 1)[0]
    if source == "app/app.js":
        return "config"
    if source == "app/index.html":
        return "landing"
    if source == "app/admin.html":
        return "admin"
    parts = source.split("/")
    if len(parts) > 1 and parts[0] == "app":
        area = parts[1]
        if area in {"core", "data"}:
            return "shared-runtime"
        if area in {"viewer", "config", "admin", "access", "landing", "about", "how-it-works"}:
            return area
    return "unassigned"


class PageParser(HTMLParser):
    def __init__(self, source_path: str, route: str, source_text: str, authoring_context: dict | None = None) -> None:
        super().__init__(convert_charrefs=True)
        self.source_path = source_path
        self.route = route
        self.source_text = source_text
        self.authoring_context = authoring_context
        self.line_offsets = [0]
        self.line_offsets.extend(index + 1 for index, char in enumerate(source_text) if char == "\n")
        self.entries: list[dict] = []
        self.excluded: list[dict] = []
        self.script_roots: list[dict] = []
        self.inline_scripts: list[dict] = []
        self._stack: list[str] = []
        self._script: dict | None = None
        self._script_number = 0
        self._base_href: str | None = None

    def _absolute_offset(self, line: int, column: int) -> int | None:
        if line < 1 or line > len(self.line_offsets):
            return None
        return self.line_offsets[line - 1] + column

    def _emit(
        self, line: int, column: int, kind: str, sink: str, value: str, hint: str,
        authoring_range: tuple[int, int] | None = None,
    ) -> None:
        entry = {
                "source": self.source_path,
                "line": line,
                "column": column + 1,
                "routeConsumers": [self.route],
                "owner": owner_for_source(self.source_path),
                "kind": kind,
                "sink": sink,
                "attribute": sink.split(":", 1)[1] if sink.startswith("attribute:") else None,
                "elementTag": sink.split(":", 1)[1] if sink.startswith("text:") else None,
                "metadataField": sink.split(":", 1)[1] if sink.startswith("meta:") else None,
                "expression": value,
                "value": value,
                "literalSegments": [value] if value else [],
                "classification": "unreviewed",
                "classificationHints": [hint],
            }
        if self.source_path in PRIMARY_PAGES:
            context = self.authoring_context or {
                "reason": "primary-page-source-map-unavailable"
            }
            entry["authoring"] = authoring_at_offset(
                context,
                authoring_range[0] if authoring_range else None,
                authoring_range[1] if authoring_range else None,
            )
        self.entries.append(entry)

    def _exclude(self, line: int, column: int, kind: str, sink: str, value: str, reason: str) -> None:
        self.excluded.append(
            {
                "source": self.source_path,
                "line": line,
                "column": column + 1,
                "routeConsumers": [self.route],
                "owner": owner_for_source(self.source_path),
                "kind": kind,
                "sink": sink,
                "value": value,
                "reason": reason,
            }
        )

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        line, column = self.getpos()
        tag = tag.lower()
        attributes = {name.lower(): value for name, value in attrs}
        if tag == "base" and attributes.get("href"):
            self._base_href = attributes["href"]

        raw_tag = self.get_starttag_text() or ""
        raw_attributes = raw_start_tag_attribute_offsets(raw_tag)
        tag_offset = self._absolute_offset(line, column)
        for attr_index, (name, value) in enumerate(attrs):
            attribute = name.lower()
            authoring_range = None
            if raw_attributes is not None and tag_offset is not None and attr_index < len(raw_attributes):
                raw_name, relative_start, relative_end = raw_attributes[attr_index]
                if raw_name == attribute and relative_start is not None and relative_end is not None:
                    authoring_range = (tag_offset + relative_start, tag_offset + relative_end)
            if attribute == "alt" and (value is None or not value.strip()):
                self._exclude(line, column, "html-attribute", "attribute:alt", value or "", "empty-alt-text")
                continue
            if value is None:
                continue
            if attribute in TEXT_ATTRIBUTES:
                hint = "accessibility-text" if attribute.startswith("aria-") else "visible-or-accessible-ui"
                self._emit(line, column, "html-attribute", "attribute:" + attribute, value, hint, authoring_range)
            elif attribute in REFERENCE_ATTRIBUTES:
                self._emit(line, column, "html-reference", "attribute:" + attribute, value, "non-translatable-reference", authoring_range)
            elif tag == "meta" and attribute == "content":
                meta_name = (attributes.get("name") or attributes.get("property") or "").lower()
                if meta_name in {"description", "og:title", "og:description", "twitter:title", "twitter:description"}:
                    self._emit(line, column, "html-metadata", "meta:" + meta_name, value, "marketing-or-seo-copy", authoring_range)
            elif attribute == "value" and (
                tag in {"button", "option"}
                or (tag == "input" and (attributes.get("type") or "").lower() in {"button", "submit", "reset"})
            ):
                self._emit(line, column, "html-attribute", "attribute:value", value, "visible-or-accessible-ui", authoring_range)

        if tag == "script":
            self._script_number += 1
            script_type = (attributes.get("type") or "").strip().lower()
            script = {
                "path": self.source_path + "#inline-script-" + str(self._script_number),
                "source": "",
                "lineOffset": max(line - 1, 0),
                "columnOffset": column + len(self.get_starttag_text() or ""),
                "executable": script_type in SCRIPT_TYPES and not attributes.get("src"),
            }
            self._script = script
            if attributes.get("src"):
                self.script_roots.append(
                    {"src": attributes["src"], "route": self.route, "baseHref": self._base_href}
                )

        if tag not in VOID_TAGS:
            self._stack.append(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "script" and self._script:
            script = self._script
            if script["executable"] and script["source"].strip():
                self.inline_scripts.append(script)
            self._script = None
        for index in range(len(self._stack) - 1, -1, -1):
            if self._stack[index] == tag:
                del self._stack[index:]
                break

    def handle_data(self, data: str) -> None:
        if self._script is not None:
            self._script["source"] += data
            return
        if any(tag in {"style", "script"} for tag in self._stack):
            return
        if data.strip():
            line, column = self.getpos()
            tag = self._stack[-1] if self._stack else "document"
            authoring_range = None
            if self.source_path in PRIMARY_PAGES:
                authoring_start = self._absolute_offset(line, column)
                if authoring_start is not None:
                    authoring_end = self.source_text.find("<", authoring_start)
                    if authoring_end < 0:
                        authoring_end = len(self.source_text)
                    raw_text = self.source_text[authoring_start:authoring_end]
                    if html_unescape(raw_text) == data:
                        authoring_range = (authoring_start, authoring_end)
            if not re.search(r"[\w]", data, flags=re.UNICODE):
                self._emit(line, column, "html-text", "text:" + tag, data, "symbol-only-context-review", authoring_range)
            else:
                self._emit(line, column, "html-text", "text:" + tag, data, "visible-or-accessible-ui", authoring_range)


def route_script_path(page_route: str, src: str, base_href: str | None = None) -> str | None:
    parsed = urlsplit(src.strip())
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    base_url = "https://local.invalid" + page_route
    if base_href:
        base_url = urljoin(base_url, base_href)
    url_path = urlsplit(urljoin(base_url, src)).path
    normalized = posixpath.normpath("/" + url_path.lstrip("/"))
    if normalized == "/":
        return None
    return "app/" + normalized.lstrip("/")


def resolve_import(source: str, specifier: str) -> str | None:
    if not specifier.startswith("."):
        return None
    source_base = source.split("#", 1)[0]
    suffixless = specifier.split("?", 1)[0]
    resolved = posixpath.normpath(posixpath.join(posixpath.dirname(source_base), suffixless))
    if not resolved.startswith("app/"):
        return None
    candidates = [resolved]
    if not posixpath.splitext(resolved)[1]:
        candidates.extend([resolved + ".js", resolved + ".mjs", resolved + "/index.js"])
    for candidate in candidates:
        if (ROOT / candidate).is_file():
            return candidate
    return None


def build_bundle_sources() -> dict[str, str]:
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    build_command = package.get("scripts", {}).get("build", "")
    tokens = shlex.split(build_command)
    bundles: dict[str, str] = {}
    for index, token in enumerate(tokens[:-1]):
        if token != "esbuild":
            continue
        entrypoint = tokens[index + 1]
        output = None
        for option in tokens[index + 2 :]:
            if option == "&&":
                break
            if option.startswith("--outfile="):
                output = option.split("=", 1)[1]
                break
        if output and entrypoint.startswith("app/") and output.startswith("app/"):
            bundles[output] = entrypoint
    return bundles


def scan(html_only: bool = False) -> dict:
    html_entries: list[dict] = []
    html_exclusions: list[dict] = []
    primary_page_contexts = load_primary_page_contexts()
    js_inputs: dict[str, dict] = {}
    script_roots: list[tuple[str, str]] = []
    inline_script_paths: list[str] = []
    source_hashes: dict[str, str] = {}
    package_path = ROOT / "package.json"
    source_hashes["package.json"] = sha256(package_path.read_bytes())
    bundle_sources = build_bundle_sources()
    html_paths = sorted(APP.rglob("*.html"))

    for path in html_paths:
        relative = path.relative_to(ROOT).as_posix()
        raw = path.read_bytes()
        source_hashes[relative] = sha256(raw)
        # Keep parser offsets and extracted text in a platform-independent
        # coordinate space; ARC-03C source maps also use LF code points.
        source_text = raw.decode("utf-8").replace("\r\n", "\n")
        parser = PageParser(
            relative,
            route_for_html(path),
            source_text,
            primary_page_contexts.get(relative),
        )
        parser.feed(source_text)
        parser.close()
        html_entries.extend(parser.entries)
        html_exclusions.extend(parser.excluded)
        for item in parser.script_roots:
            script_path = route_script_path(parser.route, item["src"], item.get("baseHref"))
            if script_path:
                script_path = bundle_sources.get(script_path, script_path)
                script_roots.append((script_path, item["route"]))
        for inline in parser.inline_scripts:
            js_inputs[inline["path"]] = inline
            inline_script_paths.append(inline["path"])

    skipped: list[dict] = []
    js_paths = sorted(APP.rglob("*"))
    for path in js_paths:
        if not path.is_file() or path.suffix.lower() not in {".js", ".mjs"}:
            continue
        relative = path.relative_to(ROOT).as_posix()
        name = path.name.lower()
        if "node_modules" in path.parts:
            skipped.append({"source": relative, "reason": "third-party"})
            continue
        if (
            name.startswith("test-")
            or name.endswith(("-test.js", "-test.mjs", ".test.js", ".spec.js", ".test.mjs", ".spec.mjs"))
        ):
            skipped.append({"source": relative, "reason": "test"})
            continue
        if ".bundle." in name or name.endswith(".min.js"):
            skipped.append({"source": relative, "reason": "generated-or-minified"})
            continue
        if html_only:
            skipped.append({"source": relative, "reason": "not-scanned-html-only"})
            continue
        raw = path.read_bytes()
        source_hashes[relative] = sha256(raw)
        js_inputs[relative] = {
            "path": relative,
            "source": raw.decode("utf-8").replace("\r\n", "\n"),
        }
    if html_only:
        skipped.extend(
            {"source": source, "reason": "not-scanned-html-only"}
            for source in inline_script_paths
        )

    js_result = {"entries": [], "sourceEntries": [], "importEdges": [], "parseErrors": [], "excludedSinks": []}
    if js_inputs and not html_only:
        process = subprocess.run(
            ["node", str(TOOL_DIR / "scan-js-sinks.mjs")],
            input=json.dumps({"files": list(js_inputs.values())}, ensure_ascii=False),
            text=True,
            encoding="utf-8",
            capture_output=True,
            cwd=ROOT,
            check=False,
        )
        if process.returncode != 0:
            raise RuntimeError("JavaScript scanner failed: " + process.stderr.strip())
        js_result = json.loads(process.stdout)

    route_consumers: dict[str, set[str]] = defaultdict(set)
    graph: dict[str, set[str]] = defaultdict(set)
    for source, route in script_roots:
        route_consumers[source].add(route)
    for edge in js_result["importEdges"]:
        target = resolve_import(edge["source"], edge["specifier"])
        if target:
            graph[edge["source"]].add(target)

    queue = deque((source, route) for source, route in script_roots)
    visited: set[tuple[str, str]] = set()
    while queue:
        source, route = queue.popleft()
        if (source, route) in visited:
            continue
        visited.add((source, route))
        route_consumers[source].add(route)
        for target in graph.get(source, ()):
            queue.append((target, route))

    js_entries = js_result["entries"]
    js_source_entries = js_result.get("sourceEntries", [])
    for entry in js_entries:
        entry["owner"] = owner_for_source(entry["source"].split("#", 1)[0])
        entry["routeConsumers"] = sorted(route_consumers.get(entry["source"], set()))
        if not entry["routeConsumers"]:
            entry["classificationHints"] = sorted(set(entry["classificationHints"] + ["route-owner-unresolved"]))

    for entry in js_source_entries:
        entry["owner"] = owner_for_source(entry["source"].split("#", 1)[0])
        entry["routeConsumers"] = sorted(route_consumers.get(entry["source"], set()))
        if not entry["routeConsumers"]:
            entry["sourceRouteOwnership"] = "unresolved"

    js_exclusions = js_result.get("excludedSinks", [])
    for entry in js_exclusions:
        entry["owner"] = owner_for_source(entry["source"].split("#", 1)[0])
        entry["routeConsumers"] = sorted(route_consumers.get(entry["source"], set()))
        if not entry["routeConsumers"]:
            entry["routeOwnership"] = "unresolved"

    entries = html_entries + js_entries
    for entry in entries:
        base_source = entry["source"].split("#", 1)[0]
        entry["sourceSha256"] = source_hashes.get(base_source)
    for entry in js_source_entries:
        base_source = entry["source"].split("#", 1)[0]
        entry["sourceSha256"] = source_hashes.get(base_source)
    excluded_entries = html_exclusions + js_exclusions
    for entry in excluded_entries:
        base_source = entry["source"].split("#", 1)[0]
        entry["sourceSha256"] = source_hashes.get(base_source)
    excluded_entries.sort(key=lambda item: (item["source"], item["line"], item["column"], item["sink"], item["reason"]))
    entries.sort(
        key=lambda item: (
            item["source"],
            item["line"],
            item["column"],
            item["kind"],
            item["sink"],
            item["expression"],
        )
    )
    occurrence_count: Counter[str] = Counter()
    for entry in entries:
        group = entry["source"] + ":" + str(entry["line"]) + ":" + entry["sink"]
        identity = json.dumps(
            [
                entry["source"],
                entry["line"],
                entry["column"],
                entry["kind"],
                entry["sink"],
                entry["expression"],
                occurrence_count[group],
            ],
            ensure_ascii=False,
            separators=(",", ":"),
        )
        occurrence_count[group] += 1
        entry["id"] = sha256(identity.encode("utf-8"))[:16]

    js_source_entries.sort(
        key=lambda item: (
            item["source"], item["line"], item["column"], item["sourceRole"],
            item["sourceBinding"], item["valuePath"], item["expression"],
        )
    )
    source_occurrence_count: Counter[str] = Counter()
    for entry in js_source_entries:
        group = entry["source"] + ":" + str(entry["line"]) + ":" + entry["sourceRole"]
        identity = json.dumps(
            [
                entry["source"], entry["line"], entry["column"], entry["kind"],
                entry["sourceRole"], entry["sourceBinding"], entry["valuePath"],
                entry["expression"], source_occurrence_count[group],
            ],
            ensure_ascii=False,
            separators=(",", ":"),
        )
        source_occurrence_count[group] += 1
        entry["id"] = sha256(identity.encode("utf-8"))[:16]

    for entry in js_source_entries:
        targets = entry.pop("sameTryCatchTargets", [])
        consumer_refs = entry.get("consumerRefs", [])
        for target in targets:
            matches = [
                sink for sink in js_entries
                if sink["source"] == entry["source"]
                and sink["line"] == target["line"]
                and sink["sink"] == target["sink"]
                and sink["expression"] == target["expression"]
            ]
            consumer_refs.extend(
                {
                    "sinkId": sink["id"],
                    "source": sink["source"],
                    "line": sink["line"],
                    "sink": sink["sink"],
                    "expression": sink["expression"],
                    "routeConsumers": sink["routeConsumers"],
                    "flow": "same-try-catch",
                }
                for sink in matches
            )
        if consumer_refs:
            entry["consumerLinkStatus"] = "same-try-catch"
            entry["consumerRefs"] = consumer_refs
        elif targets:
            entry["consumerLinkStatus"] = "catch-sink-not-indexed"
            entry["useStatus"] = "diagnostic-or-user-message-review"

        source_targets = entry.pop("consumerTargets", [])
        for target in source_targets:
            target_source = target.get("source", entry["source"])
            matches = [
                sink for sink in js_entries
                if sink["source"] == target_source
                and sink["line"] == target["line"]
                and sink["sink"] == target["sink"]
                and sink["expression"] == target["expression"]
            ]
            consumer_refs.extend(
                {
                    "sinkId": sink["id"],
                    "source": sink["source"],
                    "line": sink["line"],
                    "sink": sink["sink"],
                    "expression": sink["expression"],
                    "routeConsumers": sink["routeConsumers"],
                    "flow": target.get("flow", "bounded-helper-or-option-factory"),
                }
                for sink in matches
            )
        if consumer_refs:
            entry["consumerRefs"] = consumer_refs
            if entry.get("consumerLinkStatus") not in {"same-try-catch"}:
                flows = {ref["flow"] for ref in consumer_refs}
                entry["consumerLinkStatus"] = next(iter(flows)) if len(flows) == 1 else "bounded-source-to-sink"
        elif source_targets:
            entry["consumerLinkStatus"] = "declared-sink-not-indexed"

        fallback_targets = entry.pop("failureFallbackTargets", [])
        fallback_refs = []
        for target in fallback_targets:
            target_source = target.get("source", entry["source"])
            matches = [
                sink for sink in entries
                if sink["source"] == target_source
                and sink["line"] == target["line"]
                and sink["sink"] == target["sink"]
                and sink["expression"] == target["expression"]
            ]
            if len(matches) == 1:
                sink = matches[0]
                fallback_refs.append({
                    "sinkId": sink["id"],
                    "source": sink["source"],
                    "line": sink["line"],
                    "sink": sink["sink"],
                    "expression": sink["expression"],
                    "routeConsumers": sink["routeConsumers"],
                    "relationship": target.get("relationship", "error-to-fixed-fallback"),
                    "evidence": target.get("evidence", ""),
                })
                intermediate = target.get("intermediateFailureResponse")
                if intermediate:
                    intermediate_ref = dict(intermediate)
                    intermediate_path = ROOT / intermediate_ref["source"]
                    if intermediate_path.is_file():
                        intermediate_ref["sourceSha256"] = sha256(intermediate_path.read_bytes())
                    fallback_refs[-1]["intermediateFailureResponse"] = intermediate_ref
            elif len(matches) > 1:
                entry["failureFallbackLinkStatus"] = "ambiguous-fallback-target"
        if fallback_refs:
            entry["failureFallbackRefs"] = fallback_refs
            entry["failureFallbackLinkStatus"] = "bounded-error-to-fixed-fallback"
        elif fallback_targets and not entry.get("failureFallbackLinkStatus"):
            entry["failureFallbackLinkStatus"] = "declared-fallback-not-indexed"

    summary = {
        "htmlFilesScanned": len(html_paths),
        "htmlOccurrences": sum(entry["kind"].startswith("html-") for entry in entries),
        "excludedHtmlOccurrences": len(html_exclusions),
        "javascriptFilesScanned": sum(
            path.endswith((".js", ".mjs"))
            for path in source_hashes
        ),
        "inlineJavaScriptBlocksScanned": len(inline_script_paths) if not html_only else 0,
        "javascriptSinkSites": len(js_entries),
        "javascriptTextSourceRecords": len(js_source_entries),
        "javascriptTextSourceRecordsActive": sum(entry.get("useStatus") == "active" for entry in js_source_entries),
        "javascriptTextSourceRecordsPassedButUnused": sum(entry.get("useStatus") == "passed-but-unused" for entry in js_source_entries),
        "javascriptTextSourceRecordsUnconsumed": sum(entry.get("useStatus") == "unconsumed" for entry in js_source_entries),
        "javascriptTextSourceRecordsNeedsFlowReview": sum(entry.get("useStatus") == "diagnostic-or-user-message-review" for entry in js_source_entries),
        "javascriptTextSourceRecordsDiagnostic": sum(entry.get("classification") == "diagnostic" for entry in js_source_entries),
        "javascriptTextSourceRecordsWithSinkLinks": sum(bool(entry.get("consumerRefs")) for entry in js_source_entries),
        "javascriptTextSourceSinkLinks": sum(len(entry.get("consumerRefs", [])) for entry in js_source_entries),
        "javascriptTextSourceRecordsWithFailureFallbacks": sum(bool(entry.get("failureFallbackRefs")) for entry in js_source_entries),
        "javascriptTextSourceFailureFallbackLinks": sum(len(entry.get("failureFallbackRefs", [])) for entry in js_source_entries),
        "javascriptTextSourceRoles": dict(sorted(Counter(entry["sourceRole"] for entry in js_source_entries).items())),
        "excludedJavaScriptSinks": len(js_result["excludedSinks"]),
        "javascriptStaticValues": sum(entry["value"] is not None for entry in js_entries),
        "javascriptDynamicOrMixedValues": sum(entry["value"] is None for entry in js_entries),
        "javascriptParseErrors": len(js_result["parseErrors"]),
        "javascriptNotScannedSources": sum(item["reason"] == "not-scanned-html-only" for item in skipped),
        "javascriptNotScannedInlineBlocks": len(inline_script_paths) if html_only else 0,
        "sourceFiles": len(source_hashes),
        "unassignedOwnerSites": sum(entry.get("owner") == "unassigned" for entry in entries + excluded_entries),
        "unassignedRouteSites": sum(
            not entry.get("routeConsumers")
            for entry in js_entries + js_exclusions
        ),
        "primaryPageAuthoringMappedOccurrences": sum(
            entry.get("authoring", {}).get("status") == "mapped"
            for entry in html_entries
            if entry.get("source") in PRIMARY_PAGES
        ),
        "primaryPageAuthoringUnresolvedOccurrences": sum(
            entry.get("authoring", {}).get("status") == "unresolved"
            for entry in html_entries
            if entry.get("source") in PRIMARY_PAGES
        ),
    }
    expression_counts = Counter(
        entry["expression"] for entry in entries if entry.get("expression")
    )
    static_value_counts = Counter(
        entry["value"] for entry in entries if isinstance(entry.get("value"), str)
    )
    summary.update(
        {
            "unreviewedOccurrences": sum(entry.get("classification") == "unreviewed" for entry in entries),
            "htmlReferenceOccurrences": sum(entry.get("kind") == "html-reference" for entry in entries),
            "altTextOccurrences": sum(entry.get("attribute") == "alt" for entry in entries),
            "distinctExactExpressions": len(expression_counts),
            "exactExpressionDuplicateGroups": sum(count > 1 for count in expression_counts.values()),
            "exactExpressionDuplicateOccurrences": sum(count for count in expression_counts.values() if count > 1),
            "exactExpressionOccurrencesBeyondFirst": sum(count - 1 for count in expression_counts.values() if count > 1),
            "distinctExactStaticValues": len(static_value_counts),
            "exactStaticValueDuplicateGroups": sum(count > 1 for count in static_value_counts.values()),
            "exactStaticValueDuplicateOccurrences": sum(count for count in static_value_counts.values() if count > 1),
            "exactStaticValueOccurrencesBeyondFirst": sum(count - 1 for count in static_value_counts.values() if count > 1),
        }
    )
    tool_package_path = TOOL_DIR / "package.json"
    tool_package = json.loads(tool_package_path.read_text(encoding="utf-8"))
    lockfile_path = TOOL_DIR / "package-lock.json"
    generator_inputs = [
        tool_package_path,
        TOOL_DIR / "scan-ui-inventory.py",
        TOOL_DIR / "scan-js-sinks.mjs",
        PRIMARY_PAGE_COMPILER,
        PRIMARY_PAGE_MANIFEST,
        ROOT / PRIMARY_FRAGMENT,
        ROOT / PRIMARY_ROUTES,
        *(ROOT / page["source"] for page in PRIMARY_PAGES.values()),
    ]
    if lockfile_path.is_file():
        generator_inputs.append(lockfile_path)
    return {
        "schemaVersion": 4,
        "generator": "tools/arc13/scan-ui-inventory.py",
        "generatorInputs": [
            {
                "path": path.relative_to(ROOT).as_posix(),
                "sha256": sha256(path.read_bytes()),
            }
            for path in generator_inputs
        ],
        "javascriptParser": {
            "name": "acorn",
            "requestedVersion": tool_package.get("devDependencies", {}).get("acorn"),
            "lockfileSha256": sha256(lockfile_path.read_bytes()) if lockfile_path.is_file() else None,
        },
        "status": "candidate-html-only" if html_only else "candidate-unreviewed",
        "completeness": "html-only-js-not-scanned" if html_only else "bounded-html-js-sinks-and-selected-text-sources",
        "scope": {
            "html": "All app/**/*.html, including visible text, selected text-bearing attributes, references, and executable inline scripts. HTML occurrences in the three ARC-03C compiled primary pages carry additive authoring provenance from the compiler source map when its hashes and ranges validate.",
            "javascript": "Not scanned in HTML-only mode." if html_only else "All app/**/*.js and app/**/*.mjs except tests, generated bundles, and minified files; sink sites include configured DOM text, accessibility, status helpers, selected direct string insertion calls, and shallow local constant candidates. A separate sourceEntries list captures policy-bound literal tables, arrays written to recognized sinks, selected public data fields, Error/TypeError constructor messages, and selected custom Error message arguments without counting them as additional sink occurrences.",
            "routeOwnership": "Routes derive from local HTML script references and static relative import edges; dynamic loading and unresolved imports remain unassigned.",
            "sourceOwnership": "Page and script owners derive from known app path segments; unrecognized paths remain unassigned and are counted.",
            "excluded": [
                "CSS declarations and generated content, except the recognized JavaScript data-compact-label sink",
            "JSON and catalog/configuration data values; only explicitly listed fields in selected JavaScript data modules are source records",
                "text without a recognized JavaScript sink",
                "JavaScript values requiring interprocedural or runtime data-flow analysis",
                "third-party, generated, minified, and test sources",
                "external scripts and externally hosted content",
                "all JavaScript and inline scripts when generated with --html-only",
                "empty alternative text, static markup-only values, and text content assigned to recognized style elements (listed separately as exclusions)",
            ],
        },
        "classificationCategories": [
            "ui-visible",
            "aria-accessibility",
            "editorial-seo",
            "v5-authorable-content",
            "catalog-commercial",
            "diagnostic",
            "system-message",
            "decorative-symbol",
            "user-or-sensitive-data",
            "identifier-or-reference",
            "unknown",
        ],
        "summary": summary,
        "primaryPageAuthoringProvenance": {
            "manifest": "architecture/generated/primary-pages.manifest.json",
            "manifestSha256": sha256(PRIMARY_PAGE_MANIFEST.read_bytes()) if PRIMARY_PAGE_MANIFEST.is_file() else None,
            "sourceMapSchema": PRIMARY_MAP_SCHEMA,
            "offsetUnit": "unicode-codepoints",
            "outputs": [
                {
                    "path": output,
                    "route": PRIMARY_PAGES[output]["route"],
                    "status": "mapped" if not primary_page_contexts[output].get("reason") else "unresolved",
                    "reason": primary_page_contexts[output].get("reason"),
                }
                for output in PRIMARY_PAGES
            ],
        },
        "parseErrors": sorted(js_result["parseErrors"], key=lambda item: (item["source"], item["line"])),
        "skippedSources": skipped,
        "excludedEntries": excluded_entries,
        "entries": entries,
        "sourceEntries": js_source_entries,
        "sourceFiles": [{"path": path, "sha256": digest} for path, digest in sorted(source_hashes.items())],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--html-only", action="store_true", help="generate a clearly partial HTML inventory without the Acorn dependency")
    args = parser.parse_args()
    try:
        inventory = scan(html_only=args.html_only)
    except Exception as error:
        print(str(error), file=sys.stderr)
        return 2
    args.output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(inventory, ensure_ascii=False, indent=2) + "\n"
    args.output.write_text(payload, encoding="utf-8", newline="\n")
    try:
        output_label = args.output.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        output_label = str(args.output.resolve())
    print(json.dumps(inventory["summary"], ensure_ascii=False, sort_keys=True))
    print("Output: " + output_label)
    if inventory["summary"]["javascriptParseErrors"]:
        print("Coverage remains incomplete; review parseErrors in the inventory.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
