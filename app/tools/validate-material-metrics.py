#!/usr/bin/env python3
from pathlib import Path
import json,re
from PIL import Image,ImageStat

ROOT=Path(__file__).resolve().parent.parent
text=(ROOT/"data/catalog-data.js").read_text()
pattern=re.compile(
    r'id:\s*"(?P<id>base-light|tone-[^"]+)".*?textureAsset:\s*"(?P<asset>assets/materials/[^"]+)".*?textureLuminance:\s*(?P<luma>[0-9.]+)',
    re.S,
)
records=[]
for match in pattern.finditer(text):
    image=Image.open(ROOT/match.group("asset")).convert("L")
    measured=ImageStat.Stat(image).mean[0]/255
    configured=float(match.group("luma"))
    delta=abs(measured-configured)
    if delta>0.015:
        raise SystemExit(f"texture luminance drift {match.group('id')}: configured={configured:.4f} measured={measured:.4f}")
    records.append({"id":match.group("id"),"configured":configured,"measured":round(measured,4),"delta":round(delta,4)})
if len(records)!=6:
    raise SystemExit(f"expected 6 MDF material metrics, got {len(records)}")
print(json.dumps({"status":"PASS","records":records}))
