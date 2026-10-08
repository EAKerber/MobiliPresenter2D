"use strict";

// Fragment tickets are removed from browser history before any network call.
// Do not add third-party scripts, analytics, beacons, or URL query storage here.
(async function redeemMagicLink() {
  const params = new URLSearchParams(location.hash.slice(1));
  const ticket = params.get("ticket");
  history.replaceState(null, "", location.pathname);
  const status = document.getElementById("accessStatus");
  if (!ticket || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) {
    status.setAttribute("role", "alert");
    status.textContent = "Este link de acesso é inválido. Solicite um novo convite.";
    return;
  }
  try {
    const result = await fetch("/api/access/redeem", {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket })
    });
    if (!result.ok) throw new Error("access_denied");
    // /config/ is secured by Edge in CP-PUBLIC-03a2-3 (not available yet).
    location.replace("/config/");
  } catch {
    status.setAttribute("role", "alert");
    status.textContent = "O link expirou, já foi utilizado ou o serviço está indisponível. Solicite um novo convite.";
  }
})();
