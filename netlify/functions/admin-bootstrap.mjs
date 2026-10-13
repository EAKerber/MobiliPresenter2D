import { getUser } from "@netlify/identity";
import { canManageAdministration } from "../access/identity-policy.mjs";
import { jsonResponse } from "../access/http.mjs";
import priceBook from "../../app/data/mock-price-book.js";

export default async (request) => {
  if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "GET" });
  if (new URL(request.url).search) return jsonResponse({ error: "unsupported_query" }, 400);

  let user;
  try {
    user = await getUser();
  } catch {
    return jsonResponse({ error: "identity_unavailable" }, 503);
  }
  if (!canManageAdministration(user)) {
    return jsonResponse({ error: user ? "forbidden" : "unauthorized" }, user ? 403 : 401);
  }

  return jsonResponse({ priceBook });
};
