import {
  acceptInvite,
  getUser,
  handleAuthCallback,
  login,
  logout,
  onAuthChange,
  requestPasswordRecovery,
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
let selectedObjectIndex = 0;
let selectedObjectTab = "content";

const labels = {
  "fronts-all": "Cor das frentes",
  "handles-all": "Puxadores",
  "stone-all": "Pacote de pedra",
  "stone-skirting": "Rodapé de pedra",
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
  if (kind === "modules") return catalog.modules.map(({ entityId, referenceLabel, title }) => ({ id: entityId, label: `${referenceLabel} · ${model.objects[entityId]?.title || title}` }));
  if (kind === "finishes") return ["fronts-all", "handles-all", "stone-all", "stone-skirting"].map((id) => ({ id, label: labels[id] }));
  if (kind === "custom") return [
    ...catalog.modules.map((item) => ({ id: item.entityId, label: `${item.referenceLabel} · ${model.objects[item.entityId]?.title || item.title}` })),
    ...catalog.accessories.map((item) => ({ id: item.entityId, label: model.objects[item.entityId]?.title || item.title })),
    ...catalog.services.map((item) => ({ id: item.id, label: model.objects[item.id]?.title || item.title }))
  ];
  if (kind === "services") return [
    ...catalog.services.map((service) => ({ id: service.id, label: model.objects[service.id]?.title || service.title })),
    ...catalog.accessories.map((item) => ({ id: item.entityId, label: model.objects[item.entityId]?.title || item.title }))
  ];
  return [{ id: "summary", label: labels.summary }];
}

function renderStages() {
  stagesList.replaceChildren();
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
    getItemOptions(stage.id).forEach((item) => {
      const option = document.createElement("div");
      option.className = "item-option";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = stage.items.includes(item.id);
      input.dataset.stageItem = stage.id;
      input.value = item.id;
      input.disabled = stage.enabled && stage.items.length === 1 && input.checked;
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
    const addRow = document.createElement("div");
    addRow.className = "stage-add-item";
    const addSelect = document.createElement("select");
    addSelect.dataset.addItemSelect = stage.id;
    const usedElsewhere = new Set(model.stages.filter((item) => item.id !== stage.id).flatMap((item) => item.items));
    const choices = getItemOptions(stage.id).filter((item) => !stage.items.includes(item.id) && !usedElsewhere.has(item.id));
    const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = choices.length ? "Escolha um item para incluir" : "Todos os itens disponíveis já estão nesta etapa";
    addSelect.append(placeholder);
    choices.forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = item.label; addSelect.append(option); });
    const addItem = document.createElement("button"); addItem.type = "button"; addItem.className = "button button--secondary"; addItem.textContent = "Incluir item"; addItem.dataset.addStageItem = stage.id; addItem.disabled = choices.length === 0;
    addRow.append(addSelect, addItem);
    items.append(addRow);
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
  if (handleProduct) renderHandleColors(card, handleProduct);
  card.dataset.objectId = id;
  objectsList.append(card);
  renderObjectAssets(id, label);
}

function renderHandleColors(card, product) {
  const section = document.createElement("section"); section.className = "handle-colors"; section.dataset.handleProductId = product.id;
  const heading = document.createElement("h3"); heading.textContent = "Cores do puxador"; section.append(heading);
  const note = document.createElement("p"); note.className = "admin-note"; note.textContent = "Estas cores pertencem ao modelo de puxador e não podem ser usadas como cores de MDF."; section.append(note);
  product.colors.forEach((entry) => {
    const row = document.createElement("div"); row.className = "handle-color-row"; row.dataset.handleColorId = entry.id;
    row.append(makeField("Nome da cor", entry.label, "handleColorLabel"));
    const swatchLabel = document.createElement("label"); swatchLabel.className = "data-field"; swatchLabel.append(document.createTextNode("Cor"));
    const swatch = document.createElement("input"); swatch.type = "color"; swatch.value = entry.color; swatch.dataset.handleColorValue = "true"; swatchLabel.append(swatch); row.append(swatchLabel);
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "button button--secondary"; remove.textContent = "Remover cor"; remove.dataset.removeHandleColor = entry.id; row.append(remove);
    section.append(row);
  });
  const add = document.createElement("button"); add.type = "button"; add.className = "button button--secondary"; add.textContent = "Adicionar cor ao puxador"; add.dataset.addHandleColor = product.id; section.append(add);
  card.append(section);
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
    select.value = assets[field] || ""; select.disabled = !hasSceneEntity; labelNode.append(select); card.append(labelNode);
  });
  const note = document.createElement("p"); note.className = "admin-note"; note.textContent = hasSceneEntity ? "A lista contém apenas arquivos já presentes na cena. O painel não carrega arquivos novos nem permite caminhos externos." : "Este item não possui camada visual própria na cena. Configure cores e texturas na biblioteca de materiais.";
  card.append(note); objectAssetsList.append(card);
}

function renderFinishes() {
  finishesList.replaceChildren();
  const globalOptions = model.finishes.filter((item) => item.scope === "global" && item.enabled).length;
  model.finishes.forEach((finish) => {
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
  model.materials.forEach((material) => {
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
    const groupChoices = document.createElement("div"); groupChoices.className = "finish-module-options material-group-choices";
    model.materialGroups.filter((group) => group.id !== "handles-all").forEach((group) => {
      const optionLabel = document.createElement("label"); const input = document.createElement("input"); input.type = "checkbox"; input.checked = group.materialIds.includes(material.id); input.dataset.materialGroupMembership = `${material.id}:${group.id}`;
      optionLabel.append(input, document.createTextNode(group.label)); groupChoices.append(optionLabel);
    });
    card.append(groupChoices);
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "button button--secondary rule-remove"; remove.textContent = "Remover material"; remove.dataset.removeMaterial = material.id;
    remove.disabled = (material.locked && ["base-light", "stone-existing", "none"].includes(material.id)) || material.groupIds.some((id) => model.materialGroups.find((group) => group.id === id)?.materialIds.length <= 1);
    card.append(remove); materialsList.append(card);
  });
}

function renderMaterialGroups() {
  materialGroupsList.replaceChildren();
  model.materialGroups.forEach((group) => {
    const card = document.createElement("article"); card.className = "editor-card"; card.dataset.materialGroupId = group.id;
    const heading = document.createElement("h2"); heading.textContent = group.label; card.append(heading);
    card.append(makeField("Nome do acabamento", group.label, "materialGroupLabel"));
    const choices = makeRuleSelect(group.id === "handles-all" ? "Modelos disponíveis para clientes" : "Materiais disponíveis para clientes", group.materialIds, "groupMaterials", group.id === "handles-all" ? model.handleProducts.map((item) => [item.id, item.label]) : model.materials.map((item) => [item.id, item.label]), true);
    choices.classList.add("rule-wide"); card.append(choices);
    if (group.id === "fronts-all") {
      const available = model.finishes.filter((finish) => finish.enabled && finish.scope === "global" && group.materialIds.includes(finish.id));
      card.append(makeRuleSelect("Cor selecionada inicialmente", model.initialState.finishId, "initialFinish", available.map((finish) => [finish.id, model.materials.find((item) => item.id === finish.id)?.label || finish.id])));
    }
    if (group.id === "handles-all") card.append(makeRuleSelect("Puxador selecionado inicialmente", model.initialState.handleId, "initialHandle", [["none", "Definir depois"], ...group.materialIds.map((id) => { const item = model.handleProducts.find((product) => product.id === id); return [item?.priceEntryId || "", item?.label || id]; })]));
    if (group.id === "stone-all") card.append(makeRuleSelect("Pedra selecionada inicialmente", model.initialState.stonePackageId, "initialStone", group.materialIds.map((id) => [id, model.materials.find((item) => item.id === id)?.label || id])));
    if (group.id === "stone-all") { const note = document.createElement("p"); note.className = "admin-note"; note.textContent = "A mesma pedra escolhida atende bancada e rodapé."; card.append(note); }
    materialGroupsList.append(card);
  });
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
    const heading = document.createElement("h2"); heading.textContent = "Alteração de profundidade";
    card.append(heading, makeRuleSelect("Quando este item", rule.triggerId, "eventTrigger", entities), makeRuleSelect("Estiver", rule.when, "eventWhen", [["enabled", "Ativado"], ["disabled", "Desativado"]]));
    const target = document.createElement("label"); target.className = "rule-field"; target.append(document.createTextNode("Aplicar ao Módulo 07 · Profundidade em mm"));
    const value = document.createElement("input"); value.type = "number"; value.min = "300"; value.max = "700"; value.step = "1"; value.value = String(rule.valueMm); value.dataset.eventDepth = "true"; target.append(value); card.append(target);
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
  const handleCard = event.target.closest("[data-handle-product-id]");
  if (handleCard) {
    const product = model.handleProducts.find((item) => item.id === handleCard.dataset.handleProductId);
    const color = product?.colors.find((item) => item.id === event.target.closest("[data-handle-color-id]")?.dataset.handleColorId);
    if (color && event.target.matches("[data-handle-color-label]")) color.label = event.target.value;
    return;
  }
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
  const card = event.target.closest("[data-handle-product-id]");
  if (!card || !event.target.matches("[data-handle-color-value]")) return;
  const product = model.handleProducts.find((item) => item.id === card.dataset.handleProductId);
  const color = product?.colors.find((item) => item.id === event.target.closest("[data-handle-color-id]")?.dataset.handleColorId);
  if (color) color.color = event.target.value;
});

objectsList.addEventListener("click", (event) => {
  const add = event.target.closest("[data-add-handle-color]");
  const remove = event.target.closest("[data-remove-handle-color]");
  if (!add && !remove) return;
  const card = event.target.closest("[data-handle-product-id]");
  const product = model.handleProducts.find((item) => item.id === card?.dataset.handleProductId);
  if (!product) return;
  if (add) {
    if (product.colors.length >= 30) return setMessage(saveMessage, "Cada puxador pode ter até 30 cores cadastradas.", "error");
    const label = window.prompt("Nome da cor do puxador", "Nova cor"); if (!label?.trim()) return;
    let id = label.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "cor";
    const base = id; let suffix = 2; while (product.colors.some((item) => item.id === id)) id = `${base}-${suffix++}`;
    product.colors.push({ id, label: label.trim().slice(0, 40), color: "#b7b0a7" });
  } else product.colors = product.colors.filter((item) => item.id !== remove.dataset.removeHandleColor);
  renderObjects();
});

objectAssetsList.addEventListener("change", (event) => {
  const select = event.target.closest("[data-object-asset]");
  const card = select?.closest("[data-asset-object-id]");
  if (!select || !card) return;
  model.objectAssets[card.dataset.assetObjectId][select.dataset.objectAsset] = select.value;
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
  if (event.target.matches("[data-material-group-membership]")) {
    const [materialId, groupId] = event.target.dataset.materialGroupMembership.split(":");
    const group = model.materialGroups.find((item) => item.id === groupId);
    if (!group) return;
    if (!event.target.checked && group.materialIds.length === 1) {
      event.target.checked = true;
      return setMessage(saveMessage, "Cada lista de acabamento precisa manter pelo menos um material.", "error");
    }
    group.materialIds = event.target.checked ? [...new Set([...group.materialIds, materialId])] : group.materialIds.filter((id) => id !== materialId);
    material.groupIds = model.materialGroups.filter((item) => item.materialIds.includes(materialId)).map((item) => item.id);
    if (groupId === "fronts-all") {
      if (event.target.checked && !model.finishes.some((finish) => finish.id === materialId)) model.finishes.push({ id: materialId, enabled: false, scope: "global", moduleIds: catalog.modules.map((item) => item.entityId) });
      if (!event.target.checked) model.finishes = model.finishes.filter((finish) => finish.id !== materialId);
    }
    if (groupId === "handles-all") {
      if (event.target.checked) model.pricing.handleEntries[materialId] ??= 0;
      else if (!Object.hasOwn(priceBook.handleEntries, materialId)) delete model.pricing.handleEntries[materialId];
    }
    if (groupId === "stone-all") {
      if (event.target.checked) model.pricing.globalEntries[materialId] ??= 0;
      else if (!Object.hasOwn(priceBook.globalEntries, materialId)) delete model.pricing.globalEntries[materialId];
    }
    reconcileInitialMaterials();
  }
  renderFinishes(); renderMaterials(); renderMaterialGroups(); renderPricing();
});

materialGroupsList.addEventListener("input", (event) => {
  const card = event.target.closest("[data-material-group-id]"); if (!card) return;
  const group = model.materialGroups.find((item) => item.id === card.dataset.materialGroupId); if (!group) return;
  if (event.target.matches("[data-material-group-label]")) group.label = event.target.value;
});
materialGroupsList.addEventListener("change", (event) => {
  const card = event.target.closest("[data-material-group-id]"); if (!card) return;
  const group = model.materialGroups.find((item) => item.id === card.dataset.materialGroupId); if (!group) return;
  if (event.target.matches("[data-group-materials]")) {
    const nextIds = [...event.target.selectedOptions].map((option) => option.value);
    if (!nextIds.length) {
      event.target.value = group.materialIds[0] || "";
      return setMessage(saveMessage, "Cada lista de acabamento precisa manter pelo menos um material.", "error");
    }
    if (group.id === "fronts-all" && !model.finishes.some((finish) => nextIds.includes(finish.id) && finish.enabled && finish.scope === "global")) {
      [...event.target.options].forEach((option) => { option.selected = group.materialIds.includes(option.value); });
      return setMessage(saveMessage, "Mantenha ao menos uma cor global disponível para selecionar o padrão.", "error");
    }
    group.materialIds = nextIds;
    model.materials.forEach((material) => { material.groupIds = model.materialGroups.filter((entry) => entry.materialIds.includes(material.id)).map((entry) => entry.id); });
    if (group.id === "fronts-all") {
      model.finishes = model.finishes.filter((finish) => group.materialIds.includes(finish.id));
      group.materialIds.forEach((id) => { if (!model.finishes.some((finish) => finish.id === id)) model.finishes.push({ id, enabled: false, scope: "global", moduleIds: catalog.modules.map((item) => item.entityId) }); });
    }
    if (group.id === "handles-all") {
      const priceIds = group.materialIds.map((id) => model.handleProducts.find((item) => item.id === id)?.priceEntryId).filter(Boolean);
      priceIds.forEach((id) => { model.pricing.handleEntries[id] ??= 0; });
      Object.keys(model.pricing.handleEntries).forEach((id) => { if (!Object.hasOwn(priceBook.handleEntries, id) && !priceIds.includes(id)) delete model.pricing.handleEntries[id]; });
    }
    if (group.id === "stone-all") {
      group.materialIds.forEach((id) => { model.pricing.globalEntries[id] ??= 0; });
      Object.keys(model.pricing.globalEntries).forEach((id) => { if (!Object.hasOwn(priceBook.globalEntries, id) && !group.materialIds.includes(id) && !catalog.services.some((service) => service.id === id)) delete model.pricing.globalEntries[id]; });
    }
    reconcileInitialMaterials();
  }
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
  if (event.target.matches("[data-event-trigger]")) rule.triggerId = event.target.value;
  if (event.target.matches("[data-event-when]")) rule.when = event.target.value;
  if (event.target.matches("[data-event-depth]")) rule.valueMm = Number(event.target.value);
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
  renderFinishes(); renderMaterials(); renderMaterialGroups(); renderPricing();
});

materialsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-material]"); if (!button || button.disabled) return;
  const id = button.dataset.removeMaterial;
  model.materials = model.materials.filter((item) => item.id !== id);
  model.materialGroups.forEach((group) => { group.materialIds = group.materialIds.filter((itemId) => itemId !== id); });
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
  model.events.push({ id: newRuleId("event", model.events), triggerId: "module-04", when: "disabled", action: "set-depth", targetId: "module-07", valueMm: 400 }); renderEvents();
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
  inviteToken = token || null;
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
  stage.items = item.checked ? [...stage.items, item.value] : stage.items.filter((id) => id !== item.value);
  if ((stage.kind || stage.id) === "finishes" && item.value === "stone-all" && !item.checked) {
    stage.items = stage.items.filter((id) => id !== "stone-skirting");
  }
  if ((stage.kind || stage.id) === "finishes" && item.value === "stone-skirting" && item.checked && !stage.items.includes("stone-all")) {
    stage.items.push("stone-all");
  }
  renderStages();
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
  const addItem = event.target.closest("[data-add-stage-item]");
  if (addItem) {
    const stage = model.stages.find((item) => item.id === addItem.dataset.addStageItem);
    const select = stagesList.querySelector(`[data-add-item-select="${CSS.escape(addItem.dataset.addStageItem)}"]`);
    if (stage && select?.value && !stage.items.includes(select.value)) stage.items.push(select.value);
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
  const callback = await handleAuthCallback();
  if (callback?.type === "invite" || callback?.type === "recovery") showPasswordAction(callback.type, callback.token);
  else await showUser(await getUser());
} catch (error) {
  setMessage(loginMessage, error.message || "Não foi possível concluir o acesso.", "error");
  await showUser(await getUser());
}
