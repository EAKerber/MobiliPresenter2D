(() => {
  const button = document.getElementById("confirmAccess");
  const status = document.getElementById("accessStatus");
  const token = new URLSearchParams(window.location.hash.slice(1)).get("token");

  // Keep the bearer token out of the address bar/history before any interaction.
  if (window.location.hash) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  if (!token) {
    status.textContent = "Este link não contém um token válido. Solicite um novo acesso à equipe.";
    return;
  }

  status.textContent = "Link encontrado. Confirme para resgatar o acesso.";
  button.hidden = false;
  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "Validando o acesso…";
    try {
      const response = await fetch("/api/access/redeem", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error("invalid_or_expired_link");
      status.textContent = "Acesso confirmado. Abrindo o configurador…";
      window.location.assign("/config/");
    } catch {
      status.textContent = "Não foi possível validar este link. Solicite um novo acesso à equipe.";
      button.hidden = true;
    }
  });
})();
