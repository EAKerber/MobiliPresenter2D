import {
  acceptInvite,
  getUser,
  handleAuthCallback,
  login,
  logout,
  onAuthChange,
  requestPasswordRecovery,
  recoverPassword,
  updateUser
} from "@netlify/identity";

const settingsDefaults = window.CASA_EM_MODULOS_CONFIGURATOR_DEFAULTS;
const catalog = window.CASA_EM_MODULOS_CATALOG;
const priceBook = window.CASA_EM_MODULOS_PRICE_BOOK;
const scene = window.CASA_EM_MODULOS_SCENE;
const defaults = window.CasaModulesConfiguration.createDefaultAdministration(settingsDefaults, catalog, priceBook, scene);
const byId = (id) => document.getElementById(id);
const loginPanel = byId("loginPanel");
const deniedPanel = byId("deniedPanel");
const editorPanel = byId("editorPanel");
const loginForm = byId("loginForm");
const loginMessage = byId("loginMessage");
const passwordActionForm = byId("passwordActionForm");
const stagesList = byId("stagesList");
const objectsList = byId("objectsList");
const finishesList = byId("finishesList");
const pricingList = byId("pricingList");
const objectAssetsList = byId("objectAssetsList");
const materialsList = byId("materialsList");
const materialGroupsList = byId("materialGroupsList");
const dependenciesList = byId("dependenciesList");
const eventsList = byId("eventsList");
const saveButton = byId("saveButton");
const saveMessage = byId("saveMessage");
const logoutButton = byId("logoutButton");
let model = structuredClone(defaults);
let inviteToken = null;
let recoveryToken = null;
let selectedObjectIndex = 0;
let selectedObjectTab = "content";
let materialPageIndex = 0;
let materialTargetPageIndex = 0;
let finishAvailabilityPage = 0;
let materialAvailabilityPage = 0;
let selectedMaterialTarget = "fronts-all";
const MATERIALS_PER_PAGE = 4;

const labels = {
  "fronts-all": "Cor das frentes",
  "handles-all": "Puxadores",
  "stone-all": "Pacote de pedra",
  "lighting-08": "Iluminação embutida",
  "move-stone": "Mover pedra",
  "tempered-glass": "Vidro temperado",
  summary: "Resumo da composição"
};

const priceSections = [
  ["entries", "Valores de módulos e acessórios", "item"],
  ["handleEntries", "Puxadores", "handle"],
  ["frontFinishRatesBps", "Adicional por acabamento", "rate"],
  ["localEntries", "Adicionais locais", "local"],
  ["globalEntries", "Adicionais globais", "global"]
];

function setMessage(element, message, kind = "") {
  element.textContent = message;
  element.dataset.kind = kind;
}

function isAdmin(user) {
  const roles = [...(user?.roles || []), ...(user?.app_metadata?.roles || [])];
  return roles.includes("admin");
}

function getItemOptions(stageId) {
  const stage = model.stages.find((item) => item.id === stageId);
  const kind = stage?.kind || stage?.id;
  const registry = window.CasaModulesConfiguration.itemRegistry(catalog);
  const allowed = kind === "modules" ? new Set(["module"])
    : kind === "finishes" ? new Set(["finish-group"])
      : kind === "services" ? new Set(["service", "object"])
        : kind === "custom" ? new Set(["module", "object", "service"])
          : kind === "summary" ? new Set(["summary"]) : new Set();
  return [...registry].filter(([id, type]) => {
    const service = catalog.services.find((item) => item.id === id);
    return Array.isArray(service?.stageKinds) ? service.stageKinds.includes(kind) : allowed.has(type);
  }).map(([id]) => {
    const module = catalog.modules.find((item) => item.entityId === id);
    const entry = [...catalog.accessories, ...catalog.services].find((item) => item.entityId === id || item.id === id);
    return { id, label: module ? `${module.referenceLabel} · ${model.objects[id]?.title || module.title}` : model.objects[id]?.title || entry?.title || labels[id] || id };
  });
}

function moveStageItem(itemId, destinationId) {
  const destination = destinationId ? model.stages.find((stage) => stage.id === destinationId) : null;
  const source = model.stages.find((stage) => stage.items.includes(itemId));
  if (destinationId && !destination) return;
  if (source?.id === destination?.id) return;

  const movingIds = [itemId];
  if (itemId === "stone-all" && model.stages.some((stage) => stage.enabled && stage.items.includes("stone-skirting"))) movingIds.push("stone-skirting");
  if (itemId === "stone-skirting" && !model.stages.some((stage) => stage.enabled && stage.items.includes("stone-all"))) {
    return setMessage(saveMessage, "Inclua a pedra antes de adicionar o rodapé.", "error");
  }
  if (destination && movingIds.some((id) => !getItemOptions(destination.id).some((item) => item.id === id))) {
    return setMessage(saveMessage, "Esta etapa não aceita todos os itens selecionados para mover.", "error");
  }

  const sourceCounts = new Map();
  movingIds.forEach((id) => {
    const owner = model.stages.find((stage) => stage.items.includes(id));
    if (owner) sourceCounts.set(owner, (sourceCounts.get(owner) || 0) + 1);
  });
  const emptied = [...sourceCounts].find(([stage, count]) => stage.enabled && stage.items.length <= count);
  if (emptied) return setMessage(saveMessage, `A etapa “${emptied[0].label}” precisa manter ao menos um item enquanto estiver ativa.`, "error");

  movingIds.forEach((id) => {
    model.stages.forEach((stage) => { stage.items = stage.items.filter((item) => item !== id); });
    if (destination) destination.items.push(id);
  });
  renderStages();
}

function renderStages() {
  stagesList.replaceChildren();
  const assigned = new Set(model.stages.flatMap((stage) => stage.items));
  const availableById = new Map();
  model.stages.forEach((stage) => getItemOptions(stage.id).forEach((item) => {
    if (!assigned.has(item.id)) {
      const entry = availableById.get(item.id) || { ...item, stageIds: [] };
      entry.stageIds.push(stage.id);
      availableById.set(item.id, entry);
    }
  }));
  const availableItems = document.createElement("section");
  availableItems.className = "stage-unassigned";
  availableItems.setAttribute("aria-label", "Itens do catálogo sem etapa");
  const availableHeading = document.createElement("h2");
  availableHeading.textContent = "Itens disponíveis";
  const availableHint = document.createElement("p");
  availableHint.className = "admin-note";
  availableHint.textContent = "Arraste um item para uma etapa compatível. Arraste itens entre etapas para movê-los.";
  const availableGrid = document.createElement("div");
  availableGrid.className = "stage-unassigned__items";
  availableById.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "stage-pool-item";
    chip.draggable = true;
    chip.dataset.dragStageItem = item.id;
    chip.dataset.allowedStageIds = item.stageIds.join(" ");
    chip.title = "Arraste para uma etapa compatível";
    chip.textContent = item.label;
    availableGrid.append(chip);
  });
  if (!availableById.size) {
    const empty = document.createElement("span"); empty.className = "admin-note"; empty.textContent = "Todos os itens compatíveis já estão em etapas."; availableGrid.append(empty);
  }
  availableItems.append(availableHeading, availableHint, availableGrid);
  stagesList.append(availableItems);
  model.stages.forEach((stage, index) => {
    const card = document.createElement("article");
    card.className = "stage-card";

    const top = document.createElement("div");
    top.className = "stage-card__top";
    const number = document.createElement("span");
    number.className = "stage-card__number";
    number.textContent = String(index + 1).padStart(2, "0");

    const nameLabel = document.createElement("label");
    nameLabel.className = "stage-name";
    nameLabel.append(document.createTextNode("Nome da etapa"));
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 32;
    nameInput.value = stage.label;
    nameInput.dataset.stageLabel = stage.id;
    nameInput.setAttribute("aria-label", `Nome da etapa ${stage.label}`);
    nameLabel.append(nameInput);

    const order = document.createElement("div");
    order.className = "stage-order";
    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "↑";
    up.title = "Mover etapa para cima";
    up.setAttribute("aria-label", `Mover ${stage.label} para cima`);
    up.disabled = index === 0;
    up.dataset.moveStage = `${stage.id}:-1`;
    const down = document.createElement("button");
    down.type = "button";
    down.textContent = "↓";
    down.title = "Mover etapa para baixo";
    down.setAttribute("aria-label", `Mover ${stage.label} para baixo`);
    down.disabled = index === model.stages.length - 1;
    down.dataset.moveStage = `${stage.id}:1`;
    order.append(up, down);

    const actions = document.createElement("div");
    actions.className = "stage-card__actions";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button button--secondary";
    remove.textContent = "Remover etapa";
    remove.dataset.removeStage = stage.id;
    remove.disabled = ["modules", "summary"].includes(stage.kind || stage.id);
    actions.append(remove);

    const enabledLabel = document.createElement("label");
    enabledLabel.className = "switch";
    const enabledInput = document.createElement("input");
    enabledInput.type = "checkbox";
    enabledInput.checked = stage.enabled;
    enabledInput.dataset.stageEnabled = stage.id;
    enabledInput.disabled = stage.id === "modules" || stage.id === "summary" || stage.items.length === 0;
    enabledInput.setAttribute("aria-label", `Ativar etapa ${stage.label}`);
    enabledLabel.append(enabledInput, document.createTextNode(stage.enabled ? "Ativa" : "Inativa"));
    top.append(number, nameLabel, order, actions, enabledLabel);
    card.append(top);

    const items = document.createElement("div");
    items.className = "stage-items";
    items.setAttribute("aria-label", `Itens da etapa ${stage.label}`);
    items.dataset.stageDrop = stage.id;
    stage.items.map((id) => getItemOptions(stage.id).find((item) => item.id === id)).filter(Boolean).forEach((item) => {
      const option = document.createElement("div");
      option.className = "item-option";
      option.draggable = true;
      option.dataset.dragStageItem = item.id;
      option.title = "Arraste para outra etapa compatível";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = true;
      input.dataset.stageItem = stage.id;
      input.value = item.id;
      input.disabled = stage.enabled && stage.items.length === 1;
      input.setAttribute("aria-label", item.label);
      const itemLabel = document.createElement("label"); itemLabel.append(input, document.createTextNode(item.label));
      option.append(itemLabel);
      if (["module", "object"].includes(window.CasaModulesConfiguration.itemRegistry(catalog).get(item.id))) {
        const initial = document.createElement("input");
        initial.type = "checkbox";
        initial.checked = Boolean(model.initialState.entities[item.id]);
        initial.dataset.initialEntity = item.id;
        initial.setAttribute("aria-label", `${item.label}: ativo inicialmente`);
        const initialLabel = document.createElement("label"); initialLabel.className = "initial-state-option"; initialLabel.append(initial, document.createTextNode("Iniciar ativo"));
        option.append(initialLabel);
      } else if (["service"].includes(window.CasaModulesConfiguration.itemRegistry(catalog).get(item.id))) {
        const initial = document.createElement("input"); initial.type = "checkbox"; initial.checked = model.initialState.services.includes(item.id); initial.dataset.initialService = item.id;
        const initialLabel = document.createElement("label"); initialLabel.className = "initial-state-option"; initialLabel.append(initial, document.createTextNode("Iniciar ativo")); option.append(initialLabel);
      }
      items.append(option);
    });
    if (!stage.items.length) {
      const dropHint = document.createElement("p"); dropHint.className = "stage-drop-hint"; dropHint.textContent = "Solte aqui um item disponível."; items.append(dropHint);
    }
    card.append(items);
    stagesList.append(card);
  });
  const stageKindInput = byId("stageKindInput");
  [...stageKindInput.options].forEach((option) => {
    option.disabled = option.value !== "custom" && model.stages.some((stage) => (stage.kind || stage.id) === option.value);
  });
}

function makeField(labelText, value, name, multiline = false) {
  const label = document.createElement("label");
  label.className = "data-field";
  label.append(document.createTextNode(labelText));
  const input = document.createElement(multiline ? "textarea" : "input");
  if (!multiline) input.type = "text";
  input.value = multiline ? (value || []).join("\n") : value || "";
  input.dataset[name] = "true";
  if (multiline) input.rows = 3;
  label.append(input);
  return label;
}

function catalogObjects() {
  return [
    ...catalog.modules.map((item) => ({ id: item.entityId, label: `${item.referenceLabel} · ${item.title}` })),
    ...catalog.accessories.map((item) => ({ id: item.entityId, label: item.title })),
    ...catalog.services.map((item) => ({ id: item.id, label: item.title })),
    ...catalog.options.handles.map((item) => ({ id: item.id, label: `Puxador · ${item.label}` })),
    ...catalog.options.stonePackages.map((item) => ({ id: item.id, label: `Pedra · ${item.label}` }))
  ];
}

function assetChoices(field) {
  const values = new Set();
  scene.entities.forEach((entity) => {
    if (field === "imageAsset" && entity.asset) values.add(entity.asset);
    if (field === "maskAsset") {
      if (entity.maskAsset) values.add(entity.maskAsset);
      (entity.finishMaskVariants || []).forEach((variant) => { if (variant.maskAsset) values.add(variant.maskAsset); });
    }
  });
  return [...values].sort();
}

function renderObjectSelector() {
  const options = catalogObjects();
  const selector = byId("objectSelector");
  selector.replaceChildren();
  options.forEach((item, index) => {
    const option = document.createElement("option"); option.value = String(index); option.textContent = item.label; selector.append(option);
  });
  selectedObjectIndex = Math.max(0, Math.min(selectedObjectIndex, options.length - 1));
  selector.value = String(selectedObjectIndex);
  byId("objectPrevious").disabled = selectedObjectIndex === 0;
  byId("objectNext").disabled = selectedObjectIndex >= options.length - 1;
}

function renderObjects() {
  objectsList.replaceChildren();
  renderObjectSelector();
  const { id, label } = catalogObjects()[selectedObjectIndex];
  const data = model.objects[id];
  const card = document.createElement("article");
  card.className = "editor-card object-editor-card";
  const heading = document.createElement("h2"); heading.textContent = label;
  card.append(heading,
    makeField("Nome público", data.title, "objectTitle"),
    makeField("Descrição", data.description, "objectDescription"),
    makeField("Destaques (um por linha)", data.benefits, "objectBenefits", true),
    makeField("Componentes (um por linha)", data.components, "objectComponents", true),
    makeField("Requisitos (um por linha)", data.requirements, "objectRequirements", true));
  const handleProduct = model.handleProducts.find((item) => item.priceEntryId === id);
  if (handleProduct) {
    const section = document.createElement("section"); section.className = "handle-colors";
    const title = document.createElement("h3"); title.textContent = "Materiais deste puxador";
    const note = document.createElement("p"); note.className = "admin-note";
    note.textContent = handleProduct.materialIds.map((materialId) => model.materials.find((item) => item.id === materialId)?.label).filter(Boolean).join(" · ") || "Nenhum material associado. Configure a lista na aba Cores e acabamentos.";
    section.append(title, note); card.append(section);
  }
  card.dataset.objectId = id;
  objectsList.append(card);
  renderObjectAssets(id, label);
}

function renderObjectAssets(id, label) {
  objectAssetsList.replaceChildren();
  const assets = model.objectAssets[id] || { imageAsset: "", detailImageAsset: "", maskAsset: "" };
  const card = document.createElement("article"); card.className = "editor-card"; card.dataset.assetObjectId = id;
  const heading = document.createElement("h2"); heading.textContent = `${label} · arquivos da cena`;
  card.append(heading);
  const hasSceneEntity = scene.entities.some((entity) => entity.id === id);
  [["imageAsset", "Imagem da cena", assetChoices("imageAsset")], ["detailImageAsset", "Imagem dos detalhes", assetChoices("imageAsset")], ["maskAsset", "Máscara de acabamento", assetChoices("maskAsset")]].forEach(([field, title, choices]) => {
    const labelNode = document.createElement("label"); labelNode.className = "data-field"; labelNode.append(document.createTextNode(title));
    const select = document.createElement("select"); select.dataset.objectAsset = field;
    const empty = document.createElement("option"); empty.value = ""; empty.textContent = "Usar o padrão / sem máscara"; select.append(empty);
    choices.forEach((path) => { const option = document.createElement("option"); option.value = path; option.textContent = path; select.append(option); });
    select.value = assets[field] || ""; select.disabled = !hasSceneEntity; labelNode.append(select);
    const previewPath = assets[field] || (field !== "maskAsset" ? scene.entities.find((entity) => entity.id === id)?.asset || "" : "");
    const preview = document.createElement("div"); preview.className = `asset-preview${field === "maskAsset" ? " asset-preview--mask" : ""}`;
    if (previewPath) {
      const image = document.createElement("img"); image.src = previewPath; image.alt = `${title} · ${label}`; image.loading = "lazy"; image.decoding = "async";
      image.addEventListener("error", () => { preview.textContent = "Prévia indisponível"; }, { once: true }); preview.append(image);
    } else { const empty = document.createElement("span"); empty.textContent = "Sem máscara · usar o recorte padrão"; preview.append(empty); }
    labelNode.append(preview); card.append(labelNode);
  });
  const note = document.createElement("p"); note.className = "admin-note"; note.textContent = hasSceneEntity ? "A lista contém apenas arquivos já presentes na cena. O painel não carrega arquivos novos nem permite caminhos externos." : "Este item não possui camada visual própria na cena. Configure cores e texturas na biblioteca de materiais.";
  card.append(note); objectAssetsList.append(card);
}

function renderFinishes() {
  finishesList.replaceChildren();
  const globalOptions = model.finishes.filter((item) => item.scope === "global" && item.enabled).length;
  const pages = Math.max(1, Math.ceil(model.finishes.length / MATERIALS_PER_PAGE));
  finishAvailabilityPage = Math.min(finishAvailabilityPage, pages - 1);
  const page = model.finishes.slice(finishAvailabilityPage * MATERIALS_PER_PAGE, (finishAvailabilityPage + 1) * MATERIALS_PER_PAGE);
  page.forEach((finish) => {
    const source = model.materials.find((item) => item.id === finish.id);
    if (!source || !model.materialGroups.find((group) => group.id === "fronts-all")?.materialIds.includes(finish.id)) return;
    const card = document.createElement("article");
    card.className = "editor-card finish-admin-card";
    const heading = document.createElement("h2");
    heading.textContent = source.label;
    const swatch = document.createElement("span");
    swatch.className = "admin-color-swatch";
    swatch.style.backgroundColor = source.color;
    if (source.textureAsset) swatch.style.backgroundImage = `url("${source.textureAsset}")`;
    const active = document.createElement("label");
    active.className = "switch";
    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.checked = finish.enabled;
    enabled.disabled = finish.scope === "global" && finish.enabled && globalOptions === 1;
    enabled.dataset.finishEnabled = finish.id;
    active.append(enabled, document.createTextNode("Disponível para clientes"));
    const scopeLabel = document.createElement("label");
    scopeLabel.className = "data-field";
    scopeLabel.append(document.createTextNode("Aplicação"));
    const scope = document.createElement("select");
    scope.dataset.finishScope = finish.id;
    [["global", "Global · conjunto todo"], ["local", "Local · módulo individual"]].forEach(([value, label]) => {
      const option = document.createElement("option"); option.value = value; option.textContent = label;
      option.disabled = value === "local" && finish.enabled && finish.scope === "global" && globalOptions === 1;
      scope.append(option);
    });
    scope.value = finish.scope;
    scopeLabel.append(scope);
    card.append(swatch, heading, active, scopeLabel);
    if (finish.scope === "local") {
      const modules = document.createElement("div");
      modules.className = "finish-module-options";
      modules.setAttribute("aria-label", `Módulos que aceitam ${source.label}`);
      catalog.modules.forEach((module) => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = finish.moduleIds.includes(module.entityId);
        input.disabled = input.checked && finish.moduleIds.length === 1;
        input.dataset.finishModule = `${finish.id}:${module.entityId}`;
        label.append(input, document.createTextNode(module.referenceLabel));
        modules.append(label);
      });
      card.append(modules);
    }
    finishesList.append(card);
  });
  renderPager(byId("finishAvailabilityPager"), finishAvailabilityPage, pages, (index) => { finishAvailabilityPage = index; renderFinishes(); });
}

function renderPager(container, index, pages, onPage) {
  if (!container) return;
  container.replaceChildren();
  const previous = document.createElement("button"); previous.type = "button"; previous.className = "button button--secondary"; previous.textContent = "← Anterior"; previous.disabled = index <= 0;
  previous.addEventListener("click", () => onPage(index - 1));
  const status = document.createElement("span"); status.textContent = `${index + 1} / ${pages}`; status.setAttribute("aria-live", "polite");
  const next = document.createElement("button"); next.type = "button"; next.className = "button button--secondary"; next.textContent = "Próxima →"; next.disabled = index >= pages - 1;
  next.addEventListener("click", () => onPage(index + 1)); container.append(previous, status, next);
}

function materialTargetOptions() {
  return [
    ["fronts-all", "Frentes"], ["stone-all", "Pedra e rodapé"],
    ...model.handleProducts.map((item) => [`handle:${item.id}`, `Puxador · ${item.label}`])
  ];
}

function setMaterialTarget(materialId, targetId, enabled) {
  const material = model.materials.find((item) => item.id === materialId); if (!material) return;
  if (targetId.startsWith("handle:")) {
    const product = model.handleProducts.find((item) => item.id === targetId.slice(7)); if (!product) return;
    product.materialIds = enabled ? [...new Set([...product.materialIds, materialId])] : product.materialIds.filter((id) => id !== materialId);
    return;
  }
  const group = model.materialGroups.find((item) => item.id === targetId); if (!group) return;
  if (!enabled && group.materialIds.length === 1) return setMessage(saveMessage, "Mantenha pelo menos um material nesta opção.", "error");
  group.materialIds = enabled ? [...new Set([...group.materialIds, materialId])] : group.materialIds.filter((id) => id !== materialId);
  material.groupIds = model.materialGroups.filter((item) => ["fronts-all", "stone-all"].includes(item.id) && item.materialIds.includes(materialId)).map((item) => item.id);
  if (targetId === "fronts-all") {
    if (enabled && !model.finishes.some((item) => item.id === materialId)) model.finishes.push({ id: materialId, enabled: false, scope: "global", moduleIds: catalog.modules.map((item) => item.entityId) });
    if (!enabled) model.finishes = model.finishes.filter((item) => item.id !== materialId);
  }
  const priceSection = targetId === "fronts-all" ? "frontFinishRatesBps" : "globalEntries";
  const catalogPrices = priceBook[priceSection] || {};
  if (targetId === "stone-all") { if (enabled) model.pricing.globalEntries[materialId] ??= 0; else if (!Object.hasOwn(catalogPrices, materialId)) delete model.pricing.globalEntries[materialId]; }
  if (targetId === "fronts-all") { if (enabled) model.pricing.frontFinishRatesBps[materialId] ??= 0; else if (!Object.hasOwn(catalogPrices, materialId)) delete model.pricing.frontFinishRatesBps[materialId]; }
  reconcileInitialMaterials();
}

function makeRuleSelect(labelText, value, name, options, multiple = false) {
  const label = document.createElement("label"); label.className = "rule-field"; label.append(document.createTextNode(labelText));
  const select = document.createElement("select"); select.dataset[name] = "true"; select.multiple = multiple;
  options.forEach(([id, text]) => { const option = document.createElement("option"); option.value = id; option.textContent = text; option.selected = multiple ? value.includes(id) : id === value; select.append(option); });
  if (multiple) select.size = Math.min(5, Math.max(2, options.length));
  label.append(select); return label;
}

function renderMaterials() {
  materialsList.replaceChildren();
  const pages = Math.max(1, Math.ceil(model.materials.length / MATERIALS_PER_PAGE));
  materialPageIndex = Math.min(materialPageIndex, pages - 1);
  model.materials.slice(materialPageIndex * MATERIALS_PER_PAGE, (materialPageIndex + 1) * MATERIALS_PER_PAGE).forEach((material) => {
    const card = document.createElement("article"); card.className = "editor-card material-editor-card"; card.dataset.materialId = material.id;
    const chip = document.createElement("span"); chip.className = "material-chip"; chip.style.backgroundColor = material.color; if (material.textureAsset) chip.style.backgroundImage = `url("${material.textureAsset}")`;
    const title = document.createElement("h2"); title.textContent = material.label;
    card.append(chip, title, makeField("Nome", material.label, "materialLabel"));
    const colorLabel = document.createElement("label"); colorLabel.className = "data-field"; colorLabel.append(document.createTextNode("Cor base"));
    const color = document.createElement("input"); color.type = "color"; color.value = material.color; color.dataset.materialColor = "true"; colorLabel.append(color); card.append(colorLabel);
    const kindLabel = document.createElement("label"); kindLabel.className = "data-field"; kindLabel.append(document.createTextNode("Tipo de material"));
    const kind = document.createElement("select"); kind.dataset.materialKind = "true";
    [["color", "Cor sólida"], ["texture", "Textura"]].forEach(([value, text]) => { const option = document.createElement("option"); option.value = value; option.textContent = text; kind.append(option); });
    kind.value = material.kind; kindLabel.append(kind); card.append(kindLabel);
    const assetLabel = document.createElement("label"); assetLabel.className = "data-field"; assetLabel.append(document.createTextNode("Textura (arquivo existente)"));
    const assetSelect = document.createElement("select"); assetSelect.dataset.materialTexture = "true";
    const noTexture = document.createElement("option"); noTexture.value = ""; noTexture.textContent = "Somente cor"; assetSelect.append(noTexture);
    materialAssetChoices().forEach((path) => { const option = document.createElement("option"); option.value = path; option.textContent = path; assetSelect.append(option); });
    assetSelect.value = material.textureAsset || ""; assetLabel.append(assetSelect); card.append(assetLabel);
    if (material.textureAsset) { const thumb = document.createElement("img"); thumb.className = "material-texture-preview"; thumb.src = material.textureAsset; thumb.alt = `Textura ${material.label}`; thumb.loading = "lazy"; card.append(thumb); }
    const targetSelect = document.createElement("details"); targetSelect.className = "material-targets";
    const summary = document.createElement("summary"); summary.textContent = "Válido para…"; targetSelect.append(summary);
    const targetList = document.createElement("div"); targetList.className = "material-targets__list";
    materialTargetOptions().forEach(([id, label]) => {
      const selected = id.startsWith("handle:")
        ? Boolean(model.handleProducts.find((item) => item.id === id.slice(7))?.materialIds.includes(material.id))
        : Boolean(model.materialGroups.find((item) => item.id === id)?.materialIds.includes(material.id));
      const optionLabel = document.createElement("label"); const input = document.createElement("input"); input.type = "checkbox"; input.checked = selected; input.dataset.materialTarget = id; input.dataset.materialTargetId = material.id;
      optionLabel.append(input, document.createTextNode(label)); targetList.append(optionLabel);
    });
    targetSelect.append(targetList); card.append(targetSelect);
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "button button--secondary rule-remove"; remove.textContent = "Remover material"; remove.dataset.removeMaterial = material.id;
    remove.disabled = (material.locked && ["base-light", "stone-existing", "none"].includes(material.id)) || material.groupIds.some((id) => model.materialGroups.find((group) => group.id === id)?.materialIds.length <= 1);
    card.append(remove); materialsList.append(card);
  });
  renderPager(byId("materialPager"), materialPageIndex, pages, (index) => { materialPageIndex = index; renderMaterials(); });
}

function renderMaterialGroups() {
  materialGroupsList.replaceChildren();
  const pages = materialTargetOptions();
  materialTargetPageIndex = Math.min(materialTargetPageIndex, pages.length - 1);
  const [targetId, title] = pages[materialTargetPageIndex] || pages[0];
  if (targetId !== selectedMaterialTarget) materialAvailabilityPage = 0;
  selectedMaterialTarget = targetId;
  const card = document.createElement("article"); card.className = "editor-card material-target-page";
  if (!targetId.startsWith("handle:")) card.dataset.materialGroupId = targetId;
  const heading = document.createElement("h2"); heading.textContent = `${title} · opções válidas`; card.append(heading);
  if (targetId.startsWith("handle:")) {
    const product = model.handleProducts.find((item) => item.id === targetId.slice(7));
    const handles = model.materialGroups.find((item) => item.id === "handles-all");
    const available = document.createElement("label"); available.className = "switch material-availability";
    const toggle = document.createElement("input"); toggle.type = "checkbox"; toggle.checked = handles.materialIds.includes(product.id); toggle.dataset.handleAvailability = product.id;
    available.append(toggle, document.createTextNode("Disponível para clientes")); card.append(available);
    const note = document.createElement("p"); note.className = "admin-note"; note.textContent = "Definir depois não é um puxador e não recebe materiais."; card.append(note);
    appendMaterialAvailabilityList(card, "Cores e materiais deste puxador", model.materials, product.materialIds, `handle:${product.id}`);
    card.append(makeRuleSelect("Puxador selecionado inicialmente", model.initialState.handleId, "initialHandle", [["none", "Definir depois"], ...handles.materialIds.map((id) => { const item = model.handleProducts.find((entry) => entry.id === id); return [item?.priceEntryId || "", item?.label || id]; })]));
  } else {
    const group = model.materialGroups.find((item) => item.id === targetId);
    card.append(makeField("Nome da opção", group.label, "materialGroupLabel"));
    if (targetId === "stone-all") appendMaterialAvailabilityList(card, "Pedras e texturas disponíveis para bancada e rodapé", model.materials, group.materialIds, targetId);
    else card.append(makeMaterialCheckboxDropdown("Materiais válidos para frentes", model.materials.map((item) => [item.id, item.label, item.color, item.textureAsset]), group.materialIds, targetId));
    if (targetId === "fronts-all") {
      const available = model.finishes.filter((finish) => finish.enabled && finish.scope === "global" && group.materialIds.includes(finish.id));
      card.append(makeRuleSelect("Cor selecionada inicialmente", model.initialState.finishId, "initialFinish", available.map((finish) => [finish.id, model.materials.find((item) => item.id === finish.id)?.label || finish.id])));
    } else {
      card.append(makeRuleSelect("Pedra selecionada inicialmente", model.initialState.stonePackageId, "initialStone", group.materialIds.map((id) => [id, model.materials.find((item) => item.id === id)?.label || id])));
      const note = document.createElement("p"); note.className = "admin-note"; note.textContent = "A disponibilidade do serviço de rodapé é controlada separadamente na etapa; pedra e rodapé compartilham o material escolhido."; card.append(note);
    }
  }
  materialGroupsList.append(card);
  renderPager(byId("materialTargetPager"), materialTargetPageIndex, pages.length, (index) => { materialTargetPageIndex = index; renderMaterialGroups(); });
}

function appendMaterialAvailabilityList(container, label, materials, selectedIds, targetId) {
  const section = document.createElement("section"); section.className = "material-availability-list";
  const heading = document.createElement("h3"); heading.textContent = `${label} · ${selectedIds.length} disponível(is)`;
  const options = materials.slice().sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
  const pages = Math.max(1, Math.ceil(options.length / MATERIALS_PER_PAGE));
  materialAvailabilityPage = Math.min(materialAvailabilityPage, pages - 1);
  const start = materialAvailabilityPage * MATERIALS_PER_PAGE;
  const list = document.createElement("div"); list.className = "material-availability-list__items";
  options.slice(start, start + MATERIALS_PER_PAGE).forEach((material) => {
    const option = document.createElement("label"); option.className = "material-availability-option";
    const input = document.createElement("input"); input.type = "checkbox"; input.checked = selectedIds.includes(material.id); input.dataset.targetMaterial = targetId; input.dataset.materialId = material.id;
    const swatch = document.createElement("span"); swatch.className = "material-mini-swatch"; swatch.style.backgroundColor = material.color; if (material.textureAsset) swatch.style.backgroundImage = `url("${material.textureAsset}")`;
    const copy = document.createElement("span"); copy.textContent = material.label;
    option.append(input, swatch, copy); list.append(option);
  });
  const pager = document.createElement("div"); pager.className = "library-pager";
  renderPager(pager, materialAvailabilityPage, pages, (index) => { materialAvailabilityPage = index; renderMaterialGroups(); });
  section.append(heading, pager, list); container.append(section);
}

function makeMaterialCheckboxDropdown(label, options, selectedIds, targetId) {
  const details = document.createElement("details"); details.className = "multi-picker";
  const summary = document.createElement("summary"); summary.textContent = `${label} · ${selectedIds.length} selecionado(s)`; details.append(summary);
  const list = document.createElement("div"); list.className = "multi-picker__list";
  options.forEach(([id, name, color, texture]) => {
    const option = document.createElement("label"); option.className = "multi-picker__option";
    const input = document.createElement("input"); input.type = "checkbox"; input.checked = selectedIds.includes(id); input.dataset.targetMaterial = targetId; input.dataset.materialId = id;
    const swatch = document.createElement("span"); swatch.className = "material-mini-swatch"; swatch.style.backgroundColor = color; if (texture) swatch.style.backgroundImage = `url("${texture}")`;
    option.append(input, swatch, document.createTextNode(name)); list.append(option);
  });
  details.append(list); return details;
}

function reconcileInitialMaterials() {
  const fronts = model.materialGroups.find((group) => group.id === "fronts-all");
  const globalFinishes = new Set(model.finishes.filter((finish) => finish.enabled && finish.scope === "global" && fronts?.materialIds.includes(finish.id)).map((finish) => finish.id));
  if (!globalFinishes.has(model.initialState.finishId)) model.initialState.finishId = [...globalFinishes][0] || "";

  const handles = model.materialGroups.find((group) => group.id === "handles-all");
  if (model.initialState.handleId !== "none" && !model.handleProducts.some((item) => item.priceEntryId === model.initialState.handleId && handles?.materialIds.includes(item.id))) model.initialState.handleId = "none";

  const stones = model.materialGroups.find((group) => group.id === "stone-all");
  if (!stones?.materialIds.includes(model.initialState.stonePackageId)) model.initialState.stonePackageId = stones?.materialIds[0] || "";
}

function entityOptions() {
  const editable = new Set([...catalog.modules.map((item) => item.entityId), ...catalog.accessories.map((item) => item.entityId), "tempered-glass", "lighting-08"]);
  return scene.entities.filter((item) => editable.has(item.id)).map((item) => [item.id, item.label || catalog.modules.find((m) => m.entityId === item.id)?.title || catalog.accessories.find((m) => m.entityId === item.id)?.title || item.id]);
}

function eventTriggerOptions() {
  return [...entityOptions(), ...catalog.services.map((item) => [item.id, item.title]), ["stone-skirting", "Rodapé de pedra"]];
}

function renderDependencies() {
  dependenciesList.replaceChildren();
  const entities = entityOptions();
  model.dependencies.forEach((rule) => {
    const card = document.createElement("article"); card.className = "editor-card material-rule-card"; card.dataset.dependencyId = rule.id;
    const heading = document.createElement("h2"); heading.textContent = "Item dependente";
    card.append(heading, makeRuleSelect("Este item", rule.dependentId, "dependencyDependent", entities), makeRuleSelect("Requer todos estes itens", rule.requires, "dependencyRequires", entities, true));
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "button button--secondary rule-remove rule-wide"; remove.textContent = "Remover dependência"; remove.dataset.removeDependency = rule.id; card.append(remove);
    dependenciesList.append(card);
  });
}

function renderEvents() {
  eventsList.replaceChildren();
  const entities = eventTriggerOptions();
  model.events.forEach((rule) => {
    const card = document.createElement("article"); card.className = "editor-card material-rule-card"; card.dataset.eventId = rule.id;
    const legacyDepth = rule.action === "set-depth";
    const stateChange = rule.action === "set-enabled";
    const heading = document.createElement("h2"); heading.textContent = legacyDepth ? "Ajuste legado de profundidade" : stateChange ? "Ativar ou desativar item" : "Ajuste de dimensão";
    card.append(heading,
      makeRuleSelect("Ação", rule.action || "set-dimension", "eventAction", [["set-dimension", "Alterar dimensão de módulo"], ["set-enabled", "Ativar ou desativar módulo ou serviço"], ["set-depth", "Profundidade fixa do Módulo 07"]]),
      makeRuleSelect("Quando este item", rule.triggerId, "eventTrigger", entities),
      makeRuleSelect("Estiver", rule.when, "eventWhen", [["enabled", "Ativado"], ["disabled", "Desativado"]]));
    if (legacyDepth) {
      const target = document.createElement("label"); target.className = "rule-field"; target.append(document.createTextNode("Aplicar ao Módulo 07 · Profundidade em mm"));
      const value = document.createElement("input"); value.type = "number"; value.min = "300"; value.max = "700"; value.step = "1"; value.value = String(rule.valueMm); value.dataset.eventDepth = "true"; target.append(value); card.append(target);
    } else if (stateChange) {
      card.append(makeRuleSelect("Aplicar a", rule.targetId || "module-07", "eventTarget", entities));
      card.append(makeRuleSelect("Definir estado", String(Boolean(rule.enabled)), "eventEnabled", [["true", "Ativado"], ["false", "Desativado"]]));
    } else {
      const modules = catalog.modules.map((item) => [item.entityId, `${item.referenceLabel} · ${model.objects[item.entityId]?.title || item.title}`]);
      card.append(makeRuleSelect("Aplicar ao módulo", rule.targetId || "module-07", "eventTarget", modules));
      card.append(makeRuleSelect("Dimensão", rule.dimension || "depth", "eventDimension", [["width", "Largura"], ["height", "Altura"], ["depth", "Profundidade"]]));
      const target = document.createElement("label"); target.className = "rule-field"; target.append(document.createTextNode("Valor em mm"));
      const value = document.createElement("input"); value.type = "number"; value.min = "1"; value.max = "5000"; value.step = "1"; value.value = String(rule.valueMm); value.dataset.eventValue = "true"; target.append(value); card.append(target);
    }
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "button button--secondary rule-remove"; remove.textContent = "Remover evento"; remove.dataset.removeEvent = rule.id; card.append(remove);
    eventsList.append(card);
  });
}

function priceLabel(section, id) {
  const material = model.materials.find((item) => item.id === id);
  if (material) return material.label;
  const module = catalog.modules.find((item) => item.entityId === id);
  if (module) return `${module.referenceLabel} · ${module.title}`;
  const accessory = catalog.accessories.find((item) => item.entityId === id);
  if (accessory) return accessory.title;
  const handle = catalog.options.handles.find((item) => item.id === id);
  if (handle) return handle.label;
  const finish = catalog.options.finishes.find((item) => item.id === id);
  if (finish) return finish.publicLabel;
  const stone = catalog.options.stonePackages.find((item) => item.id === id);
  if (stone) return stone.label;
  const service = catalog.services.find((item) => item.id === id);
  if (service) return service.title;
  if (section === "localEntries") return `${catalog.modules.find((item) => item.entityId === id.split(":")[0])?.referenceLabel || id} · ${id.split(":").slice(1).join(":")}`;
  return id;
}

function renderPricing() {
  pricingList.replaceChildren();
  priceSections.forEach(([section, title, kind]) => {
    const card = document.createElement("article");
    card.className = "editor-card pricing-card";
    const heading = document.createElement("h2"); heading.textContent = title; card.append(heading);
    Object.entries(model.pricing[section]).forEach(([id, centsOrBps]) => {
      const label = document.createElement("label"); label.className = "data-field pricing-field";
      const copy = document.createElement("span"); copy.textContent = priceLabel(section, id);
      const input = document.createElement("input"); input.type = "number"; input.min = "0"; input.step = kind === "rate" ? "0.01" : "0.01";
      input.value = kind === "rate" ? (centsOrBps / 100).toFixed(2) : (centsOrBps / 100).toFixed(2);
      input.dataset.priceSection = section; input.dataset.priceId = id; input.dataset.priceKind = kind;
      const unit = document.createElement("small"); unit.textContent = kind === "rate" ? "%" : "R$";
      label.append(copy, input, unit); card.append(label);
    });
    pricingList.append(card);
  });
  const note = document.createElement("p");
  note.className = "admin-note";
  note.textContent = "Os valores publicados são estimativas para clientes. Custos, margens e dados de fornecedores não entram neste painel.";
  pricingList.append(note);
}

function renderAdminTabs() {
  renderStages(); renderObjects(); renderFinishes(); renderMaterials(); renderMaterialGroups(); renderDependencies(); renderEvents(); renderPricing();
}

function materialAssetChoices() {
  return [...new Set([
    ...catalog.options.finishes.map((item) => item.textureAsset),
    ...catalog.options.stonePackages.map((item) => item.textureAsset),
    ...model.materials.map((item) => item.textureAsset)
  ].filter(Boolean))].sort();
}

async function loadSettings() {
  const response = await fetch("/api/configuration", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 404 ? "A API de configuração ainda não foi publicada." : "Não foi possível carregar a configuração.");
  model = await response.json();
  byId("revisionLabel").textContent = `Versão ${model.revision || 1}`;
  renderAdminTabs();
}

document.querySelector(".admin-tabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-tab]");
  if (!button) return;
  document.querySelectorAll("[data-admin-tab]").forEach((tab) => {
    const active = tab === button;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-admin-panel]").forEach((panel) => { panel.hidden = panel.dataset.adminPanel !== button.dataset.adminTab; });
});

objectsList.addEventListener("input", (event) => {
  const input = event.target;
  const card = input.closest("[data-object-id]");
  if (!card) return;
  const data = model.objects[card.dataset.objectId];
  if (input.matches("[data-object-title]")) data.title = input.value;
  else if (input.matches("[data-object-description]")) data.description = input.value;
  else if (input.matches("[data-object-benefits]")) data.benefits = input.value.split("\n");
  else if (input.matches("[data-object-components]")) data.components = input.value.split("\n");
  else if (input.matches("[data-object-requirements]")) data.requirements = input.value.split("\n");
});

objectsList.addEventListener("change", (event) => {
});

objectAssetsList.addEventListener("change", (event) => {
  const select = event.target.closest("[data-object-asset]");
  const card = select?.closest("[data-asset-object-id]");
  if (!select || !card) return;
  model.objectAssets[card.dataset.assetObjectId][select.dataset.objectAsset] = select.value;
  const object = catalogObjects().find((item) => item.id === card.dataset.assetObjectId);
  renderObjectAssets(card.dataset.assetObjectId, object?.label || card.dataset.assetObjectId);
});

byId("objectSelector").addEventListener("change", (event) => { selectedObjectIndex = Number(event.target.value) || 0; renderObjects(); });
byId("objectPrevious").addEventListener("click", () => { selectedObjectIndex = Math.max(0, selectedObjectIndex - 1); renderObjects(); });
byId("objectNext").addEventListener("click", () => { selectedObjectIndex = Math.min(catalogObjects().length - 1, selectedObjectIndex + 1); renderObjects(); });
document.querySelectorAll("[data-object-tab]").forEach((button) => button.addEventListener("click", () => {
  selectedObjectTab = button.dataset.objectTab;
  document.querySelectorAll("[data-object-tab]").forEach((tab) => { const active = tab === button; tab.classList.toggle("is-active", active); tab.setAttribute("aria-selected", String(active)); });
  document.querySelectorAll("[data-object-panel]").forEach((panel) => { panel.hidden = panel.dataset.objectPanel !== selectedObjectTab; });
}));

finishesList.addEventListener("change", (event) => {
  const input = event.target;
  if (input.matches("[data-finish-enabled]")) {
    const finish = model.finishes.find((item) => item.id === input.dataset.finishEnabled);
    if (finish) finish.enabled = input.checked;
  } else if (input.matches("[data-finish-scope]")) {
    const finish = model.finishes.find((item) => item.id === input.dataset.finishScope);
    if (finish) finish.scope = input.value;
    renderFinishes();
  } else if (input.matches("[data-finish-module]")) {
    const [finishId, moduleId] = input.dataset.finishModule.split(":");
    const finish = model.finishes.find((item) => item.id === finishId);
    if (!finish) return;
    finish.moduleIds = input.checked ? [...new Set([...finish.moduleIds, moduleId])] : finish.moduleIds.filter((id) => id !== moduleId);
  }
  const previousFinish = model.initialState.finishId;
  reconcileInitialMaterials();
  if (previousFinish !== model.initialState.finishId) renderMaterialGroups();
});

materialsList.addEventListener("input", (event) => {
  const card = event.target.closest("[data-material-id]"); if (!card) return;
  const material = model.materials.find((item) => item.id === card.dataset.materialId); if (!material) return;
  if (event.target.matches("[data-material-color]")) material.color = event.target.value;
  if (event.target.matches("[data-material-label]")) material.label = event.target.value;
});
materialsList.addEventListener("change", (event) => {
  const card = event.target.closest("[data-material-id]"); if (!card) return;
  const material = model.materials.find((item) => item.id === card.dataset.materialId); if (!material) return;
  if (event.target.matches("[data-material-texture]")) material.textureAsset = event.target.value;
  if (event.target.matches("[data-material-kind]")) material.kind = event.target.value;
  if (event.target.matches("[data-material-target]")) setMaterialTarget(event.target.dataset.materialTargetId, event.target.dataset.materialTarget, event.target.checked);
  renderFinishes(); renderMaterials(); renderMaterialGroups(); renderPricing();
});

materialGroupsList.addEventListener("input", (event) => {
  const card = event.target.closest("[data-material-group-id]"); if (!card) return;
  const group = model.materialGroups.find((item) => item.id === card.dataset.materialGroupId); if (!group) return;
  if (event.target.matches("[data-material-group-label]")) group.label = event.target.value;
});
materialGroupsList.addEventListener("change", (event) => {
  const card = event.target.closest("[data-material-group-id]");
  const group = model.materialGroups.find((item) => item.id === card?.dataset.materialGroupId);
  if (event.target.matches("[data-target-material]")) setMaterialTarget(event.target.dataset.materialId, event.target.dataset.targetMaterial, event.target.checked);
  if (event.target.matches("[data-handle-availability]")) {
    const handles = model.materialGroups.find((item) => item.id === "handles-all"); const id = event.target.dataset.handleAvailability;
    if (!event.target.checked && handles.materialIds.length === 1) { event.target.checked = true; return setMessage(saveMessage, "Mantenha pelo menos um puxador disponível.", "error"); }
    handles.materialIds = event.target.checked ? [...new Set([...handles.materialIds, id])] : handles.materialIds.filter((item) => item !== id);
    reconcileInitialMaterials();
  }
  if (!card && !event.target.matches("[data-target-material],[data-handle-availability],[data-initial-finish],[data-initial-handle],[data-initial-stone]")) return;
  if (event.target.matches("[data-initial-finish]")) model.initialState.finishId = event.target.value;
  if (event.target.matches("[data-initial-handle]")) model.initialState.handleId = event.target.value;
  if (event.target.matches("[data-initial-stone]")) model.initialState.stonePackageId = event.target.value;
  renderFinishes(); renderMaterials(); renderMaterialGroups(); renderPricing();
});

dependenciesList.addEventListener("change", (event) => {
  const card = event.target.closest("[data-dependency-id]"); if (!card) return;
  const rule = model.dependencies.find((item) => item.id === card.dataset.dependencyId); if (!rule) return;
  if (event.target.matches("[data-dependency-dependent]")) rule.dependentId = event.target.value;
  if (event.target.matches("[data-dependency-requires]")) rule.requires = [...event.target.selectedOptions].map((option) => option.value);
});
eventsList.addEventListener("change", (event) => {
  const card = event.target.closest("[data-event-id]"); if (!card) return;
  const rule = model.events.find((item) => item.id === card.dataset.eventId); if (!rule) return;
  if (event.target.matches("[data-event-action]")) {
    rule.action = event.target.value;
    if (rule.action === "set-dimension") { rule.targetId = "module-07"; rule.dimension = "depth"; }
    else if (rule.action === "set-enabled") { rule.targetId = "module-07"; rule.enabled = false; delete rule.dimension; delete rule.valueMm; }
    else { rule.targetId = "module-07"; delete rule.dimension; delete rule.enabled; }
    renderEvents(); return;
  }
  if (event.target.matches("[data-event-trigger]")) rule.triggerId = event.target.value;
  if (event.target.matches("[data-event-when]")) rule.when = event.target.value;
  if (event.target.matches("[data-event-depth]")) rule.valueMm = Number(event.target.value);
  if (event.target.matches("[data-event-target]")) rule.targetId = event.target.value;
  if (event.target.matches("[data-event-enabled]")) rule.enabled = event.target.value === "true";
  if (event.target.matches("[data-event-dimension]")) rule.dimension = event.target.value;
  if (event.target.matches("[data-event-value]")) rule.valueMm = Number(event.target.value);
});

function newRuleId(prefix, records) {
  let index = 1; while (records.some((item) => item.id === `${prefix}-${index}`)) index += 1; return `${prefix}-${index}`;
}
byId("addStageButton").addEventListener("click", () => {
  if (model.stages.length >= 12) return setMessage(saveMessage, "O limite é 12 etapas.", "error");
  const kind = byId("stageKindInput").value;
  if (kind !== "custom" && model.stages.some((stage) => (stage.kind || stage.id) === kind)) return;
  const defaultLabel = kind === "finishes" ? "Acabamentos" : kind === "services" ? "Serviços" : "Nova etapa";
  const label = window.prompt("Nome da nova etapa", defaultLabel);
  if (!label?.trim()) return;
  let id = `stage-${label.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "extra"}`;
  const base = id; let suffix = 2; while (model.stages.some((stage) => stage.id === id)) id = `${base}-${suffix++}`;
  model.stages.splice(Math.max(1, model.stages.length - 1), 0, { id, kind, label: label.trim().slice(0, 40), enabled: false, items: [] });
  renderStages();
});
byId("addMaterialButton").addEventListener("click", () => {
  const label = window.prompt("Nome da nova cor ou textura", "Novo material"); if (!label?.trim()) return;
  let id = label.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "material";
  const base = id; let suffix = 2; while (model.materials.some((item) => item.id === id)) id = `${base}-${suffix++}`;
  const material = { id, label: label.trim().slice(0, 60), kind: "color", color: "#cbbcaa", textureAsset: "", textureSize: "cover", groupIds: ["fronts-all"], locked: false };
  model.materials.push(material);
  model.materialGroups.find((group) => group.id === "fronts-all").materialIds.push(id);
  model.finishes.push({ id, enabled: false, scope: "global", moduleIds: catalog.modules.map((item) => item.entityId) });
  model.pricing.frontFinishRatesBps[id] = 0;
  materialPageIndex = Math.floor((model.materials.length - 1) / MATERIALS_PER_PAGE);
  renderFinishes(); renderMaterials(); renderMaterialGroups(); renderPricing();
});

materialsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-material]"); if (!button || button.disabled) return;
  const id = button.dataset.removeMaterial;
  model.materials = model.materials.filter((item) => item.id !== id);
  model.materialGroups.forEach((group) => { group.materialIds = group.materialIds.filter((itemId) => itemId !== id); });
  model.handleProducts.forEach((product) => { product.materialIds = product.materialIds.filter((itemId) => itemId !== id); });
  model.materials.forEach((material) => { material.groupIds = model.materialGroups.filter((group) => group.materialIds.includes(material.id)).map((group) => group.id); });
  model.finishes = model.finishes.filter((finish) => finish.id !== id);
  if (!Object.hasOwn(priceBook.frontFinishRatesBps, id)) delete model.pricing.frontFinishRatesBps[id];
  if (!Object.hasOwn(priceBook.handleEntries, id)) delete model.pricing.handleEntries[id];
  if (!Object.hasOwn(priceBook.globalEntries, id) && !catalog.services.some((service) => service.id === id)) delete model.pricing.globalEntries[id];
  reconcileInitialMaterials();
  renderFinishes(); renderMaterials(); renderMaterialGroups(); renderPricing();
});

byId("addDependencyButton").addEventListener("click", () => {
  model.dependencies.push({ id: newRuleId("dependency", model.dependencies), dependentId: "lighting-08", requires: ["module-04"] }); renderDependencies();
});
byId("addEventButton").addEventListener("click", () => {
  model.events.push({ id: newRuleId("event", model.events), triggerId: "module-04", when: "disabled", action: "set-dimension", targetId: "module-07", dimension: "depth", valueMm: 400 }); renderEvents();
});
document.querySelector("[data-admin-panel=rules]").addEventListener("click", (event) => {
  const dependency = event.target.closest("[data-remove-dependency]"); if (dependency) { model.dependencies = model.dependencies.filter((item) => item.id !== dependency.dataset.removeDependency); renderDependencies(); }
  const rule = event.target.closest("[data-remove-event]"); if (rule) { model.events = model.events.filter((item) => item.id !== rule.dataset.removeEvent); renderEvents(); }
});

pricingList.addEventListener("change", (event) => {
  const input = event.target.closest("[data-price-section]");
  if (!input) return;
  const amount = Number(input.value);
  if (!Number.isFinite(amount) || amount < 0) return;
  model.pricing[input.dataset.priceSection][input.dataset.priceId] = Math.round(amount * 100);
});

async function showUser(user) {
  loginPanel.hidden = Boolean(user);
  logoutButton.hidden = !user;
  deniedPanel.hidden = true;
  editorPanel.hidden = true;
  if (!user) return;
  if (!isAdmin(user)) {
    deniedPanel.hidden = false;
    return;
  }
  byId("userLabel").textContent = user.email || "Administrador";
  editorPanel.hidden = false;
  try {
    await loadSettings();
  } catch (error) {
    setMessage(saveMessage, error.message || "Falha ao carregar as etapas.", "error");
  }
}

function showPasswordAction(type, token) {
  inviteToken = type === "invite" ? token || null : null;
  recoveryToken = type === "recovery" ? token || null : null;
  loginForm.hidden = true;
  passwordActionForm.hidden = false;
  byId("passwordActionTitle").textContent = type === "invite"
    ? "Defina uma senha para concluir o convite de administrador."
    : "Defina uma nova senha para acessar a administração.";
  byId("passwordActionButton").textContent = type === "invite" ? "Aceitar convite" : "Atualizar senha";
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = loginForm.querySelector("button[type=submit]");
  submit.disabled = true;
  setMessage(loginMessage, "Entrando…");
  try {
    const user = await login(byId("emailInput").value.trim(), byId("passwordInput").value);
    await showUser(user);
    setMessage(loginMessage, "");
  } catch (error) {
    setMessage(loginMessage, error.message || "Não foi possível entrar. Confira os dados e tente novamente.", "error");
  } finally {
    submit.disabled = false;
  }
});

byId("recoveryButton").addEventListener("click", async () => {
  const email = byId("emailInput").value.trim();
  if (!email) return setMessage(loginMessage, "Informe seu e-mail para receber o link de recuperação.", "error");
  try {
    await requestPasswordRecovery(email);
    setMessage(loginMessage, "Se a conta existir, você receberá um link para redefinir a senha.", "success");
  } catch (error) {
    setMessage(loginMessage, error.message || "Não foi possível solicitar a recuperação.", "error");
  }
});

passwordActionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = byId("newPasswordInput").value;
  try {
    if (inviteToken) await acceptInvite(inviteToken, password);
    else if (recoveryToken) await recoverPassword(recoveryToken, password);
    else await updateUser({ password });
    window.location.hash = "";
    window.location.reload();
  } catch (error) {
    setMessage(loginMessage, error.message || "Não foi possível atualizar a senha.", "error");
  }
});

stagesList.addEventListener("input", (event) => {
  const input = event.target.closest("[data-stage-label]");
  if (!input) return;
  const stage = model.stages.find((item) => item.id === input.dataset.stageLabel);
  if (stage) stage.label = input.value;
});

stagesList.addEventListener("change", (event) => {
  const enabled = event.target.closest("[data-stage-enabled]");
  if (enabled) {
    const stage = model.stages.find((item) => item.id === enabled.dataset.stageEnabled);
    if (stage) stage.enabled = enabled.checked;
    renderAdminTabs();
    return;
  }
  const initialEntity = event.target.closest("[data-initial-entity]");
  if (initialEntity) { model.initialState.entities[initialEntity.dataset.initialEntity] = initialEntity.checked; return; }
  const initialService = event.target.closest("[data-initial-service]");
  if (initialService) {
    const services = new Set(model.initialState.services);
    if (initialService.checked) services.add(initialService.dataset.initialService); else services.delete(initialService.dataset.initialService);
    model.initialState.services = [...services]; return;
  }
  const item = event.target.closest("[data-stage-item]");
  if (!item) return;
  const stage = model.stages.find((entry) => entry.id === item.dataset.stageItem);
  if (!stage) return;
  if (item.checked) return;
  moveStageItem(item.value, null);
});

stagesList.addEventListener("dragstart", (event) => {
  const item = event.target.closest("[data-drag-stage-item]");
  if (!item || !event.dataTransfer) return;
  event.dataTransfer.setData("text/plain", item.dataset.dragStageItem);
  event.dataTransfer.effectAllowed = "move";
  requestAnimationFrame(() => item.classList.add("is-dragging"));
});

stagesList.addEventListener("dragend", () => {
  stagesList.querySelectorAll(".is-dragging,.is-drop-target").forEach((item) => item.classList.remove("is-dragging", "is-drop-target"));
});

stagesList.addEventListener("dragover", (event) => {
  const target = event.target.closest("[data-stage-drop]");
  if (!target || !event.dataTransfer) return;
  const id = event.dataTransfer.getData("text/plain");
  if (id && !getItemOptions(target.dataset.stageDrop).some((item) => item.id === id)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  target.classList.add("is-drop-target");
});

stagesList.addEventListener("dragleave", (event) => {
  const target = event.target.closest("[data-stage-drop]");
  if (target && !target.contains(event.relatedTarget)) target.classList.remove("is-drop-target");
});

stagesList.addEventListener("drop", (event) => {
  const target = event.target.closest("[data-stage-drop]");
  const itemId = event.dataTransfer?.getData("text/plain");
  if (!target || !itemId) return;
  event.preventDefault();
  target.classList.remove("is-drop-target");
  moveStageItem(itemId, target.dataset.stageDrop);
});

stagesList.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove-stage]");
  if (remove && !remove.disabled) {
    const target = model.stages.find((stage) => stage.id === remove.dataset.removeStage);
    if (!target) return;
    model.stages = model.stages.filter((stage) => stage !== target);
    if (target.kind === "custom") target.items.forEach((id) => { if (!model.stages.some((stage) => stage.items.includes(id))) return; });
    renderStages(); return;
  }
  const button = event.target.closest("[data-move-stage]");
  if (!button) return;
  const [id, direction] = button.dataset.moveStage.split(":");
  const index = model.stages.findIndex((stage) => stage.id === id);
  const target = index + Number(direction);
  if (index < 0 || target < 0 || target >= model.stages.length) return;
  [model.stages[index], model.stages[target]] = [model.stages[target], model.stages[index]];
  renderStages();
});

saveButton.addEventListener("click", async () => {
  saveButton.disabled = true;
  setMessage(saveMessage, "Publicando…");
  try {
    const response = await fetch("/api/configuration", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(model)
    });
    if (response.status === 401 || response.status === 403) throw new Error("Sua sessão não tem permissão para publicar esta configuração.");
    if (response.status === 409) throw new Error("A configuração mudou em outra sessão. Recarregue o painel antes de salvar.");
    if (!response.ok) throw new Error("A configuração não foi aceita. Confira nomes e itens selecionados.");
    model = await response.json();
    byId("revisionLabel").textContent = `Versão ${model.revision}`;
    setMessage(saveMessage, "Configuração publicada e aplicada ao configurador.", "success");
    renderStages();
  } catch (error) {
    setMessage(saveMessage, error.message || "Falha ao publicar a configuração.", "error");
  } finally {
    saveButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  await logout();
  await showUser(null);
});

onAuthChange((_event, user) => { void showUser(user); });

try {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const recovery = hash.get("recovery_token");
  if (recovery) showPasswordAction("recovery", recovery);
  else {
    const callback = await handleAuthCallback();
    if (callback?.type === "invite") showPasswordAction(callback.type, callback.token);
    else await showUser(await getUser());
  }
} catch (error) {
  setMessage(loginMessage, error.message || "Não foi possível concluir o acesso.", "error");
  await showUser(await getUser());
}
