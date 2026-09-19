from pathlib import Path

def replace_once(path, old, new):
    p=Path(path)
    text=p.read_text()
    count=text.count(old)
    if count != 1:
        raise SystemExit(f"PATCH_COUNT:{path}:{count}:{old[:80]!r}")
    p.write_text(text.replace(old,new,1))

def replace_between(path, start, end, replacement):
    p=Path(path)
    text=p.read_text()
    a=text.find(start)
    if a < 0:
        raise SystemExit(f"PATCH_START_MISSING:{path}:{start}")
    b=text.find(end,a)
    if b < 0:
        raise SystemExit(f"PATCH_END_MISSING:{path}:{end}")
    p.write_text(text[:a]+replacement+text[b:])

backlog = """# Backlog — materiais, rodapé, navegação e PiP

Branch: `feat/global-finishes-stone-mobile-pip`  
PR: #32 (draft)  
Estado: implementação em preview; nenhuma promoção para `main`.

## B1 — Rodapé com semântica de material
- [x] Manter um único `plinthMask` físico.
- [x] Rodapé OFF usa material MDF global e não herda luminância/granulação da pedra original.
- [x] Rodapé ON usa a pedra global selecionada.
- [x] Mudança de pedra não altera o rodapé quando OFF.
- [x] Mudança de MDF não altera o rodapé quando ON.
- [ ] Revisão visual pelo usuário no deploy-preview.

## B2 — MDF: cor autoritativa + textura tonal
- [x] Recuperar o comportamento cromático validado da `main` como camada primária.
- [x] Usar a imagem fornecida apenas como variação tonal/detalhe, sem `multiply` RGB sobre a cor antiga da cena.
- [x] Aplicar a mesma semântica aos swatches.
- [x] Branco base volta a usar opacidade 0,84 do preset validado.
- [ ] Revisão visual de claros, madeira e escuros no preview.

## B3 — Navegação sem overflow
- [x] Compactar rótulos pela largura real do container, não pela largura da viewport.
- [x] Preservar nome completo em `title` e `aria-label`.
- [x] Impedir overflow mesmo fora do modo compacto.
- [x] Gate em painel estreito de desktop e mobile.

## B4 — PiP
- [x] `viewerCard` continua sendo o containing block dos controles ao voltar ao modo normal.
- [x] Fora do PiP, somente o controle de pin permanece visível.
- [x] Transparência e resize aparecem apenas quando pinned.
- [x] Posição/tamanho personalizados são reclampados após resize/orientação.
- [x] Clique em módulo continua abrindo a ficha sem derrubar o PiP.
- [ ] Revisão visual do usuário.

## Gates
- [x] `npm test`.
- [x] Browser gate: matriz MDF/pedra do rodapé.
- [x] Browser gate: composição tonal de MDF sem `mix-blend-mode:multiply`.
- [x] Browser gate: ausência de overflow nas etapas.
- [x] Browser gate: afiliação/visibilidade/reclamp dos controles PiP.
"""
out=Path("docs/work/global-materials-mobile-pip-backlog.md")
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(backlog)

p=Path("app/data/catalog-data.js")
text=p.read_text()
a=text.index("      finishes: [")
b=text.index("      handles: [",a)
block="""      finishes: [
        {
          id: "base-light", publicLabel: "Base clara", color: "#eeeae3", status: "published", adjustmentLabel: "normal",
          materialType: "mdf", textureAsset: "assets/materials/mdf-base.webp", textureSize: "160px 160px", textureStrength: 0.18
        },
        {
          id: "tone-15-a", publicLabel: "Avelã", color: "#8d8178", status: "published", adjustmentLabel: "+15%",
          materialType: "mdf", textureAsset: "assets/materials/mdf-warm.webp", textureSize: "160px 160px", textureStrength: 0.24
        },
        {
          id: "tone-15-b", publicLabel: "Névoa", color: "#d7d5cf", status: "published", adjustmentLabel: "+15%",
          materialType: "mdf", textureAsset: "assets/materials/mdf-soft.webp", textureSize: "160px 160px", textureStrength: 0.16
        },
        {
          id: "tone-15-c", publicLabel: "Aço", color: "#777874", status: "published", adjustmentLabel: "+15%",
          materialType: "mdf", textureAsset: "assets/materials/mdf-metal.webp", textureSize: "160px 160px", textureStrength: 0.22
        },
        {
          id: "tone-25-a", publicLabel: "Bosque", color: "#92775f", status: "published", adjustmentLabel: "+25%",
          materialType: "mdf", textureAsset: "assets/materials/mdf-wood.webp", textureSize: "180px 180px", textureStrength: 0.58
        },
        {
          id: "tone-25-b", publicLabel: "Carvão", color: "#30312f", status: "published", adjustmentLabel: "+25%",
          materialType: "mdf", textureAsset: "assets/materials/mdf-dark.webp", textureSize: "160px 160px", textureStrength: 0.28
        }
      ],
      stonePackages: [
        {
          id: "stone-existing", label: "Padrão", description: "Mantém a pedra atual do conjunto.", color: null,
          materialType: "stone", swatchColor: "#b7b0a7"
        },
        {
          id: "stone-standard-sink", label: "Padrão + cuba nova", description: "Pedra padrão com cuba nova.", color: null,
          materialType: "stone", swatchColor: "#b7b0a7"
        },
        {
          id: "stone-light", label: "Clara mineral", description: "Pedra clara de granulação fina.", color: "#e3ddd2",
          materialType: "stone", swatchColor: "#e4ded2", textureAsset: "assets/materials/stone-light.webp", textureScale: 1
        },
        {
          id: "stone-green", label: "Verde profundo", description: "Pedra verde-escura de granulação contrastante.", color: "#1e2a24",
          materialType: "stone", swatchColor: "#1f2924", textureAsset: "assets/materials/stone-green.webp", textureScale: 1
        },
        {
          id: "stone-dark", label: "Preta mineral", description: "Pedra preta de granulação fina e reflexos discretos.", color: "#171918",
          materialType: "stone", swatchColor: "#181a19", textureAsset: "assets/materials/stone-dark.webp", textureScale: 1
        }
      ],
"""
p.write_text(text[:a]+block+text[b:])

replace_between(
    "app/app.js",
    "  function syncFinishAppearance() {",
    "  function syncLayerVisibility() {",
"""  function syncFinishAppearance() {
    finishLayers.forEach((layer) => {
      const group = layer.closest(".layer-group");
      const product = catalogByEntityId.get(group?.dataset.entityId);
      if (!product?.commercial?.finishEligible) return;
      const finishId = selectedModuleFinish(product);
      const finish = catalog.options.finishes.find((item) => item.id === finishId) || catalog.options.finishes[0];
      const hasTexture = Boolean(finish.textureAsset);
      layer.classList.add("is-color");
      layer.classList.toggle("is-texture", hasTexture);
      layer.style.backgroundImage = hasTexture ? `url("${finish.textureAsset}")` : "none";
      layer.style.backgroundColor = finish.color;
      layer.style.setProperty("--finish-size", finish.textureSize || "160px 160px");
      layer.style.setProperty("--finish-background-blend", hasTexture ? "luminosity" : "normal");
      layer.style.setProperty("--finish-opacity", String(finishes.resolveOverlayOpacity(finish, finish.color)));
    });
  }

""")

replace_between(
    "app/app.js",
    "  function syncPinnedSceneUi() {",
    "  function setMobileScenePinEnabled(enabled) {",
"""  function reclampPinnedScene() {
    if (!viewerCard || !document.body.classList.contains("is-mobile-scene-pinned")) return;
    const rect = viewerCard.getBoundingClientRect();
    const maxWidth = Math.max(140, global.innerWidth - 16);
    if (rect.width > maxWidth) {
      document.documentElement.style.setProperty("--mobile-pip-width", maxWidth + "px");
      requestAnimationFrame(reclampPinnedScene);
      return;
    }
    if (viewerCard.dataset.pipPositioned !== "true") return;
    const current = viewerCard.getBoundingClientRect();
    const left = clamp(current.left, 8, Math.max(8, global.innerWidth - current.width - 8));
    const top = clamp(current.top, 8, Math.max(8, global.innerHeight - current.height - 8));
    document.documentElement.style.setProperty("--mobile-pip-left", left + "px");
    document.documentElement.style.setProperty("--mobile-pip-top", top + "px");
    document.documentElement.style.setProperty("--mobile-pip-right", "auto");
  }

  function syncPinnedSceneUi() {
    const mobile = isMobileViewport();
    const shouldDock = mobile && mobileScenePinEnabled && mobileSceneIsMini;
    if (!shouldDock && viewerCard) mobileSceneAnchorHeight = Math.ceil(viewerCard.getBoundingClientRect().height);
    document.body.classList.toggle("has-mobile-scene-pin", mobile && mobileScenePinEnabled);
    document.body.classList.toggle("is-mobile-scene-pinned", shouldDock);
    document.body.classList.toggle("is-mobile-scene-transparent", shouldDock && mobileSceneTransparent);
    document.documentElement.style.setProperty("--mobile-scene-anchor-height", shouldDock ? mobileSceneAnchorHeight + "px" : "0px");

    if (flowNav) {
      const navBottom = Math.ceil(flowNav.getBoundingClientRect().bottom);
      document.documentElement.style.setProperty("--mobile-flow-nav-bottom", Math.max(0, navBottom) + "px");
    }
    if (viewerCard) requestAnimationFrame(() => {
      const height = Math.ceil(viewerCard.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--mobile-pip-height", shouldDock ? height + "px" : "0px");
      if (shouldDock) reclampPinnedScene();
    });
    if (mobileScenePin) {
      mobileScenePin.setAttribute("aria-pressed", String(mobileScenePinEnabled));
      mobileScenePin.setAttribute("aria-label", mobileScenePinEnabled ? "Liberar mini-cena" : "Fixar mini-cena");
    }
    if (mobileSceneOpacity) {
      mobileSceneOpacity.setAttribute("aria-pressed", String(mobileSceneTransparent));
      mobileSceneOpacity.setAttribute("aria-label", mobileSceneTransparent ? "Usar mini-cena opaca" : "Usar mini-cena transparente");
    }
    if (lastResolved) updateSceneHotspots(lastResolved);
  }

""")

replace_once(
    "app/app.js",
"""  function setMobileScenePinEnabled(enabled) {
    mobileScenePinEnabled = Boolean(enabled);
    if (mobileScenePinEnabled && isMobileViewport() && viewerPinSentinel) {
      mobileSceneIsMini = viewerPinSentinel.getBoundingClientRect().top < 0;
    } else if (!mobileScenePinEnabled) {
      mobileSceneIsMini = false;
    }
    syncPinnedSceneUi();
    announce(mobileScenePinEnabled ? "Mini-cena fixada para contexto durante a configuração." : "Mini-cena liberada para o fluxo normal.");
  }
""",
"""  function setMobileScenePinEnabled(enabled) {
    mobileScenePinEnabled = Boolean(enabled);
    if (mobileScenePinEnabled && isMobileViewport() && viewerPinSentinel) {
      mobileSceneIsMini = viewerPinSentinel.getBoundingClientRect().top < 0;
    } else if (!mobileScenePinEnabled) {
      mobileSceneIsMini = false;
      mobileSceneTransparent = false;
    }
    syncPinnedSceneUi();
    announce(mobileScenePinEnabled ? "Mini-cena fixada para contexto durante a configuração." : "Mini-cena liberada para o fluxo normal.");
  }
""")

replace_once(
    "app/app.js",
    'if (nextMini) announce("Mini-cena disponível abaixo das etapas; toque em um módulo apenas para destacá-lo.");',
    'if (nextMini) announce("Mini-cena disponível abaixo das etapas; toque em um módulo para abrir sua ficha.");'
)

for path in ["app/index.html","app/app.js","app/styles.css"]:
    p=Path(path)
    p.write_text(p.read_text().replace("data-mobile-label","data-compact-label"))

p=Path("app/styles.css")
css=p.read_text()
marker="/* Global finish + stone presentation and mobile mini-scene controls. */"
cut=css.index(marker)
tail=r'''/* Global finish + stone presentation and mobile mini-scene controls. */
.flow-nav {
  container-type: inline-size;
  container-name: flow-steps;
}
.flow-step { overflow: hidden; }
.flow-step__label {
  display: inline-block;
  min-width: 0;
  max-width: calc(100% - 32px);
  overflow: hidden;
  vertical-align: middle;
  white-space: nowrap;
  text-overflow: ellipsis;
}
@container flow-steps (max-width: 500px) {
  .flow-step {
    display: grid;
    place-items: center;
    align-content: center;
    gap: 2px;
    padding: 4px 2px;
    line-height: 1.1;
  }
  .flow-step > span:first-child {
    width: 18px;
    height: 18px;
    margin-right: 0;
    font-size: 10px;
  }
  .flow-step__label {
    display: block;
    max-width: 100%;
    font-size: 0;
  }
  .flow-step__label::after {
    content: attr(data-compact-label);
    display: block;
    overflow: hidden;
    font-size: 9px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.finish-layer.is-texture {
  opacity: var(--finish-opacity, .72);
  mix-blend-mode: normal;
  background-blend-mode: var(--finish-background-blend, luminosity);
  background-size: var(--finish-size, 160px 160px);
  background-position: 0 0;
  background-repeat: repeat;
}
.swatch {
  background-color: var(--swatch);
  background-image: var(--swatch-image, none);
  background-size: var(--swatch-size, auto);
  background-position: center;
  background-repeat: repeat;
  background-blend-mode: luminosity;
}
.selected-finish {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 11px;
}
.selected-finish strong { color: var(--text); font-size: 12px; }
.global-option {
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
}
.global-option__copy { display: grid; min-width: 0; gap: 3px; }
.stone-swatch {
  width: 36px;
  height: 36px;
  border: 2px solid rgba(255,255,255,.18);
  border-radius: 50%;
  background-color: var(--stone-swatch);
  background-image: var(--stone-swatch-image, none);
  background-size: var(--stone-swatch-size, auto);
  background-position: center;
  background-repeat: repeat;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.12);
}
.global-option.is-selected .stone-swatch {
  border-color: #fff;
  box-shadow: 0 0 0 2px rgba(255,255,255,.10), inset 0 0 0 1px rgba(0,0,0,.12);
}
.viewer-pip-controls,
.viewer-pip-resize { display: none; }

@media (max-width: 700px) {
  .flow-nav {
    top: env(safe-area-inset-top);
    margin-top: 0;
    z-index: 60;
  }
  .viewer-card {
    position: relative;
    width: 100%;
  }
  .viewer-pip-controls {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 900;
    display: flex;
    gap: 4px;
  }
  .viewer-pip-control {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border: 1px solid rgba(255,255,255,.72);
    border-radius: 50%;
    padding: 0;
    background: rgba(24,24,22,.78);
    color: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,.22);
    font-size: 17px;
    line-height: 1;
    cursor: pointer;
    touch-action: manipulation;
  }
  .viewer-pip-control[aria-pressed="true"] {
    background: rgba(246,242,233,.94);
    color: #28241f;
  }
  #mobileSceneOpacity { display: none; }
  body.is-mobile-scene-pinned .viewer-anchor {
    min-height: var(--mobile-scene-anchor-height, 0px);
  }
  body.is-mobile-scene-pinned .viewer-card {
    position: fixed;
    top: var(--mobile-pip-top, calc(var(--mobile-flow-nav-bottom, 58px) + 6px));
    right: var(--mobile-pip-right, 8px);
    left: var(--mobile-pip-left, auto);
    z-index: 50;
    width: min(var(--mobile-pip-width, clamp(160px, 48vw, 210px)), calc(100vw - 16px));
    border-radius: 11px;
    box-shadow: 0 10px 28px rgba(0,0,0,.35);
  }
  body.is-mobile-scene-pinned #mobileSceneOpacity { display: grid; }
  body.is-mobile-scene-pinned .flow-nav ~ .panel:not([hidden]) {
    margin-top: calc(var(--mobile-pip-height, 0px) + 8px);
  }
  body.is-mobile-scene-pinned .viewer-card__footer {
    position: absolute;
    right: 4px;
    bottom: 4px;
    z-index: 2;
    display: block;
    min-height: 0;
    padding: 0;
    border: 0;
    background: transparent;
  }
  body.is-mobile-scene-pinned .viewer-card__footer p { display: none; }
  body.is-mobile-scene-pinned .viewer { border-radius: 10px; }
  body.is-mobile-scene-pinned .viewer-pip-resize {
    position: absolute;
    right: 2px;
    bottom: 2px;
    z-index: 901;
    display: block;
    width: 28px;
    height: 28px;
    cursor: nwse-resize;
    touch-action: none;
  }
  body.is-mobile-scene-pinned .viewer-pip-resize::after {
    content: "";
    position: absolute;
    right: 6px;
    bottom: 6px;
    width: 10px;
    height: 10px;
    border-right: 2px solid rgba(255,255,255,.9);
    border-bottom: 2px solid rgba(255,255,255,.9);
    border-radius: 0 0 2px;
  }
  body.is-mobile-scene-pinned .scene-hotspots { pointer-events: none; }
  body.is-mobile-scene-pinned .scene-hotspot { pointer-events: auto; }
  body.is-mobile-scene-transparent.is-mobile-scene-pinned .viewer-card {
    background: rgba(17,18,16,.08);
    border-color: rgba(255,255,255,.18);
    box-shadow: 0 6px 18px rgba(0,0,0,.18);
  }
  body.is-mobile-scene-transparent.is-mobile-scene-pinned .viewer {
    opacity: .56;
    background: transparent;
  }
  body.is-mobile-scene-transparent.is-mobile-scene-pinned .viewer-pip-controls,
  body.is-mobile-scene-transparent.is-mobile-scene-pinned .viewer-pip-resize {
    opacity: 1;
  }
}
'''
p.write_text(css[:cut]+tail)

Path("app/core/stone.js").write_text(r'''(function (global) {
  "use strict";

  const width = 1536, height = 1024;

  function caseId(state) {
    const a = state.visibilityByEntity["module-02"];
    const b = state.visibilityByEntity["module-03"];
    return a ? (b ? "default" : "module-03-hidden") : (b ? "module-02-hidden" : "modules-02-03-hidden");
  }

  function parseColor(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color || "")) return null;
    return [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
  }

  function materialKey(material) {
    if (!material) return "original";
    const hasTexture = Boolean(material.textureAsset);
    const color = parseColor(material.color);
    if (!hasTexture && !color) return "original";
    return [
      material.materialType || "generic",
      hasTexture ? material.textureAsset : "no-texture",
      material.color || "no-color",
      material.textureStrength ?? ""
    ].join(":");
  }

  function createRenderer(stoneCanvas, plinthCanvas, data) {
    const inputCache = new Map();
    const materialCache = new Map();
    const renderCache = new Map();
    let revision = 0;

    const stoneContext = stoneCanvas.getContext("2d");
    const plinthContext = plinthCanvas.getContext("2d");

    async function fullCanvasPixels(url) {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scratch = document.createElement("canvas");
      scratch.width = width;
      scratch.height = height;
      const context = scratch.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, width, height).data;
    }

    async function texturePixels(url) {
      if (!materialCache.has(url)) {
        materialCache.set(url, (async () => {
          const image = new Image();
          image.src = url;
          await image.decode();
          const textureWidth = image.naturalWidth || image.width;
          const textureHeight = image.naturalHeight || image.height;
          const scratch = document.createElement("canvas");
          scratch.width = textureWidth;
          scratch.height = textureHeight;
          const context = scratch.getContext("2d", { willReadFrequently: true });
          context.drawImage(image, 0, 0, textureWidth, textureHeight);
          const data = context.getImageData(0, 0, textureWidth, textureHeight).data;
          let totalLuminance = 0, samples = 0;
          for (let index = 0; index < data.length; index += 4) {
            if (!data[index + 3]) continue;
            totalLuminance += data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
            samples += 1;
          }
          return {
            data,
            width: textureWidth,
            height: textureHeight,
            averageLuminance: samples ? totalLuminance / samples : 128
          };
        })());
      }
      return materialCache.get(url);
    }

    async function materialSource(material) {
      const materialType = material?.materialType || "stone";
      const color = parseColor(material?.color);
      const texture = material?.textureAsset ? await texturePixels(material.textureAsset) : null;
      if (!texture && !color) return null;
      return {
        materialType,
        rgb: color,
        texture,
        textureStrength: Number.isFinite(Number(material?.textureStrength)) ? Number(material.textureStrength) : 0.35
      };
    }

    function textureRgb(source, pixel) {
      if (!source.texture) return source.rgb;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      const index = ((y % source.texture.height) * source.texture.width + (x % source.texture.width)) * 4;
      return [
        source.texture.data[index],
        source.texture.data[index + 1],
        source.texture.data[index + 2]
      ];
    }

    function composeStone(neutral, under, objects, mask, source) {
      const result = new Uint8ClampedArray(neutral.length);
      if (!source) return new ImageData(result, width, height);

      for (let pixel = 0, index = 0; pixel < width * height; pixel += 1, index += 4) {
        const coverage = mask[index] / 255;
        if (!coverage) continue;
        const background = 1 - objects[index + 3] / 255;
        const luminance = (
          under[index] * 0.2126 +
          under[index + 1] * 0.7152 +
          under[index + 2] * 0.0722
        ) / 180;
        const shade = Math.min(1.35, Math.max(0.35, luminance));
        const rgb = textureRgb(source, pixel) || source.rgb;
        if (!rgb) continue;
        for (let channel = 0; channel < 3; channel += 1) {
          const target = Math.min(255, rgb[channel] * shade);
          result[index + channel] = Math.round(
            neutral[index + channel] +
            (target - under[index + channel]) * background * coverage
          );
        }
        result[index + 3] = Math.round(255 * coverage);
      }
      return new ImageData(result, width, height);
    }

    function composeMdf(mask, source) {
      const result = new Uint8ClampedArray(width * height * 4);
      if (!source?.rgb) return new ImageData(result, width, height);

      for (let pixel = 0, index = 0; pixel < width * height; pixel += 1, index += 4) {
        const coverage = mask[index] / 255;
        if (!coverage) continue;
        let detail = 1;
        if (source.texture) {
          const texture = textureRgb(source, pixel);
          const luminance = texture[0] * 0.2126 + texture[1] * 0.7152 + texture[2] * 0.0722;
          const delta = (luminance - source.texture.averageLuminance) / 255;
          detail = Math.min(1.22, Math.max(0.78, 1 + delta * source.textureStrength));
        }
        for (let channel = 0; channel < 3; channel += 1) {
          result[index + channel] = Math.round(Math.min(255, source.rgb[channel] * detail));
        }
        result[index + 3] = Math.round(255 * coverage);
      }
      return new ImageData(result, width, height);
    }

    async function caseInputs(id) {
      if (!inputCache.has(id)) {
        inputCache.set(
          id,
          Promise.all(
            ["neutral", "under", "objects", "upperMask", "plinthMask"]
              .map((key) => fullCanvasPixels(data[id][key]))
          )
        );
      }
      return inputCache.get(id);
    }

    async function rendered(id, maskName, material) {
      const key = id + "|" + maskName + "|" + materialKey(material);
      if (!renderCache.has(key)) {
        renderCache.set(key, (async () => {
          const [neutral, under, objects, upperMask, plinthMask] = await caseInputs(id);
          const mask = maskName === "plinth" ? plinthMask : upperMask;
          const source = await materialSource(material);
          return source?.materialType === "mdf"
            ? composeMdf(mask, source)
            : composeStone(neutral, under, objects, mask, source);
        })());
      }
      return renderCache.get(key);
    }

    return async function render(state, materials = {}) {
      const ticket = ++revision;
      stoneContext.clearRect(0, 0, width, height);
      plinthContext.clearRect(0, 0, width, height);

      const id = caseId(state);
      try {
        const jobs = [];
        if (materialKey(materials.upper) !== "original") {
          jobs.push(rendered(id, "upper", materials.upper).then((image) => [stoneContext, image]));
        }
        if (materialKey(materials.plinth) !== "original") {
          jobs.push(rendered(id, "plinth", materials.plinth).then((image) => [plinthContext, image]));
        }
        const images = await Promise.all(jobs);
        if (ticket !== revision) return;
        images.forEach(([context, image]) => context.putImageData(image, 0, 0));
      } catch (error) {
        inputCache.delete(id);
        if (ticket === revision) console.error(error);
      }
    };
  }

  global.CasaStone = Object.freeze({ caseId, createRenderer, materialKey });
})(window);
''')

replace_once(
    "app/tools/test-core.js",
    'assert.equal(catalog.options.finishes.every((finish) => finish.textureAsset && finish.textureAsset.startsWith("assets/materials/")), true);',
    'assert.equal(catalog.options.finishes.every((finish) => finish.materialType === "mdf" && finish.textureAsset && finish.textureAsset.startsWith("assets/materials/")), true);'
)
replace_once(
    "app/tools/test-core.js",
    'assert.deepEqual(Array.from(catalog.options.stonePackages.filter((stone) => ["stone-light","stone-green","stone-dark"].includes(stone.id)).map((stone) => Boolean(stone.textureAsset))), [true,true,true]);',
    'assert.deepEqual(Array.from(catalog.options.stonePackages.filter((stone) => ["stone-light","stone-green","stone-dark"].includes(stone.id)).map((stone) => stone.materialType === "stone" && Boolean(stone.textureAsset))), [true,true,true]);\nassert.equal(finishes.resolveOverlayOpacity(catalog.options.finishes[0], catalog.options.finishes[0].color), 0.84);'
)
