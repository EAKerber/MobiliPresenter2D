import { timingSafeEqual } from "node:crypto";

export const PRIVATE_HEADERS = Object.freeze({
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
});

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...PRIVATE_HEADERS, ...extraHeaders },
  });
}

export function env(name) {
  if (typeof Netlify !== "undefined" && Netlify?.env?.get) return Netlify.env.get(name);
  return process.env[name];
}

export function hasSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function readJson(request, maximumBytes = 4096) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maximumBytes) return { ok: false, status: 413 };
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maximumBytes) return { ok: false, status: 413 };
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value)
      ? { ok: true, value }
      : { ok: false, status: 400 };
  } catch {
    return { ok: false, status: 400 };
  }
}

export function cookieValue(request, name) {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim();
  }
  return null;
}

export function internalSecretMatches(candidate, expected) {
  if (typeof candidate !== "string" || typeof expected !== "string" || !expected) return false;
  const left = Buffer.from(candidate, "utf8");
  const right = Buffer.from(expected, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}
