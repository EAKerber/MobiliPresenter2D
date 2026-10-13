import { getUser, login, logout, onAuthChange } from "@netlify/identity";

const byId = (id) => document.getElementById(id);
const loginPanel = byId("loginPanel");
const deniedPanel = byId("deniedPanel");
const managerPanel = byId("managerPanel");
const loginStatus = byId("loginStatus");
const managerStatus = byId("managerStatus");
const grantList = byId("grantList");

function rolesFor(user) {
  return new Set([
    ...(Array.isArray(user?.roles) ? user.roles : []),
    ...(Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : []),
  ]);
}

async function renderUser(user) {
  loginStatus.textContent = "";
  loginPanel.hidden = Boolean(user);
  managerPanel.hidden = true;
  deniedPanel.hidden = true;
  if (!user) return;
  if (![...rolesFor(user)].some((role) => role === "admin" || role === "staff")) {
    deniedPanel.hidden = false;
    return;
  }
  managerPanel.hidden = false;
  await refreshGrants();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "request_failed");
  return result;
}

async function refreshGrants() {
  grantList.replaceChildren();
  try {
    const { grants } = await api("/api/access/grants");
    if (!grants.length) {
      const empty = document.createElement("li");
      empty.textContent = "Nenhum acesso registrado.";
      grantList.append(empty);
      return;
    }
    grants.forEach((grant) => {
      const item = document.createElement("li");
      item.className = "grant";
      const details = document.createElement("div");
      const recipient = document.createElement("strong");
      recipient.textContent = grant.recipient_email;
      const state = document.createElement("p");
      const expired = new Date(grant.expires_at).getTime() <= Date.now();
      state.textContent = grant.revoked_at
        ? "Revogado"
        : expired
          ? "Expirado"
        : grant.redeemed_at
          ? `Resgatado · expira ${new Date(grant.expires_at).toLocaleString("pt-BR")}`
          : `Pendente · expira ${new Date(grant.expires_at).toLocaleString("pt-BR")}`;
      details.append(recipient, state);
      item.append(details);
      if (!grant.revoked_at && new Date(grant.expires_at).getTime() > Date.now()) {
        const revoke = document.createElement("button");
        revoke.className = "secondary";
        revoke.type = "button";
        revoke.textContent = "Revogar";
        revoke.addEventListener("click", async () => {
          revoke.disabled = true;
          try {
            await api("/api/access/grants", {
              method: "DELETE",
              body: JSON.stringify({ grantId: grant.id }),
            });
            await refreshGrants();
          } catch {
            managerStatus.textContent = "Não foi possível revogar agora. Tente novamente.";
            revoke.disabled = false;
          }
        });
        item.append(revoke);
      }
      grantList.append(item);
    });
  } catch {
    managerStatus.textContent = "Não foi possível carregar os acessos. Verifique a configuração do serviço.";
  }
}

byId("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "Entrando…";
  try {
    await login(byId("email").value.trim(), byId("password").value);
    await renderUser(await getUser());
  } catch {
    loginStatus.textContent = "Não foi possível entrar. Confira seus dados e tente novamente.";
  }
});

byId("grantForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = byId("sendButton");
  button.disabled = true;
  managerStatus.textContent = "Enviando…";
  try {
    await api("/api/access/grants", {
      method: "POST",
      body: JSON.stringify({ email: byId("recipient").value.trim() }),
    });
    byId("grantForm").reset();
    managerStatus.textContent = "Link enviado. Ele expira em três horas e só pode ser resgatado uma vez.";
    await refreshGrants();
  } catch (error) {
    managerStatus.textContent = error.message === "access_service_not_configured"
      ? "O envio ainda não está configurado neste ambiente."
      : "Não foi possível enviar o link. Verifique o email e tente novamente.";
  } finally {
    button.disabled = false;
  }
});

byId("refreshButton").addEventListener("click", refreshGrants);
byId("logoutButton").addEventListener("click", async () => {
  try {
    await fetch("/api/access/session/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch {
    // Identity logout must still proceed if temporary-session cleanup is unavailable.
  }
  await logout();
  window.location.replace("/admin.html?returnTo=%2Faccess%2Fmanage.html");
});
onAuthChange((_event, user) => { void renderUser(user); });
renderUser(await getUser());
