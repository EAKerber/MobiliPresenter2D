from pathlib import Path
from collections import deque
import json
from PIL import Image, ImageFilter

ROOT = Path(".")
APP = ROOT / "app"
MASK_DIR = APP / "assets/kitchen/masks"

def replace_once(path, old, new):
    p=Path(path); text=p.read_text(); count=text.count(old)
    if count != 1:
        raise SystemExit(f"PATCH_COUNT:{path}:{count}:{old[:140]!r}")
    p.write_text(text.replace(old,new,1))

def replace_between(path, start, end, replacement):
    p=Path(path); text=p.read_text()
    a=text.find(start)
    if a < 0: raise SystemExit(f"PATCH_START:{path}:{start}")
    b=text.find(end,a)
    if b < 0: raise SystemExit(f"PATCH_END:{path}:{end}")
    p.write_text(text[:a]+replacement+text[b:])

# --- Derive front geometry guides from the same finish masks that expose the real visual seams.
EXPECTED = {"01":2, "05":2, "06":3, "07":2}

def components(binary, width, height):
    visited=bytearray(width*height)
    found=[]
    for start,value in enumerate(binary):
        if not value or visited[start]:
            continue
        q=deque([start]); visited[start]=1
        area=0; minx=width; miny=height; maxx=-1; maxy=-1
        while q:
            idx=q.popleft(); area+=1
            y,x=divmod(idx,width)
            minx=min(minx,x); maxx=max(maxx,x); miny=min(miny,y); maxy=max(maxy,y)
            if x>0:
                n=idx-1
                if binary[n] and not visited[n]: visited[n]=1; q.append(n)
            if x+1<width:
                n=idx+1
                if binary[n] and not visited[n]: visited[n]=1; q.append(n)
            if y>0:
                n=idx-width
                if binary[n] and not visited[n]: visited[n]=1; q.append(n)
            if y+1<height:
                n=idx+width
                if binary[n] and not visited[n]: visited[n]=1; q.append(n)
        found.append({"area":area,"bbox":(minx,miny,maxx+1,maxy+1)})
    return found

def internal_lines(rects):
    edges=[]
    tol=0.035
    for r in rects:
        x0,y0,x1,y1=r
        if x0>tol: edges.append(["v",x0,y0,y1])
        if x1<1-tol: edges.append(["v",x1,y0,y1])
        if y0>tol: edges.append(["h",y0,x0,x1])
        if y1<1-tol: edges.append(["h",y1,x0,x1])
    merged=[]
    for edge in sorted(edges,key=lambda e:(e[0],e[1],e[2],e[3])):
        orient,coord,a,b=edge
        if b-a < .10: continue
        match=None
        for existing in merged:
            if existing[0]!=orient or abs(existing[1]-coord)>.028: continue
            overlap=max(0,min(existing[3],b)-max(existing[2],a))
            if overlap >= .35*min(existing[3]-existing[2],b-a):
                match=existing; break
        if match:
            match[1]=(match[1]+coord)/2
            match[2]=min(match[2],a); match[3]=max(match[3],b)
        else:
            merged.append([orient,coord,a,b])
    lines=[]
    for orient,coord,a,b in merged:
        if orient=="v":
            lines.append({"x1":coord,"y1":a,"x2":coord,"y2":b})
        else:
            lines.append({"x1":a,"y1":coord,"x2":b,"y2":coord})
    return [{k:round(v,4) for k,v in line.items()} for line in lines]

def derive(key, expected):
    alpha=Image.open(MASK_DIR/f"{key}.png").convert("RGBA").getchannel("A")
    bbox=alpha.getbbox()
    if not bbox: raise SystemExit(f"GUIDE_EMPTY:{key}")
    crop=alpha.crop(bbox)
    w,h=crop.size
    chosen=None
    attempts=[]
    for erosion in [1,3,5,7,9]:
        work=crop if erosion==1 else crop.filter(ImageFilter.MinFilter(erosion))
        raw=work.tobytes()
        binary=bytearray(1 if value>=96 else 0 for value in raw)
        active=sum(binary)
        comps=components(binary,w,h)
        meaningful=[c for c in comps if c["area"]>=max(40,int(active*.015))]
        meaningful.sort(key=lambda c:c["area"],reverse=True)
        selected=meaningful[:expected]
        coverage=sum(c["area"] for c in selected)/max(active,1)
        attempts.append({"erosion":erosion,"components":len(meaningful),"coverage":round(coverage,4)})
        if len(selected)==expected and coverage>=.66:
            chosen=(erosion,selected,coverage); break
    if not chosen:
        raise SystemExit("GUIDE_COMPONENTS:"+key+":"+json.dumps(attempts))
    erosion,selected,coverage=chosen
    rects=[]
    for comp in selected:
        x0,y0,x1,y1=comp["bbox"]
        rects.append([round(x0/w,4),round(y0/h,4),round(x1/w,4),round(y1/h,4)])
    rects.sort(key=lambda r:(r[1],r[0]))
    lines=internal_lines(rects)
    vertical=sum(1 for line in lines if abs(line["x1"]-line["x2"])<.001)
    horizontal=sum(1 for line in lines if abs(line["y1"]-line["y2"])<.001)
    if vertical<1:
        raise SystemExit(f"GUIDE_NO_VERTICAL:{key}:{rects}:{lines}")
    if key=="06" and horizontal<1:
        raise SystemExit(f"GUIDE_NO_HORIZONTAL:{key}:{rects}:{lines}")
    return {
        "source":"finish-mask-components",
        "sourceMask":f"assets/kitchen/masks/{key}.png",
        "erosionPx":erosion,
        "componentCount":expected,
        "coverage":round(coverage,4),
        "rects":[{"x":r[0],"y":r[1],"width":round(r[2]-r[0],4),"height":round(r[3]-r[1],4)} for r in rects],
        "lines":lines,
        "attempts":attempts,
    }

guides={f"module-{key}":derive(key,count) for key,count in EXPECTED.items()}
guide_js='''(function (global) {
  "use strict";
  global.CASA_FRONT_GUIDES = Object.freeze(%s);
})(window);
''' % json.dumps(guides,ensure_ascii=False,sort_keys=True,indent=2)
(APP/"data/front-guide-data.js").write_text(guide_js)
print("FRONT_GUIDES",json.dumps(guides,sort_keys=True))

# --- Base white: visibly cleaner/lighter while seams remain independent.
replace_once(
    "app/data/catalog-data.js",
    'id: "base-light", publicLabel: "Base clara", color: "#f6f5f2", status: "published", adjustmentLabel: "normal",\n          materialType: "mdf", textureAsset: "assets/materials/mdf-base.webp", textureSize: "160px 160px", textureStrength: 0.18, textureLuminance: 0.9242',
    'id: "base-light", publicLabel: "Base clara", color: "#faf9f6", status: "published", adjustmentLabel: "normal",\n          materialType: "mdf", textureAsset: "assets/materials/mdf-base.webp", textureSize: "160px 160px", textureStrength: 0.14, textureLuminance: 0.9242, overlayOpacity: 0.90, textureBrightness: 1.05'
)

# --- Load seam-derived guides.
replace_once(
    "app/index.html",
    '    <script src="data/mask-data.js"></script>\n',
    '    <script src="data/mask-data.js"></script>\n    <script src="data/front-guide-data.js"></script>\n'
)

replace_once(
    "app/app.js",
    '  const catalog = global.CASA_EM_MODULOS_CATALOG;\n',
    '  const catalog = global.CASA_EM_MODULOS_CATALOG;\n  const frontGuides = global.CASA_FRONT_GUIDES || {};\n'
)

# Keep upper-module number tags inside the scene by moving them under the module.
replace_once(
    "app/app.js",
    '''        tag.className = "scene-hotspot__tag";
        tag.setAttribute("aria-hidden", "true");
        tag.textContent = entity.alias;
''',
    '''        tag.className = "scene-hotspot__tag";
        if (entity.alphaBounds.y < scene.canvas.height * 0.12) tag.classList.add("scene-hotspot__tag--below");
        tag.setAttribute("aria-hidden", "true");
        tag.textContent = entity.alias;
'''
)

# Finish brightness is material metadata, independent from seam strength.
replace_once(
    "app/app.js",
    '      layer.style.setProperty("--finish-opacity", String(finishes.resolveOverlayOpacity(finish, finish.color)));\n',
    '      layer.style.setProperty("--finish-opacity", String(finishes.resolveOverlayOpacity(finish, finish.color)));\n      layer.style.setProperty("--finish-brightness", String(finish.textureBrightness || 1));\n'
)

# Replace heuristic front patterns with seam-derived guides when technical geometry is not confirmed.
start='  function appendFrontSegments(make, layout, x, y, width, height, faceWidthMm) {'
end='  function createProportionalView(product, type) {'
replacement='''  function appendGuideLines(make, guide, x, y, width, height) {
    (guide?.lines || []).forEach((line) => {
      make("line", {
        x1: x + line.x1 * width,
        y1: y + line.y1 * height,
        x2: x + line.x2 * width,
        y2: y + line.y2 * height,
        class: "module-detail__view-shape module-detail__view-guide-line"
      });
    });
  }

  function appendFrontSegments(make, product, x, y, width, height, faceWidthMm) {
    const layout = product?.frontLayout;
    if (layout?.status === "confirmed" && layout?.segments?.length) {
      const segmentsWidthMm = layout.innerWidthMm || layout.segments.reduce((total, segment) => total + (segment.spanMm || 0), 0);
      if (!segmentsWidthMm) return;
      const visibleWidth = width * Math.min(segmentsWidthMm, faceWidthMm) / faceWidthMm;
      const startX = x + (width - visibleWidth) / 2;
      let cursorMm = 0;
      layout.segments.forEach((segment, index) => {
        const segmentWidthMm = segment.spanMm || 0;
        const segmentStart = startX + (cursorMm / segmentsWidthMm) * visibleWidth;
        cursorMm += segmentWidthMm;
        const segmentEnd = startX + (cursorMm / segmentsWidthMm) * visibleWidth;
        if (index < layout.segments.length - 1) {
          make("line", { x1: segmentEnd, y1: y, x2: segmentEnd, y2: y + height, class: "module-detail__view-shape" });
        }
        if (segment.subdivisions) {
          for (let part = 1; part < segment.subdivisions; part += 1) {
            const divisionY = y + (height / segment.subdivisions) * part;
            make("line", { x1: segmentStart, y1: divisionY, x2: segmentEnd, y2: divisionY, class: "module-detail__view-shape" });
          }
        }
      });
      return;
    }

    const guide = frontGuides[product?.entityId];
    if (guide?.lines?.length) {
      appendGuideLines(make, guide, x, y, width, height);
      return;
    }

    if (layout?.pattern === "two-doors") {
      const middle = x + width / 2;
      make("line", { x1: middle, y1: y, x2: middle, y2: y + height, class: "module-detail__view-shape" });
      return;
    }
    if (layout?.pattern === "two-doors-and-lift") {
      const liftBottom = y + height * 0.34;
      const middle = x + width / 2;
      make("line", { x1: x, y1: liftBottom, x2: x + width, y2: liftBottom, class: "module-detail__view-shape" });
      make("line", { x1: middle, y1: liftBottom, x2: middle, y2: y + height, class: "module-detail__view-shape" });
    }
  }

'''
replace_between("app/app.js",start,end,replacement)
app=Path("app/app.js"); text=app.read_text()
text=text.replace('appendFrontSegments(make, product.frontLayout, x, y, drawingWidth, drawingHeight, spec.faceWidthMm);','appendFrontSegments(make, product, x, y, drawingWidth, drawingHeight, spec.faceWidthMm);')
text=text.replace('appendFrontSegments(make, product.frontLayout, left, top, width, height, spec.faceWidthMm);','appendFrontSegments(make, product, left, top, width, height, spec.faceWidthMm);')
old='''    if (product.frontLayout?.status === "count-confirmed") {
      return "Número de frentes confirmado; as proporções internas são orientativas até a ficha técnica detalhada.";
    }
'''
new='''    if (product.frontLayout?.status === "count-confirmed") {
      if (frontGuides[product.entityId]?.lines?.length) {
        return "Número de frentes confirmado; proporções internas guiadas pelas linhas de divisão visuais do recorte e ainda orientativas.";
      }
      return "Número de frentes confirmado; as proporções internas são orientativas até a ficha técnica detalhada.";
    }
'''
if text.count(old)!=1: raise SystemExit("FRONT_NOTE_ANCHOR")
text=text.replace(old,new,1)
app.write_text(text)

# Robust desktop drag + trackpad horizontal gesture; pointer capture keeps the gesture alive outside the stage.
app=Path("app/app.js"); text=app.read_text()
swipe_start='''    let swipeStartX = null;
    let swipeStartY = null;
'''
swipe_end='''    collapse.setAttribute("aria-expanded", String(!isCollapsed));
'''
a=text.find(swipe_start)
if a<0: raise SystemExit("SWIPE_START")
b=text.find(swipe_end,a)
if b<0: raise SystemExit("SWIPE_END")
swipe='''    let swipeStartX = null;
    let swipeStartY = null;
    let swipePointerId = null;
    let wheelAccumX = 0;
    let wheelResetTimer = null;

    const clearSwipe = () => {
      swipeStartX = null;
      swipeStartY = null;
      swipePointerId = null;
      stage.classList.remove("is-swiping", "is-dragging");
    };

    const finishSwipe = (event) => {
      if (swipeStartX === null || swipeStartY === null) return;
      const deltaX = event.clientX - swipeStartX;
      const deltaY = event.clientY - swipeStartY;
      const pointerId = swipePointerId;
      clearSwipe();
      try {
        if (pointerId !== null && stage.hasPointerCapture?.(pointerId)) stage.releasePointerCapture(pointerId);
      } catch (_) {}
      const horizontal = Math.abs(deltaX) >= 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
      if (!horizontal) return;
      if (deltaX < 0 && currentPage < pages.length - 1) renderPage(currentPage + 1, true);
      if (deltaX > 0 && currentPage > 0) renderPage(currentPage - 1, true);
    };

    stage.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      swipeStartX = event.clientX;
      swipeStartY = event.clientY;
      swipePointerId = event.pointerId;
      stage.classList.add("is-swiping");
      try { stage.setPointerCapture?.(event.pointerId); } catch (_) {}
      stopAutoCycle();
    });
    stage.addEventListener("pointermove", (event) => {
      if (swipePointerId === null || event.pointerId !== swipePointerId || swipeStartX === null) return;
      const deltaX = event.clientX - swipeStartX;
      const deltaY = event.clientY - swipeStartY;
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) stage.classList.add("is-dragging");
    });
    stage.addEventListener("pointerup", finishSwipe);
    stage.addEventListener("pointercancel", clearSwipe);
    stage.addEventListener("lostpointercapture", () => {
      if (swipeStartX !== null) clearSwipe();
    });
    stage.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaX) < 4 || Math.abs(event.deltaX) <= Math.abs(event.deltaY) * 1.15) return;
      event.preventDefault();
      stopAutoCycle();
      wheelAccumX += event.deltaX;
      global.clearTimeout(wheelResetTimer);
      wheelResetTimer = global.setTimeout(() => { wheelAccumX = 0; }, 140);
      if (Math.abs(wheelAccumX) < 55) return;
      const direction = wheelAccumX > 0 ? 1 : -1;
      wheelAccumX = 0;
      const target = clamp(currentPage + direction, 0, pages.length - 1);
      if (target !== currentPage) renderPage(target, true);
    }, { passive: false });

'''
text=text[:a]+swipe+text[b:]
app.write_text(text)

# CSS: upper tags below, brighter white material, explicit desktop drag cursor.
replace_once(
    "app/styles.css",
    '.scene-hotspot:hover .scene-hotspot__tag, .scene-hotspot:focus-visible .scene-hotspot__tag { opacity: 1; }',
    '.scene-hotspot:hover .scene-hotspot__tag, .scene-hotspot:focus-visible .scene-hotspot__tag { opacity: 1; }\n.scene-hotspot__tag--below { top: auto; bottom: -8px; transform: translate(-50%, 100%); }'
)
replace_once(
    "app/styles.css",
    '''.finish-layer.is-texture {
  opacity: var(--finish-opacity, .72);
  mix-blend-mode: normal;
  background-blend-mode: var(--finish-background-blend, luminosity);
  background-size: var(--finish-size, 160px 160px);
  background-position: 0 0;
  background-repeat: repeat;
}''',
    '''.finish-layer.is-texture {
  opacity: var(--finish-opacity, .72);
  mix-blend-mode: normal;
  background-blend-mode: var(--finish-background-blend, luminosity);
  background-size: var(--finish-size, 160px 160px);
  background-position: 0 0;
  background-repeat: repeat;
  filter: brightness(var(--finish-brightness, 1));
}'''
)
replace_once(
    "app/styles.css",
    '.module-detail__carousel-stage { display: grid; block-size: 252px; min-block-size: 252px; overflow: hidden; transition: opacity 180ms ease; touch-action: pan-y; overscroll-behavior-inline: contain; user-select: none; }',
    '.module-detail__carousel-stage { display: grid; block-size: 252px; min-block-size: 252px; overflow: hidden; transition: opacity 180ms ease; touch-action: pan-y; overscroll-behavior-inline: contain; user-select: none; cursor: grab; }\n.module-detail__carousel-stage.is-dragging { cursor: grabbing; }'
)

# Core test loads and validates the derived guide data.
replace_once(
    "app/tools/test-core.js",
    '  "data/mask-data.js",\n',
    '  "data/mask-data.js",\n  "data/front-guide-data.js",\n'
)
replace_once(
    "app/tools/test-core.js",
    'const masks = sandbox.window.CASA_EM_MODULOS_MASK_DATA;\n',
    'const masks = sandbox.window.CASA_EM_MODULOS_MASK_DATA;\nconst frontGuides = sandbox.window.CASA_FRONT_GUIDES;\n'
)
replace_once(
    "app/tools/test-core.js",
    'assert.equal(finishes.resolveOverlayOpacity(catalog.options.finishes[0], catalog.options.finishes[0].color), 0.84);',
    'assert.equal(finishes.resolveOverlayOpacity(catalog.options.finishes[0], catalog.options.finishes[0].color), 0.90);\nassert.equal(catalog.options.finishes[0].textureBrightness, 1.05);\nassert.deepEqual(Object.keys(frontGuides).sort(), ["module-01","module-05","module-06","module-07"]);\nassert.equal(frontGuides["module-06"].lines.some((line) => Math.abs(line.x1-line.x2) < 0.001), true);\nassert.equal(frontGuides["module-06"].lines.some((line) => Math.abs(line.y1-line.y2) < 0.001), true);'
)

backlog=Path("docs/work/global-materials-mobile-pip-backlog.md")
body=backlog.read_text()
addition='''

## B10 — Branco-base: alvo visual mais limpo
- [x] Clarear moderadamente o branco sem alterar as seams estruturais.
- [x] Aumentar a dominância do material branco com \`overlayOpacity=0.90\`.
- [x] Aplicar ganho de luminância restrito ao material (\`textureBrightness=1.05\`), preservando a textura.
- [ ] Revisão visual do alvo branco no preview.

## B11 — Tags dos módulos superiores
- [x] Detectar hotspots próximos ao topo pelo \`alphaBounds\`.
- [x] Posicionar a tag numérica abaixo dos módulos superiores em vez de deixá-la escapar pelo topo da cena.
- [x] Gate garante tag do Módulo 06 dentro do viewer.

## B12 — Swipe desktop completo
- [x] Pointer capture para drag de mouse continuar mesmo quando o cursor sai do stage.
- [x] \`pointermove\` diferencia drag horizontal de movimento vertical.
- [x] Suporte a gesto horizontal de trackpad via \`wheel.deltaX\`.
- [x] Clique nos dots, drag e trackpad compartilham \`detailPageByEntity\`.
- [x] Browser gate cobre drag com pointerup fora do stage e wheel horizontal.

## B13 — SVG guiado pelas seams reais
- [x] Derivar componentes das máscaras de acabamento dos módulos com frente count-confirmed.
- [x] Gerar \`data/front-guide-data.js\` determinístico a partir das máscaras 01/05/06/07.
- [x] Preservar layout técnico confirmado do Módulo 03 como fonte prioritária.
- [x] Para layouts apenas count-confirmed, usar linhas internas derivadas dos componentes visuais em vez da heurística fixa 50/50 e 34%.
- [x] Aplicar os mesmos guides à vista frontal e à face frontal isométrica.
- [ ] Revisão visual dos quatro módulos guiados.
'''
if "## B10 — Branco-base" not in body:
    backlog.write_text(body+addition)
