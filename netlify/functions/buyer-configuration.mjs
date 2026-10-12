import { getDeployStore, getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import configCore from "../../app/core/configuration.js";
import administrationV5 from "../../app/core/administration-v5.js";
import publishedReader from "../../app/core/published-configuration.js";
import buyerProjection from "../../app/core/published-buyer-projection.js";
import flowCore from "../../app/core/flow-model.js";
import hierarchyDefaults from "../../app/data/hierarchy-defaults.js";
import catalog from "../../app/data/catalog-data.js";
import priceBook from "../../app/data/mock-price-book.js";
import scene from "../../app/data/scene-data.js";
import pricingContract from "../../app/core/pricing-contract.js";
import presentationPolicy from "../../app/data/presentation-policy-defaults.js";
import { canUseConfigurator, canUseInternalPages } from "../access/identity-policy.mjs";
import { cookieValue, jsonResponse } from "../access/http.mjs";
import { findActiveSession } from "../access/postgres-store.mjs";
import { ACCESS_COOKIE_NAME } from "../access/tokens.mjs";

function storeFor(context) {
  const options = { name: "configurator-settings", consistency: "strong" };
  return context?.deploy?.context === "production" ? getStore(options) : getDeployStore(options);
}

export default async (request, context) => {
  if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "GET" });
  if (new URL(request.url).search) return jsonResponse({ error: "unsupported_query" }, 400);

  let actor;
  try {
    actor = await getUser();
  } catch {
    return jsonResponse({ error: "identity_unavailable" }, 503);
  }

  let temporarySession = null;
  if (!canUseInternalPages(actor)) {
    const sessionToken = cookieValue(request, ACCESS_COOKIE_NAME);
    if (sessionToken) {
      try {
        temporarySession = await findActiveSession(sessionToken);
      } catch {
        return jsonResponse({ error: "access_store_unavailable" }, 503);
      }
    }
  }
  if (!canUseConfigurator({ user: actor, temporarySession })) {
    return jsonResponse({ error: actor ? "forbidden" : "unauthorized" }, actor ? 403 : 401);
  }

  try {
    const raw = await publishedReader.readRawPublished(storeFor(context));
    if (raw.kind !== "stored") return jsonResponse({ error: "published_configuration_unavailable" }, 503);
    const inspected = publishedReader.inspectPublishedRaw(raw, {
      configuration: configCore, administrationV5, catalog, priceBook, scene,
    });
    if (inspected.kind !== "valid") {
      return jsonResponse({ error: "published_configuration_invalid" }, 503);
    }
    const payload = buyerProjection.project(inspected.value, {
      configuration: configCore,
      administrationV5,
      flow: flowCore,
      catalog,
      priceBook,
      scene,
      hierarchyDefaults,
      pricingContract,
      defaultPresentationPolicy: presentationPolicy,
    });
    return jsonResponse(payload);
  } catch {
    return jsonResponse({ error: "published_configuration_unavailable" }, 503);
  }
};

export const config = { path: "/api/buyer-configuration" };
