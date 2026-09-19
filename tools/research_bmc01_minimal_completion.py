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

def binary_alpha(path,threshold=1):
    a=Image.open(ROOT/path).convert("RGBA").getchannel("A")
    t=int(threshold)
    return a.point(lambda v:255 if v>=t else 0)

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

def promote_soft_host_rgb(clean,missing,host_rgba,host_threshold):
    """Use source-layer RGB as appearance evidence where host alpha is soft.

    Soft alpha is *not* promoted to geometry authority. Geometry entitlement
    still comes from the local projected polygon. This helper only decides
    appearance inside already-authorized missing geometry.
    """
    out=Image.new("RGBA",clean.size,(0,0,0,0))
    mp=missing.load(); hp=host_rgba.load(); op=out.load()
    bounds=missing.getbbox()
    promoted=0
    if bounds:
        for y in range(bounds[1],bounds[3]):
            for x in range(bounds[0],bounds[2]):
                if not mp[x,y]:
                    continue
                r,g,b,a=hp[x,y]
                if 0 < a < host_threshold:
                    op[x,y]=(r,g,b,255)
                    promoted+=1
    return out,promoted


def smooth_seed_fill(clean,missing,donor_mask,vertical_radius,contact_source="average"):
    """Continue a strong same-object edge across missing geometry.

    The first missing column keeps exact same-row donor appearance to preserve
    contact. Smoothing increases only with distance from that contact, so the
    rear of the inferred face loses row-to-row striping without altering the
    authoritative seam.
    """
    cp=clean.load(); mp=missing.load(); dp=donor_mask.load()
    out=Image.new("RGBA",clean.size,(0,0,0,0)); op=out.load()
    mb=missing.getbbox(); db=donor_mask.getbbox()
    if not mb or not db:
        return out,{"filled":0,"verticalRadius":vertical_radius}

    seed={}
    contact_seed={}
    for y in range(db[1],db[3]):
        vals=[]
        coords=[]
        for x in range(db[0],db[2]):
            if dp[x,y]:
                vals.append(cp[x,y][:3])
                coords.append((x,cp[x,y][:3]))
        if vals:
            seed[y]=tuple(sum(v[i] for v in vals)/len(vals) for i in range(3))
            if contact_source=="rightmost":
                contact_seed[y]=max(coords,key=lambda item:item[0])[1]
            elif contact_source=="average":
                contact_seed[y]=seed[y]
            else:
                raise ValueError(f"unsupported contact source: {contact_source}")
    if not seed:
        raise RuntimeError("empty strong seed rows")
    seed_rows=sorted(seed)

    def nearest_seed_y(y):
        return min(seed_rows,key=lambda yy:abs(yy-y))

    def smooth_color(y):
        center=nearest_seed_y(y)
        rows=[yy for yy in seed_rows if abs(yy-center)<=vertical_radius]
        if not rows: rows=[center]
        weighted=[]; total=0.0
        for yy in rows:
            w=float(vertical_radius+1-abs(yy-center))
            if w<=0: continue
            weighted.append((seed[yy],w)); total+=w
        return tuple(sum(c[i]*w for c,w in weighted)/total for i in range(3))

    filled=0
    for y in range(mb[1],mb[3]):
        xs=[x for x in range(mb[0],mb[2]) if mp[x,y]]
        if not xs: continue
        first=min(xs); last=max(xs)
        sy=nearest_seed_y(y)
        raw=contact_seed[sy]; smooth=smooth_color(y)
        span=max(1,last-first)
        for x in xs:
            t=(x-first)/span if last>first else 0.0
            rgb=tuple(round(raw[i]*(1.0-t)+smooth[i]*t) for i in range(3))
            op[x,y]=(rgb[0],rgb[1],rgb[2],255)
            filled+=1
    return out,{"filled":filled,"verticalRadius":vertical_radius,"contactSource":contact_source,"seedRows":len(seed_rows),"seedYRange":[seed_rows[0],seed_rows[-1]]}


def candidate_row_roughness(candidate):
    a=candidate.getchannel("A")
    bounds=a.getbbox()
    if not bounds:
        return {"pairCount":0,"meanRowMeanAbsDifference":0.0,"p90RowMeanAbsDifference":0.0,"maxRowMeanAbsDifference":0.0}
    cp=candidate.load(); ap=a.load()
    row_means=[]
    for y in range(bounds[1],bounds[3]):
        vals=[cp[x,y][:3] for x in range(bounds[0],bounds[2]) if ap[x,y]]
        if vals:
            row_means.append((y,tuple(sum(v[i] for v in vals)/len(vals) for i in range(3))))
    diffs=[]
    for (y0,c0),(y1,c1) in zip(row_means,row_means[1:]):
        if y1!=y0+1: continue
        diffs.append(sum(abs(c1[i]-c0[i]) for i in range(3))/3)
    ordered=sorted(diffs)
    p90=ordered[round((len(ordered)-1)*.9)] if ordered else 0.0
    return {
      "pairCount":len(diffs),
      "meanRowMeanAbsDifference":sum(diffs)/len(diffs) if diffs else 0.0,
      "p90RowMeanAbsDifference":p90,
      "maxRowMeanAbsDifference":max(diffs) if diffs else 0.0
    }


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

def same_object_contact_error(clean,image,candidate_mask,donor_mask):
    ip=image.load(); cp=clean.load(); mp=candidate_mask.load(); dp=donor_mask.load()
    w,h=clean.size
    values=[]
    pairs=0
    for y in range(h):
        for x in range(w):
            if not mp[x,y]: continue
            for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0<=nx<w and 0<=ny<h and dp[nx,ny]:
                    a=ip[x,y][:3]; b=cp[nx,ny][:3]
                    values.append(sum(abs(a[i]-b[i]) for i in range(3))/3)
                    pairs+=1
    return {
      "pairCount":pairs,
      "meanAbsChannelDifference":sum(values)/len(values) if values else None,
      "maxAbsChannelDifference":max(values) if values else None
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

def comparison_sheet(clean,current,edited,crop=(720,510,785,915),scale=3):
    panels=[]
    for image,label in (
      (clean,"A clean - historical overlay removed"),
      (current,"B current - historical overlay"),
      (edited,"C minimal deterministic completion")
    ):
        c=image.crop(crop).convert("RGB")
        c=c.resize((c.width*scale,c.height*scale),Image.Resampling.NEAREST)
        panel=Image.new("RGB",(c.width,c.height+24),"white")
        panel.paste(c,(0,24))
        ImageDraw.Draw(panel).text((6,6),label,fill="black")
        panels.append(panel)
    w=max(p.width for p in panels); h=sum(p.height for p in panels)
    sheet=Image.new("RGB",(w,h),"white")
    y=0
    for p in panels:
        sheet.paste(p,(0,y)); y+=p.height
    return sheet

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
    policy=cfg.get("policy") or {}
    host_threshold=int(policy.get("hostOwnershipAlphaThreshold",1))
    donor_threshold=int((cfg.get("donor") or {}).get("minAlpha",host_threshold))

    host_rgba=Image.open(ROOT/cfg["module02Layer"]).convert("RGBA")
    host_any=host_rgba.getchannel("A").point(lambda v:255 if v>=1 else 0)
    host_owner=host_rgba.getchannel("A").point(lambda v:255 if v>=host_threshold else 0)
    host_soft=ImageChops.multiply(host_any,ImageChops.invert(host_owner))
    stone=binary_alpha(cfg["stone02Variant"],1)
    approved=binary_alpha(cfg["approvedStone02"],1)

    support=ImageChops.lighter(host_owner,stone)
    support=ImageChops.lighter(support,approved)
    missing=ImageChops.multiply(carcass,ImageChops.invert(support))

    donor=ImageChops.multiply(carcass,binary_alpha(cfg["module02Layer"],donor_threshold))
    seam=int(cfg["frontSeamX"])
    dpx=donor.load()
    db=donor.getbbox()
    if db:
        for y in range(db[1],db[3]):
            for x in range(db[0],min(seam+1,db[2])):
                dpx[x,y]=0

    appearance_cfg=cfg.get("appearance") or {}
    appearance_mode=appearance_cfg.get("softHostRgb","ignore")
    continuation_mode=appearance_cfg.get("continuation","nearest")
    promoted_soft=Image.new("RGBA",clean.size,(0,0,0,0))
    promoted_count=0
    residual_missing=missing
    if appearance_mode=="promote-source-rgb":
        promoted_soft,promoted_count=promote_soft_host_rgb(clean,missing,host_rgba,host_threshold)
        residual_missing=ImageChops.multiply(missing,ImageChops.invert(promoted_soft.getchannel("A")))
    elif appearance_mode!="ignore":
        raise ValueError(f"unsupported softHostRgb appearance mode: {appearance_mode}")

    if continuation_mode=="nearest":
        continuation,fillstats=nearest_fill(clean,residual_missing,donor,float(cfg["donor"]["maxDistancePx"]))
    elif continuation_mode=="smooth-strong-seed":
        continuation,fillstats=smooth_seed_fill(
          clean,residual_missing,donor,
          int(appearance_cfg.get("verticalRadius",5)),
          str(appearance_cfg.get("contactSource","average"))
        )
    else:
        raise ValueError(f"unsupported continuation mode: {continuation_mode}")
    candidate=Image.alpha_composite(promoted_soft,continuation)
    edited=Image.alpha_composite(clean,candidate)

    roi=roi_mask(size,cfg["authorizedRoi"])
    outside=ImageChops.multiply(candidate.getchannel("A"),ImageChops.invert(roi))
    protected_overlap=ImageChops.multiply(candidate.getchannel("A"),support)
    soft_host_overlap=ImageChops.multiply(candidate.getchannel("A"),host_soft)
    hist=binary_alpha(cfg["historicalOverlay"],1)
    overlap_hist=ImageChops.multiply(candidate.getchannel("A"),hist)

    historical_changed=sum(1 for a,b in zip(current.getdata(),clean.getdata()) if a!=b)
    edited_changed=sum(1 for a,b in zip(edited.getdata(),clean.getdata()) if a!=b)

    args.output_dir.mkdir(parents=True,exist_ok=True)
    candidate.save(args.output_dir/"candidate.png")
    missing.save(args.output_dir/"edit-mask.png")
    edited.save(args.output_dir/"edited.png")
    comparison_sheet(clean,current,edited).save(args.output_dir/"comparison.png")

    report={
      "schemaVersion":str(cfg.get("schemaVersion","BMC01MinimalCompletion 0.1")).replace("BMC01MinimalCompletion ","BMC01MinimalCompletionReport "),
      "sceneId":cfg["sceneId"],
      "targetVariant":cfg["targetVariant"],
      "status":"RESEARCH_CANDIDATE",
      "promotionEligible":False,
      "authoringMethod":(
        "C1 same-object source-RGB promotion + deterministic continuation" if appearance_mode=="promote-source-rgb"
        else "C1 same-object smooth strong-seed continuation" if continuation_mode=="smooth-strong-seed"
        else "C1 same-object nearest deterministic donor"
      ),
      "cleanPixelSha256":sha_pixels(clean),
      "candidatePixelSha256":sha_pixels(candidate),
      "editedPixelSha256":sha_pixels(edited),
      "reviewFiles":{"candidate":"candidate.png","editMask":"edit-mask.png","edited":"edited.png","comparison":"comparison.png"},
      "localCarcassGeometryPixels":count(carcass),
      "editMaskPixels":count(missing),
      "editMaskBounds":bbox(missing),
      "candidateChangedPixelCount":edited_changed,
      "historicalOverlayChangedPixelCount":historical_changed,
      "candidateVsHistoricalChangedPixelRatio":edited_changed/historical_changed if historical_changed else None,
      "outsideAuthorizedRoiPixels":count(outside),
      "preExistingOwnerOverlapPixels":count(protected_overlap),
      "softHostFringeOverlapPixels":count(soft_host_overlap),
      "hostOwnershipAlphaThreshold":host_threshold,
      "donorMinAlpha":donor_threshold,
      "historicalOverlayOverlapPixels":count(overlap_hist),
      "donorMaskPixels":count(donor),
      "appearanceMode":appearance_mode,
      "continuationMode":continuation_mode,
      "promotedSoftHostRgbPixels":promoted_count,
      "nearestFilledResidualPixels":fillstats["filled"],
      "donorDistance":fillstats,
      "candidateRowRoughness":candidate_row_roughness(candidate),
      "boundaryColorErrorBefore":boundary_color_error(clean,clean,candidate.getchannel("A")),
      "boundaryColorErrorAfter":boundary_color_error(clean,edited,candidate.getchannel("A")),
      "sameObjectContactErrorBefore":same_object_contact_error(clean,clean,candidate.getchannel("A"),donor),
      "sameObjectContactErrorAfter":same_object_contact_error(clean,edited,candidate.getchannel("A"),donor),
      "limitations":[
        "deterministic same-object continuation is an appearance baseline, not final photometric synthesis",
        "host ownership threshold is research-only and distinguishes solid same-object support from low-alpha compositing fringe",
        "candidate has not received visual/human approval"
      ]
    }
    before=report["boundaryColorErrorBefore"]["meanAbsChannelDifference"]
    after=report["boundaryColorErrorAfter"]["meanAbsChannelDifference"]
    report["boundaryColorErrorMeanImprovement"]=before-after
    report["boundaryColorErrorMeanImprovementRatio"]=(before-after)/before if before else None
    cb=report["sameObjectContactErrorBefore"]["meanAbsChannelDifference"]
    ca=report["sameObjectContactErrorAfter"]["meanAbsChannelDifference"]
    report["sameObjectContactMeanImprovement"]=(cb-ca) if cb is not None and ca is not None else None
    report["sameObjectContactMeanImprovementRatio"]=((cb-ca)/cb) if cb not in (None,0) and ca is not None else None
    (args.output_dir/"report.json").write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(report,sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
