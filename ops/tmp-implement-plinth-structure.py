#!/usr/bin/env python3
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]

def replace_once(path, old, new):
    p=ROOT/path
    text=p.read_text()
    count=text.count(old)
    if count != 1:
        raise SystemExit(f"PATCH_COUNT:{path}:{count}:{old[:100]!r}")
    p.write_text(text.replace(old,new,1))

# 1. Expand plinth polygons to the exact owner-alpha support measured in discovery.
config_path=ROOT/"review-assets/stone-masks/config.json"
config=json.loads(config_path.read_text())
config["groups"]["stone-02"]["surfaces"]["plinth"]=[[485,858],[756,858],[756,894],[485,894]]
config["groups"]["stone-03"]["surfaces"]["plinth"]=[[736,858],[1216,858],[1216,894],[736,894]]
config_path.write_text(json.dumps(config,indent=2)+"\n")

# 2. Add a low-frequency neutral luminance plate for MDF plinth shading.
replace_once(
    "tools/build_approved_stone.py",
    "from PIL import Image, ImageChops, ImageDraw",
    "from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat"
)
replace_once(
    "tools/build_approved_stone.py",
    "def material_mask(config, ids, surfaces=None):\n",
    '''def plinth_shade(under, mask):
    """Encode low-frequency scene lighting without preserving stone granulation."""
    gray=under.convert('L')
    mean=max(1.0,ImageStat.Stat(gray,mask=mask).mean[0])
    fill=Image.new('L',SIZE,round(mean))
    isolated=Image.composite(gray,fill,mask)
    low=isolated.filter(ImageFilter.GaussianBlur(8))
    encoded=low.point(lambda v:max(112,min(140,round(128*v/mean))))
    return Image.composite(encoded,Image.new('L',SIZE,128),mask)

def material_mask(config, ids, surfaces=None):
'''
)
replace_once(
    "tools/build_approved_stone.py",
    "        plinth_mask=material_mask(config,ids,{'plinth'})\n        combined_mask=ImageChops.lighter(upper_mask,plinth_mask)\n",
    "        plinth_mask=material_mask(config,ids,{'plinth'})\n        plinth_shading=plinth_shade(under,plinth_mask)\n        combined_mask=ImageChops.lighter(upper_mask,plinth_mask)\n"
)
replace_once(
    "tools/build_approved_stone.py",
    "        for name,im in [('under',under),('neutral',neutral),('objects',foreground),('upperMask',upper_mask),('plinthMask',plinth_mask)]:\n",
    "        for name,im in [('under',under),('neutral',neutral),('objects',foreground),('upperMask',upper_mask),('plinthMask',plinth_mask),('plinthShade',plinth_shading)]:\n"
)
replace_once(
    "tools/build_approved_stone.py",
    "        bundle_names=['under','neutral','objects','upperMask','plinthMask']\n",
    "        bundle_names=['under','neutral','objects','upperMask','plinthMask','plinthShade']\n"
)

# 3. Consume the neutral shading plate in MDF plinth composition.
replace_once(
    "app/core/stone.js",
    "    function composeMdf(mask, source) {\n",
    "    function composeMdf(mask, source, shade) {\n"
)
replace_once(
    "app/core/stone.js",
    "        for (let channel = 0; channel < 3; channel += 1) {\n          result[index + channel] = Math.round(Math.min(255, source.rgb[channel] * detail));\n        }\n",
    '''        const sceneShade = shade ? Math.min(1.10, Math.max(0.86, shade[index] / 128)) : 1;
        for (let channel = 0; channel < 3; channel += 1) {
          result[index + channel] = Math.round(Math.min(255, source.rgb[channel] * detail * sceneShade));
        }
'''
)
replace_once(
    "app/core/stone.js",
    '            ["neutral", "under", "objects", "upperMask", "plinthMask"]\n',
    '            ["neutral", "under", "objects", "upperMask", "plinthMask", "plinthShade"]\n'
)
replace_once(
    "app/core/stone.js",
    "          const [neutral, under, objects, upperMask, plinthMask] = await caseInputs(id);\n",
    "          const [neutral, under, objects, upperMask, plinthMask, plinthShade] = await caseInputs(id);\n"
)
replace_once(
    "app/core/stone.js",
    "            ? composeMdf(mask, source)\n",
    "            ? composeMdf(mask, source, plinthShade)\n"
)

# 4. Deterministic structural seam/highlight masks from source luminance residuals.
structure_builder = r'''#!/usr/bin/env python3
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
'''
(ROOT/"app/tools/build-structure-masks.py").write_text(structure_builder)

replace_once(
    "app/tools/build-inline-masks.py",
    '''    "assets/kitchen/masks/07.png",
)
''',
    '''    "assets/kitchen/masks/07.png",
) + tuple(
    f"assets/kitchen/masks/structure-{key}-{kind}.png"
    for key in ("01", "02", "03", "04", "05", "06", "07")
    for kind in ("shadow", "highlight")
)
'''
)

package_path=ROOT/"app/package.json"
package=json.loads(package_path.read_text())
scripts=package["scripts"]
scripts["build:structure-masks"]="python3 tools/build-structure-masks.py"
scripts["build"]=scripts["build"].replace("npm run build:front-seam-masks && npm run build:inline-masks","npm run build:front-seam-masks && npm run build:structure-masks && npm run build:inline-masks")
scripts["test"]=scripts["test"].replace("node tools/test-core.js &&","node tools/test-core.js && python3 tools/validate-material-metrics.py &&")
package_path.write_text(json.dumps(package,indent=2,ensure_ascii=False)+"\n")

# 5. Store measured source-texture luminance with a validator so asset drift fails loudly.
catalog_path=ROOT/"app/data/catalog-data.js"
catalog=catalog_path.read_text()
for old,new in {
    "textureStrength: 0.18":"textureStrength: 0.18, textureLuminance: 0.9242",
    "textureStrength: 0.24":"textureStrength: 0.24, textureLuminance: 0.5259",
    "textureStrength: 0.16":"textureStrength: 0.16, textureLuminance: 0.9216",
    "textureStrength: 0.22":"textureStrength: 0.22, textureLuminance: 0.7679",
    "textureStrength: 0.58":"textureStrength: 0.58, textureLuminance: 0.7988",
    "textureStrength: 0.28":"textureStrength: 0.28, textureLuminance: 0.1647",
}.items():
    if catalog.count(old)!=1: raise SystemExit("CATALOG_METRIC_ANCHOR:"+old)
    catalog=catalog.replace(old,new,1)
catalog_path.write_text(catalog)

validator=r'''#!/usr/bin/env python3
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
'''
(ROOT/"app/tools/validate-material-metrics.py").write_text(validator)

# 6. Adaptive structural contrast function with measured upper/lower bounds.
replace_once(
    "app/core/finishes.js",
    "  function resolveMaskAsset(entity, resolvedVisibility) {\n",
    '''  function smoothstep(edge0, edge1, value) {
    const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function resolveStructureStrength(preset, color) {
    const configured = Number(preset?.textureLuminance);
    const parsed = parseHexColor(color);
    const colorLuminance = parsed
      ? (0.2126 * parsed.red + 0.7152 * parsed.green + 0.0722 * parsed.blue) / 255
      : 0.5;
    const luminance = Number.isFinite(configured) && configured >= 0 && configured <= 1
      ? configured
      : colorLuminance;
    const bright = smoothstep(0.78, 0.94, luminance);
    const dark = 1 - smoothstep(0.12, 0.25, luminance);
    return {
      luminance,
      shadowOpacity: Math.min(0.42, Math.max(0.08, 0.16 + 0.24 * bright - 0.06 * dark)),
      highlightOpacity: Math.min(0.10, Math.max(0, 0.10 * dark))
    };
  }

  function resolveMaskAsset(entity, resolvedVisibility) {
'''
)
replace_once(
    "app/core/finishes.js",
    "    resolveMaskAsset,\n    resolveOverlayOpacity\n",
    "    resolveMaskAsset,\n    resolveOverlayOpacity,\n    resolveStructureStrength\n"
)

# 7. Add structural layers to each finishable module and drive their opacity from material luminance.
replace_once(
    "app/app.js",
    '''          group.append(finishLayer);
        }

        sceneLayers.append(group);
''',
    '''          group.append(finishLayer);

          const moduleKey = /^module-(\\d{2})$/.exec(entity.id)?.[1];
          if (moduleKey) {
            ["shadow", "highlight"].forEach((kind) => {
              const structureAsset = "assets/kitchen/masks/structure-" + moduleKey + "-" + kind + ".png";
              const structureMask = inlineMasks[structureAsset];
              if (!structureMask) throw new Error("Máscara estrutural incorporada ausente: " + structureAsset);
              const structureLayer = document.createElement("div");
              structureLayer.className = "structure-layer structure-layer--" + kind;
              structureLayer.style.setProperty("--structure-mask-image", 'url("' + structureMask + '")');
              structureLayer.dataset.structureAsset = structureAsset;
              group.append(structureLayer);
            });
          }
        }

        sceneLayers.append(group);
'''
)
replace_once(
    "app/app.js",
    '''      layer.style.setProperty("--finish-opacity", String(finishes.resolveOverlayOpacity(finish, finish.color)));
    });
  }
''',
    '''      layer.style.setProperty("--finish-opacity", String(finishes.resolveOverlayOpacity(finish, finish.color)));
      const structure = finishes.resolveStructureStrength(finish, finish.color);
      group.style.setProperty("--structure-shadow-opacity", String(structure.shadowOpacity));
      group.style.setProperty("--structure-highlight-opacity", String(structure.highlightOpacity));
      group.dataset.structureLuminance = structure.luminance.toFixed(4);
    });
  }
'''
)

# 8. Structural overlay CSS lives above material but below hotspots/UI.
styles_path=ROOT/"app/styles.css"
styles=styles_path.read_text()
anchor='''.finish-layer.is-texture {
  opacity: var(--finish-opacity, .72);
'''
insert='''.structure-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  -webkit-mask-image: var(--structure-mask-image);
  mask-image: var(--structure-mask-image);
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-mode: alpha;
  mask-mode: alpha;
}
.structure-layer--shadow {
  background: #000;
  opacity: var(--structure-shadow-opacity, .16);
  mix-blend-mode: multiply;
}
.structure-layer--highlight {
  background: #fff;
  opacity: var(--structure-highlight-opacity, 0);
  mix-blend-mode: screen;
}

.finish-layer.is-texture {
  opacity: var(--finish-opacity, .72);
'''
if styles.count(anchor)!=1: raise SystemExit("STYLE_ANCHOR")
styles_path.write_text(styles.replace(anchor,insert,1))

# 9. Unit contracts for adaptive structural contrast.
replace_once(
    "app/tools/test-core.js",
    "assert.equal(finishes.resolveOverlayOpacity(catalog.options.finishes[0], catalog.options.finishes[0].color), 0.84);\n",
    '''assert.equal(finishes.resolveOverlayOpacity(catalog.options.finishes[0], catalog.options.finishes[0].color), 0.84);
const brightStructure = finishes.resolveStructureStrength(catalog.options.finishes[0], catalog.options.finishes[0].color);
const midStructure = finishes.resolveStructureStrength(catalog.options.finishes[1], catalog.options.finishes[1].color);
const darkStructure = finishes.resolveStructureStrength(catalog.options.finishes[5], catalog.options.finishes[5].color);
assert.equal(brightStructure.luminance > 0.9, true);
assert.equal(brightStructure.shadowOpacity > midStructure.shadowOpacity, true);
assert.equal(darkStructure.shadowOpacity < midStructure.shadowOpacity, true);
assert.equal(darkStructure.highlightOpacity > 0.05, true);
'''
)

# 10. Record confirmed/refuted assumptions and implementation choices.
backlog_path=ROOT/"docs/work/global-materials-mobile-pip-backlog.md"
backlog=backlog_path.read_text()
backlog += """
## B5 — Discovery e correção geométrica do rodapé
- [x] Hipótese CONFIRMADA: o plinthMask era horizontalmente conservador demais.
- [x] Medição stone-02: máscara 503..744 versus owner alpha 485..756 no band 858..893.
- [x] Medição stone-03: máscara 744..1203 versus owner alpha 736..1216 no band 858..893.
- [x] Expandir somente até o suporte alpha medido; o gerador continua clipando pelo owner alpha.
- [x] Bridges não possuem suporte alpha de rodapé e permanecem vazios.
- [ ] Revisão visual da pequena lateral esquerda e das duas extremidades.

## B6 — Coerência tonal do rodapé MDF
- [x] Hipótese CONFIRMADA: frentes e rodapé MDF usam pipelines estruturalmente diferentes.
- [x] Hipótese REFUTADA como necessidade imediata: não criar um donor plate manual novo.
- [x] Gerar plate neutro de baixa frequência a partir da iluminação do caso, removendo granulação da pedra.
- [x] Normalizar o plate para média 1,0 e limitar ganho a 0,86..1,10 no runtime.
- [ ] Revisão visual de branco, claro médio e carvão.

## B7 — Seams adaptativas
- [x] Hipótese CONFIRMADA: não existia camada estrutural dedicada sobre o material.
- [x] Extrair máscaras shadow/highlight por contraste local, sempre dentro da máscara de acabamento e com erosão de 1 px para não criar outline externo.
- [x] Medir luminância das texturas reais; valores observados: 0,9242 / 0,5259 / 0,9216 / 0,7679 / 0,7988 / 0,1647.
- [x] Bounds adaptativos: escuro 0,12..0,25; claro 0,78..0,94; interpolação smoothstep sem saltos.
- [x] Claros recebem shadow progressivo; escuros recebem shadow reduzido + highlight sutil.
- [x] Validador falha se a luminância configurada divergir do asset em mais de 0,015.
- [ ] Revisão visual de seams em branco, Névoa, madeira e carvão.
"""
backlog_path.write_text(backlog)
