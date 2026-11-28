const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app/core/technical-drawings.js"), "utf8");
const catalog = require("../app/core/ui-copy.js").technicalDrawings;

function drawings(copy) {
  const document = { createElementNS: (_, tag) => ({
    tag, attributes: {}, children: [], textContent: "",
    setAttribute(name, value) { this.attributes[name] = String(value); },
    append(node) { this.children.push(node); }
  }) };
  const window = copy ? { CASA_UI_THEME: { getCopy: (key, fallback) =>
    key.startsWith("technicalDrawings.") ? (copy[key.slice("technicalDrawings.".length)] ?? fallback) : fallback
  } } : {};
  vm.runInNewContext(source, { window, document, Intl });
  return window.CasaTechnicalDrawings;
}

const spec = { kind: "panel", faceWidthMm: 600, faceHeightMm: 720,
  extrusionMm: 2, faceHorizontalLabel: "L", extrusionLabel: "P" };
const layout = { pattern: "two-doors" };
const segments = [{ label: "Prateleira $&", spanMm: 300 }, { label: "Vão", spanMm: 300 }];

test("shared technical descriptions preserve Portuguese output, geometry, overrides and catalog fallback", () => {
  const normal = drawings(catalog), fallback = drawings();
  const cases = [
    ["front", api => api.elevation(spec, layout, "front"),
      "Vista frontal: L 600 milímetros por A 720 milímetros."],
    ["side", api => api.elevation(spec, layout, "side"),
      "Vista lateral: P 2 milímetros por A 720 milímetros. A espessura foi ampliada apenas para legibilidade."],
    ["isometric", api => api.isometric(spec, layout),
      "Projeção isométrica orientativa: L 600 milímetros, A 720 milímetros e P 2 milímetros. A espessura foi ampliada apenas para legibilidade."],
    ["custom prefix", api => api.isometric(spec, layout, "Detalhe $&"),
      "Detalhe $&: L 600 milímetros, A 720 milímetros e P 2 milímetros. A espessura foi ampliada apenas para legibilidade."],
    ["internal", api => api.internalFront({widthMm:600, segments}),
      "Vista interna frontal: Prateleira $& 300 milímetros, Vão 300 milímetros."],
    ["custom label", api => api.internalFront({widthMm:600, segments, ariaLabel:"Descrição própria $&"}),
      "Descrição própria $&"]
  ];
  for (const [name, draw, expected] of cases) {
    const actual = draw(normal), defaulted = draw(fallback);
    assert.equal(actual.attributes["aria-label"], expected, name);
    assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(defaulted)),
      name + " keeps the same complete SVG without a catalog");
    assert.ok(actual.children.length > 2, name + " retains drawing geometry");
  }
});

test("catalog templates change descriptions while product data remains literal", () => {
  const localized = drawings({...catalog, internalAria:"Interno: {segments}", internalSegment:"{label} / {size}"});
  const svg = localized.internalFront({widthMm:600, segments:[{label:"Vão {size} $&", spanMm:300}]});
  assert.equal(svg.attributes["aria-label"], "Interno: Vão {size} $& / 300");
});
