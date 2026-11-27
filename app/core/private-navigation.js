import { getUser, logout, onAuthChange } from "@netlify/identity";

const header = document.querySelector("[data-private-header]");
if (header) {
  const toggle = header.querySelector("[data-private-menu-toggle]");
  const menu = header.querySelector("[data-private-menu]");
  const privateLinks = menu?.querySelector("[data-private-links]");
  const account = menu?.querySelector("[data-private-account]");
  const email = menu?.querySelector("[data-private-email]");
  if (toggle && menu && privateLinks && account && email) {
    const rolesFor = (user) => new Set([
      ...(Array.isArray(user?.roles) ? user.roles : []),
      ...(Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : []),
    ]);
    const makeLink = (href, label) => {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = label;
      const target = new URL(href, window.location.origin);
      const path = target.pathname.replace(/\/+$/, "/") || "/";
      const current = window.location.pathname.replace(/\/+$/, "/") || "/";
      if (target.origin === window.location.origin && path === current) link.setAttribute("aria-current", "page");
      return link;
    };
    const addGroup = (title, parent, className) => {
      const section = document.createElement("section");
      section.className = "private-menu__group";
      const heading = document.createElement("h2");
      heading.textContent = title;
      section.append(heading);
      const list = document.createElement("div");
      list.className = className;
      section.append(list);
      parent.append(section);
      return list;
    };
    const copy = (key, fallback) => window.CASA_UI_THEME && typeof window.CASA_UI_THEME.getCopy === "function"
      ? window.CASA_UI_THEME.getCopy(key, fallback) : fallback;
    const publicPages = [
      ["/#ambientes", copy("navigation.environments", "Ambientes")],
      ["/viewer/", "Cozinha"],
      ["/how-it-works/", copy("navigation.howItWorks", "Como funciona")],
      ["/about/", copy("navigation.about", "Quem somos")],
      ["https://wa.me/", copy("navigation.contact", "Fale conosco")],
    ];
    const existingLogout = document.getElementById("logoutButton");
    let logoutButton = existingLogout;
    if (!logoutButton) {
      logoutButton = document.createElement("button");
      logoutButton.type = "button";
      logoutButton.className = "button button--secondary private-menu__logout";
      logoutButton.setAttribute("data-private-logout", "");
    }
    logoutButton.textContent = copy("navigation.logout", "Sair");
    if (!account.contains(logoutButton)) account.append(logoutButton);
    const logoutStatus = document.createElement("p");
    logoutStatus.className = "private-menu__note";
    logoutStatus.setAttribute("role", "status");
    logoutStatus.setAttribute("aria-live", "polite");
    logoutStatus.hidden = true;
    account.append(logoutStatus);
    let activeUser = null;
    const showLogoutFailure = () => {
      logoutStatus.textContent = copy("navigation.logoutFailure", "Não foi possível encerrar o acesso. Verifique a conexão e tente novamente.");
      logoutStatus.hidden = false;
      logoutButton.disabled = false;
    };
    if (!logoutButton.hasAttribute("data-private-logout")) {
      logoutButton.classList.add("private-menu__logout");
    } else {
      logoutButton.addEventListener("click", async () => {
        const temporarySession = activeUser?.temporarySession === true;
        if (temporarySession) logoutButton.disabled = true;
        logoutStatus.hidden = true;
        logoutStatus.textContent = "";
        let response = null;
        try {
          response = await fetch("/api/access/session/logout", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
        } catch {
          if (temporarySession) {
            showLogoutFailure();
            return;
          }
        }
        // This function also expires the cookie when its store returns 503.
        if (temporarySession && response && !response.ok && response.status !== 503) {
          showLogoutFailure();
          return;
        }
        await logout();
        window.location.assign("/");
      });
    }

    function render(user, { loading = false, lookupFailed = false } = {}) {
      if (activeUser !== user) {
        logoutStatus.hidden = true;
        logoutStatus.textContent = "";
      }
      activeUser = user;
      privateLinks.replaceChildren();
      account.hidden = !user;
      email.hidden = !user;
      email.textContent = user?.email || "";
      if (logoutButton.hasAttribute("data-private-logout")) logoutButton.hidden = !user;
      const privateGroup = addGroup(copy("navigation.privateMenu.privatePages", "Páginas privadas"), privateLinks, "private-menu__links");
      const roles = rolesFor(user);
      if (roles.has("admin")) {
        privateGroup.append(makeLink("/config/", copy("navigation.privateMenu.configurator", "Configurador")));
        privateGroup.append(makeLink("/admin.html", copy("navigation.privateMenu.administration", "Administração")));
        privateGroup.append(makeLink("/access/manage.html", copy("navigation.privateMenu.manageAccesses", "Gerenciar acessos")));
      } else if (roles.has("staff")) {
        privateGroup.append(makeLink("/config/", copy("navigation.privateMenu.configurator", "Configurador")));
        privateGroup.append(makeLink("/access/manage.html", copy("navigation.privateMenu.manageAccesses", "Gerenciar acessos")));
      } else if (user?.temporarySession) {
        privateGroup.append(makeLink("/config/", copy("navigation.privateMenu.configurator", "Configurador")));
      } else if (loading) {
        const note = document.createElement("p");
        note.className = "private-menu__note";
        note.textContent = copy("navigation.privateAccessState.loading", "Verificando acesso…");
        privateGroup.append(note);
      } else if (lookupFailed) {
        const note = document.createElement("p");
        note.className = "private-menu__note";
        note.textContent = copy("navigation.privateAccessState.lookupFailure", "Não foi possível verificar o acesso. Feche e abra o menu para tentar novamente.");
        privateGroup.append(note);
      } else if (!user) {
        privateGroup.append(makeLink("/admin.html", copy("navigation.privateAccessState.anonymousAdminEntry", "Entrar na administração")));
      } else {
        const note = document.createElement("p");
        note.className = "private-menu__note";
        note.textContent = copy("navigation.privateAccessState.denied", "Esta conta não tem acesso às páginas de gestão.");
        privateGroup.append(note);
      }
      const publicGroup = addGroup(copy("navigation.privateMenu.publicPages", "Páginas públicas"), privateLinks, "private-menu__links");
      for (const [href, label] of publicPages) publicGroup.append(makeLink(href, label));
    }

    function setOpen(open, restoreFocus = false) {
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      const copyKey = open ? "close" : "open";
      const fallback = open ? "Fechar menu" : "Abrir menu";
      const label = window.CASA_UI_THEME && typeof window.CASA_UI_THEME.getCopy === "function"
        ? window.CASA_UI_THEME.getCopy("navigation.menu." + copyKey, fallback) : fallback;
      toggle.setAttribute("aria-label", label);
      if (open) menu.querySelector("a, button")?.focus();
      else if (restoreFocus) toggle.focus();
    }

    toggle.addEventListener("click", () => {
      const opening = menu.hidden;
      // A login and the menu's initial auth callback can finish out of order.
      // Reconcile the authoritative session at the point the user opens it,
      // even when an earlier callback left a stale anonymous menu.
      if (opening) syncFromAuth(null);
      setOpen(opening);
    });
    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false, true);
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (!menu.hidden && !header.contains(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) setOpen(false, true);
    });

    let authRevision = 0;
    let sessionLookupPromise = null;
    let sessionLookupRevision = -1;
    function resolveCurrentSession(revision) {
      // Do not coalesce a post-login lookup with one started before login.
      // An older request may have legitimately observed the anonymous session.
      if (!sessionLookupPromise || sessionLookupRevision !== revision) {
        sessionLookupRevision = revision;
        const lookup = currentSession();
        sessionLookupPromise = lookup;
        void lookup.then(() => {
          if (sessionLookupPromise === lookup) sessionLookupPromise = null;
        }, () => {
          if (sessionLookupPromise === lookup) sessionLookupPromise = null;
        });
      }
      return sessionLookupPromise;
    }
    function syncFromAuth(user) {
      const revision = ++authRevision;
      if (user) {
        render(user);
        return;
      }
      render(null, { loading: true });
      resolveCurrentSession(revision)
        .then((session) => {
          if (revision === authRevision) render(session);
        })
        .catch(() => {
          if (revision === authRevision) render(null, { lookupFailed: true });
        });
    }

    render(null, { loading: true });
    try {
      onAuthChange((_event, user) => syncFromAuth(user));
    } catch { /* Keep the public links if Identity is unavailable. */ }
    async function currentSession() {
      let user = null;
      try { user = await getUser(); } catch { /* A scoped invitation may not use Identity. */ }
      if (user) return user;
      const response = await fetch("/api/access/session", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("session_lookup_failed");
      const result = await response.json();
      return result?.authenticated === true
        ? { email: result.email || "", roles: [], temporarySession: true }
        : null;
    }
    syncFromAuth(null);
  }
}
