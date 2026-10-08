(function (global) {
  "use strict";

  const ns = "http://www.w3.org/2000/svg";
  const dimension = (value) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);

  function svgFactory(svg) {
    return (name, attributes = {}) => {
      const node = document.createElementNS(ns, name);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
      svg.append(node);
      return node;
    };
  }
  function label(make, value, x, y, anchor = "middle") {
    const node = make("text", { x, y, "text-anchor": anchor });
    node.textContent = value;
    return node;
  }
  function drawingSpec(module) {
    if (module.drawingSpec?.kind === "panel") return {
      kind: "panel", faceWidthMm: module.drawingSpec.faceWidthMm,
      faceHeightMm: module.drawingSpec.faceHeightMm, extrusionMm: module.drawingSpec.thicknessMm,
      faceHorizontalLabel: module.drawingSpec.faceHorizontalLabel, extrusionLabel: module.drawingSpec.extrusionLabel
    };
    return { kind: "cabinet", faceWidthMm: module.dimensions.width, faceHeightMm: module.dimensions.height,
      extrusionMm: module.dimensions.depth, faceHorizontalLabel: "L", extrusionLabel: "P" };
  }
  function fit(width, height, maxWidth = 104, maxHeight = 64) {
    const safeWidth = Math.max(Number(width) || 1, 1), safeHeight = Math.max(Number(height) || 1, 1);
    const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight);
    return { width: safeWidth * scale, height: safeHeight * scale, scale };
  }
  function appendFrontSegments(make, layout, x, y, width, height, faceWidthMm) {
    if (layout?.pattern === "two-doors") {
      const middle = x + width / 2;
      make("line", { x1: middle, y1: y, x2: middle, y2: y + height, class: "module-detail__view-shape" });
      return;
    }
    if (layout?.pattern === "two-doors-and-microwave") {
      const zone = x + width * .54, split = x + width * .27, liftBottom = y + height * .42;
      const inset = Math.max(2, width * .035);
      make("line", { x1: split, y1: y, x2: split, y2: y + height, class: "module-detail__view-shape" });
      make("line", { x1: zone, y1: y, x2: zone, y2: y + height, class: "module-detail__view-shape" });
      make("line", { x1: zone, y1: liftBottom, x2: x + width, y2: liftBottom, class: "module-detail__view-shape" });
      make("rect", { x: zone + inset, y: liftBottom + inset, width: Math.max(4, width * .46 - inset * 2), height: Math.max(4, height * .58 - inset * 2), rx: 1.5, class: "module-detail__view-shape" });
      return;
    }
    if (!layout?.segments?.length) return;
    const segmentWidth = layout.innerWidthMm || layout.segments.reduce((total, segment) => total + (segment.spanMm || 0), 0);
    if (!segmentWidth) return;
    const visibleWidth = width * Math.min(segmentWidth, faceWidthMm) / faceWidthMm;
    const start = x + (width - visibleWidth) / 2;
    let cursor = 0;
    layout.segments.forEach((segment, index) => {
      const startX = start + cursor / segmentWidth * visibleWidth;
      cursor += segment.spanMm || 0;
      const endX = start + cursor / segmentWidth * visibleWidth;
      if (index < layout.segments.length - 1) make("line", { x1: endX, y1: y, x2: endX, y2: y + height, class: "module-detail__view-shape" });
      for (let part = 1; part < (segment.subdivisions || 1); part += 1) {
        const divisionY = y + height / segment.subdivisions * part;
        make("line", { x1: startX, y1: divisionY, x2: endX, y2: divisionY, class: "module-detail__view-shape" });
      }
    });
  }
  function svgFor(module, type) {
    const spec = drawingSpec(module), isSide = type === "side", isometric = type === "isometric";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 180 126"); svg.setAttribute("role", "img");
    const make = svgFactory(svg);
    if (!isometric) {
      const horizontalMm = isSide ? spec.extrusionMm : spec.faceWidthMm;
      const horizontalLabel = isSide ? spec.extrusionLabel : spec.faceHorizontalLabel;
      const box = fit(horizontalMm, spec.faceHeightMm);
      const amplified = spec.kind === "panel" && isSide && box.width < 2.5;
      const width = amplified ? 2.5 : box.width, height = box.height, x = 94 - width / 2, y = 62 - height / 2;
      const caption = isSide ? "Vista lateral" : "Vista frontal";
      svg.setAttribute("aria-label", `${caption}: ${horizontalLabel} ${dimension(horizontalMm)} milímetros por A ${dimension(spec.faceHeightMm)} milímetros${amplified ? ". A espessura foi ampliada apenas para legibilidade." : "."}`);
      make("line", { x1: x, y1: 17, x2: x + width, y2: 17, class: "module-detail__dimension-line" });
      make("line", { x1: x, y1: 13, x2: x, y2: 21, class: "module-detail__dimension-line" });
      make("line", { x1: x + width, y1: 13, x2: x + width, y2: 21, class: "module-detail__dimension-line" });
      label(make, `${horizontalLabel} ${dimension(horizontalMm)} mm`, 94, 10);
      make("line", { x1: Math.max(14, x - 18), y1: y, x2: Math.max(14, x - 18), y2: y + height, class: "module-detail__dimension-line" });
      make("line", { x1: Math.max(10, x - 22), y1: y, x2: Math.max(18, x - 14), y2: y, class: "module-detail__dimension-line" });
      make("line", { x1: Math.max(10, x - 22), y1: y + height, x2: Math.max(18, x - 14), y2: y + height, class: "module-detail__dimension-line" });
      make("rect", { x, y, width, height, rx: 2, class: "module-detail__view-shape" });
      if (!isSide) appendFrontSegments(make, module.frontLayout, x, y, width, height, spec.faceWidthMm);
      label(make, `A ${dimension(spec.faceHeightMm)} mm`, 4, y + height / 2 + 3, "start");
    } else {
      const box = fit(spec.faceWidthMm, spec.faceHeightMm, 86, 58);
      const rawDepth = spec.extrusionMm * box.scale * .68;
      const amplified = spec.kind === "panel" && rawDepth < 4;
      const depthX = Math.max(amplified ? 4 : 6, rawDepth), depthY = -Math.min(18, depthX * .62);
      const width = box.width, height = box.height, left = 92 - (width + depthX) / 2;
      const top = 59 - height / 2 - depthY / 2, right = left + width, bottom = top + height;
      svg.setAttribute("aria-label", `Projeção isométrica orientativa: ${spec.faceHorizontalLabel} ${dimension(spec.faceWidthMm)} milímetros, A ${dimension(spec.faceHeightMm)} milímetros e ${spec.extrusionLabel} ${dimension(spec.extrusionMm)} milímetros${amplified ? ". A espessura foi ampliada apenas para legibilidade." : "."}`);
      make("path", { d: `M ${left} ${top} L ${right} ${top} L ${right + depthX} ${top + depthY} L ${left + depthX} ${top + depthY} Z`, class: "module-detail__view-shape" });
      make("path", { d: `M ${right} ${top} L ${right + depthX} ${top + depthY} L ${right + depthX} ${bottom + depthY} L ${right} ${bottom} Z`, class: "module-detail__view-shape" });
      make("rect", { x: left, y: top, width, height, class: "module-detail__view-shape" });
      appendFrontSegments(make, module.frontLayout, left, top, width, height, spec.faceWidthMm);
      make("line", { x1: left, y1: bottom + 14, x2: right, y2: bottom + 14, class: "module-detail__dimension-line" });
      make("line", { x1: left, y1: bottom + 10, x2: left, y2: bottom + 18, class: "module-detail__dimension-line" });
      make("line", { x1: right, y1: bottom + 10, x2: right, y2: bottom + 18, class: "module-detail__dimension-line" });
      make("line", { x1: Math.max(15, left - 19), y1: top, x2: Math.max(15, left - 19), y2: bottom, class: "module-detail__dimension-line" });
      make("line", { x1: Math.max(11, left - 23), y1: top, x2: Math.max(19, left - 15), y2: top, class: "module-detail__dimension-line" });
      make("line", { x1: Math.max(11, left - 23), y1: bottom, x2: Math.max(19, left - 15), y2: bottom, class: "module-detail__dimension-line" });
      const depthStart = { x: right + 4, y: top - 6 }, depthEnd = { x: right + depthX + 4, y: top + depthY - 6 };
      const length = Math.hypot(depthEnd.x - depthStart.x, depthEnd.y - depthStart.y) || 1;
      const tick = { x: -(depthEnd.y - depthStart.y) / length * 4, y: (depthEnd.x - depthStart.x) / length * 4 };
      make("line", { x1: depthStart.x, y1: depthStart.y, x2: depthEnd.x, y2: depthEnd.y, class: "module-detail__dimension-line" });
      [depthStart, depthEnd].forEach((point) => make("line", { x1: point.x - tick.x, y1: point.y - tick.y, x2: point.x + tick.x, y2: point.y + tick.y, class: "module-detail__dimension-line" }));
      label(make, `${spec.faceHorizontalLabel} ${dimension(spec.faceWidthMm)} mm`, left + width / 2, bottom + 27);
      label(make, `A ${dimension(spec.faceHeightMm)} mm`, 4, top + height / 2 + 3, "start");
      label(make, `${spec.extrusionLabel} ${dimension(spec.extrusionMm)} mm`, Math.min(171, right + depthX + 9), Math.max(13, top + depthY - 8), "end");
    }
    const figure = document.createElement("article"); figure.className = "technical-view";
    const caption = isometric ? "Projeção isométrica" : isSide ? "Vista lateral" : "Vista frontal";
    figure.append(Object.assign(document.createElement("h3"), { textContent: caption }), svg,
      Object.assign(document.createElement("p"), { textContent: module.frontLayout?.status === "count-confirmed" && !isSide ? "Número de frentes confirmado; proporções internas orientativas." : "Desenho proporcional · cotas nominais." }));
    return figure;
  }

  function internalView(module) {
    const svg = document.createElementNS(ns, "svg"), dimensions = module.dimensions, segments = module.internalLayout;
    svg.setAttribute("viewBox", "0 0 180 126"); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Vista interna frontal com segmentos confirmados: ${segments.map((part) => `${part.label}, ${dimension(part.spanMm || part.span)} milímetros`).join("; ")}.`);
    const make = svgFactory(svg), x = 28, y = 28, width = 124, height = 68;
    make("line", { x1: x, y1: 17, x2: x + width, y2: 17, class: "module-detail__dimension-line" });
    label(make, `L ${dimension(dimensions.width)} mm`, x + width / 2, 12);
    make("rect", { x, y, width, height, rx: 2, class: "module-detail__view-shape" });
    let cursor = 0, total = segments.reduce((sum, part) => sum + Number(part.spanMm || part.span || 0), 0);
    segments.forEach((part, index) => {
      const startX = x + cursor / total * width;
      cursor += Number(part.spanMm || part.span || 0);
      const endX = x + cursor / total * width;
      if (index < segments.length - 1) make("line", { x1: endX, y1: y, x2: endX, y2: y + height, class: "module-detail__view-shape" });
      for (let row = 1; row < (part.subdivisions || 1); row += 1) make("line", { x1: startX, y1: y + height / part.subdivisions * row, x2: endX, y2: y + height / part.subdivisions * row, class: "module-detail__view-shape" });
    });
    label(make, segments.map((part) => dimension(part.spanMm || part.span)).join(" · "), x + width / 2, 112);
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
