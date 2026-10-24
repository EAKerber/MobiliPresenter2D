import assert from "node:assert/strict";

// CI-AUTH-01 safety barrier: refuse any staged positive browser run when
// the target is production, an arbitrary Deploy Preview, or the original DB.
// Never log connection strings, grant tokens, or cookies.
export const FORBIDDEN_PRIMARY_DB_REF = "jaedzligsqazyjelpweu";
export const ISOLATION_TAG = "M2D_CI_AUTH_ISOLATED_V1";
export const DEDICATED_CI_NETLIFY_HOST = "m2d-auth-ci-isolated.netlify.app";

export function validateFixtureEnvironment(input) {
 const {
  origin, databaseUrl, projectRef, expectedHost, isolationTag
 } = input ?? {};
 assert.equal(isolationTag,ISOLATION_TAG,"BLOCKED_AUTH_FIXTURE: explicit isolation acknowledgment absent");
 assert.ok(typeof origin==="string"&&origin.length>0,"BLOCKED_AUTH_FIXTURE: isolated origin absent");
 assert.ok(typeof expectedHost==="string"&&expectedHost.length>0,"BLOCKED_AUTH_FIXTURE: isolated hostname absent");
 let target,db;
 try{target=new URL(origin);db=new URL(databaseUrl);}catch{
  throw new Error("BLOCKED_AUTH_FIXTURE: isolated origin or DB URI invalid");
 }
 assert.equal(target.protocol,"https:","BLOCKED_AUTH_FIXTURE: staging must use HTTPS");
 assert.equal(target.hostname,expectedHost,"BLOCKED_AUTH_FIXTURE: origin/allowlist mismatch");
 assert.equal(expectedHost,DEDICATED_CI_NETLIFY_HOST,"BLOCKED_AUTH_FIXTURE: only the dedicated test site may be used");
 assert.equal(target.pathname,"/","BLOCKED_AUTH_FIXTURE: staging origin must be root");
 assert.equal(target.search+target.hash,"","BLOCKED_AUTH_FIXTURE: staging origin must have no query/fragment");
 assert.match(target.hostname,/^m2d-auth-ci-[a-z0-9-]+\.netlify\.app$/,"BLOCKED_AUTH_FIXTURE: dedicated CI site required");
 assert.doesNotMatch(target.hostname,/^deploy-preview-/);
 assert.notEqual(target.hostname,"mobilipresenter2d.netlify.app");
 assert.notEqual(target.hostname,"casaemmodulos.casa");
 assert.match(projectRef??"",/^[a-z]{20}$/,"BLOCKED_AUTH_FIXTURE: isolated Supabase project ref absent");
 assert.notEqual(projectRef,FORBIDDEN_PRIMARY_DB_REF,"BLOCKED_AUTH_FIXTURE: production/database sharing forbidden");
 assert.ok(["postgres:","postgresql:"].includes(db.protocol),"BLOCKED_AUTH_FIXTURE: DB protocol mismatch");
 assert.ok(db.username==="access_ci_fixture"||db.username==="access_ci_fixture."+projectRef,
  "BLOCKED_AUTH_FIXTURE: fixture DB role must be least-privileged access_ci_fixture");
 assert.ok(!db.hostname.includes(FORBIDDEN_PRIMARY_DB_REF)&&!db.username.includes(FORBIDDEN_PRIMARY_DB_REF),
  "BLOCKED_AUTH_FIXTURE: known production database endpoint denied");
 const projectEvidence=db.hostname.includes(projectRef)||db.username.endsWith("."+projectRef);
 assert.ok(projectEvidence,"BLOCKED_AUTH_FIXTURE: DB URI does not match isolated project ref");
 assert.ok(db.hostname.endsWith(".supabase.com")||db.hostname.endsWith(".supabase.co"),
  "BLOCKED_AUTH_FIXTURE: only dedicated Supabase database endpoints permitted");
 assert.equal(db.pathname,"/postgres","BLOCKED_AUTH_FIXTURE: staging database must be postgres");
 return Object.freeze({origin:target.origin,hostname:target.hostname,projectRef,
  user:"access_ci_fixture",status:"ISOLATED_CONFIG_VERIFIED"});
}

export function safeErrorClass(error){
 return error?.name==="AssertionError"?"BLOCKED_AUTH_FIXTURE":"AUTH_FIXTURE_RUNTIME_ERROR";
}
