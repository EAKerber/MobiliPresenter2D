(function () {
  "use strict";
  const data = window.CASA_PUBLIC_VIEWER;
  const root = document.getElementById("viewerLayout");
  const renderers = new Map();
  const requestedModuleId = new URLSearchParams(window.location.search).get("module");
  const integration = window.CASA_PUBLIC_VIEWER_INTEGRATION || {};
  // Deep links override initial selection; otherwise the adapter derives it from visible data.
  const adapter = window.CASA_PUBLIC_SCENE_ADAPTERS.create({
    ...(integration.repository || {}),
    initialSelectedId: requestedModuleId || undefined,
    onSelectionChange: null
  });
  let currentView = 0;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function section(id, className, title, subtitle) {
    const block = element("section", `viewer-block ${className}`); block.id = `block-${id}`;
    if (title) {
      const heading = element("div", "block-heading");
      const left = element("div"); left.append(element("h2", "", title));
      if (subtitle) left.append(element("p", "", subtitle));
      heading.append(left); block.append(heading);
    }
    return block;
  }
  function valueFor(module, key) { return key.split(".").reduce((value, part) => value?.[part], module); }

  function renderOverview(target, module) {
    target.replaceChildren();
    target.append(element("p", "module-kicker", `${module.category} · Módulo ${module.number}`));
    target.append(element("h2", "overview-title", module.title));
    if (module.benefits?.length) {
      const highlights = element("ul", "overview-highlights");
      module.benefits.forEach((item) => highlights.append(element("li", "", item)));
      target.append(highlights);
    }
    if (module.description) target.append(element("p", "overview-summary", module.description));
    if (module.dimensionLabel) target.append(element("p", "dimension-pill", module.dimensionLabel));
  }

  function renderViews(target, module) {
    const stage = target.querySelector(".view-stage");
    const counter = target.querySelector(".view-counter");
    const nav = target.querySelector(".mobile-view-nav");
    stage.replaceChildren(); nav.replaceChildren();
    const keys = module.views?.length ? module.views : ["front", "side", "isometric"];
    currentView = Math.min(currentView, keys.length - 1);
    keys.forEach((key, index) => {
      const spec = data.viewTypes[key] || data.viewTypes.isometric;
      const entity = adapter.getSceneEntity(module.id);
      const view = window.CASA_PUBLIC_TECHNICAL_VIEWS.render(module, spec.kind, spec.label, entity, entity && adapter.getAssetUrl(entity.asset), adapter.getSceneCanvas());
      view.classList.toggle("is-current", index === currentView); view.setAttribute("aria-current", String(index === currentView));
      stage.append(view);
      const dot = element("button"); dot.type = "button"; dot.setAttribute("aria-label", `Mostrar vista ${index + 1}`); dot.setAttribute("aria-current", String(index === currentView));
      dot.addEventListener("click", () => { currentView = index; syncViewNavigation(keys.length); }); nav.append(dot);
    });
    counter.textContent = `${currentView + 1} / ${keys.length}`;
    const previous = target.querySelector("[data-view-previous]"); const next = target.querySelector("[data-view-next]");
    stage.style.setProperty("--view-count", String(keys.length));
    previous.disabled = keys.length < 2; next.disabled = keys.length < 2;
    previous.onclick = () => { currentView = (currentView - 1 + keys.length) % keys.length; syncViewNavigation(keys.length); };
    next.onclick = () => { currentView = (currentView + 1) % keys.length; syncViewNavigation(keys.length); };
    function syncViewNavigation(count) {
      counter.textContent = `${currentView + 1} / ${count}`;
      [...nav.children].forEach((dot, index) => dot.setAttribute("aria-current", String(index === currentView)));
      [...stage.children].forEach((view, index) => {
        view.classList.toggle("is-current", index === currentView);
        view.setAttribute("aria-current", String(index === currentView));
      });
      stage.children[currentView]?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest", inline: "start" });
    }
  }

  function renderDetails(target, module) {
    const grid = target.querySelector(".detail-grid"); grid.replaceChildren();
    const sections = data.detailLayout.filter((descriptor) => {
      const value = valueFor(module, descriptor.source);
      return Array.isArray(value) ? value.length > 0 : value != null && value !== "";
    });
    const hasRequirements = (module.requirements || []).length > 0;
    grid.classList.toggle("detail-grid--has-requirements", hasRequirements);
    sections.forEach((descriptor) => {
      const value = valueFor(module, descriptor.source);
      const panel = element("section", `detail-panel detail-panel--${descriptor.id}`);
      panel.append(element("h3", "", descriptor.title));
      const list = element("ul", "detail-list");
      (Array.isArray(value) ? value : [value]).forEach((item) => {
        const row = element("li", "detail-row");
        const icon = element("img"); icon.src = descriptor.placeholder; icon.alt = ""; icon.loading = "lazy";
        row.append(icon, element("span", "", item)); list.append(row);
      });
      panel.append(list); grid.append(panel);
    });
  }

  renderers.set("overview", (module) => renderOverview(root.querySelector("#block-overview"), module));
  renderers.set("scene", (module) => { root.querySelector("#sceneSelection").textContent = `Selecionado: ${module.number} · ${module.title}`; });
  renderers.set("views", (module) => renderViews(root.querySelector("#block-views"), module));
  renderers.set("details", (module) => renderDetails(root.querySelector("#block-details"), module));

  data.layout.forEach((blockId) => {
    if (blockId === "overview") {
      const block = section("overview", "block-overview"); block.setAttribute("aria-live", "polite"); root.append(block);
    } else if (blockId === "scene") {
      const block = section("scene", "block-scene", "Cena interativa", "Clique em um módulo ou use ←/→ e as teclas 1–7.");
      const stage = element("div", "scene-stage"); stage.id = "sceneStage";
      const caption = element("div", "scene-caption"); caption.id = "sceneSelection";
      block.append(stage, caption); root.append(block); adapter.mount(stage);
    } else if (blockId === "views") {
      const block = section("views", "block-views", "Vistas técnicas", "Desenhos orientativos a partir das dimensões disponíveis.");
      const controls = element("div", "view-controls");
      const previous = element("button", "", "←"); previous.type = "button"; previous.dataset.viewPrevious = ""; previous.setAttribute("aria-label", "Vista anterior");
      const counter = element("span", "view-counter", "1 / 1");
      const next = element("button", "", "→"); next.type = "button"; next.dataset.viewNext = ""; next.setAttribute("aria-label", "Próxima vista");
      controls.append(previous, counter, next); block.querySelector(".block-heading").append(controls);
      block.append(element("div", "view-stage"), element("div", "mobile-view-nav")); root.append(block);
    } else if (blockId === "details") {
      const block = section("details", "block-details", "Detalhes do módulo", "Informações organizadas para consulta rápida.");
      block.append(element("div", "detail-grid")); root.append(block);
    }
  });

  adapter.subscribe(({ moduleId: id, module }) => {
    currentView = 0;
    renderers.get("overview")(module); renderers.get("scene")(module); renderers.get("views")(module); renderers.get("details")(module);
    // The scene adapter owns the hotspot's selected/pressed state. Do not
    // overwrite it from a second DOM loop with a different attribute key.
    integration.onSelectionChange?.({ moduleId: id, module, entity: adapter.getSceneEntity(id) });
  });
  const initial = adapter.getSelectedModule();
  renderers.get("overview")(initial); renderers.get("scene")(initial); renderers.get("views")(initial); renderers.get("details")(initial);
  integration.onSelectionChange?.(adapter.getSelection());
})();
