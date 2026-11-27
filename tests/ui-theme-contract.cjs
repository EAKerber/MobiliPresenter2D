"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const code = read("app/core/ui-theme.js");
const copyCode = read("app/core/ui-copy.js");
const copyWindow = {};
vm.runInNewContext(copyCode, { window: copyWindow }, { filename: "app/core/ui-copy.js" });
const copy = copyWindow.CASA_UI_COPY;
assert.equal(copy.schema, "M2DUIStringCatalog/1");
assert.equal(copy.locale, "pt-BR");
assert.deepEqual(JSON.parse(JSON.stringify(copy.theme.mode)), {
  auto: { full: "Automático", short: "Auto" },
  light: "Claro",
  dark: "Escuro"
});
assert.equal(copy.theme.toggle.ariaLabel, "Tema atual: {current}. Ativar {next}.");
assert.equal(copy.theme.toggle.title, "Tema: {current} (próximo: {next})");
assert.deepEqual(JSON.parse(JSON.stringify(copy.navigation.menu)), {
  open: "Abrir menu", close: "Fechar menu"
});
assert.equal(copy.navigation.contact, "Fale conosco");
assert.equal(copy.navigation.contactAriaLabel, "Fale conosco pelo WhatsApp");
assert.deepEqual(JSON.parse(JSON.stringify(copy.video.fullscreen)), {
  open: "Abrir vídeo em tela cheia", close: "Sair da tela cheia"
});
assert.deepEqual(JSON.parse(JSON.stringify(copy.admin.initialState)), {
  entityVisibility: "Iniciar visível no configurador",
  entityVisibilityAriaLabel: "{item}: visível inicialmente no configurador",
  viewerVisibility: "Iniciar visível no viewer",
  viewerVisibilityAriaLabel: "{item}: visível inicialmente no viewer",
  serviceActive: "Iniciar ativo",
  serviceActiveAriaLabel: "{item}: ativo inicialmente"
});
assert.deepEqual(JSON.parse(JSON.stringify(copy.admin.finishes)), {
  customerAvailability: "Disponível para clientes",
  customerAvailabilityAriaLabel: "{finish}: disponível para clientes",
  scopeLabel: "Aplicação",
  scopeAriaLabel: "{finish}: aplicação",
  scopeOptions: { global: "Global · conjunto todo", local: "Local · módulo individual" },
  globalAvailabilityPolicy: "Mantenha pelo menos um acabamento global disponível para clientes.",
  moduleOptionsAriaLabel: "Módulos que aceitam {finish}",
  moduleAvailabilityAriaLabel: "{finish}: disponível para o módulo {module}",
  localAssociationPolicy: "Mantenha este acabamento associado a pelo menos um módulo."
});
assert.deepEqual(JSON.parse(JSON.stringify(copy.admin.stages)), {
  availabilityActive: "Ativa",
  availabilityInactive: "Inativa",
  availabilityAriaLabel: "Ativar etapa {stage}",
  requiredAvailabilityPolicy: "Etapa obrigatória: não pode ser desativada nem removida.",
  emptyAvailabilityPolicy: "Adicione pelo menos um item antes de ativar esta etapa."
});
assert.deepEqual(JSON.parse(JSON.stringify(copy.admin.objectAssets)), {
  heading: "{item} · arquivos da cena",
  fields: {
    sceneImage: "Imagem da cena",
    detailImage: "Imagem dos detalhes",
    finishMask: "Máscara de acabamento"
  },
  defaultSelection: "Usar o padrão / sem máscara",
  previewAlt: "{asset} · {item}",
  previewUnavailable: "Prévia indisponível",
  emptyPreview: "Sem máscara · usar o recorte padrão",
  sceneEntityPolicy: "A lista contém apenas arquivos já presentes na cena. O painel não carrega arquivos novos nem permite caminhos externos.",
  nonSceneEntityPolicy: "Este item não possui camada visual própria na cena. Configure cores e texturas na biblioteca de materiais."
});
assert.deepEqual(JSON.parse(JSON.stringify(copy.admin.objectContentFields)), {
  publicName: "Nome público",
  description: "Descrição",
  benefitsPerLine: "Destaques (um por linha)",
  componentsPerLine: "Componentes (um por linha)",
  requirementsPerLine: "Requisitos (um por linha)"
});
assert.deepEqual(JSON.parse(JSON.stringify(copy.viewer.state)), {
  empty: "Nenhum módulo está visível no viewer neste momento.",
  loading: "Carregando informações publicadas…",
  unavailable: "Informações temporariamente indisponíveis. Tente novamente mais tarde."
});
assert.deepEqual(JSON.parse(JSON.stringify(copy.viewer.views)), {
  show: "Mostrar vista {index}",
  previous: "Vista anterior",
  counter: "{current} / {total}",
  next: "Próxima vista"
});
assert.deepEqual(JSON.parse(JSON.stringify(copy.viewer.scene)), {
  selected: "Selecionado: {number} · {title}",
  heading: "Cena interativa",
  instruction: "Clique em um módulo ou use ←/→ e as teclas 1–7.",
  accessibleInstruction: "Cena da cozinha. Use as setas para percorrer os módulos ou as teclas de 1 a 7 para selecionar pelo número.",
  imageAlt: "Composição da cozinha Casa em Módulos",
  hotspotsLabel: "Módulos selecionáveis na cena",
  fallbackStatus: "Imagem indisponível",
  fallbackDescription: "A composição completa da cozinha não pôde ser exibida.",
  fallbackAccessibleLabel: "Cena da cozinha indisponível. A composição completa não pôde ser exibida."
});
const viewerCode = read("app/viewer/viewer.js");
assert(viewerCode.includes('theme.getCopy("viewer.state." + key, fallback)') &&
  viewerCode.includes('viewerCopy("empty", "Nenhum módulo está visível no viewer neste momento.")') &&
  viewerCode.includes('viewerCopy("loading", "Carregando informações publicadas…")') &&
  viewerCode.includes('viewerCopy("unavailable", "Informações temporariamente indisponíveis. Tente novamente mais tarde.")'),
"Viewer state messages use the canonical catalog with per-key local fallbacks");
assert(viewerCode.includes('viewerViewCopy("show", "Mostrar vista {index}")') &&
  viewerCode.includes('viewerViewCopy("previous", "Vista anterior")') &&
  viewerCode.includes('viewerViewCopy("next", "Próxima vista")') &&
  viewerCode.includes('viewerViewCopy("counter", "{current} / {total}")') &&
  viewerCode.includes('theme.getCopy("viewer.views." + key, fallback)'),
"Viewer navigation labels use four canonical keys, with both counter sinks sharing one key");
assert(viewerCode.includes('viewerSceneCopy("selected", "Selecionado: {number} · {title}")') &&
  viewerCode.includes('viewerSceneCopy("heading", "Cena interativa")') &&
  viewerCode.includes('viewerSceneCopy("instruction", "Clique em um módulo ou use ←/→ e as teclas 1–7.")') &&
  viewerCode.includes('theme.getCopy("viewer.scene." + key, fallback)'),
"Viewer scene heading, instruction and selection caption use canonical keys with local fallbacks");
const sceneAdaptersCode = read("app/viewer/scene-adapters.js");
assert(['sceneCopy("accessibleInstruction", "Cena da cozinha. Use as setas para percorrer os módulos ou as teclas de 1 a 7 para selecionar pelo número.")', 'sceneCopy("imageAlt", "Composição da cozinha Casa em Módulos")', 'sceneCopy("hotspotsLabel", "Módulos selecionáveis na cena")', 'sceneCopy("fallbackStatus", "Imagem indisponível")', 'sceneCopy("fallbackDescription", "A composição completa da cozinha não pôde ser exibida.")', 'sceneCopy("fallbackAccessibleLabel", "Cena da cozinha indisponível. A composição completa não pôde ser exibida.")'].every(value => sceneAdaptersCode.includes(value)) &&
  sceneAdaptersCode.includes('theme.getCopy("viewer.scene." + key, fallback)'),
"Viewer scene image, accessible names, and unavailable-state copy use canonical keys with local fallbacks");
for (const [file, controller] of [
  ["app/index.html", "app/landing/landing.js"],
  ["app/how-it-works/index.html", "app/how-it-works/how-it-works.js"]
]) {
  const html = read(file), code = read(controller);
  assert(html.includes('aria-label="Abrir vídeo em tela cheia"') && html.includes('title="Abrir vídeo em tela cheia"'), file + " keeps the static fullscreen label when JavaScript is unavailable");
  assert(code.includes("window.CasaPublicVideoFullscreen.bind") && code.includes("window.CASA_UI_COPY.video.fullscreen"), controller + " delegates fullscreen behavior with canonical labels to the shared controller");
  assert(!code.includes("Abrir vídeo em tela cheia") && !code.includes("Sair da tela cheia"), controller + " does not duplicate catalog labels");
}
const sharedFullscreenCode = read("app/core/public-video-fullscreen.js");
assert(sharedFullscreenCode.includes("copy.close") && sharedFullscreenCode.includes("copy.open"), "shared fullscreen controller uses both labels supplied by the canonical catalog");
const publicMenuCode = read("app/landing/header-menu.js");
const privateMenuCode = read("app/core/private-navigation.js");
assert(publicMenuCode.includes('getCopy("navigation.menu." + copyKey, fallback)') &&
  publicMenuCode.includes('open ? "Fechar menu" : "Abrir menu"'), "public menu uses shared semantic keys with predictable fallback");
assert(privateMenuCode.includes('getCopy("navigation.menu." + copyKey, fallback)') &&
  privateMenuCode.includes('open ? "Fechar menu" : "Abrir menu"'), "private menu shares menu keys and fallback behavior");
assert(code.includes("function getCopy(path, fallback)") &&
  code.includes('COPY.schema !== COPY_SCHEMA') &&
  code.includes('typeof value === "string"'), "catalog resolver detects invalid schema and missing/non-string keys");
for (const file of ["app/index.html", "app/about/index.html", "app/how-it-works/index.html", "app/viewer/index.html"]) {
  assert(read(file).includes("header-menu.js?v=arc13-loc003-copy-1"), file + " busts the old public menu controller cache");
}
for (const file of ["app/access/index.html", "app/access/manage.html", "app/admin.html", "app/config/index.html"]) {
  assert(read(file).includes("private-navigation.bundle.js?v=arc13-loc003-copy-1"), file + " busts the old private menu bundle cache");
}
for (const file of [
  "app/index.html", "app/about/index.html", "app/how-it-works/index.html", "app/viewer/index.html",
  "app/access/index.html", "app/access/manage.html", "app/admin.html", "app/config/index.html"
]) {
  assert(read(file).includes('aria-label="Abrir menu"'), file + " keeps the static menu label as its no-JavaScript fallback");
}
const adminHeaderFallback = read("app/admin.html");
assert(adminHeaderFallback.includes(`aria-label="${copy.brand.homeLinkAriaLabel}"`), "Admin keeps the catalog-matched brand-link fallback");
assert(adminHeaderFallback.includes(`alt="${copy.brand.logoAlt}"`), "Admin keeps the catalog-matched logo alternative fallback");
assert(adminHeaderFallback.includes(`>${copy.brand.logoAlt}</strong>`), "Admin keeps the catalog-matched hidden brand fallback");
assert(adminHeaderFallback.includes(`>${copy.admin.shell.header.pageName}</small>`), "Admin keeps the catalog-matched page-name fallback");
assert(adminHeaderFallback.includes(`aria-label="${copy.admin.shell.header.menuLabel}"`), "Admin keeps the catalog-matched menu-landmark fallback");
const adminMaterialsFallback = read("app/admin.html");
const adminMaterialsCopyCode = read("app/admin/admin.js");
for (const [key, value] of Object.entries(copy.admin.materials.librarySection)) {
  assert(adminMaterialsFallback.includes(`data-admin-materials-copy="${key}">${value}</`), `Admin keeps the static ${key} fallback aligned with its catalog entry`);
}
assert(adminMaterialsCopyCode.includes('querySelectorAll("[data-admin-materials-copy]")') &&
  adminMaterialsCopyCode.includes("materialAvailabilityCopy.librarySection"), "Admin binds static materials-library copy from the canonical catalog");
const shells = [
  "app/index.html", "app/about/index.html", "app/how-it-works/index.html",
  "app/viewer/index.html", "app/access/index.html", "app/access/manage.html",
  "app/config/index.html", "app/admin.html"
];
for (const file of shells) {
  const html = read(file);
  const copyVersion = ["app/index.html", "app/about/index.html", "app/how-it-works/index.html"].includes(file)
    ? "arc13-loc004-comparison-copy-1"
    : file === "app/viewer/index.html"
      ? "arc13-loc005-scene-interaction-1"
    : file === "app/admin.html"
      ? "arc13-loc006-admin-materials-panel-copy-1"
    : "arc13-loc003-copy-1";
  assert(html.includes(`src="/core/ui-copy.js?v=${copyVersion}"`), file + " copy catalog bootstrap");
  assert(html.includes('src="/core/ui-theme.js?v=arc13-loc003-copy-1"'), file + " theme bootstrap");
  assert(html.indexOf("ui-copy.js") < html.indexOf("ui-theme.js"), file + " copy catalog before theme bootstrap");
  assert(html.includes('href="/ui-theme.css?'), file + " theme CSS");
  assert(html.indexOf("ui-theme.js") < html.indexOf("ui-theme.css"), file + " theme before stylesheet");
  if (file === "app/access/index.html") continue;
  assert(html.includes('href="/branding/favicon.ico"'), file + " favicon");
  assert(html.includes('href="/branding/apple-touch-icon.png"'), file + " apple touch icon");
  assert(html.includes("data-brand-variant"), file + " proper brand logo");
  assert(!html.includes('aria-hidden="true">▱</span>'), file + " no fake mark");
}
const themeCSS = read("app/ui-theme.css");
const adminCSS = read("app/admin/admin.css");
const configCSS = read("app/styles.css");
const hiddenRuleCount = (themeCSS.match(/\.visually-hidden\s*\{/g) || []).length;
assert.equal(hiddenRuleCount, 1, "shared theme owns one visually-hidden utility");
assert(!adminCSS.includes(".visually-hidden {") && !configCSS.includes(".visually-hidden {"),
  "route stylesheets do not duplicate the shared utility");
assert(configCSS.includes(".sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }"),
  "Config-only sr-only utility remains intact");
assert(read("app/admin.html").includes('<strong class="visually-hidden" data-admin-shell-copy="brand.logoAlt">Casa em Módulos</strong>'),
  "Admin keeps its visually-hidden brand text");
assert(read("app/config/index.html").includes('<h1 class="visually-hidden">Casa em Módulos</h1>'),
  "Config keeps a real visually-hidden page heading");
for (const file of ["app/admin.html", "app/config/index.html"]) {
  assert(read(file).includes('href="/ui-theme.css?v=arc03-fnd01-v1"'), file + " refreshes the shared utility cache for its consumer");
}
const navCSS = read("app/landing/landing.css");
assert(navCSS.includes('.site-header nav a[aria-current="page"]'), "shared active navigation styling");
for (const file of ["app/index.html", "app/about/index.html", "app/how-it-works/index.html"]) {
  assert(read(file).includes('aria-current="page"'), file + " active route announced");
}
assert(code.includes('.site-header .header-actions') &&
  code.includes('presentationActions.insertBefore(button, presentationActions.querySelector(".menu-toggle") || null)'),
  "presentation pages mount compact theme control inside their sticky header");
assert(code.includes('.viewer-heading > .eyebrow') &&
  !code.includes('.environment-feature:not([hidden])'), "only viewer uses contextual first-screen introduction");
assert(code.includes('contextRow.appendChild(contextEyebrow)') &&
  code.includes('contextRow.appendChild(button)'), "viewer eyebrow and toggle share a contextual row");
assert(code.includes("ui-theme-utility") && code.includes("header.parentNode.insertBefore(utility, header.nextSibling)"),
  "remaining functional fallback remains at top of page");
function privateHeaderOrder(hasRestoreControl) {
  const hooks = {};
  const order = hasRestoreControl ? ["restore", "menu"] : ["menu"];
  const restoreControl = hasRestoreControl ? {
    parentNode: null,
    insertAdjacentElement(position, element) {
      assert.equal(position, "afterend");
      order.splice(order.indexOf("restore") + 1, 0, "theme");
    }
  } : null;
  const actions = {
    firstChild: hasRestoreControl ? restoreControl : order[0],
    querySelector(selector) { return selector === "#restoreButton" ? restoreControl : null; },
    insertBefore(_element, reference) {
      assert.equal(reference, this.firstChild);
      order.unshift("theme");
    }
  };
  if (restoreControl) restoreControl.parentNode = actions;
  let themeButton = null;
  const document = {
    documentElement: { style: {}, setAttribute() {} },
    readyState: "loading",
    querySelector(selector) {
      if (selector === ".private-header__actions, .topbar__actions, .admin-topbar__actions") return actions;
      return null;
    },
    querySelectorAll(selector) { return selector === "[data-ui-theme-toggle]" && themeButton ? [themeButton] : []; },
    createElement(tag) {
      assert.equal(tag, "button");
      themeButton = {
        classList: { add() {} },
        setAttribute() {},
        addEventListener() {},
        querySelector() { return null; }
      };
      return themeButton;
    },
    addEventListener(name, handler) { hooks[name] = handler; }
  };
  const window = {
    CASA_UI_COPY: copy,
    localStorage: { getItem() { return null; } },
    addEventListener() {}
  };
  vm.runInNewContext(code, { window, document }, { filename: "app/core/ui-theme.js" });
  hooks.DOMContentLoaded();
  return order;
}
assert.deepEqual(privateHeaderOrder(true), ["restore", "theme", "menu"],
  "configurator theme control follows restore in both DOM and keyboard order");
assert.deepEqual(privateHeaderOrder(false), ["theme", "menu"],
  "admin keeps theme control before the menu when no restore control exists");
assert(themeCSS.includes('.ui-theme-context-row > .ui-theme-toggle') &&
  themeCSS.includes('min-height: 44px; min-width: 44px;'),
  "contextual control keeps the required 44px touch target");
assert(themeCSS.includes('.ui-theme-context-row .ui-theme-toggle__label-short'),
  "small-screen layout preserves a textual mode label");
assert(themeCSS.includes(".site-header .ui-theme-toggle--header") &&
  themeCSS.includes("@media (max-width: 1150px)"),
  "header theme control is compact across desktop/mobile");
// DS-01 #206: homologated variant A is dark-sheet + light geometry.
assert(themeCSS.includes('html[data-theme="dark"] .technical-view {') &&
  themeCSS.includes('background: #252622;') &&
  themeCSS.includes('stroke: #ddd5c9;'),
  "approved technical variant A is the default dark palette");
// DS-01 #205-#206: palette only, technical geometry and labels unchanged.
assert(themeCSS.includes('html[data-theme="dark"] .detail-row {') &&
  themeCSS.includes('background: var(--public-surface-soft);'), "dark detail cards use shell tokens");
assert(themeCSS.includes('html[data-theme="dark"] .technical-view {') &&
  themeCSS.includes('background: #252622;') && themeCSS.includes('stroke: #ddd5c9;'),
  "dark technical sheets use light strokes");
assert(themeCSS.includes('html[data-theme="dark"][data-technical-palette="neutral"] .technical-view {'),
  "previous marfim palette available for A/B");
assert(read("app/viewer/viewer.js").includes('search.get("technical") === "neutral"'),
  "query override does not modify technical drawing generator");
// Public presentation header and comparison align with already approved brand assets.
const how = read("app/how-it-works/index.html");
const about = read("app/about/index.html");
const howStyles = read("app/how-it-works/how-it-works.css");
assert(howStyles.includes('.integration-image-frame { display: block; position: relative; width: min(100%, 320px); height: auto; max-height: 160px; margin-inline: auto; aspect-ratio: 2 / 1; border-radius: 10px; }') &&
  howStyles.includes('.integration-image-frame > img { display: block; width: 100%; height: 100%; object-fit: contain; border-radius: inherit;') &&
  howStyles.includes('.integration-image-frame { width: min(100%, 250px); max-height: 125px; }'),
  "integration illustration box follows 900x450 original at both breakpoints so rounded corners clip the visible white rectangle");
assert(how.includes('class="header-cta" href="https://wa.me/"') &&
  how.includes('Fale conosco pelo WhatsApp') &&
  how.includes('src="/landing/assets/icons/ui/white/whatsapp.svg"'),
  "how-it-works contact CTA matches the shared public header");
assert(about.includes('href="https://wa.me/"'), "contact target matches existing public pages");
assert(!howStyles.includes('.how-page .header-cta span:first-child { display: none; }'),
  "how-it-works no longer replaces the WhatsApp contact icon with a bare arrow on mobile");
assert(how.includes('class="comparison-brand-logo" data-brand-variant') &&
  how.includes('data-src-light="/branding/logo-light-380.png"') &&
  how.includes('data-src-dark="/branding/logo-dark-380.png"') &&
  !how.includes('src="assets/comparacao-casa-em-modulos.svg"'),
  "comparison uses complete approved logos for both modes");
assert(themeCSS.includes('html[data-theme="dark"] .integration-callout {') &&
  themeCSS.includes('html[data-theme="dark"] .integration-callout p { color: var(--public-muted); }') &&
  themeCSS.includes('html[data-theme="dark"] .integration-callout img { mix-blend-mode: normal; }'),
  "dark integration card uses theme tokens without editing its image");
const landing = read("app/index.html");
assert(landing.includes('id="introSplash"') && landing.includes('logo-light-splash-1548.png'));
assert(landing.includes('id="environmentTrack"'));
assert(landing.includes('id="featureAvailability"') &&
  landing.includes("Visualização em breve") && landing.includes('id="featureImageFallback"'),
  "coming-soon and fallback present");
const landingJS = read("app/landing/landing.js");
const landingData = read("app/landing/data.js");
const landingSandbox = { window: {} };
vm.runInNewContext(landingData, landingSandbox);
assert.deepEqual(Array.from(landingSandbox.window.CASA_PUBLIC_LANDING.environments)
  .filter((environment) => Boolean(environment.destination)).map((environment) => environment.id),
  ["cozinha"], "only kitchen has an actual viewer destination");
assert(landingJS.includes("const version = ++selectionVersion") &&
  landingJS.includes("if (version !== selectionVersion) return") &&
  landingJS.includes("preparedFeatureImage(environment.featureImage)"),
  "decoded image required before updates; stale clicks ignored");
assert(landingJS.includes("featureImage.replaceWith(image)") &&
  landingJS.includes("featureAvailability.hidden = available") &&
  landingJS.includes("featureAction.hidden = !available"), "atomic availability and image switch");
assert(navCSS.includes(".feature-copy > p.feature-availability[hidden]") &&
  navCSS.includes(".feature-art #featureImage[hidden]"), "hidden state respects higher specificity");
assert(landing.includes('class="environment-art environment-art--feature"') &&
  landing.includes('id="featureImage"'), "feature composition retains the accessible interior image");
const sceneJS = read("app/landing/landing.js");
assert(sceneJS.includes('art.className = "environment-art"') &&
  sceneJS.includes('card.append(art, title, copy)'), "card composition shares the same wrapper");
assert(navCSS.includes(".environment-art::after") &&
  navCSS.includes('html[data-theme="dark"] .environment-art::after'), "frame is theme-dependent in CSS");
assert(!navCSS.includes('canvas('), "no runtime canvas or scene assets");
const names = ["cozinha", "sala", "quarto", "escritorio", "lavanderia"];
for (const name of names) for (const dimension of ["large", "small"]) {
  const file = "app/landing/assets/icons/" + dimension + "/" + name + ".webp";
  const bytes = fs.readFileSync(path.join(root, file));
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF", "webp RIFF signature: " + file);
  assert.equal(bytes.toString("ascii", 8, 12), "WEBP", "webp format signature: " + file);
}
for (const theme of ["light", "dark"]) {
  const svg = read("app/landing/assets/icons/frame-" + theme + ".svg");
  assert(svg.includes('viewBox="0 0 900 738"') && svg.includes('#AE5B09'),
    "approved SVG frame geometry and brand color: " + theme);
}
assert(read("app/about/index.html").includes('aria-controls="primaryNav"'));
assert(read("app/about/index.html").includes('header-menu.js'));
assert(read("app/admin.html").includes('id="loginForm"'));
assert(read("app/config/index.html").includes('id="restoreButton"'));

const expectedBlobs = {
  "app/branding/logo-light-380.png": "636b0e72187d6dc00d760dbce5f05d11c99cc5f4",
  "app/branding/logo-dark-380.png": "7b6391a2c003089f937a0c83ad767e495e36f187",
  "app/branding/logo-light-splash-1548.png": "8cec3ce04e8aec8fa57588b80de1b645268f3afe",
  "app/branding/logo-dark-splash-1548.png": "11a776419b62429f95813eeaaea32b395b87343b",
  "app/branding/favicon.ico": "b5e83a00d7900df9b56887bc3357dfbae58833bd",
  "app/branding/favicon-32.png": "47a89a6a3d04ad785884ae2e11b4f6f15a6b2107",
  "app/branding/apple-touch-icon.png": "67ff91be09892b10a4a3dd492ab63974d4d78361",
  "app/branding/android-chrome-192.png": "f7b17b47bd0830709569faea35d1cabf51a5faf2"
};
for (const [file, expected] of Object.entries(expectedBlobs)) {
  const bytes = fs.readFileSync(path.join(root, file));
  const hash = crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  assert.equal(hash, expected, "homologated asset unchanged: " + file);
}
function harness(osDark, initialMode, copyOverride) {
  const selectedCopy = arguments.length >= 3 ? copyOverride : copy;
  const saved = initialMode ? { "casa-ui-theme-mode-v1": initialMode } : {};
  const hooks = {};
  const warnings = [];
  const media = { matches: osDark, addEventListener: (name, cb) => { hooks["media:" + name] = cb; } };
  const attrs = {};
  const rootElement = { style: {}, setAttribute: (k,v) => { attrs[k] = v; } };
  const images = [];
  const themeLabels = { full: { textContent: "" }, short: { textContent: "" } };
  const themeButton = {
    setAttribute(k,v) { attrs["button:" + k] = v; },
    querySelector(selector) {
      if (selector === ".ui-theme-toggle__label-long") return themeLabels.full;
      if (selector === ".ui-theme-toggle__label-short") return themeLabels.short;
      return null;
    }
  };
  const document = {
    documentElement: rootElement,
    readyState: "loading",
    querySelectorAll(selector) {
      if (selector === "img[data-brand-variant]") return images;
      if (selector === "[data-ui-theme-toggle]") return [themeButton];
      return [];
    },
    querySelector() { return null; },
    addEventListener(name, fn) { hooks["doc:" + name] = fn; }
  };
  const window = {
    CASA_UI_COPY: selectedCopy,
    console: { warn(message) { warnings.push(message); } },
    matchMedia() { return media; },
    localStorage: { getItem(k) { return saved[k] || null; }, setItem(k,v) { saved[k] = v; } },
    addEventListener(name, fn) { hooks["win:" + name] = fn; }
  };
  vm.runInNewContext(code, { window, document }, { filename: "app/core/ui-theme.js" });
  return { hooks, media, attrs, saved, window, images, themeLabels, warnings };
}
const missingCatalog = harness(false, null, undefined);
assert.equal(missingCatalog.window.CASA_UI_THEME.getMode(), "auto", "theme initializes without the catalog");
assert.equal(missingCatalog.attrs["data-theme"], "light", "theme still applies its resolved palette without the catalog");
assert.equal(missingCatalog.attrs["button:aria-label"], "Tema atual: Automático. Ativar Claro.");
assert.equal(missingCatalog.attrs["button:title"], "Tema: Automático (próximo: Claro)");
assert.equal(missingCatalog.themeLabels.full.textContent, "Automático");
assert(missingCatalog.warnings.length >= 1, "missing catalog is diagnosed");
const invalidSchema = harness(false, null, { schema: "other", locale: "pt-BR" });
assert.equal(invalidSchema.attrs["button:aria-label"], "Tema atual: Automático. Ativar Claro.", "invalid schema selects the predictable fallback");
const missingThemeKeys = JSON.parse(JSON.stringify(copy));
delete missingThemeKeys.theme.mode.auto.short;
delete missingThemeKeys.theme.toggle.ariaLabel;
missingThemeKeys.theme.mode.dark = "   ";
const fallbackForThemeKeys = harness(false, null, missingThemeKeys);
assert.equal(fallbackForThemeKeys.themeLabels.short.textContent, "Auto", "missing short mode label falls back by key");
assert.equal(fallbackForThemeKeys.attrs["button:aria-label"], "Tema atual: Automático. Ativar Claro.", "missing aria template falls back by key");
assert.equal(fallbackForThemeKeys.window.CASA_UI_THEME.getCopy("theme.mode.dark", "Escuro"), "Escuro", "blank copy falls back by key");
const missingMenuKey = harness(false, null);
assert.equal(missingMenuKey.window.CASA_UI_THEME.getCopy("navigation.menu.close", "Fechar menu"), "Fechar menu");
const missingMenuCopy = JSON.parse(JSON.stringify(copy));
delete missingMenuCopy.navigation.menu.close;
const fallbackForMenuKey = harness(false, null, missingMenuCopy);
assert.equal(fallbackForMenuKey.window.CASA_UI_THEME.getCopy("navigation.menu.close", "Fechar menu"), "Fechar menu", "missing menu key selects its explicit fallback");
assert(fallbackForMenuKey.warnings.some((message) => message.includes("navigation.menu.close")), "missing menu key is diagnosed");
function publicMenuHarness(themeService) {
  const handlers = {};
  const attributes = { "aria-expanded": "false" };
  const toggle = {
    closest() { return null; },
    getAttribute(name) { return attributes[name]; },
    setAttribute(name, value) { attributes[name] = value; },
    addEventListener(name, handler) { handlers["toggle:" + name] = handler; }
  };
  const nav = {
    contains() { return false; },
    querySelector() { return null; },
    addEventListener(name, handler) { handlers["nav:" + name] = handler; }
  };
  const document = {
    body: { classList: { toggle() {} } },
    activeElement: null,
    getElementById(id) { return id === "menuToggle" ? toggle : id === "primaryNav" ? nav : null; },
    addEventListener(name, handler) { handlers["document:" + name] = handler; }
  };
  const window = { CASA_UI_THEME: themeService, matchMedia() { return { matches: false, addEventListener() {} }; } };
  vm.runInNewContext(publicMenuCode, { window, document, Element: function Element() {} }, { filename: "app/landing/header-menu.js" });
  handlers["toggle:click"]({ detail: 1 });
  assert.equal(attributes["aria-label"], "Fechar menu", "menu without theme/catalog uses its open-state fallback");
  handlers["toggle:click"]({ detail: 1 });
  assert.equal(attributes["aria-label"], "Abrir menu", "menu without theme/catalog uses its closed-state fallback");
}
publicMenuHarness(undefined);
const darkDefault = harness(true);
assert.equal(darkDefault.window.CASA_UI_THEME.getMode(), "auto");
assert.equal(darkDefault.window.CASA_UI_THEME.getResolved(), "dark");
assert.equal(darkDefault.attrs["data-theme"], "dark");
assert.equal(darkDefault.attrs["button:aria-label"], "Tema atual: Automático. Ativar Claro.");
assert.equal(darkDefault.attrs["button:title"], "Tema: Automático (próximo: Claro)");
assert.equal(darkDefault.themeLabels.full.textContent, "Automático");
assert.equal(darkDefault.themeLabels.short.textContent, "Auto");
assert.equal(Object.keys(darkDefault.saved).length, 0, "auto default must not persist");
assert.equal(darkDefault.window.CASA_UI_THEME.setMode("light"), true);
assert.equal(darkDefault.attrs["data-theme"], "light");
assert.equal(darkDefault.attrs["button:aria-label"], "Tema atual: Claro. Ativar Escuro.");
assert.equal(darkDefault.attrs["button:title"], "Tema: Claro (próximo: Escuro)");
assert.equal(darkDefault.saved["casa-ui-theme-mode-v1"], "light");
assert.equal(darkDefault.window.CASA_UI_THEME.setMode("invalid"), false);
assert.equal(darkDefault.attrs["data-theme"], "light");
darkDefault.hooks["win:storage"]({ key: "casa-ui-theme-mode-v1", newValue: "auto" });
assert.equal(darkDefault.attrs["data-theme"], "dark");
darkDefault.media.matches = false;
darkDefault.hooks["media:change"]();
assert.equal(darkDefault.attrs["data-theme"], "light");
const lightSaved = harness(true, "light");
assert.equal(lightSaved.attrs["data-theme"], "light", "explicit wins over OS");
lightSaved.media.matches = false;
lightSaved.hooks["media:change"]();
assert.equal(lightSaved.window.CASA_UI_THEME.getMode(), "light");
const attributes = {
  "data-src-light": "/branding/logo-light-380.png",
  "data-src-dark": "/branding/logo-dark-380.png",
  src: "/branding/logo-light-380.png"
};
darkDefault.images.push({getAttribute(k) {return attributes[k];},setAttribute(k,v) {attributes[k]=v;}});
darkDefault.window.CASA_UI_THEME.setMode("dark");
assert.equal(attributes.src, "/branding/logo-dark-380.png");
assert.equal(darkDefault.attrs["button:aria-label"], "Tema atual: Escuro. Ativar Automático.");
assert.equal(darkDefault.attrs["button:title"], "Tema: Escuro (próximo: Automático)");
assert.equal(darkDefault.themeLabels.full.textContent, "Escuro");
assert.equal(darkDefault.themeLabels.short.textContent, "Escuro");
darkDefault.window.CASA_UI_THEME.setMode("light");
assert.equal(attributes.src, "/branding/logo-light-380.png");
console.log("DS-01 asset hashes, eight shells, catalog-backed theme labels, theme auto/explicit/sync and image switching: PASS");
