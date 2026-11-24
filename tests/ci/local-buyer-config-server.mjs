// CI ONLY. A temporary localhost HTTP server with an ephemeral buyer payload
// derived from codebase defaults; never writes to Netlify Blobs or the database.
// NOT a replacement for a validated published configuration on a real deploy.
import http from "node:http";
import {readFile,stat} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {createLocalBuyerFixture} from "./local-buyer-config-fixture.mjs";
const root=resolve("app");
const port=Number(process.env.CI_LOCAL_CONFIG_PORT||8123);
if(!Number.isInteger(port)||port<0||port>65535)throw new Error("CI_LOCAL_CONFIG_PORT must be an integer from 0 to 65535");
const fixture=createLocalBuyerFixture();
const payload=fixture.payload;
const json=JSON.stringify(payload);
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",
 ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",
 ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",
 ".svg":"image/svg+xml",".woff2":"font/woff2",".ico":"image/x-icon"};
const server=http.createServer(async(req,res)=>{
 try{
  const raw=new URL(req.url,"http://localhost");
  // The browser navigation asks for anonymous session status even though
  // this is a local-only, unauthenticated V5 UI fixture. Respond as ANONYMOUS
  // rather than 405: HTTP errors pollute console assertions in all five suites.
  // Never issue a cookie or imply a real authenticated Netlify session.
  if(req.method==="POST" && raw.pathname==="/api/access/session"){
   res.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
   res.end(JSON.stringify({authenticated:false}));return;
  }
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
  res.writeHead(404,{"Content-Type":"text/plain"});res.end("not found");
 }
});
let stopping=false;
const stop=()=>{
 if(stopping)return;
 stopping=true;
 server.close(error=>{
  if(error){console.error("CI_LOCAL_BUYER_DEFAULTS_FIXTURE_CLOSE_FAILED "+error.message);process.exitCode=1}
 });
};
process.once("SIGINT",stop);
process.once("SIGTERM",stop);
server.listen(port,"127.0.0.1",()=>console.log("CI_LOCAL_BUYER_DEFAULTS_FIXTURE_READY "+JSON.stringify({
 port:server.address().port,
 source:"checked-in defaults upgraded and validated in memory",schema:fixture.sourceSchema,buyerSchema:payload.schemaVersion,
 warning:"Local testing only; not a Netlify published Blob"
})));
