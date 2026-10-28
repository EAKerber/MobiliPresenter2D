// Pure session-contract comparison. No DB, cookies from users, staging or network.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
 ACCESS_COOKIE_NAME,ACCESS_SCOPE,ACCESS_TTL_SECONDS,
 createOpaqueToken,hashOpaqueToken,normalizeRecipientEmail,
 cookieForSession,clearSessionCookie
} from "../../netlify/access/tokens.mjs";
import { hasSameOrigin } from "../../netlify/access/http.mjs";
const historical=readFileSync("docs/reconciliation/cp-public/legacy/email/netlify/lib/buyer-session-core.cjs","utf8");
const currentSql=readFileSync("netlify/access/postgres-store.mjs","utf8");
test("newer scoped session TTL replaces historical 12h without weakening cookie attributes",()=>{
 assert.match(historical,/const SESSION_SECONDS = 12 \* 60 \* 60/);
 assert.equal(ACCESS_SCOPE,"config");
 assert.equal(ACCESS_TTL_SECONDS,3*60*60);
 assert.match(ACCESS_COOKIE_NAME,/^__Host-/);
 const token=createOpaqueToken();
 const cookie=cookieForSession(token);
 for(const field of [ACCESS_COOKIE_NAME+"=", "Path=/", "Max-Age=10800", "HttpOnly", "Secure", "SameSite=Lax"])
   assert.ok(cookie.includes(field),field);
 assert.ok(clearSessionCookie().includes("Max-Age=0"));
});
test("tokens are opaque, non-reusable as hashes and malformed strings fail closed",()=>{
 const token=createOpaqueToken(),hash=hashOpaqueToken(token);
 assert.match(token,/^[A-Za-z0-9_-]{43}$/);
 assert.match(hash,/^[a-f0-9]{64}$/);
 assert.notEqual(hash,token);
 for(const malformed of [undefined,null,"","a".repeat(44),"a".repeat(42),"\n".repeat(43)])
   assert.equal(hashOpaqueToken(malformed),null);
 assert.equal(hashOpaqueToken(token),hash);
 // Any syntactically valid opaque-looking value is hashed; the DB must
 // decide membership. Rejecting by unknown value here would be incorrect.
 assert.match(hashOpaqueToken("x".repeat(43)),/^[a-f0-9]{64}$/);
});
test("ticket recipients are normalized and CRLF/header injection is rejected",()=>{
 assert.equal(normalizeRecipientEmail("  Example+Tag@Example.COM "), "example+tag@example.com");
 for(const bad of ["", "not-an-email","a@b", "a@b.com\nBcc:other@example.com",123,null])
   assert.equal(normalizeRecipientEmail(bad),null);
});
test("write-origin protection never treats missing/cross-origin Origin as same-origin",()=>{
 const url="https://example.invalid/api/access/redeem";
 const make=(origin)=>new Request(url,{method:"POST",headers:origin?{"Origin":origin}:{}});
 assert.equal(hasSameOrigin(make(null)),false);
 assert.equal(hasSameOrigin(make("https://cross.invalid")),false);
 assert.equal(hasSameOrigin(make("https://example.invalid")),true);
});
test("current grant redemption/lookup remains transactionally scoped and revocation-filtered",()=>{
 for(const s of ["FOR UPDATE","BEGIN","COMMIT","ROLLBACK","g.revoked_at IS NULL","s.revoked_at IS NULL","g.scope = $2","expires_at > now()"])
   assert.ok(currentSql.includes(s),s);
});
