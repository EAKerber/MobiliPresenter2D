#!/usr/bin/env python3
"""Materialize R4 module-02 fidelity repair from the frozen parent checkpoint."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'app'
PARENT='d8ec0dd15c7dc9e61623b5eb3a4bd346b4e7d587'
CHECKPOINT='cozinha-01-module02-fidelity-fix1'
OLD_SOURCE='tools/sources/02_inferior_fogao-combined-v2.png'
NEW_SOURCE='tools/sources/02_inferior_fogao-combined-v3.png'
ROI=(484,590,498,856)
PROTECTED=(516,611,720,838)
PARENT_GOLDEN_SHA='b626b8ae3669f7feda5824c7cbdc2de2593e3290d5fcfab58c78c6d7d53f4413'
PARENT_MODULE_SHA='6ba1ad26835d349a28b098bd6c60182b369ec66e51ea2b1a8cc263f30c44da98'
ARCHIVE_SHA='ab419606d02a3e785810aa32ca9a31e576c09d8619abd59acfe47a4fda9bd189'

def sha_bytes(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def sha(path:Path)->str:return sha_bytes(path.read_bytes())
def write_json(path:Path,payload:dict):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(payload,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8')
def git_bytes(path:str)->bytes:
    cp=subprocess.run(['git','show',f'{PARENT}:{path}'],cwd=ROOT,capture_output=True,check=False)
    if cp.returncode: raise RuntimeError(f'PARENT_FILE_UNAVAILABLE:{path}:{cp.stderr.decode(errors="replace")}')
    return cp.stdout

def patch_text(path:Path,replacements:list[tuple[str,str]]):
    text=path.read_text(encoding='utf-8')
    for old,new in replacements:
        if old in text:text=text.replace(old,new)
        elif new not in text:raise RuntimeError(f'PATCH_PATTERN_MISSING:{path}:{old[:60]}')
    path.write_text(text,encoding='utf-8')

def image_record(rel:str)->dict:
    p=APP/rel
    with Image.open(p) as im:
        rgba=im.convert('RGBA'); b=rgba.getchannel('A').getbbox()
        return {'path':'app/'+rel,'size':p.stat().st_size,'sha256':sha(p),'dimensions':[im.width,im.height],'alphaBounds':list(b) if b else None,'canonicalCanvas':True}

def changed_pixels_and_bounds(a:Image.Image,b:Image.Image):
    aa=a.convert('RGBA');bb=b.convert('RGBA');count=0;minx=miny=10**9;maxx=maxy=-1
    for y in range(aa.height):
        for x in range(aa.width):
            if aa.getpixel((x,y))!=bb.getpixel((x,y)):
                count+=1;minx=min(minx,x);miny=min(miny,y);maxx=max(maxx,x);maxy=max(maxy,y)
    return count,None if count==0 else [minx,miny,maxx+1,maxy+1]

def main()->int:
    parent_golden=git_bytes('app/assets/kitchen/composicao-completa.png');parent_module=git_bytes('app/assets/kitchen/layers/02_inferior_fogao.png')
    if sha_bytes(parent_golden)!=PARENT_GOLDEN_SHA:raise RuntimeError('PARENT_GOLDEN_SHA_MISMATCH')
    if sha_bytes(parent_module)!=PARENT_MODULE_SHA:raise RuntimeError('PARENT_MODULE_SHA_MISMATCH')

    patch_text(APP/'data/scene-data.js',[
      ('manifestVersion: "cozinha-01@2026-09-02-phase3-stone-split1"','manifestVersion: "cozinha-01@2026-09-04-r4-module02-fidelity1"'),
      ('maskAsset: null,\n        alphaBounds: { x: 484, y: 590, width: 273, height: 266 },\n        defaultVisible: true,\n        controllable: true,\n        hostId: null,\n        finishGroups: [],\n        tags: ["lower", "cooking-zone"]','maskAsset: "assets/kitchen/masks/02.png",\n        alphaBounds: { x: 498, y: 590, width: 259, height: 266 },\n        defaultVisible: true,\n        controllable: true,\n        hostId: null,\n        finishGroups: ["fronts-all"],\n        tags: ["lower", "cooking-zone"]'),
      ('"module-01",\n          "module-03",','"module-01",\n          "module-02",\n          "module-03",')])
    patch_text(APP/'tools/build-inline-masks.py',[( '"assets/kitchen/masks/01.png",\n    "assets/kitchen/masks/03.png",','"assets/kitchen/masks/01.png",\n    "assets/kitchen/masks/02.png",\n    "assets/kitchen/masks/03.png",')])
    patch_text(APP/'tools/validate-assets.py',[('module02-alpha-approved-v2.png','module02-alpha-approved-v3.png'),('02_inferior_fogao-combined-v2.png','02_inferior_fogao-combined-v3.png')])

    subprocess.run([sys.executable,'tools/apply-r4-module02-fidelity.py'],cwd=APP,check=True)
    subprocess.run([sys.executable,'tools/build-inline-masks.py'],cwd=APP,check=True)

    tech_path=APP/'data/technical-data.json';tech=json.loads(tech_path.read_text(encoding='utf-8'));tech['baselineId']=CHECKPOINT
    if OLD_SOURCE in tech['files']:
        tech['files'][NEW_SOURCE]=tech['files'].pop(OLD_SOURCE)
    elif NEW_SOURCE not in tech['files']:raise RuntimeError('TECHNICAL_SOURCE_KEY_MISSING')
    with Image.open(APP/'assets/kitchen/base.png') as opened: composed=opened.convert('RGBA')
    for rel in tech['compositionOrder']:
        with Image.open(APP/rel) as opened:composed=Image.alpha_composite(composed,opened.convert('RGBA'))
    composed.save(APP/'assets/kitchen/composicao-completa.png')
    for rel in ['assets/kitchen/composicao-completa.png','assets/kitchen/layers/02_inferior_fogao.png','assets/kitchen/masks/02.png',NEW_SOURCE]:
        rec=image_record(rel);tech['files'][rel]={'sha256':rec['sha256'],'alphaBounds':rec['alphaBounds']}
    tech_path.write_text(json.dumps(tech,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

    subprocess.run(['npm','test'],cwd=APP,check=True)

    import io
    prev_g=Image.open(io.BytesIO(parent_golden)).convert('RGBA');cur_g=Image.open(APP/'assets/kitchen/composicao-completa.png').convert('RGBA')
    prev_m=Image.open(io.BytesIO(parent_module)).convert('RGBA');cur_m=Image.open(APP/'assets/kitchen/layers/02_inferior_fogao.png').convert('RGBA')
    gcount,gbbox=changed_pixels_and_bounds(prev_g,cur_g);mcount,mbbox=changed_pixels_and_bounds(prev_m,cur_m)
    if gbbox!=list(ROI) or mbbox!=list(ROI):raise RuntimeError(f'R4_DIFF_OUTSIDE_ROI:golden={gbbox}:module={mbbox}')
    if gcount!=3579:raise RuntimeError(f'R4_GOLDEN_CHANGE_COUNT:{gcount}')

    spec={'schemaVersion':'R4Module02Fidelity 0.1','checkpointId':CHECKPOINT,'parentCheckpointId':'cozinha-01-phase3-stone-split1','parentCommit':PARENT,'cleanupRoi':list(ROI),'protectedAppliance':list(PROTECTED),'expectedModule02AlphaBounds':[498,590,757,856],'expectedFinishMaskBounds':[498,590,757,856],'expectedGoldenChangedPixelCount':3579,'parentGoldenSha256':PARENT_GOLDEN_SHA,'parentModule02Sha256':PARENT_MODULE_SHA,'currentGoldenSha256':sha(APP/'assets/kitchen/composicao-completa.png'),'currentModule02Sha256':sha(APP/'assets/kitchen/layers/02_inferior_fogao.png'),'finishMaskSha256':sha(APP/'assets/kitchen/masks/02.png'),'visualDecisions':['remove-column-contamination','enable-module02-front-finish','protect-complete-oven-appliance']}
    write_json(ROOT/'reference/r4-module02-fidelity.json',spec)

    files=[{'path':'app/'+p.relative_to(APP).as_posix(),'size':p.stat().st_size,'sha256':sha(p)} for p in sorted(APP.rglob('*')) if p.is_file()]
    assets=[image_record(rel) for rel in tech['files']]
    golden=next(x for x in assets if x['path']=='app/assets/kitchen/composicao-completa.png')
    manifest={'schemaVersion':'BaselineManifest 0.1','status':'READY','sceneId':'cozinha-01','baselineId':CHECKPOINT,'parentBaseline':{'baselineId':'cozinha-01-phase3-stone-split1','commit':PARENT,'archiveSha256':ARCHIVE_SHA},'mutation':{'slice':'R4','reasons':['remove-column-contamination','enable-module02-front-finish'],'cleanupRoi':list(ROI),'goldenChangedPixelCountFromParent':3579,'outsideCleanupRoiDifferenceCount':0},'canvas':{'width':1536,'height':1024,'origin':[0,0]},'files':files,'golden':golden,'assets':assets,'defaultComposition':{'background':'app/assets/kitchen/base.png','layers':['app/'+x for x in tech['compositionOrder']]},'expectedRuntime':{'passed':True,'initialFingerprint':'scene2d-e7c8dba7','entities':11,'controllableEntities':8},'sourceValidation':{'trackedAssetCount':23,'pixelDifferenceCount':0,'differenceBounds':None}}
    write_json(ROOT/'reference/baseline-manifest.json',manifest)
    subprocess.run([sys.executable,'tools/validate-baseline.py'],cwd=ROOT,check=True)
    print(json.dumps({'status':'PASS','checkpointId':CHECKPOINT,'goldenChangedPixelCount':gcount,'goldenDifferenceBounds':gbbox,'files':len(files),'assets':len(assets)},sort_keys=True))
    return 0
if __name__=='__main__':raise SystemExit(main())
