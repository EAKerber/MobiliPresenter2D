"use strict";

// Resend HTTP transport. Never log API keys, recipient, link or response body.
function createSender({ apiKey, from, fetcher = fetch } = {}) {
  if (typeof apiKey !== "string" || !apiKey.startsWith("re_")
    || typeof from !== "string" || !/^[^\r\n<>]+@[^\s<>]+$/.test(from)
    || typeof fetcher !== "function") {
    throw new TypeError("configured transactional mail transport required");
  }
  return Object.freeze({
    async send({ to, link }) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetcher("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from, to: [to], subject: "Seu acesso ao configurador",
            text: "Para acessar o configurador, abra este link (uso único, válido por 15 minutos):\n"
              + link + "\nSe você não solicitou este acesso, ignore este e-mail."
          }),
          signal: controller.signal
        });
        if (!response.ok) throw new Error("transactional mail delivery rejected");
        const body = await response.json();
        if (typeof body?.id !== "string" || !body.id) {
          throw new Error("transactional mail delivery not acknowledged");
        }
      } finally {
        clearTimeout(timeout);
      }
    }
  });
}
function getConfiguredSender() {
  if (process.env.CASA_ACCESS_ENABLED !== "1") return null;
  try {
    return createSender({
      apiKey: process.env.CASA_ACCESS_RESEND_API_KEY,
      from: process.env.CASA_ACCESS_MAIL_FROM
    });
  } catch {
    return null;
  }
}
module.exports = Object.freeze({ createSender, getConfiguredSender });
