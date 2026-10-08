import { getDeployStore, getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import access from "../lib/authorized-buyer-read.cjs";
import session from "../lib/buyer-session-core.cjs";
import sessionStore from "../lib/buyer-session-postgres.cjs";
import sessionHttp from "../lib/buyer-session-http.cjs";
import reader from "../../app/core/published-configuration.js";
import projection from "../../app/core/buyer-configuration-projection.js";
import configuration from "../../app/core/configuration.js";
import administrationV5 from "../../app/core/administration-v5.js";
import catalog from "../../app/data/catalog-data.js";
import priceBook from "../../app/data/mock-price-book.js";
import scene from "../../app/data/scene-data.js";
import pricingContract from "../../app/core/pricing-contract.js";

// Buyer access requires a PostgreSQL-verified opaque session; in the absence
// of configured credentials, only a verified Identity administrator can read.
// Direct /.netlify/functions/buyer-configuration uses the same server guard.
const selectStore = context => {
  const options = { name: "configurator-settings", consistency: "strong" };
  return context?.deploy?.context === "production" ? getStore(options) : getDeployStore(options);
};
const runtime = Object.freeze({
  configuration, administrationV5, catalog, priceBook, scene, pricingContract
});
export default (request, context) => access.handle(request, context, {
  getIdentityUser: getUser, selectStore, reader, projection, runtime,
  verifyCustomerSession: async (incoming, deployContext) => {
    if (!session.readSessionCookie(incoming)) return null;
    const database = sessionStore.getConfiguredStore();
    if (!database) return null;
    return session.verify({
      store: database, request: incoming,
      audience: sessionHttp.audience(deployContext)
    });
  }
});
