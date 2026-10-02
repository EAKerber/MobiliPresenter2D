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

const defaults = window.CASA_EM_MODULOS_CONFIGURATOR_DEFAULTS;
const catalog = window.CASA_EM_MODULOS_CATALOG;
const byId = (id) => document.getElementById(id);
const loginPanel = byId("loginPanel");
const deniedPanel = byId("deniedPanel");
const editorPanel = byId("editorPanel");
const loginForm = byId("loginForm");
const loginMessage = byId("loginMessage");
const passwordActionForm = byId("passwordActionForm");
const stagesList = byId("stagesList");
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

function setMessage(element, message, kind = "") {
  element.textContent = message;
  element.dataset.kind = kind;
}

function isAdmin(user) {
  const roles = [...(user?.roles || []), ...(user?.app_metadata?.roles || [])];
  return roles.includes("admin");
}

function getItemOptions(stageId) {
  if (stageId === "modules") return catalog.modules.map(({ entityId, referenceLabel, title }) => ({ id: entityId, label: `${referenceLabel} · ${title}` }));
  if (stageId === "finishes") return ["fronts-all", "handles-all", "stone-all", "stone-skirting"].map((id) => ({ id, label: labels[id] }));
  if (stageId === "services") return [
    ...catalog.services.map((service) => ({ id: service.id, label: service.title })),
    ...catalog.accessories.map((item) => ({ id: item.entityId, label: item.title }))
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

async function loadSettings() {
  const response = await fetch("/api/configuration", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 404 ? "A API de configuração ainda não foi publicada." : "Não foi possível carregar a configuração.");
  model = await response.json();
  byId("revisionLabel").textContent = `Versão ${model.revision || 1}`;
  renderStages();
}

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
    renderStages();
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
