// GitHub Actions OIDC -> Configurator-only CI trust.
// Restricted to ONE workflow, repository, GitHub environment and Netlify preview.
// No shared password, permanent bearer credential, or Admin authorization.
import {createPublicKey,verify as verifySignature} from "node:crypto";

export const CI_OIDC_AUDIENCE="api://mobilipresenter2d/ci-preview-235";
export const CI_PREVIEW_ORIGIN="https://deploy-preview-235--mobilipresenter2d.netlify.app";
export const CI_WORKFLOW_REF="EAKerber/MobiliPresenter2D/.github/workflows/ci-preview-oidc.yml@refs/heads/security/oidc-ci-preview235-v0-20261023";
const EXPECTED={
  iss:"https://token.actions.githubusercontent.com",
  repository:"EAKerber/MobiliPresenter2D",
  repository_id:"1356562826",
  repository_owner_id:"62451548",
  ref:"refs/heads/security/oidc-ci-preview235-v0-20261023",
  workflow_ref:CI_WORKFLOW_REF,
  environment:"ci-auth-preview"
};
const JWKS_URL="https://token.actions.githubusercontent.com/.well-known/jwks";
const error=code=>Object.assign(new Error(code),{code});

function parseSegment(raw){
  if(typeof raw!=="string"||raw.length>12288||!/^[A-Za-z0-9_-]+$/.test(raw))throw error("invalid_oidc_encoding");
  const decoded=Buffer.from(raw,"base64url");
  if(decoded.toString("base64url")!==raw)throw error("invalid_oidc_encoding");
  try {
    const parsed=JSON.parse(decoded.toString("utf8"));
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("invalid");
    return parsed;
  }catch{throw error("invalid_oidc_payload");}
}
export function isAuthorizedPreview(requestUrl,context){
  try{
    const uri=new URL(requestUrl);
    return uri.origin===CI_PREVIEW_ORIGIN
      &&context?.deploy?.context==="deploy-preview"
      &&String(context?.deploy?.id??"").length>0
      &&context?.deploy?.published===false;
  }catch{return false;}
}
export function validateOidcClaims(claims, now=Math.floor(Date.now()/1000)){
  if(!claims||typeof claims!=="object"||Array.isArray(claims))return false;
  for(const [name,want] of Object.entries(EXPECTED)){
    if(claims[name]!==want)return false;
  }
  if(claims.aud!==CI_OIDC_AUDIENCE)return false;
  // GitHub allows customized subject templates. The authoritative identity is
  // pinned via the signed immutable repository/owner IDs, ref, workflow and environment.
  // Require a well-formed subject, not one optional formatting convention.
  if(typeof claims.sub!=="string"||claims.sub.length<6||claims.sub.length>1024)return false;
  if(!["push","workflow_dispatch"].includes(claims.event_name))return false;
  if(typeof claims.jti!=="string"||claims.jti.length<12||claims.jti.length>256)return false;
  if(!/^[0-9]{1,22}$/.test(String(claims.run_id??"")))return false;
  if(!Number.isInteger(claims.iat)||!Number.isInteger(claims.exp))return false;
  if(claims.iat>now+60||claims.iat<now-600)return false;
  if(claims.exp<=now||claims.exp>now+900||claims.exp<=claims.iat)return false;
  if(claims.nbf!==undefined&&(!Number.isInteger(claims.nbf)||claims.nbf>now+60))return false;
  return true;
}
export async function verifyGithubOidc(jwt,{fetchJwks=fetch,now=Math.floor(Date.now()/1000)}={}){
  if(typeof jwt!=="string"||jwt.length>16000)throw error("invalid_oidc_token");
  const parts=jwt.split(".");
  if(parts.length!==3)throw error("invalid_oidc_token");
  const [protectedHeader,payload,signature]=parts;
  const header=parseSegment(protectedHeader);
  const claims=parseSegment(payload);
  if(header.alg!=="RS256"||typeof header.kid!=="string"||header.kid.length>256||!header.kid)throw error("oidc_algorithm_denied");
  if(!validateOidcClaims(claims,now))throw error("oidc_claims_denied");
  if(!/^[A-Za-z0-9_-]+$/.test(signature)||signature.length>4096)throw error("oidc_signature_malformed");
  const fetched=await fetchJwks(JWKS_URL,{
    method:"GET",headers:{Accept:"application/json"},signal:AbortSignal.timeout(6000)
  });
  if(!fetched.ok)throw error("oidc_jwks_unavailable");
  const keys=await fetched.json();
  if(!Array.isArray(keys?.keys)||keys.keys.length>50)throw error("oidc_jwks_invalid");
  const matching=keys.keys.filter(k=>k?.kid===header.kid && k.kty==="RSA" && (!k.alg||k.alg==="RS256") && (!k.use||k.use==="sig"));
  if(matching.length!==1)throw error("oidc_signing_key_not_found");
  let key;
  try{key=createPublicKey({key:matching[0],format:"jwk"});}
  catch{throw error("oidc_signing_key_invalid");}
  const signed=Buffer.from(protectedHeader+"."+payload,"ascii");
  const ok=verifySignature("RSA-SHA256",signed,key,Buffer.from(signature,"base64url"));
  if(!ok)throw error("oidc_signature_invalid");
  return claims;
}
