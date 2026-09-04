#!/usr/bin/env python3
from __future__ import annotations
import json, os, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'reference'/'baseline-manifest.json'
def emit(p): print(json.dumps(p,ensure_ascii=False,sort_keys=True))
def fail(code,detail): emit({'status':'FAIL','code':code,'detail':detail}); return 1
def load(path): return json.loads(path.read_text(encoding='utf-8'))
def blocked(code,detail):
 emit({'status':'BLOCKED_EXPECTED','code':code,'detail':detail})
 if os.getenv('GITHUB_ACTIONS')=='true': print(f'::warning title=R0 baseline blocked::{detail}')
 return 0
def main():
 try: m=load(MANIFEST)
 except FileNotFoundError: return fail('BASELINE_MANIFEST_MISSING',str(MANIFEST))
 except (OSError,json.JSONDecodeError) as e: return fail('BASELINE_MANIFEST_INVALID',str(e))
 if m.get('schemaVersion')!='BaselineManifest 0.1': return fail('BASELINE_SCHEMA_UNSUPPORTED',repr(m.get('schemaVersion')))
 c=m.get('canvas') or {}
 if (c.get('width'),c.get('height'),c.get('origin'))!=(1536,1024,[0,0]): return fail('BASELINE_CANVAS_CONTRACT_INVALID',repr(c))
 status=m.get('status')
 if status=='UNMATERIALIZED':
  s=m.get('intendedSource') or {}
  if s.get('exactBytesRequired') is not True or s.get('sourceLocated') is not False or s.get('reason')!='BASELINE_SOURCE_MISSING': return fail('BASELINE_BLOCKER_CONTRACT_INVALID',repr(s))
  return blocked('BASELINE_SOURCE_MISSING','Exact v3.3.0 source bytes are not materialized.')
 if status=='SOURCE_VALIDATED':
  s=m.get('source') or {}
  required={'archiveSize':7741469,'archiveSha256':'ab419606d02a3e785810aa32ca9a31e576c09d8619abd59acfe47a4fda9bd189','exactBytesRequired':True,'sourceLocated':True,'materializedInRepository':False,'reason':'BASELINE_BYTES_TRANSPORT_PENDING'}
  if any(s.get(k)!=v for k,v in required.items()): return fail('SOURCE_VALIDATED_CONTRACT_INVALID',repr(s))
  try: inv=load(ROOT/s['inventoryPath']); val=load(ROOT/s['validationPath'])
  except (KeyError,OSError,json.JSONDecodeError) as e: return fail('SOURCE_EVIDENCE_INVALID',str(e))
  if inv.get('schemaVersion')!='BaselineSourceInventory 0.1' or inv.get('fileCount')!=57 or inv.get('archive',{}).get('sha256')!=s['archiveSha256']: return fail('SOURCE_INVENTORY_CONTRACT_INVALID',repr({k:inv.get(k) for k in ['schemaVersion','fileCount','archive']}))
  if val.get('status')!='PASS' or val.get('archiveSha256')!=s['archiveSha256'] or val.get('repositoryMaterialized') is not False or val.get('blocker')!='BASELINE_BYTES_TRANSPORT_PENDING': return fail('SOURCE_VALIDATION_CONTRACT_INVALID',repr(val))
  return blocked('BASELINE_BYTES_TRANSPORT_PENDING','Exact v3.3.0 source is independently validated; binary materialization into the repository is pending a suitable carrier.')
 if status!='READY': return fail('BASELINE_STATUS_INVALID',repr(status))
 return subprocess.run([sys.executable,str(ROOT/'tools'/'validate-baseline.py')],cwd=ROOT).returncode
if __name__=='__main__': raise SystemExit(main())
