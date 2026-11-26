import json, subprocess, tempfile, unittest, sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import ops


def g(repo,*args):
    return subprocess.check_output(['git','-C',str(repo),*args],stderr=subprocess.PIPE,text=True).strip()

def put(repo,path,text):
    f=repo/path;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(text,encoding='utf-8')

def commit(repo,msg):
    g(repo,'add','-A');g(repo,'commit','-qm',msg);return g(repo,'rev-parse','HEAD')

def init(repo):
    repo.mkdir();g(repo,'init','-q','-b','main');g(repo,'config','user.email','fixture@example.invalid');g(repo,'config','user.name','Fixture')

def fixture(base):
    repo=base/'product';ds=base/'ds';init(repo);init(ds)
    plan='''# Plano sintético
### DOM-004 — Publicação
#### Critério de conclusão
Publicação validada.
### DOM-010 — Preços
**Dependências:** DOM-004, DOM-008/012; fixture autorizada.
#### Critério de conclusão
DTO restrito.
### TST-011 — Gate
**Dependências:** DOM-010
# Anexo A — Registro canônico
| 001 | `DOM-004` | publicação |
| 002 | `DOM-010` | preço |
| 003 | `TST-011` | teste |
# Anexo B — Outro
| 001 | `NOT-999` | não pertence ao anexo A |
'''
    put(ds,ops.PLAN,plan);ds_sha=commit(ds,'plan')
    ds_blob=g(ds,'rev-parse',f'HEAD:{ops.PLAN}')
    register={'schema':'PlanV09OperationalRegister/1','planSource':{'blobSha':ds_blob},'entries':[
        {'id':'DOM-004','title':'Publicação','priority':'P0','reconciliation':'done','development':'done'},
        {'id':'DOM-010','title':'Preço','priority':'P0','reconciliation':'partial','nextAction':'validar publicação hospedada'},
        {'id':'TST-011','title':'Gate','priority':'P0','reconciliation':'unreviewed'}]}
    put(repo,ops.REGISTER,json.dumps(register));put(repo,ops.IMPACT,json.dumps({'schema':'M2DTestImpactMap/1','bundles':[{'id':'price','paths':['app/**']}]}))
    for file in ['shared.js','reverse.js','removed.js','old.js','same.js']: put(repo,'app/'+file,'base\n')
    commit(repo,'base');g(repo,'branch','development');put(repo,'app/reverse.js','main fix\n');put(repo,'app/shared.js','main variant\n');put(repo,'app/same.js','same change\n');put(repo,'app/main-only.js','main-only\n');commit(repo,'main correction')
    g(repo,'checkout','-q','development');put(repo,'app/shared.js','development variant\n');put(repo,'app/same.js','same change\n');put(repo,'app/old.js','development update\n');(repo/'app/removed.js').unlink();put(repo,'app/dev-only.js','development-only\n');commit(repo,'development work')
    return repo,ds

class OpsTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.repo,self.ds=fixture(Path(self.tmp.name));self.o=self.capture();self.n={'schema':'M2DOpsNotes/0.1','authority':'agent_assertion_not_verified'}
    def capture(self): return ops.seal(ops.snapshot(self.repo,'main','development',self.ds,'main'))
    def test_exact_tree_not_commit_count(self):
        rows={x['path']:x for x in ops.diff_rows(self.o)}
        self.assertNotIn('app/same.js',rows);self.assertEqual(rows['app/shared.js']['direction'],'both_changed');self.assertEqual(rows['app/reverse.js']['direction'],'main_changed');self.assertEqual(rows['app/removed.js']['direction'],'development_changed');self.assertEqual(rows['app/dev-only.js']['presence'],'development_only');self.assertEqual(len(rows),6)
    def test_readonly_git_and_uncommitted_changes_ignored(self):
        put(self.repo,'untracked.txt','dirty');before=g(self.repo,'status','--porcelain');refs=g(self.repo,'show-ref');head=g(self.repo,'rev-parse','HEAD')
        self.assertEqual(self.capture(),self.o);self.assertEqual(g(self.repo,'status','--porcelain'),before);self.assertEqual(g(self.repo,'show-ref'),refs);self.assertEqual(g(self.repo,'rev-parse','HEAD'),head)
    def test_plan_and_hints(self):
        self.assertTrue(self.o['plan_check']['complete']);self.assertTrue(self.o['planPinMatches']);self.assertEqual(self.o['plan_hints']['DOM-010'][0]['mentions'],['DOM-004','DOM-008']);self.assertIn('DTO restrito.',ops.context(self.o,self.n,'DOM-010')['plan_source_sections'][0]['criteria'][0]['text']);self.assertEqual(ops.candidates(self.o,self.n)['candidates'][0]['state'],'review_candidate')
    def test_no_unreviewed_is_not_started(self):
        c=ops.candidates(self.o,self.n);t=next(x for x in c['candidates'] if x.get('id')=='TST-011');self.assertEqual(t['kind'],'reconcile_existing_first');self.assertTrue(c['possible_groups'])
    def test_explicit_dependencies_and_cycles(self):
        self.n['edges']=[{'from':a,'to':b,'type':'requires','reason':'fixture assertion','evidence':['source']} for a,b in [('DOM-010','TST-011'),('TST-011','DOM-010')]]
        c=ops.candidates(self.o,self.n);self.assertEqual(c['dependency_cycles'],['DOM-010','TST-011']);self.assertEqual(next(x for x in c['candidates'] if x.get('id')=='DOM-010')['state'],'dependency_cycle')
    def test_receipt_scope(self):
        self.n['receipts']=[{'id':'R','destination':'development','scope':{'app/shared.js':self.o['trees']['development']['app/shared.js']},'claim':'test','evidence':['test report'],'objectives':['DOM-010']}]
        self.assertEqual(ops.check_receipts(self.o,self.n)[0]['status'],'declared_scope_unchanged')
        put(self.repo,'app/unrelated.js','new');commit(self.repo,'unrelated');o=self.capture();self.assertEqual(ops.check_receipts(o,self.n)[0]['status'],'declared_scope_unchanged')
        put(self.repo,'app/shared.js','changed');commit(self.repo,'scope change');self.assertEqual(ops.check_receipts(self.capture(),self.n)[0]['status'],'scope_changed')
    def test_scoped_disposition(self):
        row=next(x for x in ops.diff_rows(self.o) if x['path']=='app/shared.js');p=row['path'];self.n['dispositions']=[{'fingerprint':row['fingerprint'],'observationId':self.o['observationId'],'planBlob':self.o['sourceBlobs']['plan'],'state':'equivalent','reason':'fixture judgment','evidence':['fixture test'],'scope':{d:{p:self.o['trees'][d][p]} for d in ['main','development']}}]
        get=lambda o:next(x for x in ops.reconciliation(o,self.n)['differences'] if x['path']==p)['state']
        self.assertEqual(get(self.o),'agent_asserted_equivalent');put(self.repo,'unrelated.md','notes');commit(self.repo,'unrelated');self.assertEqual(get(self.capture()),'agent_asserted_equivalent')
        put(self.repo,p,'new');commit(self.repo,'scope');self.assertEqual(get(self.capture()),'needs_review')
    def test_unscoped_disposition_not_reused(self):
        row=next(ops.diff_rows(self.o));self.n['dispositions']=[{'fingerprint':row['fingerprint'],'observationId':self.o['observationId'],'state':'intentional','reason':'test','evidence':['fixture']}]
        put(self.repo,'unrelated.md','notes');commit(self.repo,'unrelated');self.assertEqual(len(ops.reconciliation(self.capture(),self.n)['unmatched_dispositions']),1)
    def test_concurrent_move_rejected(self):
        real=ops.pin; count=0
        def changing(repo,ref):
            nonlocal count
            if repo==self.repo and ref=='main':
                count+=1
                if count==2:return 'f'*40
            return real(repo,ref)
        with patch('ops.pin',side_effect=changing):
            with self.assertRaisesRegex(ValueError,'REF_MOVED'):self.capture()
    def test_tampering_detected(self):
        self.o['entries'][0]['reconciliation']='partial'
        with self.assertRaisesRegex(ValueError,'altered'):ops.validate(self.o)
    def test_merge_base_unavailable(self):
        self.o['trees']['base']=None
        self.assertTrue(all(r['direction']=='unknown_baseline' for r in ops.diff_rows(self.o)))
    def test_hygiene_receipt_historical_not_live(self):
        self.n['hygieneReceipts']=[{'schemaVersion':'MergedPrHeadCleanupReceipt 0.1','pullRequest':506,'result':'DELETED','readback':'PASS','proof':{'proof':'SQUASH_TREE_IDENTICAL'}}]
        self.assertIn('historical',ops.hygiene_history(self.n)[0]['authority'])
    def test_artifact_ancestry_and_bite(self):
        self.n['nodes']=[{'id':'artifact:old','kind':'implementation','reference':'commit/path'}]
        self.n['edges']=[{'from':'DOM-010','to':'artifact:old','type':'derived_from','reason':'technical provenance','evidence':['fixture']}]
        self.n['bites']=[{'id':'B1','members':['objective:DOM-010'],'intent':'price contract','acceptance':'restricted DTO','validation':['test'],'rollback':'revert','destination':'development'}]
        c=ops.candidates(self.o,self.n);self.assertEqual(c['bites'][0]['state'],'agent_proposal_reviewable');self.assertEqual(ops.context(self.o,self.n,'DOM-010')['artifact_nodes'][0]['id'],'artifact:old')
        self.n['bites'][0]['members'].append('diff:missing');self.assertEqual(ops.candidates(self.o,self.n)['bites'][0]['state'],'needs_refresh')
    def test_multiple_dispositions_do_not_hide_conflict(self):
        row=next(ops.diff_rows(self.o));d={'fingerprint':row['fingerprint'],'observationId':self.o['observationId'],'state':'intentional','reason':'test','evidence':['fixture']};self.n['dispositions']=[d,dict(d,state='conflict')]
        self.assertEqual(ops.reconciliation(self.o,self.n)['differences'][0]['state'],'conflicting_assertions')
    def test_plan_pin_mismatch(self):
        put(self.ds,ops.PLAN,'# modified plan');commit(self.ds,'modified plan');o=self.capture();self.assertFalse(o['planPinMatches']);self.assertFalse(o['plan_check']['complete'])
    def test_cli(self):
        o=Path(self.tmp.name)/'observation.json';o.write_text(json.dumps(self.o));script=Path(ops.__file__)
        out=subprocess.check_output([sys.executable,str(script),'handover',str(o)],text=True);self.assertIn('Handover derivado',out);self.assertIn('não são ordens',out)
        result=json.loads(subprocess.check_output([sys.executable,str(script),'status',str(o)],text=True));self.assertEqual(result['total'],3)

if __name__=='__main__':unittest.main()
