import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
from development_aux_retirement import validate,verify_roster,OP
M="a"*40;D="b"*40;X="c"*40
def f():
    six=[{"branch":"integration/aux"+str(k),"sha":str(k+1)*40} for k in range(6)]
    old=[{"branch":"docs/legacy"+str(k),"sha":str(k%8+1)*40} for k in range(60)]
    m={"schemaVersion":"M2DDevelopmentAuxBatch/0.1","wave":"M2D-DEV-AUX-A1-20261027",
       "repository":"EAKerber/MobiliPresenter2D","control":"development",
       "mainSha":M,"baseline":"00eadf770513107db4be71519e6a38a9da9f9854","operational":OP,"targets":six[:3]}
    p={"stableMainSha":M,"controlSha":"994d7f613db144cbb07d638b05754820170a20a4","status":"PROPOSAL_ONLY_NO_DELETE",
       "authorizedDeletions":0,"allAuxiliaries":six}
    o={"baseSha":M,"totals":{"branches":60},"rows":old}
    return m,p,o
class Safeties(unittest.TestCase):
    def test_exact_roster(self):
        m,p,o=f(); old,aux=validate(m,p,o); full={**old,**aux,"main":M,"development":D,OP:X}
        self.assertEqual(verify_roster(full,old,aux,M,D,X),full)
    def test_extra_branch_fails(self):
        m,p,o=f();old,aux=validate(m,p,o)
        refs={**old,**aux,"main":M,"development":D,OP:X,"unapproved":"f"*40}
        with self.assertRaisesRegex(RuntimeError,"INVENTORY_DRIFT"):
            verify_roster(refs,old,aux,M,D,X)
    def test_changed_target_sha_fails(self):
        m,p,o=f();old,aux=validate(m,p,o);refs={**old,**aux,"main":M,"development":D,OP:X}
        refs[next(iter(aux))]="f"*40
        with self.assertRaisesRegex(RuntimeError,"INVENTORY_DRIFT"):
            verify_roster(refs,old,aux,M,D,X)
    def test_missing_historical_fails(self):
        m,p,o=f();old,aux=validate(m,p,o);refs={**old,**aux,"main":M,"development":D,OP:X}
        del refs[next(iter(old))]
        with self.assertRaisesRegex(RuntimeError,"INVENTORY_DRIFT"):
            verify_roster(refs,old,aux,M,D,X)
    def test_six_targets_fails(self):
        m,p,o=f();m["targets"]=p["allAuxiliaries"]
        with self.assertRaisesRegex(RuntimeError,"STRICT_BATCH_SHAPE"):validate(m,p,o)
    def test_reordered_targets_fails(self):
        m,p,o=f();m["targets"].reverse()
        with self.assertRaisesRegex(RuntimeError,"STRICT_BATCH_SHAPE"):validate(m,p,o)
    def test_proposal_changed_fails(self):
        m,p,o=f();p["authorizedDeletions"]=1
        with self.assertRaisesRegex(RuntimeError,"CONTEXT_MISMATCH"):validate(m,p,o)
    def test_main_changed_fails(self):
        m,p,o=f();m["mainSha"]="f"*40
        with self.assertRaisesRegex(RuntimeError,"CONTEXT_MISMATCH"):validate(m,p,o)
    def test_duplicate_history_fails(self):
        m,p,o=f();o["rows"][1]=o["rows"][0]
        with self.assertRaisesRegex(RuntimeError,"INVALID_PINNED_HISTORY"):validate(m,p,o)
    def test_development_target_fails(self):
        m,p,o=f();p["allAuxiliaries"][0]["branch"]="development";m["targets"]=p["allAuxiliaries"][:3]
        with self.assertRaisesRegex(RuntimeError,"INVALID_PINNED_HISTORY"):validate(m,p,o)
    def test_wrong_repo_fails(self):
        m,p,o=f();m["repository"]="different/repo"
        with self.assertRaisesRegex(RuntimeError,"CONTEXT_MISMATCH"):validate(m,p,o)
if __name__=="__main__":unittest.main()
