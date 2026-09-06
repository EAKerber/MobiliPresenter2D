#!/usr/bin/env python3
from __future__ import annotations
import argparse, json
from pathlib import Path
from PIL import Image, ImageDraw

PASS='PASS'; FAIL='FAIL'

def load(path: Path): return json.loads(path.read_text(encoding='utf-8'))

def signed(value: float, positive: str, negative: str, deadzone: float=0.0) -> str:
    if abs(value) <= deadzone: return 'none'
    return positive if value > 0 else negative

def evaluate(grid: dict, measurement: dict) -> dict:
    ref=grid['reference']; obs=measurement['candidate']; thr=grid['thresholds']
    ref_depth=ref['counterFrontY']-ref['counterBackY']
    obs_depth=obs['cooktopFrontY']-obs['cooktopBackY']
    ratio=obs_depth/ref_depth
    front=obs['cooktopFrontY']-ref['counterFrontY']
    back=obs['cooktopBackY']-ref['counterBackY']
    floor=obs['floorContactY']-ref['floorContactY']
    ref_center=(ref['bayLeftX']+ref['bayRightX'])/2
    obs_center=(obs['leftX']+obs['rightX'])/2
    center=obs_center-ref_center
    width=(obs['rightX']-obs['leftX'])-(ref['bayRightX']-ref['bayLeftX'])
    gates={
      'horizontalRoll': {'status':PASS if abs(obs.get('rollDeviationDeg',0))<=thr['horizontalRollDeg'] else FAIL,'observedDeg':obs.get('rollDeviationDeg',0),'limitDeg':thr['horizontalRollDeg']},
      'verticalAxis': {'status':PASS if abs(obs.get('verticalAxisDeviationDeg',0))<=thr['verticalAxisDeg'] else FAIL,'observedDeg':obs.get('verticalAxisDeviationDeg',0),'limitDeg':thr['verticalAxisDeg']},
      'projectedDepth': {'status':PASS if thr['depthRatioMin']<=ratio<=thr['depthRatioMax'] else FAIL,'observedRatio':round(ratio,4),'acceptedRange':[thr['depthRatioMin'],thr['depthRatioMax']]},
      'frontAlignment': {'status':PASS if abs(front)<=thr['frontAlignmentPx'] else FAIL,'offsetPx':round(front,2),'limitPx':thr['frontAlignmentPx']},
      'backAlignment': {'status':PASS if abs(back)<=thr['backAlignmentPx'] else FAIL,'offsetPx':round(back,2),'limitPx':thr['backAlignmentPx']},
      'floorContact': {'status':PASS if abs(floor)<=thr['floorContactPx'] else FAIL,'offsetPx':round(floor,2),'limitPx':thr['floorContactPx']},
      'centerAlignment': {'status':PASS if abs(center)<=thr['centerAlignmentPx'] else FAIL,'offsetPx':round(center,2),'limitPx':thr['centerAlignmentPx']},
      'widthFit': {'status':PASS if abs(width)<=thr['widthFitPx'] else FAIL,'offsetPx':round(width,2),'limitPx':thr['widthFitPx']},
    }
    top_ok=gates['frontAlignment']['status']==PASS and gates['backAlignment']['status']==PASS
    depth_ok=gates['projectedDepth']['status']==PASS
    floor_ok=gates['floorContact']['status']==PASS
    center_ok=gates['centerAlignment']['status']==PASS
    avg=(front+back)/2
    vectors={
      'verticalTranslation':'none' if top_ok else signed(avg,'up','down',1),
      'depthAdjustment':'none' if depth_ok else ('increase-depth' if ratio<thr['depthRatioMin'] else 'decrease-depth'),
      'horizontalTranslation':'none' if center_ok else signed(center,'left','right',1),
      'verticalScale':('expand-vertical' if floor_ok and avg>thr['frontAlignmentPx'] and not top_ok else ('compress-vertical' if floor_ok and avg<-thr['frontAlignmentPx'] and not top_ok else 'none')),
    }
    overall=FAIL if any(g['status']==FAIL for g in gates.values()) else PASS
    diagnostics=[]
    diagnostics.append('roll_aligned' if gates['horizontalRoll']['status']==PASS else 'roll_misaligned')
    diagnostics.append('vertical_axis_aligned' if gates['verticalAxis']['status']==PASS else 'vertical_axis_misaligned')
    diagnostics.append('depth_ok' if depth_ok else ('depth_too_shallow' if ratio<thr['depthRatioMin'] else 'depth_too_deep'))
    diagnostics.append('counter_top_height_ok' if top_ok else ('counter_top_too_low' if avg>0 else 'counter_top_too_high'))
    diagnostics.append('floor_contact_ok' if floor_ok else 'floor_contact_off')
    diagnostics.append('centering_ok' if center_ok else 'centering_off')
    diagnostics.append('width_fit_ok' if gates['widthFit']['status']==PASS else 'width_fit_off')
    if depth_ok and gates['horizontalRoll']['status']==PASS and gates['verticalAxis']['status']==PASS and floor_ok and not top_ok:
        diagnostics.append('looks_like_inverted_editorial_correction')
    return {
      'schemaVersion':'PerspectiveEditorialGate 0.1','sceneId':grid['sceneId'],'candidateId':measurement['candidateId'],'role':measurement['role'],'targetVariant':measurement['targetVariant'],'overall':overall,
      'measures':{'referenceTopPlaneDepthPx':ref_depth,'candidateTopPlaneDepthPx':round(obs_depth,2),'topPlaneDepthRatio':round(ratio,4),'frontEdgeOffsetPx':round(front,2),'backEdgeOffsetPx':round(back,2),'floorContactOffsetPx':round(floor,2),'centerOffsetPx':round(center,2),'widthOffsetPx':round(width,2)},
      'vectors':vectors,'diagnostics':diagnostics,'gates':gates,'authoringTransform':measurement.get('authoringTransform')
    }

def overlay(grid: dict, measurement: dict, result: dict, source_path: Path, candidate_path: Path, out: Path):
    src=Image.open(source_path).convert('RGB'); cand=Image.open(candidate_path).convert('RGB')
    crop=(430,470,820,930); ref=grid['reference']; obs=measurement['candidate']
    def panel(im, is_cand):
        p=im.crop(crop); d=ImageDraw.Draw(p); xo,yo=crop[0],crop[1]
        for y,label in [(ref['counterBackY'],'REF back'),(ref['counterFrontY'],'REF front'),(ref['floorContactY'],'REF floor')]:
            yy=int(round(y-yo)); d.line((0,yy,p.width,yy),fill=(30,180,70),width=2); d.text((5,max(0,yy-15)),label,fill=(20,110,40))
        xx=int(round(ref['verticalAxisX']-xo)); d.line((xx,0,xx,p.height),fill=(30,180,70),width=2)
        if is_cand:
            for y,label in [(obs['cooktopBackY'],'OBJ back'),(obs['cooktopFrontY'],'OBJ front'),(obs['floorContactY'],'OBJ floor')]:
                yy=int(round(y-yo)); d.line((0,yy,p.width,yy),fill=(220,45,45),width=2); d.text((205,max(0,yy-15)),label,fill=(165,20,20))
            cx=int(round(((obs['leftX']+obs['rightX'])/2)-xo)); cy=int(round(((obs['cooktopBackY']+obs['cooktopFrontY'])/2)-yo))
            if result['vectors']['verticalTranslation']=='up':
                d.line((cx,cy,cx,cy-55),fill=(50,90,220),width=4); d.polygon([(cx,cy-66),(cx-8,cy-50),(cx+8,cy-50)],fill=(50,90,220))
            elif result['vectors']['verticalTranslation']=='down':
                d.line((cx,cy,cx,cy+55),fill=(50,90,220),width=4); d.polygon([(cx,cy+66),(cx-8,cy+50),(cx+8,cy+50)],fill=(50,90,220))
        return p
    left=panel(src,False); right=panel(cand,True); header=145
    sheet=Image.new('RGB',(left.width+right.width,left.height+header),'white'); sheet.paste(left,(0,header)); sheet.paste(right,(left.width,header)); d=ImageDraw.Draw(sheet)
    d.text((12,12),f"PERSPECTIVE EDITORIAL GATE — {result['overall']}",fill='black')
    d.text((12,38),f"vectors: {result['vectors']}",fill='black')
    m=result['measures']; d.text((12,64),f"depth ref={m['referenceTopPlaneDepthPx']} obj={m['candidateTopPlaneDepthPx']} ratio={m['topPlaneDepthRatio']}",fill='black')
    d.text((12,88),f"front={m['frontEdgeOffsetPx']}px back={m['backEdgeOffsetPx']}px floor={m['floorContactOffsetPx']}px",fill='black')
    d.text((12,112),f"center={m['centerOffsetPx']}px width={m['widthOffsetPx']}px",fill='black')
    d.text((12,132),', '.join(result['diagnostics']),fill='black')
    out.parent.mkdir(parents=True,exist_ok=True); sheet.save(out)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--grid',type=Path,required=True); ap.add_argument('--measurement',type=Path,required=True); ap.add_argument('--source-image',type=Path,required=True); ap.add_argument('--candidate-image',type=Path,required=True); ap.add_argument('--output-json',type=Path,required=True); ap.add_argument('--output-png',type=Path,required=True); args=ap.parse_args()
    grid=load(args.grid); measurement=load(args.measurement)
    if grid.get('schemaVersion')!='PerspectiveEditorialGrid 0.1' or measurement.get('schemaVersion')!='PerspectiveEditorialMeasurement 0.1': raise SystemExit('unsupported perspective schema')
    if grid['sceneId']!=measurement['sceneId']: raise SystemExit('scene mismatch')
    result=evaluate(grid,measurement); args.output_json.parent.mkdir(parents=True,exist_ok=True); args.output_json.write_text(json.dumps(result,indent=2,ensure_ascii=False,sort_keys=True)+'\n',encoding='utf-8'); overlay(grid,measurement,result,args.source_image,args.candidate_image,args.output_png)
    print(json.dumps({'overall':result['overall'],'candidateId':result['candidateId'],'vectors':result['vectors'],'diagnostics':result['diagnostics']},sort_keys=True))
    return 0 if result['overall']==PASS else 1
if __name__=='__main__': raise SystemExit(main())
