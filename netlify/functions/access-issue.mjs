import service from "../lib/buyer-session-http.cjs";
import { getUser } from "@netlify/identity";

// Feature remains disabled without explicit transactional DB and origin config.
export default (request, context) => service.issue(request, context, { getIdentityUser: getUser });
