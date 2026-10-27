import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from development_access_dto_aux_retire import BRANCH, MAIN_SHA, SOURCE, expected_roster

D = "b" * 40


def inventory():
    return {
        "baseSha": MAIN_SHA, "totals": {"branches": 60},
        "rows": [{"branch": "historic/item" + str(i), "sha": format(i + 1, "040x")} for i in range(60)]
    }


class TestAccessDtoRetirement(unittest.TestCase):
    def test_exact_roster(self):
        roster = expected_roster(inventory(), D)
        self.assertEqual(len(roster), 63)
        self.assertEqual(roster["main"], MAIN_SHA)
        self.assertEqual(roster["development"], D)
        self.assertEqual(roster[BRANCH], SOURCE)

    def test_wrong_main_rejected(self):
        bad = inventory()
        bad["baseSha"] = "a" * 40
        with self.assertRaises(RuntimeError): expected_roster(bad, D)

    def test_lost_historical_branch_rejected(self):
        bad = inventory()
        bad["rows"].pop()
        with self.assertRaises(RuntimeError): expected_roster(bad, D)

    def test_duplicate_branch_rejected(self):
        bad = inventory()
        bad["rows"][1]["branch"] = bad["rows"][0]["branch"]
        with self.assertRaises(RuntimeError): expected_roster(bad, D)

    def test_invalid_head_rejected(self):
        bad = inventory()
        bad["rows"][5]["sha"] = "short"
        with self.assertRaises(RuntimeError): expected_roster(bad, D)

    def test_aux_overlap_rejected(self):
        bad = inventory()
        bad["rows"][12]["branch"] = BRANCH
        with self.assertRaises(RuntimeError): expected_roster(bad, D)

    def test_main_overlap_rejected(self):
        bad = inventory()
        bad["rows"][11]["branch"] = "main"
        with self.assertRaises(RuntimeError): expected_roster(bad, D)

    def test_development_overlap_rejected(self):
        bad = inventory()
        bad["rows"][8]["branch"] = "development"
        with self.assertRaises(RuntimeError): expected_roster(bad, D)

    def test_wrong_count_rejected(self):
        bad = inventory()
        bad["totals"]["branches"] = 59
        with self.assertRaises(RuntimeError): expected_roster(bad, D)

    def test_invalid_dev_sha_rejected(self):
        with self.assertRaises(RuntimeError): expected_roster(inventory(), "not-a-sha")


if __name__ == "__main__":
    unittest.main()
