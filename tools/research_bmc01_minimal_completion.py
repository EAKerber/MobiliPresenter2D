#!/usr/bin/env python3
"""Build a minimal deterministic BMC-01 same-object completion candidate.

Research-only. The candidate may write only local-geometry pixels for which
none of the current Module 02 / stone owner assets contribute alpha. Appearance
comes from the nearest composited pixel that is both inside the local carcass
geometry and owned by Module 02 to the right of the measured front seam.
"""
from __future__ import annotations
import argparse, copy, hashlib, json, math
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
try:
    from tools.render_variant_fidelity import render_case, safe_app_path
except ModuleNotFoundError:
    from render_variant_fidelity import render_case, safe_app_path

ROOT=Path(__file__).resolve().parents[1]

def pmask(size,quad):
    im=Image.new("L",size,0)
    ImageDraw.Draw(im).polygon([(round(x),round(y)) for x,y in quad],fill=255)
    return im

def binalpha(path):
    a=Image.open(ROOT/path).convert("RGBA").getchannel("A")
    return a.point(lambda v:255 if v else 0)

def count(mask):
    return sum(1 for v in mask.getdata() if v)

def bbox(mask):
    b=mask.getbbox()
    return list(b) if b else None

def roi_mask(size,roi):
    im=Image.new("L",size,0)
    x0,y0,x1,y1=map(int,roi)
    ImageDraw.Draw(im).rectangle((x0,y0,x1-1,y1-1),fill=255)
    return im

def sha_pixels(im):
    return hashlib.sha256(im.tobytes()).hexdigest()

def nearest_fill(clean,missing,donor_mask,max_distance):
    out=Image.new("RGBA",clean.size,(0,0,0,0))
    mp=missing.load(); dp=donor_mask.load(); cp=clean.load(); op=out.load()
    mb=missing.getbbox()
    if not mb: return out,{"filled":0,"maxDistance":0.0,"meanDistance":0.0}
    donor_points=[]
    db=donor_mask.getbbox()
    if db:
        for y in range(db[1],db[3]):
            for x in range(db[0],db[2]):
                if dp[x,y]: donor_points.append((x,y))
    if not donor_points: raise RuntimeError("empty donor mask")
    distances=[]
    filled=0
    for y in range(mb[1],mb[3]):
        for x in range(mb[0],mb[2]):
            if not mp[x,y]: continue
            best=None; bestd=None
            for dx,dy in donor_points:
                d2=(dx-x)*(dx-x)+(dy-y)*(dy-y)
                if bestd is None or d2<bestd:
                    bestd=d2; best=(dx,dy)
            dist=math.sqrt(bestd)
            if dist>max_distance:
                raise RuntimeError(f"donor too far at {(x,y)}: {dist:.3f}px")
            r,g,b,a=cp[best[0],best[1]]
            op[x,y]=(r,g,b,255)
            distances.append(dist); filled+=1
    return out,{
      "filled":filled,
      "maxDistance":max(distances) if distances else 0,
      "meanDistance":sum(distances)/len(distances) if distances else 0
    }

def boundary_color_error(clean,edited,candidate_mask):
    cp=clean.load(); ep=edited.load(); mp=candidate_mask.load()
    w,h=clean.size
    values=[]
    pairs=0
    for y in range(h):
        for x in range(w):
            if not mp[x,y]: continue
            for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0<=nx<w and 0<=ny<h and not mp[nx,ny]:
                    a=ep[x,y][:3]; b=clean.getpixel((nx,ny))[:3]
                    values.append(sum(abs(a[i]-b[i]) for i in range(3))/3)
                    pairs+=1
    return {
      "pairCount":pairs,
      "meanAbsChannelDifference":sum(values)/len(values) if values else 0,
      "maxAbsChannelDifference":max(values) if values else 0
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--config",type=Path,required=True)
    ap.add_argument("--variant-manifest",type=Path,required=True)
    ap.add_argument("--output-dir",type=Path,required=True)
    args=ap.parse_args()
    cfg=json.loads(args.config.read_text(encoding="utf-8"))
    manifest=json.loads(args.variant_manifest.read_text(encoding="utf-8"))
    local=json.loads((ROOT/cfg["localTransferReport"]).read_text(encoding="utf-8"))
    case=next(x for x in manifest["cases"] if x["id"]==cfg["targetVariant"])
    size=(manifest["canvas"]["width"],manifest["canvas"]["height"])
    with Image.open(safe_app_path(manifest["baseAsset"])) as im:
        base=im.convert("RGBA")

    clean_case=copy.deepcopy(case)
    clean_case["visibleEntities"]=[e for e in case["visibleEntities"] if e["id"]!=cfg["excludeEntityForClean"]]
    clean=render_case(base,clean_case,size)
    current=render_case(base,case,size)

    carcass=pmask(size,local["target"]["carcass"]["quad"])
    host=binalpha(cfg["module02Layer"])
    support=ImageChops.lighter(host,binalpha(cfg["stone02Variant"]))
    support=ImageChops.lighter(support,binalpha(cfg["approvedStone02"]))
    missing=ImageChops.multiply(carcass,ImageChops.invert(support))

    donor=ImageChops.multiply(carcass,host)
    seam=int(cfg["frontSeamX"])
    dpx=donor.load()
    db=donor.getbbox()
    if db:
        for y in range(db[1],db[3]):
            for x in range(db[0],min(seam+1,db[2])):
                dpx[x,y]=0

    candidate,fillstats=nearest_fill(clean,missing,donor,float(cfg["donor"]["maxDistancePx"]))
    edited=Image.alpha_composite(clean,candidate)

    roi=roi_mask(size,cfg["authorizedRoi"])
    outside=ImageChops.multiply(candidate.getchannel("A"),ImageChops.invert(roi))
    protected_overlap=ImageChops.multiply(candidate.getchannel("A"),support)
    hist=binalpha(cfg["historicalOverlay"])
    overlap_hist=ImageChops.multiply(candidate.getchannel("A"),hist)

    historical_changed=sum(1 for a,b in zip(current.getdata(),clean.getdata()) if a!=b)
    edited_changed=sum(1 for a,b in zip(edited.getdata(),clean.getdata()) if a!=b)

    args.output_dir.mkdir(parents=True,exist_ok=True)
    candidate.save(args.output_dir/"candidate.png")
    missing.save(args.output_dir/"edit-mask.png")

    report={
      "schemaVersion":"BMC01MinimalCompletionReport 0.1",
      "sceneId":cfg["sceneId"],
      "targetVariant":cfg["targetVariant"],
      "status":"RESEARCH_CANDIDATE",
      "promotionEligible":False,
      "authoringMethod":"C1 same-object nearest deterministic donor",
      "cleanPixelSha256":sha_pixels(clean),
      "candidatePixelSha256":sha_pixels(candidate),
      "editedPixelSha256":sha_pixels(edited),
      "localCarcassGeometryPixels":count(carcass),
      "editMaskPixels":count(missing),
      "editMaskBounds":bbox(missing),
      "candidateChangedPixelCount":edited_changed,
      "historicalOverlayChangedPixelCount":historical_changed,
      "candidateVsHistoricalChangedPixelRatio":edited_changed/historical_changed if historical_changed else None,
      "outsideAuthorizedRoiPixels":count(outside),
      "preExistingOwnerOverlapPixels":count(protected_overlap),
      "historicalOverlayOverlapPixels":count(overlap_hist),
      "donorMaskPixels":count(donor),
      "donorDistance":fillstats,
      "boundaryColorError":boundary_color_error(clean,edited,candidate.getchannel("A")),
      "limitations":[
        "nearest-pixel donor is a deterministic appearance baseline, not final photometric synthesis",
        "edit entitlement currently uses absence of any alpha contribution from current host/stone assets and remains research-only",
        "candidate has not received visual/human approval"
      ]
    }
    (args.output_dir/"report.json").write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(report,sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
