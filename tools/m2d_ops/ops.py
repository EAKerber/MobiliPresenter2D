#!/usr/bin/env python3
"""Read-only agent operations draft. Python stdlib + Git; no network or apply path."""
from __future__ import annotations
import argparse
import collections
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

REGISTER = 'docs/architecture/plan-v0.9-execution-register.json'
PLAN = 'docs/architecture/MOBILIPRESENTER2D_PLANO_DIRETOR_CONSOLIDADO_v0.9.md'
IMPACT = 'tools/ci/test-impact-bundles.json'
FIELDS = ('reconciliation','local','development','main','technicalValidation','approvalPublication')
HEX = re.compile(r'^(?:[0-9a-f]{40}|[0-9a-f]{64})$')
ID = re.compile(r'\b[A-Z][A-Z0-9]*(?:-[A-Z]+)*-\d+\b')

def canonical(x):
    return json.dumps(x, ensure_ascii=False, sort_keys=True, separators=(',', ':'))

def digest(x):
    return hashlib.sha256(canonical(x).encode()).hexdigest()

def git(repo, *args, allowed=(0,)):
    # Disable optional locking and on-demand fetching from partial clones.
    env = dict(os.environ, GIT_OPTIONAL_LOCKS='0', GIT_NO_LAZY_FETCH='1', GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1')
    r = subprocess.run(['git','-C',str(repo),*args], capture_output=True, env=env, timeout=60)
    if r.returncode not in allowed:
        raise ValueError(f'git {args[0]}: {r.stderr.decode(errors="replace").strip()}')
    return r.stdout

def pin(repo, ref):
    return git(repo, 'rev-parse','--verify','--end-of-options',ref+'^{commit}').decode().strip()

def tree(repo, sha):
    out = {}
    for row in git(repo,'ls-tree','-rz','--full-tree',sha).split(b'\0'):
        if not row: continue
        meta, raw_path = row.split(b'\t',1)
        mode, typ, oid = meta.decode().split(' ')
        path = raw_path.decode('utf-8',errors='strict')
        out[path] = [mode,typ,oid]
    return out

def read_blob(repo, sha, path, entries, required=True):
    if path not in entries:
        if required: raise ValueError(f'missing {path} at {sha}')
        return None
    mode, typ, oid = entries[path]
    if typ != 'blob' or mode not in ('100644','100755'):
        raise ValueError(f'expected regular file: {path}')
    return git(repo,'cat-file','blob',oid).decode('utf-8')

def merge_bases(repo, a, b):
    return git(repo,'merge-base','--all',a,b,allowed=(0,1)).decode().splitlines()

def plan_hints(markdown, ids):
    """Source-preserving dependency mentions, never inferred hard blockers."""
    found = collections.defaultdict(list)
    current = None
    for n,line in enumerate(markdown.splitlines(), 1):
        head = re.match(r'^#{2,6}\s+`?([A-Z][A-Z0-9]*(?:-[A-Z]+)*-\d+)`?(?:\s|$)',line)
        if re.match(r'^#{1,3}\s+',line) or head:
            current = head.group(1) if head and head.group(1) in ids else None
        dep = re.match(r'^\s*\*\*Dependências?:\*\*\s*(.*)$',line)
        if current and dep:
            raw = dep.group(1).strip()
            found[current].append({'line':n,'text':raw,'mentions':sorted(set(ID.findall(raw))-{current})})
    return dict(found)

def plan_sections(markdown, ids):
    """Collect exact heading ranges and DoD excerpts, preserving multiple matches."""
    lines=markdown.splitlines(); hits=collections.defaultdict(list)
    heading=re.compile(r'^(#{2,6})\s+`?([A-Z][A-Z0-9]*(?:-[A-Z]+)*-\d+)`?(?:\s|$)')
    for n,line in enumerate(lines):
        h=heading.match(line)
        if not h or h.group(2) not in ids: continue
        depth=len(h.group(1)); end=n+1
        while end<len(lines):
            other=re.match(r'^(#{1,6})\s+',lines[end])
            if other and len(other.group(1))<=depth: break
            end+=1
        excerpts=[]
        for j in range(n+1,end):
            if re.match(r'^#{2,6}\s+(?:Critério de conclusão|Critérios de conclusão|Critérios|Definition of Done)\s*$',lines[j],re.I):
                k=j+1
                while k<end and not re.match(r'^#{1,6}\s+',lines[k]): k+=1
                excerpts.append({'line':j+1,'text':'\n'.join(lines[j:k]).strip()})
        hits[h.group(2)].append({'heading':line,'startLine':n+1,'endLine':end,'criteria':excerpts})
    return dict(hits)

def read_inputs(register, plan_text, impact):
    if register.get('schema') != 'PlanV09OperationalRegister/1': raise ValueError('unsupported register schema')
    entries = register.get('entries')
    if not isinstance(entries,list) or not entries: raise ValueError('missing register entries')
    ids = [e.get('id') for e in entries]
    if any(not isinstance(i,str) or not ID.fullmatch(i) for i in ids) or len(ids)!=len(set(ids)):
        raise ValueError('invalid/duplicate register IDs')
    if impact is not None and impact.get('schema') != 'M2DTestImpactMap/1': raise ValueError('unsupported impact schema')
    annex_text = re.split(r'^# Anexo A[^\n]*$',plan_text or '',maxsplit=1,flags=re.M)
    annex_text = re.split(r'^# ',annex_text[1],maxsplit=1,flags=re.M)[0] if len(annex_text)==2 else ''
    annex_list = re.findall(r'^\|\s*\d+\s*\|\s*`([^`]+)`\s*\|',annex_text,flags=re.M)
    annex=set(annex_list)
    # Legacy register is a claim, not proof. Pin source text and retain raw references.
    return {'entries':entries,'plan_hints':plan_hints(plan_text or '',set(ids)), 'plan_sections':plan_sections(plan_text or '',set(ids)),
            'plan_check':{'annex_ids':len(annex),'missing_from_annex':sorted(set(ids)-annex),
                          'missing_from_register':sorted(annex-set(ids)),'duplicate_annex_ids':sorted(k for k,v in collections.Counter(annex_list).items() if v>1), 'complete':bool(annex) and annex==set(ids) and len(annex_list)==len(annex)},
            'bundles': (impact or {}).get('bundles',[])}

def snapshot(repo, main_ref, dev_ref, ds_repo=None, ds_ref=None):
    # Pin independently; re-read requested refs at the end to catch concurrent moves.
    if ds_ref and ds_repo is None: raise ValueError('--ds-repo required with --ds-ref')
    m,d=pin(repo,main_ref),pin(repo,dev_ref)
    mt,dt=tree(repo,m),tree(repo,d)
    bases=merge_bases(repo,m,d)
    bt=tree(repo,bases[0]) if len(bases)==1 else None
    register=json.loads(read_blob(repo,d,REGISTER,dt))
    raw_impact=read_blob(repo,d,IMPACT,dt,False)
    plan_text=None; ds=None; st=None
    if ds_repo is not None:
        if not ds_ref: raise ValueError('--ds-ref required with --ds-repo')
        ds=pin(ds_repo,ds_ref); st=tree(ds_repo,ds)
        plan_text=read_blob(ds_repo,ds,PLAN,st)
    inputs=read_inputs(register,plan_text,json.loads(raw_impact) if raw_impact is not None else None)
    if pin(repo,main_ref)!=m or pin(repo,dev_ref)!=d or (ds is not None and pin(ds_repo,ds_ref)!=ds):
        raise ValueError('REF_MOVED_DURING_CAPTURE: retry; no observation emitted')
    source_pin=register.get('planSource',{}).get('blobSha')
    ds_blob=st[PLAN][2] if st else None
    return {'schema':'M2DOpsObservation/0.1','source':'local_git_refs_not_live_remote',
            'refs':{'main':m,'development':d,'designSystem':ds},'requestedRefs':{'main':main_ref,'development':dev_ref,'designSystem':ds_ref},
            'sourceBlobs':{'register':dt[REGISTER][2],'plan':ds_blob,'registerPlanPin':source_pin,'impact':dt.get(IMPACT,[None,None,None])[2]},
            'planPinMatches': None if ds_blob is None or source_pin is None else ds_blob==source_pin,
            'mergeBases':bases,'trees':{'main':mt,'development':dt,'base':bt},**inputs}

def observation_id(o):
    return digest({k:v for k,v in o.items() if k!='observationId'})

def seal(o):
    return dict(o,observationId=observation_id(o))

def validate(o):
    if o.get('schema')!='M2DOpsObservation/0.1' or o.get('observationId')!=observation_id(o):
        raise ValueError('unsupported or altered observation')
    for k in ('main','development'):
        if not HEX.fullmatch(o['refs'][k]): raise ValueError('invalid ref identity')
        for path,v in o['trees'][k].items():
            if not path or len(v)!=3 or not HEX.fullmatch(v[2]): raise ValueError('bad tree entry')
    ids=[e['id'] for e in o['entries']]
    if len(ids)!=len(set(ids)): raise ValueError('duplicate IDs')
    return o

def diff_rows(o):
    m,d,b=(o['trees'][k] for k in ('main','development','base'))
    for path in sorted(m.keys()|d.keys()):
        a,c=m.get(path),d.get(path)
        if a==c: continue
        prior=b.get(path) if b is not None else None
        if b is None: side='unknown_baseline'
        elif a==prior: side='development_changed'
        elif c==prior: side='main_changed'
        else: side='both_changed'
        yield {'path':path,'main':a,'development':c,'base':prior,'direction':side,
               'presence':'both' if a is not None and c is not None else 'main_only' if a is not None else 'development_only',
               'fingerprint':digest([path,a,c]),'bundles':matching_bundles(o,path)}

def matching_bundles(o,path):
    # Approximate suggestions only; glob semantics are NOT the Actions path filter.
    return sorted({b['id'] for b in o['bundles'] if any(fnmatch.fnmatchcase(path,p) for p in b.get('paths',[]))})

def check_receipts(o, notes):
    """Exact declared scope checks. Never promote validity from matching hashes."""
    result=[]
    for r in notes.get('receipts',[]):
        scope=r.get('scope') or {}; dest=r.get('destination'); expected=o['trees'].get(dest)
        if dest not in ('main','development') or not isinstance(scope,dict) or not scope or not isinstance(expected,dict):
            status='insufficient_scope'
        elif any(v!=expected.get(p) for p,v in scope.items()): status='scope_changed'
        elif not r.get('evidence') or not r.get('claim'): status='insufficient_evidence'
        else: status='declared_scope_unchanged'
        result.append({'id':r.get('id'),'status':status,'objectives':r.get('objectives',[]),
                       'note':'Scope preservation is not verification of test execution, completeness or semantic equivalence.'})
    return result

def resolve_notes(o,notes):
    if not isinstance(notes,dict) or notes.get('schema')!='M2DOpsNotes/0.1': raise ValueError('unsupported notes schema')
    if notes.get('authority') != 'agent_assertion_not_verified': raise ValueError('notes must declare assertion authority')
    known={e['id'] for e in o['entries']}; edges=[]; unknown=[]
    nodes={}
    for n in notes.get('nodes',[]):
        key=n.get('id')
        if not isinstance(key,str) or not key.startswith('artifact:') or key in nodes or not n.get('reference') or not n.get('kind'):
            raise ValueError('invalid or duplicate artifact node')
        nodes[key]=n
    known |= set(nodes)
    for x in notes.get('edges',[]):
        if x.get('from') not in known or x.get('to') not in known or not x.get('reason') or not x.get('evidence'):
            unknown.append(x); continue
        if x.get('type') not in ('requires','consumes','validates','supersedes','derived_from','conflicts_with','related_to'):
            unknown.append(x); continue
        edges.append(x)
    # Cycle detection only on hard dependency assertions; fail closed for those nodes.
    graph=collections.defaultdict(list)
    for e in edges:
        if e['type']=='requires': graph[e['from']].append(e['to'])
    cycles=set(); stack=[]; visited=set()
    def walk(n):
        if n in stack: cycles.update(stack[stack.index(n):]); return
        if n in visited: return
        stack.append(n)
        for dep in graph[n]: walk(dep)
        stack.pop(); visited.add(n)
    for n in known: walk(n)
    return edges,unknown,sorted(cycles)

def disposition_applies(o,row,x):
    if not x.get('reason') or not x.get('evidence') or x.get('state') not in ('equivalent','intentional','promote','backport','conflict'):
        return False
    if x.get('observationId')==o['observationId']: return True
    # Optional scoped reuse across unrelated commits; provenance stays on original observation.
    # Both destination scopes and the plan blob must be declared and unchanged.
    scope=x.get('scope'); plan=o['sourceBlobs'].get('plan')
    if not x.get('observationId') or not plan or x.get('planBlob')!=plan or not isinstance(scope,dict): return False
    for dest in ('main','development'):
        paths=scope.get(dest)
        if not isinstance(paths,dict) or row['path'] not in paths: return False
        if any(v!=o['trees'][dest].get(p) for p,v in paths.items()): return False
    return True

def reconciliation(o,notes):
    ds=notes.get('dispositions',[]); by=collections.defaultdict(list)
    for x in ds: by[x.get('fingerprint')].append(x)
    results=[]
    for row in diff_rows(o):
        # Bind semantic judgments to exact pair AND explicit observed source identities.
        matches=[x for x in by[row['fingerprint']] if disposition_applies(o,row,x)]
        state='needs_review' if not matches else 'conflicting_assertions' if len(matches)!=1 else 'agent_asserted_'+matches[0]['state']
        results.append(dict(row,state=state,assertion=matches[0] if len(matches)==1 else None))
    live={r['fingerprint']:r for r in results}
    return {'differences':results,'counts':dict(collections.Counter(x['state'] for x in results)),
            'unmatched_dispositions':[x for x in ds if x.get('fingerprint') not in live or not disposition_applies(o,live[x['fingerprint']],x)],
            'no_automatic_merge':True}

def candidates(o,notes):
    edges,invalid,cycles=resolve_notes(o,notes); entries={e['id']:e for e in o['entries']}
    requires=collections.defaultdict(list)
    for edge in edges:
        if edge['type']=='requires': requires[edge['from']].append(edge['to'])
    out=[]
    for e in o['entries']:
        i=e['id']; status=e.get('reconciliation','unknown')
        if status=='done': continue
        unmet=[x for x in sorted(set(requires[i])) if entries.get(x,{}).get('reconciliation')!='done']
        state='dependency_cycle' if i in cycles else 'asserted_dependency_pending' if unmet else 'review_candidate'
        out.append({'key':'objective:'+i,'id':i,'kind':'reconcile_existing_first' if status in ('unreviewed','unknown') else 'complete_known_gap',
                    'priority':e.get('priority'),'state':state,'asserted_dependencies_pending':unmet,
                    'dependency_hints':o['plan_hints'].get(i,[]),'nextAction':e.get('nextAction'),
                    'caution':'No readiness claim; unknown or incomplete dependencies remain possible.'})
    rows=reconciliation(o,notes)['differences']
    for r in rows:
        if r['state'] in ('agent_asserted_equivalent','agent_asserted_intentional'): continue
        out.append({'key':'diff:'+r['fingerprint'],'kind':'review_branch_delta','path':r['path'],'state':r['state'],
                    'direction':r['direction'],'bundles':r['bundles'],'fingerprint':r['fingerprint']})
    # Group suggestions only: common bundle != shared intent or safe bite.
    groups=collections.defaultdict(list)
    for c in out:
        for b in c.get('bundles',[]): groups[b].append(c['key'])
    return {'candidates':out,'possible_groups':[{'bundle':b,'members':keys,'reason':'overlapping test-impact paths; agent must establish coherence'} for b,keys in sorted(groups.items()) if len(keys)>1],
            'nodes':notes.get('nodes',[]),'edges':edges,'invalid_edges':invalid,'dependency_cycles':cycles, 'bites':review_bites(out,notes)}

def hygiene_history(notes):
    out=[]
    for r in notes.get('hygieneReceipts',[]):
        if r.get('schemaVersion')!='MergedPrHeadCleanupReceipt 0.1':
            out.append({'schema':r.get('schemaVersion'),'status':'unsupported'}); continue
        out.append({'repository':r.get('repository'),'pr':r.get('pullRequest'),'branch':r.get('branch'),
                    'head':r.get('sha'),'merge':r.get('mergeSha'),'recordedResult':r.get('result'),
                    'recordedReadback':r.get('readback'),'proof':(r.get('proof') or {}).get('proof'),
                    'authority':'supplied historical receipt; not independently authenticated or current inventory'})
    return out

def review_bites(candidates,notes):
    """Review agent-proposed packages without turning them into scheduling instructions."""
    current={c['key'] for c in candidates}; result=[]
    for b in notes.get('bites',[]):
        members=b.get('members') or []; missing=sorted(set(members)-current)
        omissions=[k for k in ('intent','acceptance','validation','rollback','destination') if not b.get(k)]
        state='needs_refresh' if missing else 'incomplete_proposal' if omissions or not members else 'agent_proposal_reviewable'
        result.append({'proposal':b,'state':state,'missing_candidates':missing,'missing_fields':omissions,
                       'note':'Not an approval, a proof of readiness, or an execution instruction.'})
    return result

def status(o,notes):
    dims={k:dict(collections.Counter(e.get(k,'unknown') for e in o['entries'])) for k in FIELDS}
    families={}
    for e in o['entries']:
        f=e['id'].rsplit('-',1)[0]; families.setdefault(f,collections.Counter())[e.get('reconciliation','unknown')]+=1
    return {'observationId':o['observationId'],'source':o['source'],'refs':o['refs'],'sourceBlobs':o['sourceBlobs'],
            'planPinMatches':o['planPinMatches'],'planCheck':o['plan_check'],'total':len(o['entries']),
            'registered_claims_not_independent_validation':dims,'families':{k:dict(v) for k,v in families.items()},
            'tree_delta':dict(collections.Counter(r['presence'] for r in diff_rows(o))),
            'receipts':check_receipts(o,notes),'hygieneHistory':hygiene_history(notes),'remote_activity':'unavailable; no network query performed'}

def context(o,notes,i):
    e=next((e for e in o['entries'] if e['id']==i),None)
    if not e: raise ValueError('unknown objective: '+i)
    c=candidates(o,notes)
    return {'observationId':o['observationId'],'refs':o['refs'],'register_claim':e,
            'plan_dependency_hints':o['plan_hints'].get(i,[]),'plan_source_sections':o.get('plan_sections',{}).get(i,[]),'asserted_edges':[x for x in c['edges'] if i in (x['from'],x['to'])], 'artifact_nodes':[n for n in c['nodes'] if any(i in (x['from'],x['to']) and n['id'] in (x['from'],x['to']) for x in c['edges'])],
            'candidate':next((x for x in c['candidates'] if x.get('id')==i),None),
            'receipts':[r for r in check_receipts(o,notes) if i in r['objectives']]}

def markdown(report):
    # Intentionally small; JSON remains the full machine contract.
    s=report['status']; lines=['# Handover derivado (somente leitura)','',f"Observação: `{s['observationId']}`",f"Fonte: `{s['source']}`",'']
    for k,v in s['refs'].items(): lines.append(f'- {k}: `{v or "indisponível"}`')
    lines+=['','## Registro — afirmações, não prova independente',f"IDs: {s['total']}"]
    for k,v in s['registered_claims_not_independent_validation'].items(): lines.append(f'- {k}: '+', '.join(f'{a}={b}' for a,b in sorted(v.items())))
    lines+=['','## Divergências de conteúdo',str(s['tree_delta']),'','## Candidatos (não são ordens nem prontidão comprovada)']
    objectives=[c for c in report['candidates']['candidates'] if c.get('id')]
    lines.append(f'{len(objectives)} candidatos de objetivo; exibindo até 12 na ordem do registro. Use candidates para todos.')
    for c in objectives[:12]:
        if c.get('id'): lines.append(f"- {c['id']} [{c['state']}]: {c['nextAction'] or 'investigar'}")
    lines+=['','## Limites','- Estado remoto, CI e deploy não foram consultados por esta CLI.','- Não há merge, push, exclusão, execução de testes ou atualização automática do registro.','- Dependências extraídas do plano são pistas; equivalência semântica exige julgamento.']
    return '\n'.join(lines)+'\n'

def load(path): return json.loads(Path(path).read_text(encoding='utf-8'))

def cli(argv=None):
    p=argparse.ArgumentParser(description=__doc__); sub=p.add_subparsers(dest='cmd',required=True)
    cap=sub.add_parser('snapshot'); cap.add_argument('--repo',required=True); cap.add_argument('--main',required=True); cap.add_argument('--development',required=True); cap.add_argument('--ds-repo'); cap.add_argument('--ds-ref')
    for name in ('status','context','candidates','reconcile','handover','validate'):
        a=sub.add_parser(name); a.add_argument('observation'); a.add_argument('--notes');
        if name=='context': a.add_argument('id')
        if name=='candidates': a.add_argument('--objective',action='store_true',help='only objective candidates')
        if name=='reconcile': a.add_argument('--bundle',help='approximate impact bundle filter')
        if name=='handover': a.add_argument('--format',choices=('json','markdown'),default='markdown')
    a=p.parse_args(argv)
    if a.cmd=='snapshot': result=seal(snapshot(a.repo,a.main,a.development,a.ds_repo,a.ds_ref))
    else:
        o=validate(load(a.observation)); n=load(a.notes) if a.notes else {'schema':'M2DOpsNotes/0.1','authority':'agent_assertion_not_verified'}
        edges,invalid,cycles=resolve_notes(o,n)
        if a.cmd=='status': result=status(o,n)
        elif a.cmd=='context': result=context(o,n,a.id)
        elif a.cmd=='candidates':
            result=candidates(o,n)
            if a.objective: result['candidates']=[c for c in result['candidates'] if c.get('id')]
        elif a.cmd=='reconcile':
            result=reconciliation(o,n)
            if a.bundle: result['differences']=[r for r in result['differences'] if a.bundle in r['bundles']]; result['filter']=a.bundle
        elif a.cmd=='validate': result={'observation_integrity':'PASS','planCheck':o['plan_check'],'planPinMatches':o['planPinMatches'],'invalid_edges':invalid,'dependency_cycles':cycles,'semantic_validation':'not_performed'}
        else:
            result={'status':status(o,n),'candidates':candidates(o,n),'reconciliation':reconciliation(o,n)}
            if a.format=='markdown': print(markdown(result),end=''); return 0
    print(json.dumps(result,ensure_ascii=False,indent=2)); return 0

if __name__=='__main__':
    try: sys.exit(cli())
    except (ValueError,KeyError,TypeError,OSError,subprocess.TimeoutExpired) as exc:
        print(f'ERROR: {exc}',file=sys.stderr); sys.exit(2)
