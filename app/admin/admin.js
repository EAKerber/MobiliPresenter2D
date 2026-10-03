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
const defaults = window.CasaModulesConfiguration.createDefaultAdministration(settingsDefaults, catalog, priceBook);
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
const saveButton = byId("saveButton");
const saveMessage = byId("saveMessage");
const logoutButton = byId("logoutButton");
let model = structuredClone(defaults);
let inviteToken = null;

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
  if (stageId === "modules") return catalog.modules.map(({ entityId, referenceLabel, title }) => ({ id: entityId, label: `${referenceLabel} · ${model.objects[entityId]?.title || title}` }));
  if (stageId === "finishes") return ["fronts-all", "handles-all", "stone-all", "stone-skirting"].map((id) => ({ id, label: labels[id] }));
  if (stageId === "services") return [
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

    const enabledLabel = document.createElement("label");
    enabledLabel.className = "switch";
    const enabledInput = document.createElement("input");
    enabledInput.type = "checkbox";
    enabledInput.checked = stage.enabled;
    enabledInput.dataset.stageEnabled = stage.id;
    enabledInput.disabled = stage.id === "modules" || stage.id === "summary" || stage.items.length === 0;
    enabledInput.setAttribute("aria-label", `Ativar etapa ${stage.label}`);
    enabledLabel.append(enabledInput, document.createTextNode(stage.enabled ? "Ativa" : "Inativa"));
    top.append(number, nameLabel, order, enabledLabel);
    card.append(top);

    const items = document.createElement("div");
    items.className = "stage-items";
    items.setAttribute("aria-label", `Itens da etapa ${stage.label}`);
    getItemOptions(stage.id).forEach((item) => {
      const option = document.createElement("label");
      option.className = "item-option";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = stage.items.includes(item.id);
      input.dataset.stageItem = stage.id;
      input.value = item.id;
      input.disabled = stage.enabled && stage.items.length === 1 && input.checked;
      input.setAttribute("aria-label", item.label);
      option.append(input, document.createTextNode(item.label));
      items.append(option);
    });
    card.append(items);
    stagesList.append(card);
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

function renderObjects() {
  objectsList.replaceChildren();
  catalogObjects().forEach(({ id, label }) => {
    const data = model.objects[id];
    const card = document.createElement("article");
    card.className = "editor-card";
    const heading = document.createElement("h2");
    heading.textContent = label;
    card.append(heading,
      makeField("Nome público", data.title, "objectTitle"),
      makeField("Descrição", data.description, "objectDescription"),
      makeField("Destaques (um por linha)", data.benefits, "objectBenefits", true),
      makeField("Componentes (um por linha)", data.components, "objectComponents", true),
      makeField("Requisitos (um por linha)", data.requirements, "objectRequirements", true));
    card.dataset.objectId = id;
    objectsList.append(card);
  });
}

function renderFinishes() {
  finishesList.replaceChildren();
  const globalOptions = model.finishes.filter((item) => item.scope === "global" && item.enabled).length;
  model.finishes.forEach((finish) => {
    const source = catalog.options.finishes.find((item) => item.id === finish.id);
    const card = document.createElement("article");
    card.className = "editor-card finish-admin-card";
    const heading = document.createElement("h2");
    heading.textContent = source.publicLabel;
    const swatch = document.createElement("span");
    swatch.className = "admin-color-swatch";
    swatch.style.backgroundColor = source.color;
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
      modules.setAttribute("aria-label", `Módulos que aceitam ${source.publicLabel}`);
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

function priceLabel(section, id) {
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
  renderStages(); renderObjects(); renderFinishes(); renderPricing();
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
  const item = event.target.closest("[data-stage-item]");
  if (!item) return;
  const stage = model.stages.find((entry) => entry.id === item.dataset.stageItem);
  if (!stage) return;
  stage.items = item.checked ? [...stage.items, item.value] : stage.items.filter((id) => id !== item.value);
  if (stage.id === "finishes" && item.value === "stone-all" && !item.checked) {
    stage.items = stage.items.filter((id) => id !== "stone-skirting");
  }
  if (stage.id === "finishes" && item.value === "stone-skirting" && item.checked && !stage.items.includes("stone-all")) {
    stage.items.push("stone-all");
  }
  renderStages();
});

stagesList.addEventListener("click", (event) => {
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
