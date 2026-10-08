import service from "../lib/buyer-session-http.cjs";

// Feature remains disabled without explicit transactional DB and origin config.
export default (request, context) => service.redeem(request, context, {});
