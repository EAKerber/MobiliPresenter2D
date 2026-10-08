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
const pricingContract = window.CasaModulesPricingContract;
const scene = window.CASA_EM_MODULOS_SCENE;
const configurationCore = window.CasaModulesConfiguration;
const capabilityCore = window.CasaModulesItemCapabilities;
const presentationCore = window.CasaModulesPresentation;
const flowCore = window.CasaModulesFlow;
const hierarchyV4Core = window.CasaModulesHierarchyAdministration;
const hierarchyCore = window.CasaModulesAdministrationV5;
const hierarchyEditor = window.CasaModulesHierarchyEditor;
const legacyStageRepair = window.CasaModulesLegacyStageRepair;
const hierarchyDefaults = window.CASA_EM_MODULOS_HIERARCHY_DEFAULTS;
const legacyDefaults = configurationCore.createDefaultAdministration(settingsDefaults, catalog, priceBook, scene);
const catalogPricing = pricingContract.normalize(priceBook.pricing);
const defaults = hierarchyCore.upgrade(legacyDefaults, configurationCore, flowCore, catalog, priceBook, scene, hierarchyDefaults);
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
const persistHandlesButton = byId("persistHandlesButton");
const saveMessage = byId("saveMessage");
const logoutButton = byId("logoutButton");
let model = structuredClone(defaults);
let publishedSource = null;
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

function configuredHierarchyItemLabel(itemId) {
  for (const stage of Object.values(hierarchyDefaults?.stages || {})) {
    for (const group of stage.groups || []) {
      for (const section of group.sections || []) {
        if ((section.itemIds || []).includes(itemId)) return section.label || itemId;
      }
    }
  }
  if (hierarchyDefaults?.customStage?.section?.itemIds?.includes?.(itemId)) {
    return hierarchyDefaults.customStage.section.label || itemId;
  }
  return null;
}

const pricingRoles = [
  ["itemBase", "Valores de módulos e acessórios"],
  ["handleChoiceTotal", "Puxadores"],
  ["frontFinishAdjustment", "Adicional por acabamento"],
  ["localAdjustment", "Adicionais locais"],
  ["globalAdjustment", "Adicionais globais"]
];

const pricingTypeLabels = Object.freeze({
  amount: "Valor fixo",
  percentage: "Percentual"
});
const pricingBasisLabels = Object.freeze({
  "eligible-module-base": "Base: valor base de cada módulo elegível"
});

function setMessage(element, message, kind = "") {
  element.textContent = message;
  element.dataset.kind = kind;
}

function syncPasswordReveal(button) {
  const input = byId(button.dataset.passwordReveal);
  if (!input) return;
  const revealed = input.type === "text";
  const label = revealed ? "Ocultar senha" : "Mostrar senha";
  button.setAttribute("aria-pressed", String(revealed));
  button.setAttribute("aria-label", label);
  button.title = label;
  button.textContent = revealed ? "Ocultar" : "Mostrar";
}

document.querySelectorAll("[data-password-reveal]").forEach((button) => {
  syncPasswordReveal(button);
  button.addEventListener("click", () => {
    const input = byId(button.dataset.passwordReveal);
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    syncPasswordReveal(button);
  });
});

function isAdmin(user) {
  const roles = [...(user?.roles || []), ...(user?.app_metadata?.roles || [])];
  return roles.includes("admin");
}

function getItemOptions(stageId) {
  const stage = model.stages.find((item) => item.id === stageId);
  const kind = stage?.kind || stage?.id;
  const registry = configurationCore.itemRegistry(catalog);
  return [...registry].filter(([id, type]) =>
    capabilityCore.stageAllowsItem(kind, id, type, catalog)
  ).map(([id]) => {
    const module = catalog.modules.find((item) => item.entityId === id);
    const entry = [...catalog.accessories, ...catalog.services].find((item) => item.entityId === id || item.id === id);
    return {
      id,
      label: module
        ? `${module.referenceLabel} · ${model.objects[id]?.title || module.title}`
        : model.objects[id]?.title || entry?.title || configuredHierarchyItemLabel(id) || id
    };
  });
}

function stageItemIds(stage) {
  return hierarchyEditor.itemIds(stage);
}

function itemBehavior(itemId) {
  const kind = configurationCore.itemRegistry(catalog).get(itemId);
  return capabilityCore.behaviorForKind(kind);
}

function sectionBehavior(section) {
  return section?.behavior || itemBehavior(section?.itemIds?.[0]);
}

function itemLabel(stageId, itemId) {
  return getItemOptions(stageId).find((item) => item.id === itemId)?.label
    || model.objects[itemId]?.title
    || configuredHierarchyItemLabel(itemId)
    || itemId;
}

function hierarchyErrors(candidate) {
  return hierarchyCore.validate(candidate, configurationCore, catalog, priceBook, scene);
}

function commitHierarchy(candidate, successMessage = "") {
  if (candidate === model) return false;
  const errors = hierarchyErrors(candidate);
  if (errors.length) {
    setMessage(saveMessage, errors[0], "error");
    return false;
  }
  model = candidate;
  if (successMessage) setMessage(saveMessage, successMessage, "success");
  renderStages();
  return true;
}

function defaultEmptyPlacement(stage, itemId) {
  const behavior = hierarchyCore.defaultSectionBehavior(stage, itemId, configurationCore, catalog, hierarchyDefaults) || itemBehavior(itemId);
  const sectionLabel = itemLabel(stage.id, itemId);
  return {
    groupId: hierarchyEditor.uniqueId(new Set(), `${stage.id}-group`, "group"),
    groupLabel: stage.label || "Grupo",
    sectionId: hierarchyEditor.uniqueId(new Set(), `${stage.id}-items`, "items"),
    sectionLabel,
    behavior,
    component: presentationCore.componentForBehavior(behavior),
    columnSpan: 2
  };
}

function compatibleDestinationOptions(itemId) {
  const options = [];
  model.stages.forEach((stage) => {
    if (!getItemOptions(stage.id).some((item) => item.id === itemId)) return;
    const behavior = hierarchyCore.defaultSectionBehavior(stage, itemId, configurationCore, catalog, hierarchyDefaults) || itemBehavior(itemId);
    if (!stage.groups.length) {
      options.push({
        value: `${stage.id}||`,
        label: `${stage.label} · criar grupo/seção inicial`
      });
      return;
    }
    stage.groups.forEach((group) => group.sections.forEach((section) => {
      if (sectionBehavior(section) !== behavior) return;
      options.push({
        value: `${stage.id}|${group.id}|${section.id}`,
        label: `${stage.label} › ${group.label} › ${section.label}`
      });
    }));
  });
  return options;
}

function placeItemAtTarget(itemId, targetValue) {
  const [stageId, groupId, sectionId] = targetValue.split("|");
  const stage = model.stages.find((entry) => entry.id === stageId);
  if (!stage) return;
  let candidate;
  if (!groupId || !sectionId) {
    candidate = hierarchyEditor.placeItemInEmptyStage(model, itemId, stageId, defaultEmptyPlacement(stage, itemId));
  } else {
    candidate = hierarchyEditor.moveItem(model, itemId, { stageId, groupId, sectionId });
  }
  commitHierarchy(candidate);
}

function appendInitialStateControl(option, itemId, item) {
  const kind = configurationCore.itemRegistry(catalog).get(itemId);
  if (["module", "object"].includes(kind)) {
    const initial = document.createElement("input");
    initial.type = "checkbox";
    initial.checked = Boolean(model.initialState.entities[itemId]);
    initial.dataset.initialEntity = itemId;
    initial.setAttribute("aria-label", `${item.label}: ativo inicialmente`);
    const label = document.createElement("label");
    label.className = "initial-state-option";
    label.append(initial, document.createTextNode("Iniciar ativo"));
    option.append(label);
  } else if (kind === "service") {
    const initial = document.createElement("input");
    initial.type = "checkbox";
    initial.checked = model.initialState.services.includes(itemId);
    initial.dataset.initialService = itemId;
    initial.setAttribute("aria-label", `${item.label}: ativo inicialmente`);
    const label = document.createElement("label");
    label.className = "initial-state-option";
    label.append(initial, document.createTextNode("Iniciar ativo"));
    option.append(label);
  }
}

function makeOrderButtons(upData, downData, index, length, label) {
  const controls = document.createElement("div");
  controls.className = "hierarchy-order";
  const up = document.createElement("button");
  up.type = "button";
  up.textContent = "↑";
  up.title = `Mover ${label} para cima`;
  up.setAttribute("aria-label", up.title);
  up.disabled = index === 0;
  Object.entries(upData).forEach(([key, value]) => { up.dataset[key] = value; });
  const down = document.createElement("button");
  down.type = "button";
  down.textContent = "↓";
  down.title = `Mover ${label} para baixo`;
  down.setAttribute("aria-label", down.title);
  down.disabled = index === length - 1;
  Object.entries(downData).forEach(([key, value]) => { down.dataset[key] = value; });
  controls.append(up, down);
  return controls;
}

function hierarchyChoiceOptions(itemId) {
  const kind = configurationCore.itemRegistry(catalog).get(itemId);
  const source = capabilityCore.itemCapabilities(itemId, kind, catalog).optionSource;
  if (!source) return [];

  if (source === "handles") {
    const available = new Set(model.materialGroups.find((entry) => entry.id === itemId)?.materialIds || []);
    return catalog.options.handles.map((handle) => {
      const product = model.handleProducts.find((entry) => entry.priceEntryId === handle.id || entry.id === handle.id);
      const alwaysAvailable = handle.id === "none" || handle.isAbsence;
      return {
        id: handle.id,
        label: handle.label,
        available: alwaysAvailable || Boolean(product && available.has(product.id))
      };
    });
  }

  if (source === "finishes") {
    const group = model.materialGroups.find((entry) => entry.id === itemId);
    const allowed = new Set(group?.materialIds || []);
    return catalog.options.finishes.map((finish) => {
      const settings = model.finishes.find((entry) => entry.id === finish.id);
      return {
        id: finish.id,
        label: finish.publicLabel || finish.label || finish.id,
        available: allowed.has(finish.id) && Boolean(settings?.enabled) && settings?.scope === "global"
      };
    });
  }

  if (source === "stonePackages") {
    const group = model.materialGroups.find((entry) => entry.id === itemId);
    const allowed = new Set(group?.materialIds || []);
    return catalog.options.stonePackages.map((stone) => ({
      id: stone.id,
      label: stone.label,
      available: !group || allowed.has(stone.id)
    }));
  }

  return [];
}

function appendHierarchyChoiceOptions(container, itemId) {
  const choices = hierarchyChoiceOptions(itemId);
  if (!choices.length) return;

  const details = document.createElement("details");
  details.className = "hierarchy-choice-options";
  details.dataset.hierarchyChoiceList = itemId;
  const kind = configurationCore.itemRegistry(catalog).get(itemId);
  details.open = capabilityCore.itemCapabilities(itemId, kind, catalog).optionsOpenByDefault;

  const summary = document.createElement("summary");
  const availableCount = choices.filter((choice) => choice.available).length;
  summary.textContent = `Opções do item · ${availableCount} disponível(is)`;

  const note = document.createElement("p");
  note.className = "admin-note hierarchy-choice-options__note";
  note.textContent = "Estas são opções do item, não itens hierárquicos independentes. Disponibilidade e dados comerciais continuam nas abas próprias.";

  const list = document.createElement("div");
  list.className = "hierarchy-choice-options__list";
  choices.forEach((choice) => {
    const row = document.createElement("div");
    row.className = "hierarchy-choice-option";
    row.dataset.hierarchyChoiceOption = choice.id;
    row.dataset.available = String(choice.available);

    const label = document.createElement("span");
    label.textContent = choice.label;

    const status = document.createElement("small");
    status.textContent = choice.available ? "Disponível" : "Indisponível";
    row.append(label, status);
    list.append(row);
  });

  details.append(summary, note, list);
  container.append(details);
}

function renderItem(stage, group, section, itemId, itemIndex) {
  const item = { id: itemId, label: itemLabel(stage.id, itemId) };
  const option = document.createElement("article");
  option.className = "hierarchy-item";
  option.dataset.hierarchyItem = itemId;

  const heading = document.createElement("div");
  heading.className = "hierarchy-item__heading";
  const label = document.createElement("strong");
  label.textContent = item.label;
  const order = makeOrderButtons(
    { moveHierarchyItem: `${itemId}:-1` },
    { moveHierarchyItem: `${itemId}:1` },
    itemIndex,
    section.itemIds.length,
    item.label
  );
  heading.append(label, order);
  option.append(heading);

  appendInitialStateControl(option, itemId, item);
  appendHierarchyChoiceOptions(option, itemId);

  const moveLabel = document.createElement("label");
  moveLabel.className = "hierarchy-move";
  moveLabel.append(document.createTextNode("Mover para"));
  const move = document.createElement("select");
  move.dataset.moveHierarchyItemTarget = itemId;
  const current = `${stage.id}|${group.id}|${section.id}`;
  compatibleDestinationOptions(itemId).forEach((destination) => {
    const choice = document.createElement("option");
    choice.value = destination.value;
    choice.textContent = destination.label;
    choice.selected = destination.value === current;
    move.append(choice);
  });
  moveLabel.append(move);
  option.append(moveLabel);

  const actions = document.createElement("div");
  actions.className = "hierarchy-item__actions";
  if (section.itemIds.length > 1) {
    const split = document.createElement("button");
    split.type = "button";
    split.className = "button button--secondary button--compact";
    split.textContent = "Nova seção";
    split.dataset.splitHierarchyItem = itemId;
    split.dataset.stageId = stage.id;
    split.dataset.groupId = group.id;
    split.dataset.sectionId = section.id;
    actions.append(split);
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "button button--secondary button--compact";
  remove.textContent = "Retirar";
  remove.dataset.removeHierarchyItem = itemId;
  actions.append(remove);
  option.append(actions);
  return option;
}

function renderSection(stage, group, section, sectionIndex) {
  const card = document.createElement("section");
  card.className = "hierarchy-section";
  card.dataset.hierarchySection = section.id;

  const header = document.createElement("div");
  header.className = "hierarchy-section__header";
  const name = document.createElement("label");
  name.className = "hierarchy-name";
  name.append(document.createTextNode("Seção"));
  const input = document.createElement("input");
  input.type = "text";
  input.value = section.label;
  input.maxLength = 40;
  input.dataset.sectionLabel = `${stage.id}|${group.id}|${section.id}`;
  name.append(input);

  const presentation = document.createElement("label");
  presentation.className = "hierarchy-field";
  presentation.append(document.createTextNode("Componente"));
  const select = document.createElement("select");
  select.dataset.sectionComponent = `${stage.id}|${group.id}|${section.id}`;
  hierarchyCore.COMPONENTS.filter((value) => presentationCore.componentSupportsBehavior(value, section.behavior)).forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === section.component;
    select.append(option);
  });
  presentation.append(select);

  const order = makeOrderButtons(
    { moveHierarchySection: `${stage.id}|${group.id}|${section.id}|-1` },
    { moveHierarchySection: `${stage.id}|${group.id}|${section.id}|1` },
    sectionIndex,
    group.sections.length,
    section.label
  );
  header.append(name, presentation, order);
  card.append(header);

  if (stage.groups.length > 1) {
    const moveGroupLabel = document.createElement("label");
    moveGroupLabel.className = "hierarchy-move";
    moveGroupLabel.append(document.createTextNode("Mover seção para grupo"));
    const moveGroup = document.createElement("select");
    moveGroup.dataset.moveSectionGroup = `${stage.id}|${group.id}|${section.id}`;
    stage.groups.forEach((candidate) => {
      const option = document.createElement("option");
      option.value = candidate.id;
      option.textContent = candidate.label;
      option.selected = candidate.id === group.id;
      moveGroup.append(option);
    });
    moveGroupLabel.append(moveGroup);
    card.append(moveGroupLabel);
  }

  const items = document.createElement("div");
  items.className = "hierarchy-items";
  section.itemIds.forEach((itemId, index) => items.append(renderItem(stage, group, section, itemId, index)));
  card.append(items);

  const actions = document.createElement("div");
  actions.className = "hierarchy-section__actions";
  if (group.sections.length > 1) {
    const split = document.createElement("button");
    split.type = "button";
    split.className = "button button--secondary button--compact";
    split.textContent = "Mover para novo grupo";
    split.dataset.splitHierarchySection = `${stage.id}|${group.id}|${section.id}`;
    actions.append(split);

    const merge = document.createElement("button");
    merge.type = "button";
    merge.className = "button button--secondary button--compact";
    merge.textContent = "Remover seção e unir";
    merge.dataset.mergeHierarchySection = `${stage.id}|${group.id}|${section.id}|${sectionIndex === 0 ? "next" : "previous"}`;
    actions.append(merge);
  }
  card.append(actions);
  return card;
}

function renderGroup(stage, group, groupIndex) {
  const card = document.createElement("section");
  card.className = "hierarchy-group";
  card.dataset.hierarchyGroup = group.id;

  const header = document.createElement("div");
  header.className = "hierarchy-group__header";
  const name = document.createElement("label");
  name.className = "hierarchy-name";
  name.append(document.createTextNode("Grupo"));
  const input = document.createElement("input");
  input.type = "text";
  input.value = group.label;
  input.maxLength = 40;
  input.dataset.groupLabel = `${stage.id}|${group.id}`;
  name.append(input);

  const span = document.createElement("label");
  span.className = "hierarchy-field";
  span.append(document.createTextNode("Largura"));
  const select = document.createElement("select");
  select.dataset.groupSpan = `${stage.id}|${group.id}`;
  hierarchyCore.COLUMN_SPANS.forEach((value) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = value === 2 ? "2 colunas" : "1 coluna";
    option.selected = value === group.columnSpan;
    select.append(option);
  });
  span.append(select);

  const order = makeOrderButtons(
    { moveHierarchyGroup: `${stage.id}|${group.id}|-1` },
    { moveHierarchyGroup: `${stage.id}|${group.id}|1` },
    groupIndex,
    stage.groups.length,
    group.label
  );
  header.append(name, span, order);
  card.append(header);

  const sections = document.createElement("div");
  sections.className = "hierarchy-sections";
  group.sections.forEach((section, index) => sections.append(renderSection(stage, group, section, index)));
  card.append(sections);

  if (stage.groups.length > 1) {
    const merge = document.createElement("button");
    merge.type = "button";
    merge.className = "button button--secondary button--compact hierarchy-group__merge";
    merge.textContent = "Remover grupo e unir conteúdo";
    merge.dataset.mergeHierarchyGroup = `${stage.id}|${group.id}|${groupIndex === 0 ? "next" : "previous"}`;
    card.append(merge);
  }
  return card;
}

function renderStages() {
  stagesList.replaceChildren();
  const assigned = new Set(model.stages.flatMap(stageItemIds));
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
  availableItems.setAttribute("aria-label", "Itens do catálogo sem seção");
  const availableHeading = document.createElement("h2");
  availableHeading.textContent = "Itens disponíveis";
  const availableHint = document.createElement("p");
  availableHint.className = "admin-note";
  availableHint.textContent = "Itens pertencem a seções explícitas. Escolha uma seção compatível ou crie a estrutura inicial de uma etapa vazia.";
  const availableGrid = document.createElement("div");
  availableGrid.className = "stage-unassigned__items";

  availableById.forEach((item) => {
    const chip = document.createElement("article");
    chip.className = "stage-pool-item hierarchy-pool-item";
    const title = document.createElement("strong");
    title.textContent = item.label;
    const select = document.createElement("select");
    select.dataset.placeHierarchyItemTarget = item.id;
    compatibleDestinationOptions(item.id).forEach((destination) => {
      const option = document.createElement("option");
      option.value = destination.value;
      option.textContent = destination.label;
      select.append(option);
    });
    const add = document.createElement("button");
    add.type = "button";
    add.className = "button button--secondary button--compact";
    add.textContent = "Adicionar";
    add.dataset.placeHierarchyItem = item.id;
    add.disabled = !select.options.length;
    chip.append(title, select, add);
    availableGrid.append(chip);
  });
  if (!availableById.size) {
    const empty = document.createElement("span");
    empty.className = "admin-note";
    empty.textContent = "Todos os itens compatíveis já pertencem a uma seção.";
    availableGrid.append(empty);
  }
  availableItems.append(availableHeading, availableHint, availableGrid);
  stagesList.append(availableItems);

  model.stages.forEach((stage, index) => {
    const card = document.createElement("article");
    card.className = "stage-card";
    card.dataset.hierarchyStage = stage.id;

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
    nameInput.maxLength = 40;
    nameInput.value = stage.label;
    nameInput.dataset.stageLabel = stage.id;
    nameInput.setAttribute("aria-label", `Nome da etapa ${stage.label}`);
    nameLabel.append(nameInput);

    const order = makeOrderButtons(
      { moveStage: `${stage.id}:-1` },
      { moveStage: `${stage.id}:1` },
      index,
      model.stages.length,
      stage.label
    );

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
    enabledInput.disabled = stage.id === "modules" || stage.id === "summary" || stageItemIds(stage).length === 0;
    enabledInput.setAttribute("aria-label", `Ativar etapa ${stage.label}`);
    enabledLabel.append(enabledInput, document.createTextNode(stage.enabled ? "Ativa" : "Inativa"));
    top.append(number, nameLabel, order, actions, enabledLabel);
    card.append(top);

    const hierarchy = document.createElement("div");
    hierarchy.className = "stage-hierarchy";
    if (stage.groups.length) {
      stage.groups.forEach((group, groupIndex) => hierarchy.append(renderGroup(stage, group, groupIndex)));
    } else {
      const empty = document.createElement("p");
      empty.className = "stage-drop-hint";
      empty.textContent = "Etapa vazia. Adicione um item disponível para criar o primeiro grupo e seção.";
      hierarchy.append(empty);
    }
    card.append(hierarchy);
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
  if (targetId === "stone-all") {
    const rules = model.pricing.roles.globalAdjustment;
    if (enabled) rules[materialId] ??= { type: "amount", cents: 0 };
    else if (!Object.hasOwn(catalogPricing.roles.globalAdjustment, materialId)) delete rules[materialId];
  }
  if (targetId === "fronts-all") {
    const rules = model.pricing.roles.frontFinishAdjustment;
    if (enabled) rules[materialId] ??= { type: "percentage", bps: 0, basis: "eligible-module-base" };
    else if (!Object.hasOwn(catalogPricing.roles.frontFinishAdjustment, materialId)) delete rules[materialId];
  }
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
    const chip = document.createElement("span"); chip.className = "material-chip"; chip.style.backgroundColor = material.color || "transparent"; if (material.textureAsset) chip.style.backgroundImage = `url("${material.textureAsset}")`;
    const title = document.createElement("h2"); title.textContent = material.label;
    card.append(chip, title, makeField("Nome", material.label, "materialLabel"));
    const colorLabel = document.createElement("label"); colorLabel.className = "data-field"; colorLabel.append(document.createTextNode("Cor base"));
    const color = document.createElement("input"); color.type = "color"; color.value = material.color || "#b7b0a7"; color.disabled = material.color === null; color.dataset.materialColor = "true"; colorLabel.append(color); card.append(colorLabel);
    const noColorLabel = document.createElement("label"); noColorLabel.className = "data-field";
    const noColor = document.createElement("input"); noColor.type = "checkbox"; noColor.checked = material.color === null; noColor.disabled = material.kind !== "texture"; noColor.dataset.materialNoColor = "true";
    noColorLabel.append(noColor, document.createTextNode(" Sem cor/tinta base")); card.append(noColorLabel);
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
  if (section === "localAdjustment") return `${catalog.modules.find((item) => item.entityId === id.split(":")[0])?.referenceLabel || id} · ${id.split(":").slice(1).join(":")}`;
  return id;
}

function renderPricing() {
  pricingList.replaceChildren();
  pricingRoles.forEach(([role, title]) => {
    const card = document.createElement("article");
    card.className = "editor-card pricing-card";
    const heading = document.createElement("h2"); heading.textContent = title; card.append(heading);
    const capabilities = pricingContract.ROLE_CAPABILITIES[role];
    Object.entries(model.pricing.roles[role]).forEach(([id, rule]) => {
      const percentage = rule.type === "percentage";
      const storedValue = percentage ? rule.bps : rule.cents;
      const publicLabel = priceLabel(role, id);
      const row = document.createElement("div");
      row.className = "data-field pricing-field";
      const copy = document.createElement("span");
      copy.className = "pricing-field__label";
      copy.textContent = publicLabel;

      if ((capabilities?.types || []).length > 1) {
        row.classList.add("pricing-field--typed");
        const select = document.createElement("select");
        select.dataset.priceRuleType = "true";
        select.dataset.priceRole = role;
        select.dataset.priceId = id;
        select.setAttribute("aria-label", `Tipo de preço: ${publicLabel}`);
        capabilities.types.forEach((type) => {
          const option = document.createElement("option");
          option.value = type;
          option.textContent = pricingTypeLabels[type] || type;
          option.selected = type === rule.type;
          select.append(option);
        });
        row.append(copy, select);
      } else {
        row.append(copy);
      }

      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "0.01";
      input.value = (storedValue / 100).toFixed(2);
      input.dataset.priceRole = role;
      input.dataset.priceId = id;
      input.dataset.priceType = rule.type;
      input.setAttribute("aria-label", `Valor de ${publicLabel}`);

      const unit = document.createElement("small");
      unit.className = "pricing-unit";
      unit.textContent = percentage ? "%" : "R$";
      row.append(input, unit);

      if (percentage && rule.basis) {
        const basis = document.createElement("small");
        basis.className = "pricing-basis";
        basis.textContent = pricingBasisLabels[rule.basis] || `Base: ${rule.basis}`;
        row.append(basis);
      }
      card.append(row);
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

function baselineHierarchyFor(source) {
  return hierarchyCore.upgrade(source, configurationCore, flowCore, catalog, priceBook, scene, hierarchyDefaults);
}

function handlesRepairPlan(source = publishedSource) {
  if (!source || source.schemaVersion !== configurationCore.SCHEMA || !legacyStageRepair) return null;
  return legacyStageRepair.planHandlesAssignment(source, configurationCore.SCHEMA);
}

function refreshHandlesRepairState() {
  const plan = handlesRepairPlan();
  const needed = Boolean(plan?.ok && plan.needed);
  persistHandlesButton.hidden = !needed;
  persistHandlesButton.disabled = false;
  return plan;
}

async function loadSettings() {
  const response = await fetch("/api/configuration", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 404 ? "A API de configuração ainda não foi publicada." : "Não foi possível carregar a configuração.");
  const published = await response.json();
  publishedSource = structuredClone(published);
  model = baselineHierarchyFor(published);
  byId("revisionLabel").textContent = `Versão ${model.revision || 1} · editor hierárquico`;
  const repair = refreshHandlesRepairState();
  setMessage(
    saveMessage,
    repair?.ok && repair.needed
      ? "Puxadores ainda não está atribuído no v3 publicado. Persista Puxadores no v3 antes da futura publicação hierárquica."
      : published.schemaVersion === hierarchyCore.SCHEMA
        ? "Configuração v5 carregada. A hierarquia e os preços tipados podem ser publicados com validação."
        : "Hierarquia carregada. Alterações estruturais permanecem em rascunho até a publicação hierárquica ser habilitada."
  );
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
  if (event.target.matches("[data-material-no-color]")) {
    const colorInput = card.querySelector("[data-material-color]");
    material.color = event.target.checked ? null : (colorInput?.value || "#b7b0a7");
  }
  if (event.target.matches("[data-material-kind]")) {
    material.kind = event.target.value;
    if (material.kind === "color" && material.color === null) material.color = "#b7b0a7";
  }
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
  model.stages.splice(Math.max(1, model.stages.length - 1), 0, { id, kind, label: label.trim().slice(0, 40), enabled: false, groups: [] });
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
  model.pricing.roles.frontFinishAdjustment[id] = { type: "percentage", bps: 0, basis: "eligible-module-base" };
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
  if (!Object.hasOwn(catalogPricing.roles.frontFinishAdjustment, id)) delete model.pricing.roles.frontFinishAdjustment[id];
  if (!Object.hasOwn(catalogPricing.roles.handleChoiceTotal, id)) delete model.pricing.roles.handleChoiceTotal[id];
  if (!Object.hasOwn(catalogPricing.roles.globalAdjustment, id) && !catalog.services.some((service) => service.id === id)) delete model.pricing.roles.globalAdjustment[id];
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
  const typeSelect = event.target.closest("[data-price-rule-type]");
  if (typeSelect) {
    const role = typeSelect.dataset.priceRole;
    const id = typeSelect.dataset.priceId;
    const capabilities = pricingContract.ROLE_CAPABILITIES[role];
    const nextType = typeSelect.value;
    const rules = model.pricing.roles[role];
    if (!rules?.[id] || !capabilities?.types?.includes(nextType)) return;
    if (nextType === "percentage") {
      const basis = capabilities.percentageBases?.[0];
      if (!basis) return;
      rules[id] = { type: "percentage", bps: 0, basis };
    } else {
      rules[id] = { type: "amount", cents: 0 };
    }
    setMessage(saveMessage, "Tipo de preço alterado. O valor foi zerado para evitar conversão implícita entre R$ e %.", "success");
    renderPricing();
    return;
  }

  const input = event.target.closest("input[data-price-role]");
  if (!input) return;
  const amount = Number(input.value);
  if (!Number.isFinite(amount) || amount < 0) return;
  const rule = model.pricing.roles[input.dataset.priceRole]?.[input.dataset.priceId];
  if (!rule) return;
  const storedValue = Math.round(amount * 100);
  if (rule.type === "percentage") rule.bps = storedValue;
  else rule.cents = storedValue;
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
  const stageInput = event.target.closest("[data-stage-label]");
  if (stageInput) {
    const stage = model.stages.find((item) => item.id === stageInput.dataset.stageLabel);
    if (stage) stage.label = stageInput.value;
    return;
  }
  const groupInput = event.target.closest("[data-group-label]");
  if (groupInput) {
    const [stageId, groupId] = groupInput.dataset.groupLabel.split("|");
    const group = model.stages.find((stage) => stage.id === stageId)?.groups.find((entry) => entry.id === groupId);
    if (group) group.label = groupInput.value;
    return;
  }
  const sectionInput = event.target.closest("[data-section-label]");
  if (sectionInput) {
    const [stageId, groupId, sectionId] = sectionInput.dataset.sectionLabel.split("|");
    const group = model.stages.find((stage) => stage.id === stageId)?.groups.find((entry) => entry.id === groupId);
    const section = group?.sections.find((entry) => entry.id === sectionId);
    if (section) section.label = sectionInput.value;
  }
});

stagesList.addEventListener("change", (event) => {
  const enabled = event.target.closest("[data-stage-enabled]");
  if (enabled) {
    const candidate = structuredClone(model);
    const stage = candidate.stages.find((item) => item.id === enabled.dataset.stageEnabled);
    if (stage) stage.enabled = enabled.checked;
    commitHierarchy(candidate);
    renderAdminTabs();
    return;
  }

  const groupSpan = event.target.closest("[data-group-span]");
  if (groupSpan) {
    const [stageId, groupId] = groupSpan.dataset.groupSpan.split("|");
    const candidate = structuredClone(model);
    const group = candidate.stages.find((stage) => stage.id === stageId)?.groups.find((entry) => entry.id === groupId);
    if (group) group.columnSpan = Number(groupSpan.value);
    commitHierarchy(candidate);
    return;
  }

  const sectionComponent = event.target.closest("[data-section-component]");
  if (sectionComponent) {
    const [stageId, groupId, sectionId] = sectionComponent.dataset.sectionComponent.split("|");
    const candidate = structuredClone(model);
    const group = candidate.stages.find((stage) => stage.id === stageId)?.groups.find((entry) => entry.id === groupId);
    const section = group?.sections.find((entry) => entry.id === sectionId);
    if (section) section.component = sectionComponent.value;
    commitHierarchy(candidate);
    return;
  }

  const sectionGroup = event.target.closest("[data-move-section-group]");
  if (sectionGroup) {
    const [stageId, sourceGroupId, sectionId] = sectionGroup.dataset.moveSectionGroup.split("|");
    const candidate = hierarchyEditor.moveSectionToGroup(model, stageId, sourceGroupId, sectionId, sectionGroup.value);
    commitHierarchy(candidate);
    return;
  }

  const itemTarget = event.target.closest("[data-move-hierarchy-item-target]");
  if (itemTarget) {
    placeItemAtTarget(itemTarget.dataset.moveHierarchyItemTarget, itemTarget.value);
    return;
  }

  const initialEntity = event.target.closest("[data-initial-entity]");
  if (initialEntity) {
    model.initialState.entities[initialEntity.dataset.initialEntity] = initialEntity.checked;
    return;
  }
  const initialService = event.target.closest("[data-initial-service]");
  if (initialService) {
    const services = new Set(model.initialState.services);
    if (initialService.checked) services.add(initialService.dataset.initialService);
    else services.delete(initialService.dataset.initialService);
    model.initialState.services = [...services];
  }
});

stagesList.addEventListener("click", (event) => {
  const removeStage = event.target.closest("[data-remove-stage]");
  if (removeStage && !removeStage.disabled) {
    const candidate = structuredClone(model);
    const target = candidate.stages.find((stage) => stage.id === removeStage.dataset.removeStage);
    if (!target) return;
    candidate.stages = candidate.stages.filter((stage) => stage !== target);
    commitHierarchy(candidate);
    return;
  }

  const moveStage = event.target.closest("[data-move-stage]");
  if (moveStage) {
    const [stageId, direction] = moveStage.dataset.moveStage.split(":");
    commitHierarchy(hierarchyEditor.moveStage(model, stageId, Number(direction)));
    return;
  }

  const moveGroup = event.target.closest("[data-move-hierarchy-group]");
  if (moveGroup) {
    const [stageId, groupId, direction] = moveGroup.dataset.moveHierarchyGroup.split("|");
    commitHierarchy(hierarchyEditor.moveGroup(model, stageId, groupId, Number(direction)));
    return;
  }

  const moveSection = event.target.closest("[data-move-hierarchy-section]");
  if (moveSection) {
    const [stageId, groupId, sectionId, direction] = moveSection.dataset.moveHierarchySection.split("|");
    commitHierarchy(hierarchyEditor.moveSection(model, stageId, groupId, sectionId, Number(direction)));
    return;
  }

  const moveItem = event.target.closest("[data-move-hierarchy-item]");
  if (moveItem) {
    const [itemId, direction] = moveItem.dataset.moveHierarchyItem.split(":");
    commitHierarchy(hierarchyEditor.reorderItem(model, itemId, Number(direction)));
    return;
  }

  const placeItem = event.target.closest("[data-place-hierarchy-item]");
  if (placeItem) {
    const itemId = placeItem.dataset.placeHierarchyItem;
    const select = placeItem.closest(".hierarchy-pool-item")?.querySelector("[data-place-hierarchy-item-target]");
    if (select?.value) placeItemAtTarget(itemId, select.value);
    return;
  }

  const splitItem = event.target.closest("[data-split-hierarchy-item]");
  if (splitItem) {
    const label = window.prompt("Nome da nova seção", itemLabel(splitItem.dataset.stageId, splitItem.dataset.splitHierarchyItem));
    if (!label?.trim()) return;
    const stage = model.stages.find((entry) => entry.id === splitItem.dataset.stageId);
    const sectionIds = new Set((stage?.groups || []).flatMap((group) => group.sections.map((section) => section.id)));
    const sectionId = hierarchyEditor.uniqueId(sectionIds, label, "secao");
    const itemId = splitItem.dataset.splitHierarchyItem;
    const behavior = hierarchyCore.defaultSectionBehavior(stage, itemId, configurationCore, catalog, hierarchyDefaults) || itemBehavior(itemId);
    const candidate = hierarchyEditor.splitItemToSection(model, itemId, {
      sectionId,
      label: label.trim().slice(0, 40),
      behavior,
      component: presentationCore.componentForBehavior(behavior)
    });
    commitHierarchy(candidate);
    return;
  }

  const splitSection = event.target.closest("[data-split-hierarchy-section]");
  if (splitSection) {
    const [stageId, groupId, sectionId] = splitSection.dataset.splitHierarchySection.split("|");
    const stage = model.stages.find((entry) => entry.id === stageId);
    const section = stage?.groups.find((group) => group.id === groupId)?.sections.find((entry) => entry.id === sectionId);
    const label = window.prompt("Nome do novo grupo", section?.label || "Novo grupo");
    if (!label?.trim()) return;
    const groupIds = new Set((stage?.groups || []).map((group) => group.id));
    const nextGroupId = hierarchyEditor.uniqueId(groupIds, label, "grupo");
    const candidate = hierarchyEditor.splitSectionToGroup(model, stageId, groupId, sectionId, {
      groupId: nextGroupId,
      label: label.trim().slice(0, 40),
      columnSpan: 1
    });
    commitHierarchy(candidate);
    return;
  }

  const mergeSection = event.target.closest("[data-merge-hierarchy-section]");
  if (mergeSection) {
    const [stageId, groupId, sectionId, direction] = mergeSection.dataset.mergeHierarchySection.split("|");
    const candidate = direction === "next"
      ? hierarchyEditor.mergeSectionIntoNext(model, stageId, groupId, sectionId)
      : hierarchyEditor.mergeSectionIntoPrevious(model, stageId, groupId, sectionId);
    commitHierarchy(candidate);
    return;
  }

  const mergeGroup = event.target.closest("[data-merge-hierarchy-group]");
  if (mergeGroup) {
    const [stageId, groupId, direction] = mergeGroup.dataset.mergeHierarchyGroup.split("|");
    const candidate = direction === "next"
      ? hierarchyEditor.mergeGroupIntoNext(model, stageId, groupId)
      : hierarchyEditor.mergeGroupIntoPrevious(model, stageId, groupId);
    commitHierarchy(candidate);
    return;
  }

  const removeItem = event.target.closest("[data-remove-hierarchy-item]");
  if (removeItem) {
    commitHierarchy(hierarchyEditor.removeItem(model, removeItem.dataset.removeHierarchyItem));
  }
});

persistHandlesButton.addEventListener("click", async () => {
  persistHandlesButton.disabled = true;
  saveButton.disabled = true;
  try {
    if (!publishedSource) throw new Error("A configuração publicada ainda não foi carregada.");
    if (publishedSource.schemaVersion !== configurationCore.SCHEMA) throw new Error("A persistência isolada de Puxadores é exclusiva do v3.");
    const baseline = baselineHierarchyFor(publishedSource);
    const hasLocalDraft = JSON.stringify(model) !== JSON.stringify(baseline);
    if (hasLocalDraft) {
      const confirmed = window.confirm(
        "Há alterações locais no painel. Esta operação publicará somente Puxadores no schema v3 e recarregará o painel; outras alterações locais não serão publicadas. Continuar?"
      );
      if (!confirmed) {
        setMessage(saveMessage, "Persistência de Puxadores cancelada; nenhuma alteração foi publicada.");
        return;
      }
    }

    setMessage(saveMessage, "Relendo a configuração publicada antes de persistir Puxadores…");
    const freshResponse = await fetch("/api/configuration", { credentials: "same-origin", cache: "no-store" });
    if (!freshResponse.ok) throw new Error("Não foi possível reler a configuração publicada.");
    const fresh = await freshResponse.json();

    if (JSON.stringify(fresh) !== JSON.stringify(publishedSource)) {
      publishedSource = structuredClone(fresh);
      model = baselineHierarchyFor(fresh);
      refreshHandlesRepairState();
      renderAdminTabs();
      throw new Error("A configuração mudou desde que o painel foi aberto. O painel foi recarregado; revise o estado antes de tentar novamente.");
    }

    const plan = handlesRepairPlan(fresh);
    if (!plan?.ok) throw new Error(plan?.message || "Não foi possível preparar a atribuição de Puxadores.");
    if (!plan.needed) {
      publishedSource = structuredClone(fresh);
      model = baselineHierarchyFor(fresh);
      refreshHandlesRepairState();
      renderAdminTabs();
      setMessage(saveMessage, "Puxadores já está persistido em Acabamentos.", "success");
      return;
    }

    const delta = legacyStageRepair.verifyHandlesOnlyDelta(fresh, plan.candidate, configurationCore.SCHEMA);
    if (!delta.ok) throw new Error(delta.message || "A alteração proposta não é exclusivamente a atribuição de Puxadores.");

    const validationErrors = configurationCore.validateConfiguratorSettings(plan.candidate, catalog, priceBook, scene);
    if (validationErrors.length) throw new Error(validationErrors[0]);

    setMessage(saveMessage, "Persistindo apenas Puxadores em Acabamentos no schema v3…");
    const response = await fetch("/api/configuration", {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Configuration-Operation": "persist-handles-all"
      },
      body: JSON.stringify(plan.candidate)
    });
    const payload = await response.json().catch(() => null);
    if (response.status === 401 || response.status === 403) throw new Error("Sua sessão não tem permissão para persistir Puxadores.");
    if (response.status === 409) throw new Error("A configuração mudou durante a gravação. Recarregue o painel antes de tentar novamente.");
    if (!response.ok) throw new Error(payload?.message || "A API recusou a gravação isolada de Puxadores.");

    const expected = configurationCore.normalizeConfiguratorSettings(plan.candidate, catalog, priceBook, scene);
    expected.revision = fresh.revision + 1;
    if (JSON.stringify(payload) !== JSON.stringify(expected)) {
      throw new Error("A resposta da gravação não corresponde ao candidato v3 esperado.");
    }

    const readbackResponse = await fetch("/api/configuration", { credentials: "same-origin", cache: "no-store" });
    if (!readbackResponse.ok) throw new Error("Puxadores foi gravado, mas a releitura de confirmação falhou.");
    const readback = await readbackResponse.json();
    if (JSON.stringify(readback) !== JSON.stringify(expected)) {
      throw new Error("A releitura não corresponde exatamente ao v3 esperado após persistir Puxadores.");
    }

    publishedSource = structuredClone(readback);
    model = baselineHierarchyFor(readback);
    byId("revisionLabel").textContent = `Versão ${model.revision} · editor hierárquico`;
    refreshHandlesRepairState();
    renderAdminTabs();
    setMessage(
      saveMessage,
      hasLocalDraft
        ? "Puxadores foi persistido em Acabamentos no v3 publicado. O painel foi recarregado a partir do publicado; outras alterações locais não foram enviadas."
        : "Puxadores foi persistido em Acabamentos no v3 publicado. A publicação hierárquica v5 continua bloqueada.",
      "success"
    );
  } catch (error) {
    setMessage(saveMessage, error.message || "Falha ao persistir Puxadores.", "error");
  } finally {
    saveButton.disabled = false;
    if (!persistHandlesButton.hidden) persistHandlesButton.disabled = false;
  }
});

saveButton.addEventListener("click", async () => {
  saveButton.disabled = true;
  try {
    const hierarchyValidation = hierarchyErrors(model);
    if (hierarchyValidation.length) throw new Error(hierarchyValidation[0]);
    if (!publishedSource) throw new Error("A configuração publicada ainda não foi carregada.");

    if (publishedSource.schemaVersion === hierarchyCore.SCHEMA) {
      if (model.revision !== publishedSource.revision) {
        throw new Error("O rascunho não corresponde à revisão publicada. Recarregue antes de salvar.");
      }
      const candidate = hierarchyCore.normalize(model);
      const expected = hierarchyCore.normalize({
        ...structuredClone(candidate), revision: publishedSource.revision + 1
      });
      setMessage(saveMessage, "Publicando configuração hierárquica v5…");
      const response = await fetch("/api/configuration", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidate)
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 401 || response.status === 403) {
        throw new Error("Sua sessão não tem permissão para publicar esta configuração.");
      }
      if (response.status === 409) {
        throw new Error("A configuração mudou em outra sessão. Recarregue o painel antes de salvar.");
      }
      if (!response.ok) throw new Error(payload?.message || payload?.error || "A API recusou a publicação v5.");
      if (JSON.stringify(payload) !== JSON.stringify(expected)) {
        throw new Error("A resposta de publicação v5 não corresponde ao documento esperado.");
      }

      const readbackResponse = await fetch("/api/configuration", {
        credentials: "same-origin", cache: "no-store"
      });
      if (!readbackResponse.ok) {
        throw new Error("A publicação v5 foi aceita, mas a releitura de confirmação falhou.");
      }
      const readback = await readbackResponse.json();
      if (JSON.stringify(readback) !== JSON.stringify(expected)) {
        throw new Error("A releitura v5 não corresponde à revisão publicada; nenhuma confirmação foi assumida.");
      }
      publishedSource = structuredClone(readback);
      model = baselineHierarchyFor(readback);
      byId("revisionLabel").textContent = `Versão ${model.revision} · editor hierárquico`;
      refreshHandlesRepairState();
      renderAdminTabs();
      setMessage(saveMessage, "Configuração v5 publicada e verificada por releitura.", "success");
      return;
    }

    if (publishedSource.schemaVersion !== configurationCore.SCHEMA) {
      throw new Error("O schema publicado não é compatível com este editor.");
    }

    const projection = hierarchyCore.projectToLegacy(
      model,
      configurationCore,
      flowCore,
      catalog,
      priceBook,
      scene,
      hierarchyDefaults
    );
    if (!projection.ok) {
      if (projection.code === "hierarchy_requires_publication") {
        setMessage(
          saveMessage,
          "A hierarquia foi alterada. Este rascunho não será achatado no schema publicado; publique a hierarquia apenas no checkpoint autenticado.",
          "error"
        );
        return;
      }
      if (projection.code === "pricing_requires_publication") {
        setMessage(
          saveMessage,
          "Este tipo de preço exige a futura publicação consolidada. Nenhuma configuração foi publicada; use Percentual para manter compatibilidade com o schema atual.",
          "error"
        );
        return;
      }
      throw new Error(projection.errors?.[0] || "A hierarquia não pode ser publicada com segurança.");
    }

    setMessage(saveMessage, "Publicando configuração compatível…");
    const response = await fetch("/api/configuration", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projection.value)
    });
    if (response.status === 401 || response.status === 403) throw new Error("Sua sessão não tem permissão para publicar esta configuração.");
    if (response.status === 409) throw new Error("A configuração mudou em outra sessão. Recarregue o painel antes de salvar.");
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      if (payload?.error === "hierarchy_publication_required") throw new Error("A API bloqueou uma publicação hierárquica antes do checkpoint autorizado.");
      throw new Error(payload?.message || "A configuração não foi aceita. Confira nomes e itens selecionados.");
    }
    model = hierarchyCore.upgrade(payload, configurationCore, flowCore, catalog, priceBook, scene, hierarchyDefaults);
    publishedSource = structuredClone(payload);
    byId("revisionLabel").textContent = `Versão ${model.revision} · editor hierárquico`;
    refreshHandlesRepairState();
    setMessage(saveMessage, "Configuração compatível publicada. A hierarquia estrutural continua protegida contra publicação prematura.", "success");
    renderAdminTabs();
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
