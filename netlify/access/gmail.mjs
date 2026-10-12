import { env } from "./http.mjs";
import { normalizeRecipientEmail } from "./tokens.mjs";

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export function accessMailIsConfigured() {
  return Boolean(
    env("GMAIL_OAUTH_CLIENT_ID")
    && env("GMAIL_OAUTH_CLIENT_SECRET")
    && env("GMAIL_OAUTH_REFRESH_TOKEN")
    && normalizeRecipientEmail(env("GMAIL_SENDER_EMAIL"))
    && safePublicOrigin(),
  );
}

function safePublicOrigin() {
  const value = env("ACCESS_PUBLIC_ORIGIN");
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === value.replace(/\/$/, "")
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function toBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function emailMessage({ sender, recipient, link }) {
  const subject = "Seu acesso ao Configurador Casa em Modulos";
  const body = [
    "Ola,",
    "",
    "Use o link abaixo para abrir o configurador. Ele e valido por 3 horas e pode ser resgatado uma unica vez:",
    link,
    "",
    "Se voce nao esperava este acesso, ignore esta mensagem.",
    "",
    "Casa em Modulos",
  ].join("\r\n");
  return [
    `From: Casa em Modulos <${sender}>`,
    `To: ${recipient}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");
}

async function requestGoogleAccessToken() {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GMAIL_OAUTH_CLIENT_ID"),
      client_secret: env("GMAIL_OAUTH_CLIENT_SECRET"),
      refresh_token: env("GMAIL_OAUTH_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("gmail_oauth_failed");
  const result = await response.json();
  if (typeof result?.access_token !== "string" || !result.access_token) {
    throw new Error("gmail_oauth_failed");
  }
  return result.access_token;
}

export async function sendAccessLink({ recipientEmail, token }) {
  const recipient = normalizeRecipientEmail(recipientEmail);
  const sender = normalizeRecipientEmail(env("GMAIL_SENDER_EMAIL"));
  const origin = safePublicOrigin();
  if (!recipient || !sender || !origin || !token || !accessMailIsConfigured()) {
    throw new Error("access_email_not_configured");
  }

  const accessUrl = new URL("/access/", origin);
  accessUrl.hash = `token=${encodeURIComponent(token)}`;
  const accessToken = await requestGoogleAccessToken();
  const response = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: toBase64Url(emailMessage({ sender, recipient, link: accessUrl.href })) }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("gmail_send_failed");
}
