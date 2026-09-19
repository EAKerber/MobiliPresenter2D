#!/usr/bin/env python3
"""Build antialiased BMC-01 carcass + plinth donor candidate."""
from __future__ import annotations
import argparse, copy, hashlib, json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
try:
    from tools.render_variant_fidelity import render_case, safe_app_path
    from tools.materialize_perspective_donor_recipe import perspective_coefficients, polygon_mask
except ModuleNotFoundError:
    from render_variant_fidelity import render_case, safe_app_path
    from materialize_perspective_donor_recipe import perspective_coefficients, polygon_mask

ROOT=Path(__file__).resolve().parents[1]

def binary_alpha(path,threshold):
    a=Image.open(ROOT/path).convert("RGBA").getchannel("A")
    return a.point(lambda v:255 if v>=threshold else 0)

def count_nonzero(mask):
    return sum(1 for v in mask.getdata() if v)

def alpha_mass(mask):
    return sum(mask.getdata())/255.0

def sha_pixels(im):
    return hashlib.sha256(im.tobytes()).hexdigest()

def donor_candidate(source,donor_quad,target_quad,coverage,protected):
    coeffs=perspective_coefficients(target_quad,donor_quad)
    warped=source.transform(
      source.size,Image.Transform.PERSPECTIVE,coeffs,resample=Image.Resampling.BILINEAR
    ).convert("RGBA")
    mask=ImageChops.multiply(coverage,ImageChops.invert(protected))
    warped.putalpha(mask)
    return warped,mask

def boundary_alpha(mask):
    """One-pixel 4-neighbour boundary of nonzero candidate coverage."""
    b=mask.point(lambda v:255 if v else 0)
    left=Image.new("L",b.size); left.paste(b,(-1,0))
    right=Image.new("L",b.size); right.paste(b,(1,0))
    up=Image.new("L",b.size); up.paste(b,(0,-1))
    down=Image.new("L",b.size); down.paste(b,(0,1))
    grown=ImageChops.lighter(ImageChops.lighter(left,right),ImageChops.lighter(up,down))
    return ImageChops.multiply(grown,ImageChops.invert(b))

def boundary_color_error(clean,edited,mask):
    bp=boundary_alpha(mask)
    mp=mask.point(lambda v:255 if v else 0)
    cp=clean.load(); ep=edited.load(); m=mp.load(); b=bp.load()
    w,h=clean.size; vals=[]; pairs=0
    for y in range(h):
      for x in range(w):
        if not m[x,y]: continue
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
          if 0<=nx<w and 0<=ny<h and b[nx,ny]:
            a=ep[x,y][:3]; c=cp[nx,ny][:3]
            vals.append(sum(abs(a[i]-c[i]) for i in range(3))/3); pairs+=1
    return {
      "pairCount":pairs,
      "meanAbsChannelDifference":sum(vals)/len(vals) if vals else None,
      "maxAbsChannelDifference":max(vals) if vals else None
    }

def comparison_sheet(clean,current,edited,crop=(720,510,785,915),scale=3):
    panels=[]
    for image,label in (
      (clean,"A clean - historical side removed"),
      (current,"B current - historical overlay"),
      (edited,"C antialiased local donor completion")
    ):
      c=image.crop(crop).convert("RGB").resize(
        ((crop[2]-crop[0])*scale,(crop[3]-crop[1])*scale),Image.Resampling.NEAREST
      )
      panel=Image.new("RGB",(c.width,c.height+24),"white"); panel.paste(c,(0,24))
      ImageDraw.Draw(panel).text((6,6),label,fill="black"); panels.append(panel)
    w=max(p.width for p in panels); h=sum(p.height for p in panels)
    sheet=Image.new("RGB",(w,h),"white"); y=0
    for p in panels: sheet.paste(p,(0,y)); y+=p.height
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
    size=(manifest["canvas"]["width"],manifest["canvas"]["height"])
    with Image.open(safe_app_path(manifest["baseAsset"])) as im: base=im.convert("RGBA")
    case=next(x for x in manifest["cases"] if x["id"]==cfg["targetVariant"])
    clean_case=copy.deepcopy(case)
    clean_case["visibleEntities"]=[e for e in case["visibleEntities"] if e["id"]!=cfg["excludeEntityForClean"]]
    clean=render_case(base,clean_case,size)
    current=render_case(base,case,size)

    roi=tuple(cfg["authorizedRoi"]); ss=int(cfg["supersampling"])
    carcass_cov=polygon_mask(size,local["target"]["carcass"]["quad"],ss,roi)
    plinth_cov=polygon_mask(size,local["target"]["plinth"]["quad"],ss,roi)

    host=binary_alpha(cfg["module02Layer"],int(cfg["carcass"]["hostOwnershipAlphaThreshold"]))
    stone_any=binary_alpha(cfg["stone02Variant"],1)
    approved_any=binary_alpha(cfg["approvedStone02"],1)
    carcass_protected=ImageChops.lighter(host,ImageChops.lighter(stone_any,approved_any))

    carcass_candidate,carcass_mask=donor_candidate(
      clean,cfg["carcass"]["donorQuad"],local["target"]["carcass"]["quad"],carcass_cov,carcass_protected
    )
    after_carcass=Image.alpha_composite(clean,carcass_candidate)

    pt=int(cfg["plinth"]["ownershipAlphaThreshold"])
    plinth_protected=ImageChops.lighter(
      binary_alpha(cfg["module02Layer"],pt),
      ImageChops.lighter(binary_alpha(cfg["stone02Variant"],pt),binary_alpha(cfg["approvedStone02"],pt))
    )
    plinth_candidate,plinth_mask=donor_candidate(
      clean,cfg["plinth"]["donorQuad"],local["target"]["plinth"]["quad"],plinth_cov,plinth_protected
    )
    combined_candidate=Image.alpha_composite(carcass_candidate,plinth_candidate)
    edited=Image.alpha_composite(clean,combined_candidate)

    out=args.output_dir; out.mkdir(parents=True,exist_ok=True)
    for name,im in (
      ("carcass-candidate.png",carcass_candidate),
      ("carcass-mask.png",carcass_mask),
      ("plinth-candidate.png",plinth_candidate),
      ("plinth-mask.png",plinth_mask),
      ("candidate.png",combined_candidate),
      ("edited.png",edited)
    ): im.save(out/name)
    comparison_sheet(clean,current,edited).save(out/"comparison.png")

    outside_roi=ImageChops.multiply(combined_candidate.getchannel("A"),ImageChops.invert(
      Image.new("L",size,0)
    ))
    # Explicit ROI mask for exact outside check.
    roi_mask=Image.new("L",size,0)
    ImageDraw.Draw(roi_mask).rectangle((roi[0],roi[1],roi[2]-1,roi[3]-1),fill=255)
    outside_roi=ImageChops.multiply(combined_candidate.getchannel("A"),ImageChops.invert(roi_mask))

    report={
      "schemaVersion":"BMC01AntialiasedCompletionReport 0.1",
      "sceneId":cfg["sceneId"],
      "targetVariant":cfg["targetVariant"],
      "status":"RESEARCH_CANDIDATE",
      "promotionEligible":False,
      "supersampling":ss,
      "carcass":{
        "targetQuad":local["target"]["carcass"]["quad"],
        "donorQuad":cfg["carcass"]["donorQuad"],
        "coverageNonzeroPixels":count_nonzero(carcass_mask),
        "coverageAlphaMass":alpha_mass(carcass_mask),
        "boundaryColorErrorAfter":boundary_color_error(clean,edited,carcass_mask)
      },
      "plinth":{
        "targetQuad":local["target"]["plinth"]["quad"],
        "donorQuad":cfg["plinth"]["donorQuad"],
        "coverageNonzeroPixels":count_nonzero(plinth_mask),
        "coverageAlphaMass":alpha_mass(plinth_mask),
        "boundaryColorErrorAfter":boundary_color_error(clean,edited,plinth_mask)
      },
      "combined":{
        "changedPixelCount":sum(1 for a,b in zip(edited.getdata(),clean.getdata()) if a!=b),
        "candidatePixelSha256":sha_pixels(combined_candidate),
        "editedPixelSha256":sha_pixels(edited),
        "outsideAuthorizedRoiNonzeroPixels":count_nonzero(outside_roi)
      },
      "limitations":[
        "carcass and plinth donors are canonical appearance references, not direct photos of the newly exposed faces",
        "local geometry remains derived rather than globally calibrated",
        "plinth donor preserves front-surface lighting and may still require bounded orientation harmonization"
      ]
    }
    (out/"report.json").write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(report,sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
