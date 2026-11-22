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


if __name__ == "__main__":
    unittest.main()
