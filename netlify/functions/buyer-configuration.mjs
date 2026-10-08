import { getDeployStore, getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import access from "../lib/authorized-buyer-read.cjs";
import reader from "../../app/core/published-configuration.js";
import projection from "../../app/core/buyer-configuration-projection.js";
import configuration from "../../app/core/configuration.js";
import administrationV5 from "../../app/core/administration-v5.js";
import catalog from "../../app/data/catalog-data.js";
import priceBook from "../../app/data/mock-price-book.js";
import scene from "../../app/data/scene-data.js";
import pricingContract from "../../app/core/pricing-contract.js";

// Admin-only until CP-PUBLIC-03a2-2 installs a real verified customer session.
// Direct /.netlify/functions/buyer-configuration has the SAME access guard.
const selectStore = context => {
  const options = { name: "configurator-settings", consistency: "strong" };
  return context?.deploy?.context === "production" ? getStore(options) : getDeployStore(options);
};
const runtime = Object.freeze({
  configuration, administrationV5, catalog, priceBook, scene, pricingContract
});
export default (request, context) => access.handle(request, context, {
  getIdentityUser: getUser, selectStore, reader, projection, runtime
});
