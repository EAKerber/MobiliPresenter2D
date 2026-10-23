// Fail-closed, preview-only OIDC exchange for the five Configurator CI suites.
// An ID token from the single authorized GitHub Actions workflow is consumed
// once to create an ordinary revocable config-only temporary session in SQL.
import {createHash} from "node:crypto";
import {env,hasSameOrigin,jsonResponse,readJson} from "../access/http.mjs";
import {isAuthorizedPreview,verifyGithubOidc} from "../access/github-oidc-ci.mjs";
import {issueGrant,redeemGrant} from "../access/postgres-store.mjs";
import {cookieForSession,createId,hashOpaqueToken} from "../access/tokens.mjs";

const TTL_SECONDS=55*60;
const RECIPIENT="ci-preview-235@mobilipresenter.invalid";
function consumeKey(jwt){
  // The same signed OIDC JWT always produces the same unique grant hash.
  // The database UNIQUE constraint rejects a replay, including concurrent requests.
  return createHash("sha256").update("m2d-oidc-grant-v1\0").update(jwt).digest("base64url");
}
export default async function handler(request,context){
  if(request.method!=="POST")return jsonResponse({error:"method_not_allowed"},405,{Allow:"POST"});
  if(!isAuthorizedPreview(request.url,context))return jsonResponse({error:"not_available"},404);
  if(!hasSameOrigin(request))return jsonResponse({error:"invalid_request_origin"},403);
  if(!env("DATABASE_URL"))return jsonResponse({error:"access_store_not_configured"},503);
  const parsed=await readJson(request,18000);
  if(!parsed.ok)return jsonResponse({error:"invalid_request"},parsed.status);
  const jwt=parsed.value.jwt;
  if(typeof jwt!=="string"||jwt.length<64||jwt.length>16000)return jsonResponse({error:"invalid_request"},400);
  let claims;
  try{claims=await verifyGithubOidc(jwt);}
  catch(error){
    if(error?.code==="oidc_jwks_unavailable"||error?.code==="oidc_jwks_invalid")return jsonResponse({error:"identity_provider_unavailable"},503);
    return jsonResponse({error:"unauthorized"},401);
  }
  const token=consumeKey(jwt),expiry=new Date(Date.now()+TTL_SECONDS*1000);
  try{
    await issueGrant({
      id:createId(),recipientEmail:RECIPIENT,
      tokenHash:hashOpaqueToken(token),
      issuedBy:"github-actions-oidc:"+claims.run_id,
      expiresAt:expiry
    });
    const redeemed=await redeemGrant({grantToken:token});
    if(!redeemed.ok)return jsonResponse({error:"session_unavailable"},503);
    const maxAge=Math.floor((new Date(redeemed.expiresAt).getTime()-Date.now())/1000);
    if(maxAge<=0)return jsonResponse({error:"session_unavailable"},503);
    return jsonResponse({ok:true,access:"config-only",expiresAt:new Date(redeemed.expiresAt).toISOString()},200,{
      "Set-Cookie":cookieForSession(redeemed.sessionToken,maxAge)
    });
  }catch(error){
    if(error?.code==="23505")return jsonResponse({error:"oidc_token_already_consumed"},409);
    return jsonResponse({error:"access_store_unavailable"},503);
  }
}
export const config={path:"/api/ci/config-session",method:"POST"};
