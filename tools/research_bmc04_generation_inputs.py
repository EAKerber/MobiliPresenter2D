#!/usr/bin/env python3
"""Assemble deterministic BMC-04 generation inputs from current canonical assets."""
from __future__ import annotations
import argparse, hashlib, json, shutil
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]

try:
    from tools.render_variant_fidelity import render_case
    from tools.materialize_stone_cleanplate import masks
except ModuleNotFoundError:
    from render_variant_fidelity import render_case
    from materialize_stone_cleanplate import masks

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def localize(points,crop):
    x0,y0,_,_=crop
    return [[float(x)-x0,float(y)-y0] for x,y in points]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--config",type=Path,required=True)
    ap.add_argument("--variant-manifest",type=Path,required=True)
    ap.add_argument("--output-dir",type=Path,required=True)
    args=ap.parse_args()

    cfg=json.loads(args.config.read_text(encoding="utf-8"))
    manifest=json.loads(args.variant_manifest.read_text(encoding="utf-8"))
    footprint=json.loads((ROOT/cfg["footprintReport"]).read_text(encoding="utf-8"))

    base=Image.open(ROOT/"app"/manifest["baseAsset"]).convert("RGBA")
    case=next(c for c in manifest["cases"] if c["id"]==cfg["targetVariant"])
    source=render_case(base,case,base.size)

    parts,_=masks(json.loads((ROOT/cfg["stoneCleanplateConfig"]).read_text(encoding="utf-8")))
    pans=parts["pans-02"]
    clean=Image.open(ROOT/cfg["stoneCleanplateComposed"]).convert("RGBA")
    without_pans=Image.composite(clean,source,pans)
    removal=Image.open(ROOT/cfg["cooktopRemovalMask"]).convert("L")
    backing=Image.open(ROOT/cfg["stoneBacking"]).convert("RGBA")
    under=Image.composite(backing,without_pans,removal)

    crop=tuple(map(int,cfg["crop"]))
    out=args.output_dir
    out.mkdir(parents=True,exist_ok=True)

    source_crop=source.crop(crop)
    clean_crop=under.crop(crop)
    source_crop.save(out/"reference-current.png")
    clean_crop.save(out/"clean-cooktop-free.png")

    q=footprint["targetQuadPx"]
    ordered=[
      q["frontLeft"],q["frontRight"],q["backRight"],q["backLeft"]
    ]
    local=localize(ordered,crop)

    mask=Image.new("L",clean_crop.size,0)
    ImageDraw.Draw(mask).polygon([(round(x),round(y)) for x,y in local],fill=255)
    mask.save(out/"footprint-max-support.png")

    guide=clean_crop.convert("RGB")
    draw=ImageDraw.Draw(guide)
    pts=[(round(x),round(y)) for x,y in local]
    draw.line(pts+[pts[0]],fill=(255,0,255),width=2)
    labels=["FL","FR","BR","BL"]
    for label,(x,y) in zip(labels,pts):
        draw.ellipse((x-3,y-3,x+3,y+3),fill=(255,255,0),outline=(0,0,0))
        draw.text((x+5,y-8),label,fill=(0,0,0))
    guide.save(out/"footprint-guide.png")

    donor_src=ROOT/cfg["existingGeneratedDonor"]
    donor_dst=out/"existing-generated-donor.png"
    shutil.copyfile(donor_src,donor_dst)

    receipt={
      "schemaVersion":"BMC04GenerationInputReceipt 0.1",
      "sceneId":cfg["sceneId"],
      "status":"READY_FOR_BOUNDED_GENERATION",
      "promotionEligible":False,
      "cropGlobal":list(crop),
      "targetFootprintGlobalPx":q,
      "targetFootprintCropPx":{
        key:point for key,point in zip(["frontLeft","frontRight","backRight","backLeft"],local)
      },
      "files":{},
      "generationContract":{
        "cleanReference":"clean-cooktop-free.png",
        "currentReference":"reference-current.png",
        "hardGuide":"footprint-guide.png",
        "maximumSupportMask":"footprint-max-support.png",
        "existingGeneratedDonor":"existing-generated-donor.png",
        "desiredOutput":"isolated transparent cooktop already matching the target footprint/perspective",
        "forbidden":"scene/background/stone/cabinet edits"
      },
      "perceptualTarget":{"status":"PENDING_MATERIALIZATION","geometryAuthority":False}
    }
    for name in [
      "reference-current.png","clean-cooktop-free.png","footprint-max-support.png",
      "footprint-guide.png","existing-generated-donor.png"
    ]:
        p=out/name
        receipt["files"][name]={"sha256":sha256(p),"sizeBytes":p.stat().st_size}
    (out/"receipt.json").write_text(json.dumps(receipt,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(receipt,sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
