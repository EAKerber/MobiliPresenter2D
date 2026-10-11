(function (global) {
  "use strict";

  const ns = "http://www.w3.org/2000/svg";
  const dimension = (value) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
  function drawingSpec(module) {
    if (module.drawingSpec?.kind === "panel") return {
      kind: "panel", faceWidthMm: module.drawingSpec.faceWidthMm,
      faceHeightMm: module.drawingSpec.faceHeightMm, extrusionMm: module.drawingSpec.thicknessMm,
      faceHorizontalLabel: module.drawingSpec.faceHorizontalLabel, extrusionLabel: module.drawingSpec.extrusionLabel
    };
    return { kind: "cabinet", faceWidthMm: module.dimensions.width, faceHeightMm: module.dimensions.height,
      extrusionMm: module.dimensions.depth, faceHorizontalLabel: "L", extrusionLabel: "P" };
  }
  function svgFor(module, type) {
    const spec = drawingSpec(module), isSide = type === "side", isometric = type === "isometric";
    const svg = isometric
      ? global.CasaTechnicalDrawings.isometric(spec, module.frontLayout)
      : global.CasaTechnicalDrawings.elevation(spec, module.frontLayout, isSide ? "side" : "front");
    const figure = document.createElement("article"); figure.className = "technical-view";
    const caption = isometric ? "Projeção isométrica" : isSide ? "Vista lateral" : "Vista frontal";
    figure.append(Object.assign(document.createElement("h3"), { textContent: caption }), svg,
      Object.assign(document.createElement("p"), { textContent: module.frontLayout?.status === "count-confirmed" && !isSide ? "Número de frentes confirmado; proporções internas orientativas." : "Desenho proporcional · cotas nominais." }));
    return figure;
  }

  function internalView(module) {
    const dimensions = module.dimensions, segments = module.internalLayout;
    const svg = global.CasaTechnicalDrawings.internalFront({
      widthMm: dimensions.width,
      segments,
      frame: { x: 28, y: 28, width: 124, height: 68 },
      segmentScaleMm: segments.reduce((total, part) => total + Number(part.spanMm || part.span || 0), 0),
      ariaLabel: `Vista interna frontal com segmentos confirmados: ${segments.map((part) => `${part.label}, ${dimension(part.spanMm || part.span)} milímetros`).join("; ")}.`,
      showEndTicks: false,
      dimensionLabelY: 12
    });
    const figure = document.createElement("article"); figure.className = "technical-view";
    figure.append(Object.assign(document.createElement("h3"), { textContent: "Vista interna" }), svg,
      Object.assign(document.createElement("p"), { textContent: "Vãos internos confirmados; medidas não representam o envelope externo." }));
    return figure;
  }
  function focusView(module, entity, assetUrl, sceneCanvas) {
    const bounds = entity?.alphaBounds;
    const figure = document.createElement("article"); figure.className = "technical-view technical-view--focus";
    figure.append(Object.assign(document.createElement("h3"), { textContent: "Detalhe do módulo" }));
    if (!entity?.asset || !bounds?.width || !bounds?.height) {
      figure.append(Object.assign(document.createElement("p"), { textContent: "Recorte do módulo indisponível." }));
      return figure;
    }
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet"); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Recorte isolado de ${module.title}`);
    const image = document.createElementNS(ns, "image");
    image.setAttribute("href", assetUrl || `../${entity.asset}`); image.setAttribute("width", sceneCanvas.width); image.setAttribute("height", sceneCanvas.height);
    image.setAttribute("preserveAspectRatio", "none"); svg.append(image);
    figure.append(svg, Object.assign(document.createElement("p"), { textContent: "Recorte do módulo selecionado na cena." }));
    return figure;
  }
  function render(module, kind, label, entity, assetUrl, sceneCanvas) {
    if (kind === "focus") return focusView(module, entity, assetUrl, sceneCanvas);
    if ((kind === "internal" || kind === "internal-front") && module.internalLayout?.length) return internalView(module);
    return svgFor(module, kind === "side" ? "side" : kind === "isometric" ? "isometric" : "front");
  }
  global.CASA_PUBLIC_TECHNICAL_VIEWS = Object.freeze({ render });
})(window);
