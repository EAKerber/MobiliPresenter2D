#!/usr/bin/env python3
"""Audit proposed BMC-01 geometry against current authoritative raster support.

This is a geometry/provenance gate, not appearance authoring. It separates:
- pixels already owned by current Module 02 / stone assets;
- pixels genuinely absent before the historical exposed-side overlay;
- pixels supplied by the historical overlay;
- pixels outside the authorized ROI.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ROOT=Path(__file__).resolve().parents[1]

def full(path):
    return ROOT/path

def alpha_raw(path):
    return Image.open(full(path)).convert("RGBA").getchannel("A")

def binary(mask,threshold):
    return mask.point(lambda v: 255 if v >= threshold else 0)

def polygon_mask(size,quad):
    im=Image.new("L",size,0)
    pts=[(round(float(x)),round(float(y))) for x,y in quad]
    ImageDraw.Draw(im).polygon(pts,fill=255)
    return im

def roi_mask(size,roi):
    im=Image.new("L",size,0)
    x0,y0,x1,y1=map(int,roi)
    ImageDraw.Draw(im).rectangle((x0,y0,x1-1,y1-1),fill=255)
    return im

def count(mask):
    return sum(1 for v in mask.getdata() if v)

def logical_and(a,b):
    return ImageChops.multiply(a,b)

def logical_or(*items):
    out=Image.new("L",items[0].size,0)
    for item in items: out=ImageChops.lighter(out,item)
    return out

def invert(a):
    return ImageChops.invert(a)

def bbox(mask):
    b=mask.getbbox()
    return list(b) if b else None

def audit_geometry(name,quad,support,overlay,roi):
    geom=polygon_mask(support.size,quad)
    existing=logical_and(geom,support)
    missing=logical_and(geom,invert(support))
    overlay_in=logical_and(geom,overlay)
    overlay_out=logical_and(overlay,invert(geom))
    missing_covered=logical_and(missing,overlay)
    missing_uncovered=logical_and(missing,invert(overlay))
    outside_roi=logical_and(geom,invert(roi))
    total=count(geom)
    return {
      "id":name,
      "quad":[[float(x),float(y)] for x,y in quad],
      "bounds":bbox(geom),
      "totalPixels":total,
      "preOverlayExistingSupportPixels":count(existing),
      "preOverlayExistingSupportRatio":count(existing)/total if total else 0,
      "preOverlayMissingPixels":count(missing),
      "preOverlayMissingRatio":count(missing)/total if total else 0,
      "historicalOverlayInsideGeometryPixels":count(overlay_in),
      "historicalOverlayOutsideGeometryPixels":count(overlay_out),
      "missingCoveredByHistoricalOverlayPixels":count(missing_covered),
      "missingUncoveredByHistoricalOverlayPixels":count(missing_uncovered),
      "outsideAuthorizedRoiPixels":count(outside_roi),
      "_masks":{"geometry":geom,"missing":missing,"existing":existing}
    }

def save_review(size,records,overlay,out):
    # Geometry masks only; colors are deliberately simple review semantics.
    # full=gray, existing=white, missing=mid-gray; overlay support shown by alpha.
    canvas=Image.new("RGBA",size,(0,0,0,0))
    for rec in records:
        geom=rec["_masks"]["geometry"]
        missing=rec["_masks"]["missing"]
        layer=Image.new("RGBA",size,(255,255,255,0))
        layer.putalpha(geom.point(lambda v: 70 if v else 0))
        canvas=Image.alpha_composite(canvas,layer)
        miss=Image.new("RGBA",size,(160,160,160,0))
        miss.putalpha(missing.point(lambda v: 190 if v else 0))
        canvas=Image.alpha_composite(canvas,miss)
    hist=Image.new("RGBA",size,(80,80,80,0))
    hist.putalpha(overlay.point(lambda v: 220 if v else 0))
    canvas=Image.alpha_composite(canvas,hist)
    out.parent.mkdir(parents=True,exist_ok=True)
    canvas.save(out)

def clean(rec):
    out=dict(rec)
    out.pop("_masks",None)
    return out

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--config",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    ap.add_argument("--review-image",type=Path)
    args=ap.parse_args()
    cfg=json.loads(args.config.read_text(encoding="utf-8"))
    local=json.loads(full(cfg["inputs"]["localTransferReport"]).read_text(encoding="utf-8"))
    size=tuple(cfg["canvas"])
    thresholds=[int(x) for x in cfg.get("alphaThresholds",[1,128])]
    roi=roi_mask(size,cfg["authorizedRoi"])

    raw_support=[
      alpha_raw(cfg["inputs"]["module02Layer"]),
      alpha_raw(cfg["inputs"]["stone02Variant"]),
      alpha_raw(cfg["inputs"]["approvedStone02"])
    ]
    raw_overlay=alpha_raw(cfg["inputs"]["historicalOverlay"])

    sweeps=[]
    review_records=None
    review_overlay=None
    for threshold in thresholds:
        support=logical_or(*(binary(x,threshold) for x in raw_support))
        overlay=binary(raw_overlay,threshold)
        cases=[
          audit_geometry("historical-carcass",cfg["historical"]["carcassQuad"],support,overlay,roi),
          audit_geometry("historical-plinth",cfg["historical"]["plinthQuad"],support,overlay,roi),
          audit_geometry("local-carcass",local["target"]["carcass"]["quad"],support,overlay,roi),
          audit_geometry("local-plinth",local["target"]["plinth"]["quad"],support,overlay,roi),
        ]
        for rec in cases:
            if rec["totalPixels"] != rec["preOverlayExistingSupportPixels"] + rec["preOverlayMissingPixels"]:
                raise RuntimeError(f"non-partitioned binary support at threshold {threshold}: {rec['id']}")
        sweeps.append({"alphaThreshold":threshold,"cases":[clean(x) for x in cases]})
        if threshold==thresholds[0]:
            review_records=cases
            review_overlay=overlay

    if args.review_image and review_records is not None:
        save_review(size,review_records,review_overlay,args.review_image)

    report={
      "schemaVersion":"BMC01GeometrySupportAuditReport 0.2",
      "sceneId":cfg["sceneId"],
      "promotionEligible":False,
      "authorizedRoi":cfg["authorizedRoi"],
      "supportDefinition":[
        cfg["inputs"]["module02Layer"],
        cfg["inputs"]["stone02Variant"],
        cfg["inputs"]["approvedStone02"]
      ],
      "historicalOverlay":cfg["inputs"]["historicalOverlay"],
      "thresholdSweep":sweeps,
      "interpretationRules":[
        "all geometry masks and support masks are binary before set arithmetic",
        "high preOverlayExistingSupportRatio means the proposed face mostly re-describes pixels already owned by current canonical assets",
        "preOverlayMissingPixels are the only geometry area that could justify new raster support under this model",
        "historical overlay is comparison-only and is never counted as pre-overlay support",
        "outsideAuthorizedRoiPixels must remain zero for any promotable descendant"
      ]
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps({
      str(sweep["alphaThreshold"]):{
        case["id"]:{
          "existingRatio":round(case["preOverlayExistingSupportRatio"],4),
          "missing":case["preOverlayMissingPixels"],
          "missingCoveredByOldOverlay":case["missingCoveredByHistoricalOverlayPixels"],
          "outsideRoi":case["outsideAuthorizedRoiPixels"]
        } for case in sweep["cases"]
      } for sweep in report["thresholdSweep"]
    },sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
