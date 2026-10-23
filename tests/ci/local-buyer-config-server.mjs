// CI ONLY. A temporary localhost HTTP server with an ephemeral buyer payload
// derived from codebase defaults; never writes to Netlify Blobs or the database.
// NOT a replacement for a validated published configuration on a real deploy.
import http from "node:http";
import {readFile,stat} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import configCore from "../../app/core/configuration.js";
import administrationV5 from "../../app/core/administration-v5.js";
import publishedReader from "../../app/core/published-configuration.js";
import projection from "../../app/core/published-buyer-projection.js";
import flow from "../../app/core/flow-model.js";
import hierarchy from "../../app/data/hierarchy-defaults.js";
import defaults from "../../app/data/configurator-settings.js";
import catalog from "../../app/data/catalog-data.js";
import priceBook from "../../app/data/mock-price-book.js";
import scene from "../../app/data/scene-data.js";
import pricingContract from "../../app/core/pricing-contract.js";
import presentationPolicy from "../../app/data/presentation-policy-defaults.js";
const root=resolve("app");
const port=Number(process.env.CI_LOCAL_CONFIG_PORT||8123);
const v3=configCore.normalizeConfiguratorSettings(configCore.createDefaultAdministration(defaults,catalog,priceBook,scene),catalog,priceBook,scene);
const v5=administrationV5.upgrade(v3,configCore,flow,catalog,priceBook,scene,hierarchy);
const errors=administrationV5.validate(v5,configCore,catalog,priceBook,scene);
if(errors.length)throw new Error("LOCAL_V5_FIXTURE_INVALID");
const inspected=publishedReader.inspectPublishedRaw({kind:"stored",etag:"LOCAL_ONLY",value:v5},
  {configuration:configCore,administrationV5,catalog,priceBook,scene});
if(inspected.kind!=="valid")throw new Error("CI_LOCAL_FIXTURE_INVALID");
const payload=projection.project(inspected.value,{
 configuration:configCore,administrationV5,flow,catalog,priceBook,scene,
 hierarchyDefaults:hierarchy,pricingContract,defaultPresentationPolicy:presentationPolicy
});
const json=JSON.stringify(payload);
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",
 ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",
 ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",
 ".svg":"image/svg+xml",".woff2":"font/woff2",".ico":"image/x-icon"};
const server=http.createServer(async(req,res)=>{
 try{
  const raw=new URL(req.url,"http://localhost");
  if(req.method!=="GET"){res.writeHead(405);res.end();return}
  if(raw.pathname==="/api/buyer-configuration"){
   res.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
   res.end(json);return;
  }
  if(raw.pathname.startsWith("/api/")){res.writeHead(404);res.end();return}
  let rel=decodeURIComponent(raw.pathname);
  if(rel.includes("\0")||rel.includes("..")){res.writeHead(403);res.end();return}
  if(rel.endsWith("/"))rel+="index.html";
  let f=resolve(root,"."+rel);
  if(!f.startsWith(root+sep)){res.writeHead(403);res.end();return}
  const meta=await stat(f);
  if(meta.isDirectory())f=resolve(f,"index.html");
  const body=await readFile(f);
  res.writeHead(200,{"Content-Type":mime[extname(f)]||"application/octet-stream","Cache-Control":"no-store"});
  res.end(body);
 }catch{
  // Local-only diagnostic; paths are localhost and contain no real credentials.
  console.log("CI_LOCAL_HTTP_404 "+JSON.stringify({path:new URL(req.url,"http://localhost").pathname}));
  res.writeHead(404,{"Content-Type":"text/plain"});res.end("not found");
 }
});
server.listen(port,"127.0.0.1",()=>console.log("CI_LOCAL_BUYER_DEFAULTS_FIXTURE_READY "+JSON.stringify({
 source:"checked-in defaults",schema:v5.schemaVersion,buyerSchema:payload.schemaVersion,
 warning:"Local testing only; not a Netlify published Blob"
})));
