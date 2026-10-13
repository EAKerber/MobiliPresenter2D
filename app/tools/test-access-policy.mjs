import assert from "node:assert/strict";
import {
  canIssueOrRevokeGrants,
  canManageAdministration,
  canUseConfigurator,
  canUseInternalPages,
} from "../../netlify/access/identity-policy.mjs";
import {
  ACCESS_COOKIE_NAME,
  ACCESS_TTL_SECONDS,
  clearSessionCookie,
  cookieForSession,
  createOpaqueToken,
  hashOpaqueToken,
  normalizeRecipientEmail,
} from "../../netlify/access/tokens.mjs";

const admin = { id: "admin-1", app_metadata: { roles: ["admin"] } };
const staff = { id: "staff-1", roles: ["staff"] };
const buyer = { id: "buyer-1", roles: ["user"] };

assert.equal(canManageAdministration(admin), true);
assert.equal(canManageAdministration(staff), false);
assert.equal(canIssueOrRevokeGrants(admin), true);
assert.equal(canIssueOrRevokeGrants(staff), true);
assert.equal(canIssueOrRevokeGrants(buyer), false);
assert.equal(canUseInternalPages(admin), true);
assert.equal(canUseInternalPages(staff), true);
assert.equal(canUseInternalPages(buyer), false);
assert.equal(canUseConfigurator({ user: staff }), true);
assert.equal(canUseConfigurator({ user: buyer }), false);
assert.equal(canUseConfigurator({ temporarySession: { id: "s1", grant_id: "g1", expires_at: "future" } }), true);

const token = createOpaqueToken();
assert.match(token, /^[A-Za-z0-9_-]{43}$/);
assert.equal(hashOpaqueToken(token).length, 64);
assert.equal(hashOpaqueToken("malformed"), null);
assert.equal(normalizeRecipientEmail("  Cliente@Example.com "), "cliente@example.com");
assert.equal(normalizeRecipientEmail("not-an-email"), null);
assert.equal(ACCESS_TTL_SECONDS, 3 * 60 * 60);
assert.match(cookieForSession(token), new RegExp(`^${ACCESS_COOKIE_NAME}=`));
assert.match(cookieForSession(token), /; Path=\//);
assert.match(cookieForSession(token), /; HttpOnly/);
assert.match(cookieForSession(token), /; Secure/);
assert.match(cookieForSession(token), /; SameSite=Lax/);
assert.match(clearSessionCookie(), /Max-Age=0/);

console.log("temporary access roles, tokens and cookie contract: PASS");
