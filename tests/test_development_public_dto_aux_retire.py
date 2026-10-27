import copy,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
from development_public_dto_aux_retire import expected_roster,BRANCH,SOURCE,STABLE
D="b"*40
def example():
    inv={"baseSha":STABLE,"totals":{"branches":60},"rows":[
        {"branch":"docs/legacy"+str(i),"sha":str(i%8+1)*40} for i in range(60)]}
    return inv
class OneShot(unittest.TestCase):
    def test_valid_roster(self):
        i=example();r=expected_roster(i,D)
        self.assertEqual(len(r),63)
        self.assertEqual(r[BRANCH],SOURCE)
        self.assertEqual(r["main"],STABLE)
    def test_wrong_main_blocked(self):
        i=example();i["baseSha"]="a"*40
        with self.assertRaisesRegex(RuntimeError,"INVENTORY_INVALID"):expected_roster(i,D)
    def test_missing_historical_blocked(self):
        i=example();i["rows"].pop()
        with self.assertRaisesRegex(RuntimeError,"INVENTORY_INVALID"):expected_roster(i,D)
    def test_duplicate_branch_blocked(self):
        i=example();i["rows"][1]["branch"]=i["rows"][0]["branch"]
        with self.assertRaisesRegex(RuntimeError,"INVENTORY_INVALID"):expected_roster(i,D)
    def test_bad_sha_blocked(self):
        i=example();i["rows"][9]["sha"]="123"
        with self.assertRaisesRegex(RuntimeError,"INVENTORY_INVALID"):expected_roster(i,D)
    def test_overlapping_control_blocked(self):
        i=example();i["rows"][0]["branch"]="development"
        with self.assertRaisesRegex(RuntimeError,"INVENTORY_INVALID"):expected_roster(i,D)
    def test_wrong_count_blocked(self):
        i=example();i["totals"]["branches"]=59
        with self.assertRaisesRegex(RuntimeError,"INVENTORY_INVALID"):expected_roster(i,D)
    def test_manifest_mismatch_blocked(self):
        i=example();i["baseSha"]=None
        with self.assertRaisesRegex(RuntimeError,"INVENTORY_INVALID"):expected_roster(i,D)
if __name__=="__main__":unittest.main()
