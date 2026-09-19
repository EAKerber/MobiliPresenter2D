#!/usr/bin/env python3
from __future__ import annotations
import json, math, re, subprocess
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat

ROOT=Path(__file__).resolve().parents[1]
OUT=Path("/tmp/material-discovery")
OUT.mkdir(parents=True,exist_ok=True)
SIZE=(1536,1024)

def alpha_count(im):
    return sum(im.convert("L").histogram()[1:])

def luminance(rgb):
    r,g,b=rgb
    return (0.2126*r+0.7152*g+0.0722*b)/255

def stats_luma(path):
    im=Image.open(path).convert("RGB")
    gray=im.convert("L")
    stat=ImageStat.Stat(gray)
    return {"mean":round(stat.mean[0]/255,4),"std":round(stat.stddev[0]/255,4),"size":list(im.size)}

def components_band(mask, y0, y1, min_pixels=4):
    im=mask.convert("L")
    px=im.load()
    seen=set()
    comps=[]
    for y in range(max(0,y0),min(im.height,y1)):
        for x in range(im.width):
            if px[x,y]==0 or (x,y) in seen: continue
            stack=[(x,y)];seen.add((x,y));xs=[];ys=[]
            while stack:
                cx,cy=stack.pop();xs.append(cx);ys.append(cy)
                for nx,ny in ((cx-1,cy),(cx+1,cy),(cx,cy-1),(cx,cy+1)):
                    if 0<=nx<im.width and y0<=ny<y1 and px[nx,ny] and (nx,ny) not in seen:
                        seen.add((nx,ny));stack.append((nx,ny))
            if len(xs)>=min_pixels:
                comps.append({"pixels":len(xs),"bounds":[min(xs),min(ys),max(xs)+1,max(ys)+1]})
    comps.sort(key=lambda c:c["pixels"],reverse=True)
    return comps

# Rebuild approved stone inputs to ensure runtime masks and discovery use the same canonical pipeline.
subprocess.run(["python","tools/build_approved_stone.py","--output-dir",str(OUT/"stone-approved")],cwd=ROOT,check=True,capture_output=True,text=True)
config=json.loads((ROOT/"review-assets/stone-masks/config.json").read_text())
plinth_records=[]
review_scene=Image.open(ROOT/"app/assets/kitchen/composicao-completa.png").convert("RGBA")
review_crop=review_scene.crop((450,835,1260,910)).convert("RGB")
overlay=review_crop.convert("RGBA")

for asset in config["assets"]:
    group=config["groups"][asset["group"]]
    poly=group["surfaces"]["plinth"]
    y0=min(y for x,y in poly); y1=max(y for x,y in poly)+1
    owner=Image.open(ROOT/asset["path"]).convert("RGBA").getchannel("A")
    mask_path=ROOT/f"review-assets/stone-masks/generated/{asset['id']}-plinth.png"
    current=Image.open(mask_path).convert("L")
    band=Image.new("L",SIZE)
    ImageDraw.Draw(band).rectangle((0,y0,SIZE[0]-1,y1-1),fill=255)
    owner_band=ImageChops.multiply(owner,band)
    missed=ImageChops.subtract(owner_band,current)
    comps=components_band(missed,y0,y1,4)
    plinth_records.append({
        "asset":asset["id"],
        "polygonBounds":[min(x for x,y in poly),y0,max(x for x,y in poly)+1,y1],
        "currentBounds":list(current.getbbox()) if current.getbbox() else None,
        "ownerBandBounds":list(owner_band.getbbox()) if owner_band.getbbox() else None,
        "missedBounds":list(missed.getbbox()) if missed.getbbox() else None,
        "missedPixels":alpha_count(missed),
        "components":comps[:12]
    })
    crop_current=current.crop((450,835,1260,910))
    crop_missed=missed.crop((450,835,1260,910))
    blue=Image.new("RGBA",overlay.size,(30,110,255,0));blue.putalpha(crop_current.point(lambda v:round(v*.45)))
    red=Image.new("RGBA",overlay.size,(255,40,40,0));red.putalpha(crop_missed.point(lambda v:round(v*.75)))
    overlay=Image.alpha_composite(overlay,blue)
    overlay=Image.alpha_composite(overlay,red)
overlay.convert("RGB").save(OUT/"plinth-current-blue-missed-red.png")

# Material luminance from actual source files and configured base color.
catalog=(ROOT/"app/data/catalog-data.js").read_text()
finish_pattern=re.compile(
    r'id:\s*"(?P<id>base-light|tone-[^"]+)".*?color:\s*"(?P<color>#[0-9a-fA-F]{6})".*?textureAsset:\s*"(?P<asset>assets/materials/[^"]+)"',
    re.S
)
materials=[]
for m in finish_pattern.finditer(catalog):
    color=m.group("color")
    rgb=tuple(int(color[i:i+2],16) for i in (1,3,5))
    rec={"id":m.group("id"),"color":color,"colorLuma":round(luminance(rgb),4),"asset":m.group("asset")}
    rec.update({"texture":stats_luma(ROOT/"app"/m.group("asset"))})
    materials.append(rec)

# Analyze structural dark/light residuals inside each approved finish mask.
scene=json.loads("{}")
pairs={
 "01":"01_modulo_lavanderia.png","02":"02_inferior_fogao.png","03":"03_inferior_pia.png",
 "04":"04_lateral_geladeira.png","05":"05_aereo_fogao.png","06":"06_aereo_pia.png","07":"07_aereo_geladeira.png"
}
seam_records=[]
shadow_union=Image.new("L",SIZE)
highlight_union=Image.new("L",SIZE)
for key,layer_name in pairs.items():
    layer=Image.open(ROOT/"app/assets/kitchen/layers"/layer_name).convert("RGBA")
    mask=Image.open(ROOT/"app/assets/kitchen/masks"/f"{key}.png").convert("RGBA").getchannel("A")
    gray=layer.convert("RGB").convert("L")
    blur=gray.filter(ImageFilter.GaussianBlur(2.2))
    dark=ImageChops.subtract(blur,gray)
    light=ImageChops.subtract(gray,blur)
    dark=ImageChops.multiply(dark,mask)
    light=ImageChops.multiply(light,mask)
    vals=[v for v in dark.getdata() if v>0]
    lvals=[v for v in light.getdata() if v>0]
    def pct(values,p):
        if not values:return 0
        values=sorted(values);return values[min(len(values)-1,round((len(values)-1)*p))]
    p90=max(5,pct(vals,.90)); hp90=max(4,pct(lvals,.90))
    shadow=dark.point(lambda v:0 if v<p90 else min(255,round((v-p90+1)*10)))
    high=light.point(lambda v:0 if v<hp90 else min(255,round((v-hp90+1)*8)))
    shadow_union=ImageChops.lighter(shadow_union,shadow)
    highlight_union=ImageChops.lighter(highlight_union,high)
    seam_records.append({
      "module":key,
      "maskBounds":list(mask.getbbox()) if mask.getbbox() else None,
      "darkResidual":{"nonzero":len(vals),"p50":pct(vals,.5),"p75":pct(vals,.75),"p90":pct(vals,.9),"p95":pct(vals,.95),"p99":pct(vals,.99),"candidateThreshold":p90,"candidatePixels":alpha_count(shadow)},
      "lightResidual":{"nonzero":len(lvals),"p90":pct(lvals,.9),"p95":pct(lvals,.95),"p99":pct(lvals,.99),"candidateThreshold":hp90,"candidatePixels":alpha_count(high)}
    })
base=Image.open(ROOT/"app/assets/kitchen/composicao-completa.png").convert("RGBA")
struct=base.copy()
red=Image.new("RGBA",SIZE,(255,30,30,0));red.putalpha(shadow_union.point(lambda v:round(v*.7)))
cyan=Image.new("RGBA",SIZE,(30,220,255,0));cyan.putalpha(highlight_union.point(lambda v:round(v*.55)))
struct=Image.alpha_composite(struct,red);struct=Image.alpha_composite(struct,cyan)
struct.crop((450,40,1260,915)).convert("RGB").save(OUT/"structure-candidate-red-shadow-cyan-highlight.png")
shadow_union.save(OUT/"structure-shadow-candidate.png")
highlight_union.save(OUT/"structure-highlight-candidate.png")

# Runtime architecture facts verified directly from source.
stone_core=(ROOT/"app/core/stone.js").read_text()
styles=(ROOT/"app/styles.css").read_text()
app=(ROOT/"app/app.js").read_text()
architecture={
 "plinthOffUsesFinishMaterial":'plinth: useStonePlinth ? stoneMaterial : finishMaterial' in app,
 "mdfPlinthSeparateCompose":'source?.materialType === "mdf"' in stone_core and 'composeMdf' in stone_core,
 "frontFinishNormalBlend":'mix-blend-mode: normal' in styles,
 "frontFinishOpacityFromResolver":'finishes.resolveOverlayOpacity(finish, finish.color)' in app,
 "frontStructureDedicatedLayer":("finish-structure" in app or "seam-layer" in app or "structure-layer" in app),
}

report={
 "schemaVersion":"MaterialDiscovery 0.1",
 "status":"PASS",
 "plinth":plinth_records,
 "materials":materials,
 "seams":seam_records,
 "architecture":architecture,
 "interpretationHints":{
   "plinthSideHypothesis":"CONFIRMED only if missed owner-alpha component is adjacent to current plinth in canonical y-band; otherwise remains unclassified.",
   "neutralPlateHypothesis":"NOT assumed; current MDF plinth and front pipelines differ structurally and require visual/metric comparison before adding a plate.",
   "seamLayerHypothesis":"Existing front pipeline has no dedicated structural seam layer if frontStructureDedicatedLayer=false."
 }
}
(OUT/"diagnostics.json").write_text(json.dumps(report,indent=2)+"\n")
print("DISCOVERY_JSON="+json.dumps(report,separators=(",",":")))
