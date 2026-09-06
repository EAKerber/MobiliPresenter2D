#!/usr/bin/env python3
from __future__ import annotations
import argparse, base64, hashlib, io, json
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops
REPO_ROOT=Path(__file__).resolve().parents[1]
def sha_bytes(b): return hashlib.sha256(b).hexdigest()
def sha_file(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p): return json.loads(p.read_text(encoding='utf-8'))
def count_changed(a,b):
    pa=a.load(); pb=b.load(); c=0; xs=[]; ys=[]
    for y in range(a.height):
        for x in range(a.width):
            if pa[x,y]!=pb[x,y]: c+=1; xs.append(x); ys.append(y)
    return c, ([min(xs),min(ys),max(xs)+1,max(ys)+1] if xs else None)
def apply_top_plane_yaw(image: Image.Image, cfg: dict | None) -> Image.Image:
    if not cfg: return image
    if cfg.get('type')!='top-plane-rear-shift': raise SystemExit('unsupported perspective adjustment')
    rear_shift=float(cfg.get('rearShiftPx',0)); hinge=int(cfg.get('hingeLocalY',0)); front_shift=float(cfg.get('frontShiftPx',0))
    if hinge<2 or hinge>image.height: raise SystemExit(f'invalid top-plane hinge: {hinge}')
    out=image.copy(); w=image.width
    for y in range(hinge):
        t=y/(hinge-1); shift=rear_shift*(1-t)+front_shift*t
        row=image.crop((0,y,w,y+1))
        row=row.transform((w,1),Image.Transform.AFFINE,(1,0,-shift,0,1,0),resample=Image.Resampling.BICUBIC)
        out.paste(row,(0,y))
    return out
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--recipe',type=Path,required=True); ap.add_argument('--source-frame',type=Path,required=True); ap.add_argument('--variant-manifest',type=Path,required=True); ap.add_argument('--output-dir',type=Path,required=True); args=ap.parse_args()
    recipe=load(args.recipe)
    if recipe.get('schemaVersion')!='GeneratedDonorPlacementRecipe 0.2': raise SystemExit('unsupported recipe schema')
    source=Image.open(args.source_frame).convert('RGBA'); source_sha=sha_file(args.source_frame)
    if source.size!=(1536,1024): raise SystemExit(f'source canvas mismatch: {source.size}')
    if source_sha!=recipe['sourceFrameSha256']: raise SystemExit(f"source sha mismatch: {source_sha} != {recipe['sourceFrameSha256']}")
    manifest=load(args.variant_manifest); case={c['id']:c for c in manifest['cases']}.get(recipe['targetVariant'])
    if not case or case['fingerprint']!=recipe['targetVariantFingerprint']: raise SystemExit('target variant/fingerprint mismatch')
    donor_doc=recipe['donor']; packed_path=donor_doc.get('packedPath')
    if packed_path:
        packed=(REPO_ROOT/packed_path).read_bytes()
    else:
        chunks=donor_doc.get('packedBase64Chunks') or []
        if not chunks: raise SystemExit('packed donor payload missing')
        b64=''.join((REPO_ROOT/p).read_text(encoding='ascii').strip() for p in chunks); packed=base64.b64decode(b64)
    if sha_bytes(packed)!=donor_doc['packedSha256']: raise SystemExit('packed donor sha mismatch')
    donor=Image.open(io.BytesIO(packed)).convert('RGBA')
    robust=int(donor_doc.get('robustAlphaCropThreshold',0))
    if robust:
        mask=donor.getchannel('A').point(lambda v:255 if v>=robust else 0); bbox=mask.getbbox()
        if not bbox: raise SystemExit('robust alpha crop empty')
        donor=donor.crop(bbox); alpha=donor.getchannel('A').point(lambda v:0 if v<robust else v); donor.putalpha(alpha)
    x0,y0,x1,y1=recipe['placementBox']; target_size=(x1-x0,y1-y0)
    if donor.size!=target_size: donor=donor.resize(target_size,Image.Resampling.LANCZOS)
    threshold=int(recipe.get('alphaThresholdBelow',0)); alpha=donor.getchannel('A').point(lambda v:0 if v<threshold else v); donor.putalpha(alpha)
    perspective_cfg=recipe.get('perspectiveAdjustment'); donor=apply_top_plane_yaw(donor,perspective_cfg); alpha=donor.getchannel('A')
    overlay=Image.new('RGBA',source.size,(0,0,0,0)); shadow_cfg=recipe.get('contactShadow') or {}
    if shadow_cfg.get('enabled'):
        rows=int(shadow_cfg['sourceBottomRows']); radius=float(shadow_cfg['gaussianBlurRadius']); yoff=int(shadow_cfg['pasteYOffsetFromBottom']); scale=float(shadow_cfg['opacityScale']); bottom=alpha.crop((0,max(0,alpha.height-rows),alpha.width,alpha.height)).filter(ImageFilter.GaussianBlur(radius)); sa=Image.new('L',source.size,0); sa.paste(bottom,(x0,y1+yoff)); sa=sa.point(lambda v:max(0,min(255,int(v*scale)))); shadow=Image.new('RGBA',source.size,(0,0,0,255)); shadow.putalpha(sa); overlay=Image.alpha_composite(overlay,shadow)
    overlay.alpha_composite(donor,(x0,y0)); edited=Image.alpha_composite(source,overlay)
    changed_count,bounds=count_changed(source,edited); roi=recipe['authorizedRoi']; outside=0; ps=source.load(); pe=edited.load(); delta=Image.new('RGBA',source.size,(0,0,0,0)); pd=delta.load()
    for y in range(source.height):
        for x in range(source.width):
            if ps[x,y]!=pe[x,y]:
                if not (roi[0]<=x<roi[2] and roi[1]<=y<roi[3]): outside+=1
                pd[x,y]=(*pe[x,y][:3],255)
    if outside: raise SystemExit(f'outside ROI changed pixels: {outside}')
    roundtrip=source.copy(); roundtrip.alpha_composite(delta); mismatch,_=count_changed(roundtrip,edited)
    if mismatch: raise SystemExit(f'roundtrip mismatch: {mismatch}')
    out=args.output_dir; out.mkdir(parents=True,exist_ok=True); cp=out/'candidate.png'; dp=out/'difference.png'; rp=out/'extraction-report.json'; mp=out/'candidate.json'; delta.save(cp)
    diff=ImageChops.difference(source.convert('RGB'),edited.convert('RGB')).convert('RGBA'); da=Image.new('L',source.size,0); dap=da.load()
    for y in range(source.height):
        for x in range(source.width):
            if ps[x,y]!=pe[x,y]: dap[x,y]=255
    diff.putalpha(da); diff.save(dp)
    tmp=out/'_edited.png'; edited.save(tmp); candidate_sha=sha_file(cp); edited_sha=sha_file(tmp); tmp.unlink()
    report={'schemaVersion':'CandidateDeltaExtractionReport 0.1','status':'PASS','role':recipe['role'],'targetVariant':recipe['targetVariant'],'authoringContractId':recipe['authoringContractId'],'canvas':recipe['canvas'],'authorizedRoi':roi,'deltaMode':'opaque-replacement-pixels','candidateAlphaBounds':list(delta.getchannel('A').getbbox()),'differenceBounds':bounds,'changedPixelCount':changed_count,'outsideAuthorizedRoiChangedPixelCount':outside,'roundtripMismatchPixelCount':mismatch,'candidateSha256':candidate_sha,'sourceFrameSha256':source_sha,'editedFrameSha256':edited_sha,'donor':{'sourceMethod':donor_doc['sourceMethod'],'sourceGenId':donor_doc['sourceGenId'],'sourceGeneratedFrameSha256':donor_doc['sourceGeneratedFrameSha256'],'packedSha256':donor_doc['packedSha256'],'processing':donor_doc['processing'],'robustAlphaCropThreshold':robust,'placementBox':recipe['placementBox'],'perspectiveAdjustment':perspective_cfg}}
    rp.write_text(json.dumps(report,indent=2,ensure_ascii=False,sort_keys=True)+'\n',encoding='utf-8')
    meta={'schemaVersion':'CandidateAsset 0.1','id':recipe['output']['candidateId'],'role':recipe['role'],'targetScene':'cozinha-01','targetVariant':recipe['targetVariant'],'imagePath':recipe['output']['candidatePath'],'expectedImageSha256':candidate_sha,'status':'REVIEW','humanReview':{'status':'PENDING','reviewer':None,'reviewedAt':None,'checklist':{}},'provenance':{'method':'generated-donor-derived','authoringContractId':recipe['authoringContractId'],'deltaExtractionRequired':True,'sourceReferences':['app/assets/kitchen/base.png',f"variant:{recipe['targetVariant']}@{recipe['targetVariantFingerprint']}",f"image_gen:{donor_doc['sourceGenId']}"],'sourceFrameSha256':source_sha,'editedFrameSha256':edited_sha,'extractionReport':recipe['output']['extractionReportPath']}}
    mp.write_text(json.dumps(meta,indent=2,ensure_ascii=False,sort_keys=True)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS','candidateSha256':candidate_sha,'changedPixelCount':changed_count,'differenceBounds':bounds,'outsideAuthorizedRoiChangedPixelCount':outside,'roundtripMismatchPixelCount':mismatch,'sourceFrameSha256':source_sha,'perspectiveAdjustment':perspective_cfg},sort_keys=True)); return 0
if __name__=='__main__': raise SystemExit(main())
