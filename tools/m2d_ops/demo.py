#!/usr/bin/env python3
"""Create a disposable synthetic scenario in a NEW directory."""
import argparse, json, sys
from pathlib import Path
import ops
sys.path.insert(0,str(Path(__file__).resolve().parent/'tests'))
from test_ops import fixture
p=argparse.ArgumentParser(description=__doc__);p.add_argument('directory');a=p.parse_args();dest=Path(a.directory);dest.mkdir(parents=True,exist_ok=False)
repo,ds=fixture(dest);o=ops.seal(ops.snapshot(repo,'main','development',ds,'main'));n={'schema':'M2DOpsNotes/0.1','authority':'agent_assertion_not_verified'}
for file,data in [('observation.json',o),('status.json',ops.status(o,n)),('reconciliation.json',ops.reconciliation(o,n))]:
    (dest/file).write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
(dest/'handover.md').write_text(ops.markdown({'status':ops.status(o,n),'candidates':ops.candidates(o,n)}))
print('SYNTHETIC FIXTURE ONLY:',dest)
