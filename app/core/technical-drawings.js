(function registerTechnicalDrawings(global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const dimension = (value) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);

  function fit(width, height, maxWidth = 104, maxHeight = 64) {
    const safeWidth = Math.max(Number(width) || 1, 1);
    const safeHeight = Math.max(Number(height) || 1, 1);
    const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight);
    return { width: safeWidth * scale, height: safeHeight * scale, scale };
  }

  function factory(svg) {
    return (name, attributes = {}) => {
      const node = document.createElementNS(SVG_NS, name);
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

  function appendFrontSegments(make, layout, x, y, width, height, faceWidthMm, className) {
    if (layout?.pattern === "two-doors") {
      const middle = x + width / 2;
      make("line", { x1: middle, y1: y, x2: middle, y2: y + height, class: className });
      return;
    }
    if (layout?.pattern === "two-doors-and-lift") {
      // Legacy and known to be visually incorrect; retained only for compatibility until its source data is repaired.
      const liftBottom = y + height * 0.34;
      const middle = x + width / 2;
      make("line", { x1: x, y1: liftBottom, x2: x + width, y2: liftBottom, class: className });
      make("line", { x1: middle, y1: liftBottom, x2: middle, y2: y + height, class: className });
      return;
    }
    if (layout?.pattern === "two-doors-and-microwave") {
      const leftZoneEnd = x + width * 0.54;
      const leftDoorSplit = x + width * 0.27;
      const liftBottom = y + height * 0.42;
      const nicheInset = Math.max(2, width * 0.035);
      make("line", { x1: leftDoorSplit, y1: y, x2: leftDoorSplit, y2: y + height, class: className });
      make("line", { x1: leftZoneEnd, y1: y, x2: leftZoneEnd, y2: y + height, class: className });
      make("line", { x1: leftZoneEnd, y1: liftBottom, x2: x + width, y2: liftBottom, class: className });
      make("rect", { x: leftZoneEnd + nicheInset, y: liftBottom + nicheInset, width: Math.max(4, width * 0.46 - nicheInset * 2), height: Math.max(4, height * 0.58 - nicheInset * 2), rx: 1.5, class: className });
      return;
    }
    if (!layout?.segments?.length) return;
    const segmentsWidthMm = layout.innerWidthMm || layout.segments.reduce((total, segment) => total + (segment.spanMm || 0), 0);
    if (!segmentsWidthMm) return;
    const visibleWidth = width * Math.min(segmentsWidthMm, faceWidthMm) / faceWidthMm;
    const startX = x + (width - visibleWidth) / 2;
    let cursorMm = 0;
    layout.segments.forEach((segment, index) => {
      const segmentStart = startX + cursorMm / segmentsWidthMm * visibleWidth;
      cursorMm += segment.spanMm || 0;
      const segmentEnd = startX + cursorMm / segmentsWidthMm * visibleWidth;
      if (index < layout.segments.length - 1) make("line", { x1: segmentEnd, y1: y, x2: segmentEnd, y2: y + height, class: className });
      for (let part = 1; part < (segment.subdivisions || 1); part += 1) {
        make("line", { x1: segmentStart, y1: y + height / segment.subdivisions * part, x2: segmentEnd, y2: y + height / segment.subdivisions * part, class: className });
      }
    });
  }

  function elevation(spec, layout, type, classes = {}) {
    const isSide = type === "side";
    const horizontalMm = isSide ? spec.extrusionMm : spec.faceWidthMm;
    const horizontalLabel = isSide ? spec.extrusionLabel : spec.faceHorizontalLabel;
    const box = fit(horizontalMm, spec.faceHeightMm);
    const amplified = spec.kind === "panel" && isSide && box.width < 2.5;
    const width = amplified ? 2.5 : box.width;
    const height = box.height;
    const x = 94 - width / 2;
    const y = 62 - height / 2;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 180 126");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${isSide ? "Vista lateral" : "Vista frontal"}: ${horizontalLabel} ${dimension(horizontalMm)} milímetros por A ${dimension(spec.faceHeightMm)} milímetros${amplified ? ". A espessura foi ampliada apenas para legibilidade." : "."}`);
    const make = factory(svg);
    const dimensionClass = classes.dimension || "module-detail__dimension-line";
    const shapeClass = classes.shape || "module-detail__view-shape";
    make("line", { x1: x, y1: 17, x2: x + width, y2: 17, class: dimensionClass });
    make("line", { x1: x, y1: 13, x2: x, y2: 21, class: dimensionClass });
    make("line", { x1: x + width, y1: 13, x2: x + width, y2: 21, class: dimensionClass });
    label(make, `${horizontalLabel} ${dimension(horizontalMm)} mm`, 94, 10);
    make("line", { x1: Math.max(14, x - 18), y1: y, x2: Math.max(14, x - 18), y2: y + height, class: dimensionClass });
    make("line", { x1: Math.max(10, x - 22), y1: y, x2: Math.max(18, x - 14), y2: y, class: dimensionClass });
    make("line", { x1: Math.max(10, x - 22), y1: y + height, x2: Math.max(18, x - 14), y2: y + height, class: dimensionClass });
    make("rect", { x, y, width, height, rx: 2, class: shapeClass });
    if (!isSide) appendFrontSegments(make, layout, x, y, width, height, spec.faceWidthMm, shapeClass);
    label(make, `A ${dimension(spec.faceHeightMm)} mm`, 4, y + height / 2 + 3, "start");
    return svg;
  }

  function isometric(spec, layout, ariaPrefix = "Projeção isométrica orientativa", classes = {}) {
    const box = fit(spec.faceWidthMm, spec.faceHeightMm, 86, 58);
    const rawDepth = spec.extrusionMm * box.scale * 0.68;
    const amplified = spec.kind === "panel" && rawDepth < 4;
    const depthX = Math.max(amplified ? 4 : 6, rawDepth);
    const depthY = -Math.min(18, depthX * 0.62);
    const width = box.width, height = box.height;
    const left = 92 - (width + depthX) / 2;
    const top = 59 - height / 2 - depthY / 2;
    const right = left + width, bottom = top + height;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 180 126"); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${ariaPrefix}: ${spec.faceHorizontalLabel} ${dimension(spec.faceWidthMm)} milímetros, A ${dimension(spec.faceHeightMm)} milímetros e ${spec.extrusionLabel} ${dimension(spec.extrusionMm)} milímetros${amplified ? ". A espessura foi ampliada apenas para legibilidade." : "."}`);
    const make = factory(svg);
    const dimensionClass = classes.dimension || "module-detail__dimension-line";
    const shapeClass = classes.shape || "module-detail__view-shape";
    make("path", { d: `M ${left} ${top} L ${right} ${top} L ${right + depthX} ${top + depthY} L ${left + depthX} ${top + depthY} Z`, class: shapeClass });
    make("path", { d: `M ${right} ${top} L ${right + depthX} ${top + depthY} L ${right + depthX} ${bottom + depthY} L ${right} ${bottom} Z`, class: shapeClass });
    make("rect", { x: left, y: top, width, height, class: shapeClass });
    appendFrontSegments(make, layout, left, top, width, height, spec.faceWidthMm, shapeClass);
    make("line", { x1: left, y1: bottom + 14, x2: right, y2: bottom + 14, class: dimensionClass });
    make("line", { x1: left, y1: bottom + 10, x2: left, y2: bottom + 18, class: dimensionClass });
    make("line", { x1: right, y1: bottom + 10, x2: right, y2: bottom + 18, class: dimensionClass });
    make("line", { x1: Math.max(15, left - 19), y1: top, x2: Math.max(15, left - 19), y2: bottom, class: dimensionClass });
    make("line", { x1: Math.max(11, left - 23), y1: top, x2: Math.max(19, left - 15), y2: top, class: dimensionClass });
    make("line", { x1: Math.max(11, left - 23), y1: bottom, x2: Math.max(19, left - 15), y2: bottom, class: dimensionClass });
    const depthStart = { x: right + 4, y: top - 6 }, depthEnd = { x: right + depthX + 4, y: top + depthY - 6 };
    const length = Math.hypot(depthEnd.x - depthStart.x, depthEnd.y - depthStart.y) || 1;
    const tick = { x: -(depthEnd.y - depthStart.y) / length * 4, y: (depthEnd.x - depthStart.x) / length * 4 };
    make("line", { x1: depthStart.x, y1: depthStart.y, x2: depthEnd.x, y2: depthEnd.y, class: dimensionClass });
    [depthStart, depthEnd].forEach((point) => make("line", { x1: point.x - tick.x, y1: point.y - tick.y, x2: point.x + tick.x, y2: point.y + tick.y, class: dimensionClass }));
    label(make, `${spec.faceHorizontalLabel} ${dimension(spec.faceWidthMm)} mm`, left + width / 2, bottom + 27);
    label(make, `A ${dimension(spec.faceHeightMm)} mm`, 4, top + height / 2 + 3, "start");
    label(make, `${spec.extrusionLabel} ${dimension(spec.extrusionMm)} mm`, Math.min(171, right + depthX + 9), Math.max(13, top + depthY - 8), "end");
    return svg;
  }

  function internalFront({ widthMm, segments, frame = { x: 48, y: 30, width: 94, height: 61 }, segmentScaleMm = widthMm, ariaLabel = null, classes = {}, showEndTicks = true, dimensionLabelY = 10 }) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 180 126"); svg.setAttribute("role", "img");
    const name = classes.dimension || "module-detail__dimension-line", shape = classes.shape || "module-detail__view-shape";
    const describe = segments.map((segment) => `${segment.label} ${dimension(segment.spanMm || segment.span)} milímetros`).join(", ");
    svg.setAttribute("aria-label", ariaLabel || `Vista interna frontal: ${describe}.`);
    const make = factory(svg), { x, y, width, height } = frame;
    make("line", { x1: x, y1: 17, x2: x + width, y2: 17, class: name });
    if (showEndTicks) {
      make("line", { x1: x, y1: 13, x2: x, y2: 21, class: name });
      make("line", { x1: x + width, y1: 13, x2: x + width, y2: 21, class: name });
    }
    label(make, `L ${dimension(widthMm)} mm`, x + width / 2, dimensionLabelY);
    make("rect", { x, y, width, height, rx: 2, class: shape });
    let cursor = 0;
    segments.forEach((segment, index) => {
      const span = Number(segment.spanMm || segment.span || 0);
      const start = x + cursor / segmentScaleMm * width;
      cursor += span;
      const end = x + cursor / segmentScaleMm * width;
      if (index < segments.length - 1) make("line", { x1: end, y1: y, x2: end, y2: y + height, class: shape });
      for (let part = 1; part < (segment.subdivisions || 1); part += 1) make("line", { x1: start, y1: y + height / segment.subdivisions * part, x2: end, y2: y + height / segment.subdivisions * part, class: shape });
    });
    label(make, segments.map((segment) => dimension(segment.spanMm || segment.span)).join(" · "), x + width / 2, 108);
    return svg;
  }

  global.CasaTechnicalDrawings = Object.freeze({ elevation, isometric, internalFront });
})(window);
