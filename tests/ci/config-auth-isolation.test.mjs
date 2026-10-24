import test from "node:test";
import assert from "node:assert/strict";
import {validateFixtureEnvironment,FORBIDDEN_PRIMARY_DB_REF,ISOLATION_TAG} from "./config-auth-isolation.mjs";

const base={origin:"https://m2d-auth-ci-isolated.netlify.app/",
 expectedHost:"m2d-auth-ci-isolated.netlify.app",projectRef:"abcdefghijklmnopqrst",
 databaseUrl:"postgresql://access_ci_fixture.abcdefghijklmnopqrst:PLACEHOLDER@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
 isolationTag:ISOLATION_TAG};
test("isolated URL and role are checked without exposing secrets",()=>{
 const output=validateFixtureEnvironment(base);
 assert.equal(output.hostname,base.expectedHost);
 assert.equal(output.status,"ISOLATED_CONFIG_VERIFIED");
 assert.equal(JSON.stringify(output).includes("PLACEHOLDER"),false);
});
test("production origins and anonymous preview sites fail closed",()=>{
 for(const origin of [
  "https://casaemmodulos.casa/",
  "https://mobilipresenter2d.netlify.app/",
  "https://deploy-preview-231--mobilipresenter2d.netlify.app/",
  "http://m2d-auth-ci-isolated.netlify.app/",
  "https://m2d-auth-ci-isolated.netlify.app/config/"
 ])assert.throws(()=>validateFixtureEnvironment({...base,origin}));
});
test("original DB and non-fixture privileged roles cannot provision CI session",()=>{
 assert.throws(()=>validateFixtureEnvironment({...base,projectRef:FORBIDDEN_PRIMARY_DB_REF}));
 assert.throws(()=>validateFixtureEnvironment({...base,databaseUrl:
   "postgresql://postgres.abcdefghijklmnopqrst:PLACEHOLDER@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"}));
 assert.throws(()=>validateFixtureEnvironment({...base,databaseUrl:
   "postgresql://access_ci_fixture.abcdefghijklmnopqrst:PLACEHOLDER@db."+FORBIDDEN_PRIMARY_DB_REF+".supabase.co:5432/postgres"}));
 assert.throws(()=>validateFixtureEnvironment({...base,isolationTag:""}));
 assert.throws(()=>validateFixtureEnvironment({...base,expectedHost:"casaemmodulos.casa"}));
});
