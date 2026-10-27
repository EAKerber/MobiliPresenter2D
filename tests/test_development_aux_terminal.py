import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
from development_aux_terminal import attest,OP
M="221b54b2a41ecc8c338d1bf2cf67280cf165ce95"
B="2ea9627ed315430586adccf269594a1769169d89"
H="8bc69de89f977b9e82960c5b0c950c6fe6854fc1"
D="f"*40
def fixture():
    m={"schemaVersion":"M2DDevAuxTerminal/0.1","repository":"EAKerber/MobiliPresenter2D",
       "operational":OP,"mainSha":M,"developmentBaseSha":B,"operationalSha":H}
    old={"baseSha":M,"totals":{"branches":60},
         "rows":[{"branch":"docs/legacy"+str(i),"sha":str(i%8+1)*40} for i in range(60)]}
    refs={x["branch"]:x["sha"] for x in old["rows"]}
    refs.update({"main":M,"development":D,OP:H})
    return m,old,refs
class ExactTerminal(unittest.TestCase):
    def test_full_exact_roster_passes(self):
        m,o,r=fixture()
        self.assertEqual(attest(m,o,r,D),r)
    def test_extra_unlisted_ref_rejected(self):
        m,o,r=fixture();r["other"]="a"*40
        with self.assertRaisesRegex(RuntimeError,"UNEXPECTED_REMOTE"):attest(m,o,r,D)
    def test_moved_operational_rejected(self):
        m,o,r=fixture();r[OP]="a"*40
        with self.assertRaisesRegex(RuntimeError,"UNEXPECTED_REMOTE"):attest(m,o,r,D)
    def test_missing_original_history_rejected(self):
        m,o,r=fixture();r.pop("docs/legacy0")
        with self.assertRaisesRegex(RuntimeError,"UNEXPECTED_REMOTE"):attest(m,o,r,D)
    def test_changed_original_history_rejected(self):
        m,o,r=fixture();r["docs/legacy5"]="a"*40
        with self.assertRaisesRegex(RuntimeError,"UNEXPECTED_REMOTE"):attest(m,o,r,D)
    def test_wrong_control_sha_rejected(self):
        m,o,r=fixture()
        with self.assertRaisesRegex(RuntimeError,"UNEXPECTED_REMOTE"):attest(m,o,r,"a"*40)
    def test_modified_main_pin_rejected(self):
        m,o,r=fixture();m["mainSha"]="a"*40
        with self.assertRaisesRegex(RuntimeError,"BAD_TERMINAL"):attest(m,o,r,D)
    def test_modified_branch_pin_rejected(self):
        m,o,r=fixture();m["operationalSha"]="a"*40
        with self.assertRaisesRegex(RuntimeError,"BAD_TERMINAL"):attest(m,o,r,D)
    def test_duplicate_original_rejected(self):
        m,o,r=fixture();o["rows"][1]=o["rows"][0]
        with self.assertRaisesRegex(RuntimeError,"INVALID_ORIGINAL"):attest(m,o,r,D)
    def test_wrong_schema_rejected(self):
        m,o,r=fixture();m["schemaVersion"]="unsafe"
        with self.assertRaisesRegex(RuntimeError,"BAD_TERMINAL"):attest(m,o,r,D)
if __name__=="__main__":
    unittest.main()
