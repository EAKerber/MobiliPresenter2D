import { getUser } from "@netlify/identity";
import { canUseInternalPages } from "../access/identity-policy.mjs";
import { ACCESS_COOKIE_NAME } from "../access/constants.mjs";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Pragma": "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Vary": "Cookie",
};

function hasAccessCookie(request) {
  return (request.headers.get("cookie") || "")
    .split(";")
    .some((part) => part.trim().startsWith(`${ACCESS_COOKIE_NAME}=`));
}

function denied(pathname, status, requestUrl) {
  if (pathname === "/data/mock-price-book.js") {
    return new Response(null, { status: status === 503 ? 503 : 404, headers: PRIVATE_HEADERS });
  }
  if (status === 401) return Response.redirect(new URL("/access/", requestUrl), 302);
  return new Response("Acesso temporariamente indisponível.", {
    status,
    headers: { ...PRIVATE_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
  });
}

export default async (request, context) => {
  const pathname = new URL(request.url).pathname;
  let user;
  try {
    user = await getUser();
  } catch {
    return denied(pathname, 503, request.url);
  }

  if (canUseInternalPages(user)) {
    const response = await context.next();
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(PRIVATE_HEADERS)) headers.set(name, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  if (!hasAccessCookie(request)) return denied(pathname, user ? 403 : 401, request.url);

  const secret = Netlify.env.get("ACCESS_GATE_SECRET");
  if (!secret) return denied(pathname, 503, request.url);

  try {
    const checkUrl = new URL("/.netlify/functions/access-check", request.url);
    const response = await fetch(checkUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": request.headers.get("cookie") || "",
        "x-access-gate-secret": secret,
      },
      body: "{}",
      cache: "no-store",
    });
    if (!response.ok) return denied(pathname, 503, request.url);
    const result = await response.json().catch(() => null);
    if (result?.authorized !== true) return denied(pathname, 401, request.url);
  } catch {
    return denied(pathname, 503, request.url);
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

export const config = {
  path: ["/config", "/config/*", "/data/mock-price-book.js"],
};
