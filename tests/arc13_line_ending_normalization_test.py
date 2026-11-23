import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCANNER_PATH = ROOT / "tools" / "arc13" / "scan-ui-inventory.py"
SPEC = importlib.util.spec_from_file_location("arc13_scanner", SCANNER_PATH)
SCANNER = importlib.util.module_from_spec(SPEC)
assert SPEC is not None and SPEC.loader is not None
SPEC.loader.exec_module(SCANNER)


class SourceMapLineEndingNormalizationTest(unittest.TestCase):
    def test_lf_and_crlf_share_source_map_offsets(self):
        lf = "<nav>\n  <a aria-label=\"Abrir menu\">Menu</a>\n</nav>".encode("utf-8")
        crlf = lf.replace(b"\n", b"\r\n")

        normalized_lf = SCANNER.decode_source_map_text(lf)
        normalized_crlf = SCANNER.decode_source_map_text(crlf)

        self.assertEqual(normalized_lf, normalized_crlf)
        self.assertEqual(normalized_lf.index("Abrir menu"), normalized_crlf.index("Abrir menu"))
        self.assertEqual(SCANNER.offset_location(normalized_lf, normalized_lf.index("Menu")), (2, 30))
        self.assertEqual(SCANNER.offset_location(normalized_crlf, normalized_crlf.index("Menu")), (2, 30))

    def test_catalog_copy_can_include_only_template_whitespace(self):
        catalog_text = "Conheça nossos ambientes"
        suffix = " "
        template = catalog_text + suffix + "→"
        context = {
            "manifestSha256": "fixture",
            "texts": {"architecture/pages/root.page.html": template},
            "segments": [
                {
                    "output": {"start": 0, "end": len(catalog_text)},
                    "origin": {
                        "kind": "catalog-key",
                        "path": "app/core/ui-copy.js",
                        "pointer": "/actions/exploreEnvironments",
                        "template": {"path": "architecture/pages/root.page.html"},
                    },
                    "transform": "catalog-key-substitution",
                },
                {
                    "output": {"start": len(catalog_text), "end": len(catalog_text) + len(suffix)},
                    "origin": {
                        "kind": "page",
                        "path": "architecture/pages/root.page.html",
                        "range": {"start": len(catalog_text), "end": len(catalog_text) + len(suffix)},
                    },
                    "transform": "copy",
                },
            ],
        }

        mapped = SCANNER.authoring_at_offset(context, 0, len(catalog_text) + len(suffix))

        self.assertEqual(mapped["status"], "mapped")
        self.assertEqual(mapped["origin"]["kind"], "catalog-key")
        self.assertEqual(mapped["transform"], "catalog-key-substitution-plus-template-whitespace")
        self.assertEqual(mapped["evidence"]["templateWhitespaceSuffix"], suffix)

    def test_catalog_copy_with_non_whitespace_template_suffix_stays_unresolved(self):
        catalog_text = "Conheça nossos ambientes"
        suffix = " →"
        template = catalog_text + suffix
        context = {
            "manifestSha256": "fixture",
            "texts": {"architecture/pages/root.page.html": template},
            "segments": [
                {
                    "output": {"start": 0, "end": len(catalog_text)},
                    "origin": {
                        "kind": "catalog-key",
                        "path": "app/core/ui-copy.js",
                        "pointer": "/actions/exploreEnvironments",
                        "template": {"path": "architecture/pages/root.page.html"},
                    },
                    "transform": "catalog-key-substitution",
                },
                {
                    "output": {"start": len(catalog_text), "end": len(template)},
                    "origin": {
                        "kind": "page",
                        "path": "architecture/pages/root.page.html",
                        "range": {"start": len(catalog_text), "end": len(template)},
                    },
                    "transform": "copy",
                },
            ],
        }

        mapped = SCANNER.authoring_at_offset(context, 0, len(template))

        self.assertEqual(mapped["status"], "unresolved")
        self.assertEqual(mapped["reason"], "sink-crosses-source-map-segments-or-gap")


if __name__ == "__main__":
    unittest.main()
