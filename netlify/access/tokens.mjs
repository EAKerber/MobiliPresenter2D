import { createHash, randomBytes, randomUUID } from "node:crypto";
import { ACCESS_COOKIE_NAME, ACCESS_SCOPE, ACCESS_TTL_SECONDS } from "./constants.mjs";

export { ACCESS_COOKIE_NAME, ACCESS_SCOPE, ACCESS_TTL_SECONDS };

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createId() {
  return randomUUID();
}

export function normalizeRecipientEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function cookieForSession(token, maxAgeSeconds = ACCESS_TTL_SECONDS) {
  const safeMaxAge = Math.max(0, Math.floor(maxAgeSeconds));
  return `${ACCESS_COOKIE_NAME}=${token}; Path=/; Max-Age=${safeMaxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${ACCESS_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
