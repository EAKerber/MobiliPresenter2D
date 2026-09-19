#!/usr/bin/env python3
"""Build neutral structural masks that preserve front seams independently of material color."""
from pathlib import Path
import json
from PIL import Image, ImageChops, ImageFilter

ROOT=Path(__file__).resolve().parent.parent
LAYERS=ROOT/"assets/kitchen/layers"
MASKS=ROOT/"assets/kitchen/masks"
PAIRS={
    "01":"01_modulo_lavanderia.png",
    "02":"02_inferior_fogao.png",
    "03":"03_inferior_pia.png",
    "04":"04_lateral_geladeira.png",
    "05":"05_aereo_fogao.png",
    "06":"06_aereo_pia.png",
    "07":"07_aereo_geladeira.png",
}

def percentile(values,p):
    if not values:return 0
    values=sorted(values)
    return values[min(len(values)-1,round((len(values)-1)*p))]

def rgba_mask(alpha):
    image=Image.new("RGBA",alpha.size,(255,255,255,0))
    image.putalpha(alpha)
    return image

def build_one(key,layer_name):
    layer=Image.open(LAYERS/layer_name).convert("RGBA")
    finish=Image.open(MASKS/f"{key}.png").convert("RGBA").getchannel("A")
    # One-pixel erosion suppresses outer silhouettes; the target is internal structure.
    interior=finish.filter(ImageFilter.MinFilter(3))
    gray=layer.convert("RGB").convert("L")
    local=gray.filter(ImageFilter.GaussianBlur(2.2))
    dark=ImageChops.multiply(ImageChops.subtract(local,gray),interior)
    light=ImageChops.multiply(ImageChops.subtract(gray,local),interior)
    dark_values=[v for v in dark.getdata() if v>0]
    light_values=[v for v in light.getdata() if v>0]
    dark_threshold=max(5,percentile(dark_values,.90))
    light_threshold=max(4,percentile(light_values,.90))
    dark_hi=max(dark_threshold+1,percentile(dark_values,.99))
    light_hi=max(light_threshold+1,percentile(light_values,.99))
    shadow=dark.point(lambda v:0 if v<dark_threshold else min(255,round((v-dark_threshold)*255/(dark_hi-dark_threshold))))
    highlight=light.point(lambda v:0 if v<light_threshold else min(255,round((v-light_threshold)*255/(light_hi-light_threshold))))
    shadow_path=MASKS/f"structure-{key}-shadow.png"
    highlight_path=MASKS/f"structure-{key}-highlight.png"
    rgba_mask(shadow).save(shadow_path,optimize=False)
    rgba_mask(highlight).save(highlight_path,optimize=False)
    return {
        "module":key,
        "darkThreshold":dark_threshold,
        "darkP99":dark_hi,
        "lightThreshold":light_threshold,
        "lightP99":light_hi,
        "shadowBounds":shadow.getbbox(),
        "highlightBounds":highlight.getbbox(),
        "shadowPixels":sum(shadow.histogram()[1:]),
        "highlightPixels":sum(highlight.histogram()[1:]),
    }

def main():
    records=[build_one(key,name) for key,name in PAIRS.items()]
    print(json.dumps({"status":"PASS","records":records},sort_keys=True))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
