// ARC-03C. Sole authoring source: architecture/pages and architecture/fragments.
// app HTML is checked-in generated output. The real build fails closed on drift.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const SLOT="<!-- ARC03_PRIMARY_HEADER -->";
const FRAGMENT="architecture/fragments/primary-header.fragment.html";
const ROUTES="architecture/fragments/primary-header.routes.json";
const MANIFEST="architecture/generated/primary-pages.manifest.json";
const MAP=[
 {route:"/",source:"architecture/pages/root.page.html",output:"app/index.html"},
 {route:"/about/",source:"architecture/pages/about.page.html",output:"app/about/index.html"},
 {route:"/how-it-works/",source:"architecture/pages/how-it-works.page.html",output:"app/how-it-works/index.html"}
];
const KEYS=["brandHref","ambientesHref","ambientesCurrent","howHref","howCurrent","aboutHref","aboutCurrent","whatsAppIconAriaHidden"];
function gitBlobSha(data) {
 return createHash("sha1").update("blob "+Buffer.byteLength(data)+"\0").update(data).digest("hex");
}
function header(fragment,r) {
 assert.ok(["ambientes","how","about"].includes(r.current),"Invalid menu selection");
 for(const k of ["brandHref","ambientesHref","howHref","aboutHref"])
  assert.match(r[k],/^(?:\/[^\s"'<>]*|\.\.\/[^\s"'<>]*|\.\/)$/,"Unsafe static link: "+k);
 const values={
  brandHref:r.brandHref,ambientesHref:r.ambientesHref,howHref:r.howHref,aboutHref:r.aboutHref,
  ambientesCurrent:r.current==="ambientes"?' aria-current="page"':"",
  howCurrent:r.current==="how"?' aria-current="page"':"",
  aboutCurrent:r.current==="about"?' aria-current="page"':"",
  whatsAppIconAriaHidden:r.whatsAppIconAriaHidden?' aria-hidden="true"':""
 };
 assert.deepEqual([...new Set([...fragment.matchAll(/\{\{([^{}]+)\}\}/g)].map(m=>m[1]))].sort(),[...KEYS].sort());
 const text=fragment.replace(/\{\{([^{}]+)\}\}/g,(_,key)=>values[key]).trim();
 assert.ok(!text.includes("{{"),"Unresolved placeholder");
 return text;
}
export async function projectPages() {
 const [routeText,fragment]=await Promise.all([
  readFile(join(ROOT,ROUTES),"utf8"),readFile(join(ROOT,FRAGMENT),"utf8")
 ]);
 const config=JSON.parse(routeText);
 assert.equal(config.schema,"M2DPrimaryHeaderRoutes/0.1");
 assert.equal(config.status,"BUILD_AUTHORITATIVE_ARC03C");
 assert.equal(config.template,FRAGMENT);
 assert.deepEqual(config.routes.map(r=>r.route),MAP.map(p=>p.route));
 assert.deepEqual(config.routes.map(r=>r.source),MAP.map(p=>p.source));
 assert.deepEqual(config.scope.doesNotInclude,["/viewer/","/config/","/admin.html","/access/","/access/manage.html"]);
 assert.equal(config.scope.mayOverwriteAuthoredPages,false);
 assert.equal(config.scope.mayModifyNetlifyBuild,true);
 const manifest={
  schema:"M2DARC03CPublishedPages/1",authority:"architecture/pages",
  fragment:{path:FRAGMENT,gitBlobSha:gitBlobSha(fragment)},
  routesConfig:{path:ROUTES,gitBlobSha:gitBlobSha(routeText)},pages:[]
 };
 const pages=[];
 for(let i=0;i<MAP.length;i++) {
  const p=MAP[i],source=await readFile(join(ROOT,p.source),"utf8");
  assert.equal(source.split(SLOT).length,2,"Exactly one header slot required in "+p.source);
  assert.ok(!/<header class="site-header">/.test(source),"Duplicate authorial header");
  assert.ok(!/<header class="viewer-header">/.test(source),"NAV-005 excluded");
  const html=source.replace(SLOT,header(fragment,config.routes[i]));
  assert.ok(!html.includes(SLOT)&&!html.includes("{{"),"Unresolved page");
  manifest.pages.push({route:p.route,source:p.source,output:p.output,
   sourceGitBlobSha:gitBlobSha(source),outputGitBlobSha:gitBlobSha(html)});
  pages.push({output:p.output,html});
 }
 return {manifest,pages,text:JSON.stringify(manifest,null,2)+"\n"};
}
async function check(r) {
 assert.equal(await readFile(join(ROOT,MANIFEST),"utf8"),r.text,
  "Generated manifest drift; run pages:sync and review changes");
 for(const p of r.pages)
  assert.equal(await readFile(join(ROOT,p.output),"utf8"),p.html,
   "Generated HTML drift in "+p.output+"; edit architecture/pages and run pages:sync");
}
async function emit(r) {
 for(const p of r.pages) {
  const path=join(ROOT,p.output);
  await mkdir(dirname(path),{recursive:true});
  await writeFile(path,p.html,"utf8");
 }
 const path=join(ROOT,MANIFEST);
 await mkdir(dirname(path),{recursive:true});
 await writeFile(path,r.text,"utf8");
}
export async function run(mode) {
 assert.ok(["--check","--sync","--build"].includes(mode),"Invalid ARC-03C operation");
 const r=await projectPages();
 if(mode!=="--sync")await check(r);
 if(mode!=="--check")await emit(r);
 return {mode,pages:r.pages.length,authority:r.manifest.authority};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 assert.equal(process.argv.length,3,"Choose --check, --sync or --build");
 run(process.argv[2]).then(r=>console.log("ARC03C_PAGE_GATE_PASS "+JSON.stringify(r)))
 .catch(e=>{console.error(e);process.exitCode=1;});
}
