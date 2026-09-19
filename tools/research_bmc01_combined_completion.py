#!/usr/bin/env python3
"""Compose BMC-01 carcass v0.6 with an independently reconstructed plinth."""
from __future__ import annotations
import argparse, copy, hashlib, json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
try:
    from tools.render_variant_fidelity import render_case, safe_app_path
    from tools.research_bmc01_minimal_completion import pmask, nearest_fill, count, bbox, roi_mask, boundary_color_error, same_object_contact_error, candidate_row_roughness
except ModuleNotFoundError:
    from render_variant_fidelity import render_case, safe_app_path
    from research_bmc01_minimal_completion import pmask, nearest_fill, count, bbox, roi_mask, boundary_color_error, same_object_contact_error, candidate_row_roughness

ROOT=Path(__file__).resolve().parents[1]

def binary_alpha(path,threshold):
    a=Image.open(ROOT/path).convert("RGBA").getchannel("A")
    return a.point(lambda v:255 if v>=threshold else 0)

def sha_pixels(im):
    return hashlib.sha256(im.tobytes()).hexdigest()

def comparison_sheet(clean,current,carcass_only,combined,crop=(720,510,785,915),scale=3):
    panels=[]
    for image,label in (
      (clean,"A clean - historical side removed"),
      (current,"B current - historical overlay"),
      (carcass_only,"C carcass v0.6 only"),
      (combined,"D carcass v0.6 + local plinth")
    ):
        c=image.crop(crop).convert("RGB")
        c=c.resize((c.width*scale,c.height*scale),Image.Resampling.NEAREST)
        panel=Image.new("RGB",(c.width,c.height+24),"white")
        panel.paste(c,(0,24)); ImageDraw.Draw(panel).text((6,6),label,fill="black")
        panels.append(panel)
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
    carcass_report=json.loads((ROOT/cfg["carcassReport"]).read_text(encoding="utf-8"))
    size=(manifest["canvas"]["width"],manifest["canvas"]["height"])
    with Image.open(safe_app_path(manifest["baseAsset"])) as im: base=im.convert("RGBA")
    case=next(x for x in manifest["cases"] if x["id"]==cfg["targetVariant"])
    clean_case=copy.deepcopy(case)
    clean_case["visibleEntities"]=[e for e in case["visibleEntities"] if e["id"]!=cfg["excludeEntityForClean"]]
    clean=render_case(base,clean_case,size)
    current=render_case(base,case,size)

    carcass_candidate=Image.open(ROOT/cfg["carcassCandidate"]).convert("RGBA")
    if carcass_candidate.size!=size: raise RuntimeError("carcass candidate size mismatch")
    carcass_only=Image.alpha_composite(clean,carcass_candidate)

    plinth_geom=pmask(size,local["target"]["plinth"]["quad"])
    t=int(cfg["plinth"]["ownershipAlphaThreshold"])
    support=ImageChops.lighter(binary_alpha(cfg["module02Layer"],t),binary_alpha(cfg["stone02Variant"],t))
    support=ImageChops.lighter(support,binary_alpha(cfg["approvedStone02"],t))
    missing=ImageChops.multiply(plinth_geom,ImageChops.invert(support))

    semantic=Image.open(ROOT/cfg["stone02PlinthMask"]).convert("L").point(lambda v:255 if v else 0)
    donor_alpha=binary_alpha(cfg["stone02Variant"],int(cfg["plinth"]["donorAlphaThreshold"]))
    donor=ImageChops.multiply(semantic,donor_alpha)
    seam=int(cfg["frontSeamX"]); dp=donor.load(); db=donor.getbbox()
    if db:
        for y in range(db[1],db[3]):
            for x in range(max(seam,db[0]),db[2]):
                dp[x,y]=0

    plinth_candidate,fillstats=nearest_fill(clean,missing,donor,float(cfg["plinth"]["donorMaxDistancePx"]))
    combined_candidate=Image.alpha_composite(carcass_candidate,plinth_candidate)
    combined=Image.alpha_composite(clean,combined_candidate)

    roi=roi_mask(size,cfg["authorizedRoi"])
    outside=ImageChops.multiply(combined_candidate.getchannel("A"),ImageChops.invert(roi))
    protected_overlap=ImageChops.multiply(plinth_candidate.getchannel("A"),support)
    hist=binary_alpha(cfg["historicalOverlay"],1)
    plinth_hist_overlap=ImageChops.multiply(plinth_candidate.getchannel("A"),hist)

    out=args.output_dir; out.mkdir(parents=True,exist_ok=True)
    for name,im in (
      ("plinth-candidate.png",plinth_candidate),
      ("plinth-edit-mask.png",missing),
      ("candidate.png",combined_candidate),
      ("edited.png",combined)
    ): im.save(out/name)
    comparison_sheet(clean,current,carcass_only,combined).save(out/"comparison.png")

    report={
      "schemaVersion":"BMC01CombinedCompletionReport 0.1",
      "sceneId":cfg["sceneId"],
      "targetVariant":cfg["targetVariant"],
      "status":"RESEARCH_CANDIDATE",
      "promotionEligible":False,
      "carcass":{
        "sourceCandidate":cfg["carcassCandidate"],
        "sourceReport":cfg["carcassReport"],
        "method":carcass_report["authoringMethod"],
        "changedPixels":carcass_report["candidateChangedPixelCount"]
      },
      "plinth":{
        "physicalDepthMm":local["target"]["plinth"]["physicalDepthMm"],
        "geometryPixels":count(plinth_geom),
        "editMaskPixels":count(missing),
        "editMaskBounds":bbox(missing),
        "donorMaskPixels":count(donor),
        "fillStats":fillstats,
        "protectedOwnerOverlapPixels":count(protected_overlap),
        "historicalOverlayOverlapPixels":count(plinth_hist_overlap),
        "boundaryColorErrorBefore":boundary_color_error(clean,clean,plinth_candidate.getchannel("A")),
        "boundaryColorErrorAfter":boundary_color_error(clean,combined,plinth_candidate.getchannel("A")),
        "donorContactErrorBefore":same_object_contact_error(clean,clean,plinth_candidate.getchannel("A"),donor),
        "donorContactErrorAfter":same_object_contact_error(clean,combined,plinth_candidate.getchannel("A"),donor),
        "rowRoughness":candidate_row_roughness(plinth_candidate)
      },
      "combined":{
        "changedPixelCount":sum(1 for a,b in zip(combined.getdata(),clean.getdata()) if a!=b),
        "candidatePixelSha256":sha_pixels(combined_candidate),
        "editedPixelSha256":sha_pixels(combined),
        "outsideAuthorizedRoiPixels":count(outside)
      },
      "limitations":[
        "plinth donor is same-object front-plinth appearance, not an independently photographed right-side plinth",
        "local plinth geometry remains derived from adjacent Stone03 projection plus physical depth",
        "candidate requires visual review before any promotion"
      ]
    }
    before=report["plinth"]["boundaryColorErrorBefore"]["meanAbsChannelDifference"]
    after=report["plinth"]["boundaryColorErrorAfter"]["meanAbsChannelDifference"]
    report["plinth"]["boundaryMeanImprovement"]=before-after
    (out/"report.json").write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(report,sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
