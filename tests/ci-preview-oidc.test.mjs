import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {readFileSync} from "node:fs";
import {CI_OIDC_AUDIENCE,CI_PREVIEW_ORIGIN,CI_WORKFLOW_REF,isAuthorizedPreview,validateOidcClaims,verifyGithubOidc} from "../netlify/access/github-oidc-ci.mjs";

const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const key={...publicKey.export({format:"jwk"}),kid:"fixture-oidc",alg:"RS256",use:"sig"};
const now=Math.floor(Date.now()/1000);
const claims=()=>({
  iss:"https://token.actions.githubusercontent.com",aud:CI_OIDC_AUDIENCE,
  repository:"EAKerber/MobiliPresenter2D",repository_id:"1356562826",repository_owner_id:"62451548",
  sub:"repo:EAKerber/MobiliPresenter2D:environment:ci-auth-preview",
  ref:"refs/heads/security/oidc-ci-preview235-v0-20261023",
  workflow_ref:CI_WORKFLOW_REF,environment:"ci-auth-preview",event_name:"push",
  run_id:"40000000000",jti:"fixture-unique-oidc-jti-0123456789",iat:now-10,exp:now+300
});
const enc=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
function jwt(value=claims(),opts={}){
  const header=enc({alg:opts.alg??"RS256",kid:opts.kid??key.kid,typ:"JWT"});
  const payload=enc(value);
  const body=header+"."+payload;
  return body+"."+sign("RSA-SHA256",Buffer.from(body),privateKey).toString("base64url");
}
const fakeKeys=async url=>{
  assert.equal(url,"https://token.actions.githubusercontent.com/.well-known/jwks");
  return{ok:true,json:async()=>({keys:[key]})};
};
test("real RS256 verification with mocked signing-key response and pinned claims",async()=>{
  const c=await verifyGithubOidc(jwt(),{fetchJwks:fakeKeys,now});
  assert.equal(c.repository_id,"1356562826");
  assert.equal(c.environment,"ci-auth-preview");
});
test("signature is mandatory, not merely a decoded JWT claim",async()=>{
  const signed=jwt(),parts=signed.split(".");
  const altered={...claims(),repository_id:"1356562826",jti:"another-unique-jti-0123456789"};
  const tampered=parts[0]+"."+enc(altered)+"."+parts[2];
  await assert.rejects(verifyGithubOidc(tampered,{fetchJwks:fakeKeys,now}),/oidc_signature_invalid/);
  await assert.rejects(verifyGithubOidc(jwt(claims(),{alg:"none"}),{fetchJwks:fakeKeys,now}),/oidc_algorithm_denied/);
  await assert.rejects(verifyGithubOidc(jwt(claims(),{kid:"unknown-key"}),{fetchJwks:fakeKeys,now}),/oidc_signing_key_not_found/);
  await assert.rejects(verifyGithubOidc("not-a-jwt",{fetchJwks:fakeKeys,now}),/invalid_oidc_token/);
});
test("wrong issuer, audience, repository identity, workflow, environment and event are rejected before network",async()=>{
  const variations=[
    ["iss","https://evil.invalid"],["aud","other-audience"],["repository","somewhere/else"],
    ["repository_id","1"],["repository_owner_id","2"],["ref","refs/heads/main"],
    ["workflow_ref","wrong/workflow@refs/heads/main"],["environment","production"],
    ["sub",null],
    ["event_name","pull_request"],["iat",now-700],["exp",now-5],
    ["jti","short"],["run_id","not-an-integer"]
  ];
  for(const [field,value]of variations){
    const changed={...claims(),[field]:value};
    assert.equal(validateOidcClaims(changed,now),false,field);
    await assert.rejects(verifyGithubOidc(jwt(changed),{fetchJwks:()=>{throw Error("unexpected JWKS network");},now}),/oidc_claims_denied/,field);
  }
});
test("custom GitHub subject templates are not treated as a new authorization authority",async()=>{
  const changed={...claims(),sub:"custom:repository_id:1356562826:workflow:ci-preview"};
  assert.equal(validateOidcClaims(changed,now),true,"signed immutable claims remain the authority");
  const verified=await verifyGithubOidc(jwt(changed),{fetchJwks:fakeKeys,now});
  assert.equal(verified.repository_id,"1356562826");
  for(const field of ["repository_id","ref","workflow_ref","environment"]){
    const wrong={...changed,[field]:"untrusted"};
    assert.equal(validateOidcClaims(wrong,now),false,field);
  }
});
test("only the pinned unpublished Netlify preview is eligible",()=>{
  const good={deploy:{context:"deploy-preview",id:"sample-deploy-id",published:false}};
  assert.equal(isAuthorizedPreview(CI_PREVIEW_ORIGIN+"/api/ci/config-session",good),true);
  assert.equal(isAuthorizedPreview("https://mobilipresenter2d.netlify.app/api/ci/config-session",good),false);
  assert.equal(isAuthorizedPreview(CI_PREVIEW_ORIGIN+"/api/ci/config-session",{deploy:{...good.deploy,context:"production"}}),false);
  assert.equal(isAuthorizedPreview(CI_PREVIEW_ORIGIN+"/api/ci/config-session",{deploy:{...good.deploy,published:true}}),false);
  assert.equal(isAuthorizedPreview(CI_PREVIEW_ORIGIN+"/api/ci/config-session",{}),false);
});
test("exchange endpoint remains short lived, config-only, DB revocable and not Admin",()=>{
  const code=readFileSync(new URL("../netlify/functions/ci-config-session.mjs",import.meta.url),"utf8");
  assert.match(code,/isAuthorizedPreview\(request\.url,context\)/);
  assert.match(code,/hasSameOrigin\(request\)/);
  assert.match(code,/await verifyGithubOidc\(jwt\)/);
  assert.match(code,/await issueGrant\(/);
  assert.match(code,/await redeemGrant\(/);
  assert.match(code,/if\(error\?\.code==="23505"\)/);
  assert.match(code,/const TTL_SECONDS=55\*60/);
  assert.match(code,/access:"config-only"/);
  assert.doesNotMatch(code,/admin\s*:\s*true|roles\s*:\s*\["admin"\]/);
});
