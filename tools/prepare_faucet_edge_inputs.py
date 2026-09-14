from PIL import Image,ImageChops
from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[1];p=r/'review-assets/faucet-edge-donor';box=(944,416,1072,576);scale=8
obj=Image.open(r/'review-assets/object-antialias/generated/faucet.png').convert('RGBA')
band=Image.open(r/'review-assets/object-antialias/generated/faucet-allowed-band.png').convert('L')
target=Image.alpha_composite(Image.new('RGBA',obj.size,(64,64,64,255)),obj).crop(box).resize((1024,1280),Image.Resampling.NEAREST)
target.save(p/'target.png')
guide=target.convert('RGB');highlight=Image.new('RGB',target.size,(255,0,255));m=band.crop(box).resize(target.size,Image.Resampling.NEAREST).point(lambda v:160 if v else 0);Image.composite(highlight,guide,m).save(p/'guide.png')
config={'status':'REVIEW','crop':box,'scale':scale,'targetSize':[1024,1280],'object':'review-assets/object-antialias/generated/faucet.png','allowedBand':'review-assets/object-antialias/generated/faucet-allowed-band.png','source':'review-assets/stone-backing/source.png','sha256':{x:hashlib.sha256((r/x).read_bytes()).hexdigest() for x in ['review-assets/object-antialias/generated/faucet.png','review-assets/object-antialias/generated/faucet-allowed-band.png','review-assets/stone-backing/source.png']},'alphaPolicy':'unchanged from PR16','editTarget':'target.png','guideOnly':'guide.png'}
(p/'config.json').write_text(json.dumps(config,indent=2)+'\n')
