import assert from "node:assert/strict";
// Only the user-confirmed internal test project may run the real fixture.
// Database access is limited to two fixed-purpose SECURITY DEFINER functions.
export const ALLOWED_INTERNAL_CI_DB_REF = "jaedzligsqazyjelpweu";
export const ISOLATION_TAG = "M2D_CI_AUTH_ISOLATED_V1";
export const DEDICATED_CI_NETLIFY_HOST = "m2d-auth-ci-isolated.netlify.app";
export function validateFixtureEnvironment(input) {
 const {origin,databaseUrl,projectRef,expectedHost,isolationTag}=input??{};
 assert.equal(isolationTag,ISOLATION_TAG,"BLOCKED_AUTH_FIXTURE: explicit isolation acknowledgment absent");
 assert.ok(typeof origin==="string"&&origin.length>0,"BLOCKED_AUTH_FIXTURE: isolated origin absent");
 assert.ok(typeof expectedHost==="string"&&expectedHost.length>0,"BLOCKED_AUTH_FIXTURE: isolated hostname absent");
 let target,db; try{target=new URL(origin);db=new URL(databaseUrl);}catch{throw new Error("BLOCKED_AUTH_FIXTURE: isolated origin or DB URI invalid");}
 assert.equal(target.protocol,"https:","BLOCKED_AUTH_FIXTURE: staging must use HTTPS");
 assert.equal(target.hostname,expectedHost,"BLOCKED_AUTH_FIXTURE: origin/allowlist mismatch");
 assert.equal(expectedHost,DEDICATED_CI_NETLIFY_HOST,"BLOCKED_AUTH_FIXTURE: only the dedicated test site may be used");
 assert.equal(target.pathname,"/","BLOCKED_AUTH_FIXTURE: staging origin must be root");
 assert.equal(target.search+target.hash,"","BLOCKED_AUTH_FIXTURE: staging origin must have no query/fragment");
 assert.match(target.hostname,/^m2d-auth-ci-[a-z0-9-]+\.netlify\.app$/,"BLOCKED_AUTH_FIXTURE: dedicated CI site required");
 assert.doesNotMatch(target.hostname,/^deploy-preview-/);
 assert.notEqual(target.hostname,"mobilipresenter2d.netlify.app");
 assert.notEqual(target.hostname,"casaemmodulos.casa");
 assert.equal(projectRef,ALLOWED_INTERNAL_CI_DB_REF,"BLOCKED_AUTH_FIXTURE: only the confirmed internal test database is allowed");
 assert.ok(["postgres:","postgresql:"].includes(db.protocol),"BLOCKED_AUTH_FIXTURE: DB protocol mismatch");
 assert.equal(db.username,"access_ci_fixture."+projectRef,"BLOCKED_AUTH_FIXTURE: database role must be the project-scoped access_ci_fixture role");
 assert.ok(!db.username.includes("postgres"),"BLOCKED_AUTH_FIXTURE: privileged database role denied");
 assert.ok(db.hostname.includes(projectRef)||db.username.endsWith("."+projectRef),"BLOCKED_AUTH_FIXTURE: DB URI does not match confirmed project ref");
 assert.ok(db.hostname.endsWith(".supabase.com")||db.hostname.endsWith(".supabase.co"),"BLOCKED_AUTH_FIXTURE: only Supabase database endpoints permitted");
 assert.equal(db.pathname,"/postgres","BLOCKED_AUTH_FIXTURE: staging database must be postgres");
 return Object.freeze({origin:target.origin,hostname:target.hostname,projectRef,user:"access_ci_fixture",status:"INTERNAL_TEST_CONFIG_VERIFIED"});
}
export function safeErrorClass(error){
 if(error?.name==="AssertionError"){
  const firstLine=typeof error.message==="string"?error.message.split(/\r?\n/,1)[0]:"";
  return firstLine.startsWith("BLOCKED_AUTH_FIXTURE:")?firstLine:"BLOCKED_AUTH_FIXTURE";
 }
 return "AUTH_FIXTURE_RUNTIME_ERROR";
}
