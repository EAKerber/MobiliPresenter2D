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
    const publicPages = [
      ["/#ambientes", "Ambientes"],
      ["/viewer/", "Cozinha"],
      ["/how-it-works/", "Como funciona"],
      ["/about/", "Quem somos"],
      ["https://wa.me/", "Fale conosco"],
    ];
    const existingLogout = document.getElementById("logoutButton");
    let logoutButton = existingLogout;
    if (!logoutButton) {
      logoutButton = document.createElement("button");
      logoutButton.type = "button";
      logoutButton.className = "button button--secondary private-menu__logout";
      logoutButton.textContent = "Sair";
      logoutButton.setAttribute("data-private-logout", "");
    }
    if (!account.contains(logoutButton)) account.append(logoutButton);
    if (!logoutButton.hasAttribute("data-private-logout")) {
      logoutButton.classList.add("private-menu__logout");
    } else {
      logoutButton.addEventListener("click", async () => {
        try {
          await fetch("/api/access/session/logout", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
        } catch { /* Identity logout remains authoritative. */ }
        await logout();
        window.location.assign("/");
      });
    }

    function render(user) {
      privateLinks.replaceChildren();
      account.hidden = !user;
      email.hidden = !user;
      email.textContent = user?.email || "";
      logoutButton.hidden = !user;
      const privateGroup = addGroup("Páginas privadas", privateLinks, "private-menu__links");
      const roles = rolesFor(user);
      if (roles.has("admin")) {
        privateGroup.append(makeLink("/config/", "Configurador"));
        privateGroup.append(makeLink("/admin.html", "Administração"));
        privateGroup.append(makeLink("/access/manage.html", "Gerenciar acessos"));
      } else if (roles.has("staff")) {
        privateGroup.append(makeLink("/config/", "Configurador"));
        privateGroup.append(makeLink("/access/manage.html", "Gerenciar acessos"));
      } else if (user?.temporarySession) {
        privateGroup.append(makeLink("/config/", "Configurador"));
      } else if (!user) {
        privateGroup.append(makeLink("/admin.html", "Entrar na administração"));
      } else {
        const note = document.createElement("p");
        note.className = "private-menu__note";
        note.textContent = "Esta conta não tem acesso às páginas de gestão.";
        privateGroup.append(note);
      }
      const publicGroup = addGroup("Páginas públicas", privateLinks, "private-menu__links");
      for (const [href, label] of publicPages) publicGroup.append(makeLink(href, label));
    }

    function setOpen(open, restoreFocus = false) {
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      if (open) menu.querySelector("a, button")?.focus();
      else if (restoreFocus) toggle.focus();
    }

    toggle.addEventListener("click", () => setOpen(menu.hidden));
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

    render(null);
    try {
      onAuthChange((_event, user) => {
        if (user) render(user);
        else currentSession().then(render).catch(() => render(null));
      });
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
    currentSession().then(render).catch(() => render(null));
  }
}