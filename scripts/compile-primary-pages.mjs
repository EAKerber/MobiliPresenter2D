// ARC-03C. Sole authoring source: architecture/pages and architecture/fragments.
// app HTML is checked-in generated output. The real build fails closed on drift.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const SLOT="<!-- ARC03_PRIMARY_HEADER -->";
const FRAGMENT="architecture/fragments/primary-header.fragment.html";
const ROUTES="architecture/fragments/primary-header.routes.json";
const COPY_CATALOG="app/core/ui-copy.js";
const MANIFEST="architecture/generated/primary-pages.manifest.json";
const COMPILER="scripts/compile-primary-pages.mjs";
const SOURCE_MAP_SCHEMA="M2DARC03CProvenanceMap/2";
const MAP=[
 {route:"/",source:"architecture/pages/root.page.html",output:"app/index.html"},
 {route:"/about/",source:"architecture/pages/about.page.html",output:"app/about/index.html"},
 {route:"/how-it-works/",source:"architecture/pages/how-it-works.page.html",output:"app/how-it-works/index.html"}
];
const KEYS=["brandHref","ambientesHref","ambientesCurrent","howHref","howCurrent","aboutHref","aboutCurrent","whatsAppIconAriaHidden","copy.brand.homeLinkAriaLabel","copy.brand.logoAlt","copy.navigation.primaryLabel","copy.navigation.environments","copy.navigation.howItWorks","copy.navigation.about","copy.navigation.contactAriaLabel","copy.navigation.contact"];
const COPY_POINTERS={
 "copy.brand.homeLinkAriaLabel":"/brand/homeLinkAriaLabel",
 "copy.brand.logoAlt":"/brand/logoAlt",
 "copy.navigation.primaryLabel":"/navigation/primaryLabel",
 "copy.navigation.environments":"/navigation/environments",
 "copy.navigation.howItWorks":"/navigation/howItWorks",
 "copy.navigation.about":"/navigation/about",
 "copy.navigation.contactAriaLabel":"/navigation/contactAriaLabel",
 "copy.navigation.contact":"/navigation/contact"
};
const PAGE_COPY_POINTERS={
 "architecture/pages/root.page.html":{
  "copy.actions.exploreEnvironments":"/actions/exploreEnvironments",
  "copy.home.hero.aboutLink":"/home/hero/aboutLink",
  "copy.video.youtubeLink":"/video/youtubeLink",
  "copy.footer.tagline":"/footer/tagline"
 },
 "architecture/pages/about.page.html":{
  "copy.actions.exploreEnvironments":"/actions/exploreEnvironments",
  "copy.footer.homeLink":"/footer/homeLink",
  "copy.footer.tagline":"/footer/tagline"
 },
 "architecture/pages/how-it-works.page.html":{
  "copy.video.youtubeLink":"/video/youtubeLink",
  "copy.footer.homeLink":"/footer/homeLink",
  "copy.footer.tagline":"/footer/tagline"
 }
};
const require=createRequire(import.meta.url);
function canonicalText(value) { return value.replace(/\r\n/g,"\n"); }
async function readCanonical(path) {
 return canonicalText(await readFile(join(ROOT,path),"utf8"));
}
function gitBlobSha(data) {
 const canonical=canonicalText(data);
 return createHash("sha1").update("blob "+Buffer.byteLength(canonical)+"\0").update(canonical).digest("hex");
}
function headerHasClass(source,className) {
 return [...source.matchAll(/<header\b([^>]*)>/gi)].some(([,attributes])=>{
  const match=attributes.match(/\bclass\s*=\s*(["'])(.*?)\1/i);
  return match?.[2].split(/\s+/).includes(className)===true;
 });
}
function codePointLength(value) { return Array.from(value).length; }
function appendMapped(parts,segments,offset,value,transform,origin) {
 const start=offset,end=start+codePointLength(value);
 parts.push(value);
 if(end>start)segments.push({output:{start,end},transform,origin});
 return end;
}
function renderPageCopy(source,path,sourceBase,catalog) {
 const allowed=PAGE_COPY_POINTERS[path]||{};
 const parts=[],segments=[];let outputOffset=0,cursor=0;
 for(const match of source.matchAll(/\{\{([^{}]+)\}\}/g)) {
  const key=match[1],pointer=allowed[key];
  assert.equal(typeof pointer,"string","Page copy placeholder is not approved for "+path+": "+key);
  const literal=source.slice(cursor,match.index);
  if(literal) {
   const sourceStart=sourceBase+codePointLength(source.slice(0,cursor));
   outputOffset=appendMapped(parts,segments,outputOffset,literal,"copy",{
    kind:"page",path,range:{start:sourceStart,end:sourceStart+codePointLength(literal)}
   });
  }
  const value=pointer.split("/").slice(1).reduce((node,keyPart)=>node?.[keyPart],catalog);
  assert.equal(typeof value,"string","Catalog entry must be a string: "+pointer);
  assert.notEqual(value.trim(),"","Catalog entry must not be blank: "+pointer);
  const templateStart=sourceBase+codePointLength(source.slice(0,match.index));
  outputOffset=appendMapped(parts,segments,outputOffset,escapeHtml(value),"catalog-key-substitution",{
   kind:"catalog-key",path:COPY_CATALOG,pointer,
   template:{path,range:{start:templateStart,end:templateStart+codePointLength(match[0])}}
  });
  cursor=match.index+match[0].length;
 }
 const trailing=source.slice(cursor);
 if(trailing) {
  const sourceStart=sourceBase+codePointLength(source.slice(0,cursor));
  outputOffset=appendMapped(parts,segments,outputOffset,trailing,"copy",{
   kind:"page",path,range:{start:sourceStart,end:sourceStart+codePointLength(trailing)}
  });
 }
 return {text:parts.join(""),segments};
}
function trimRendered(parts,segments) {
 const value=parts.join(""),trimmed=value.trim();
 const leadingUtf16=value.length-value.trimStart().length;
 const leading=codePointLength(value.slice(0,leadingUtf16));
 const end=leading+codePointLength(trimmed);
 const cropped=[];
 for(const segment of segments) {
  const start=Math.max(segment.output.start,leading),finish=Math.min(segment.output.end,end);
  if(finish<=start)continue;
  const deltaStart=start-segment.output.start,deltaEnd=segment.output.end-finish;
  const origin={...segment.origin};
  if(segment.transform==="copy"&&origin.range)
   origin.range={start:origin.range.start+deltaStart,end:origin.range.end-deltaEnd};
  cropped.push({...segment,output:{start:start-leading,end:finish-leading},origin});
 }
 return {text:trimmed,segments:cropped};
}
export function escapeHtml(value) {
 return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
}
function header(fragment,r,routeIndex,catalog) {
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
 for(const [placeholder,pointer] of Object.entries(COPY_POINTERS)) {
  const value=pointer.split("/").slice(1).reduce((node,key)=>node?.[key],catalog);
  assert.equal(typeof value,"string","Catalog entry must be a string: "+pointer);
  assert.notEqual(value.trim(),"","Catalog entry must not be blank: "+pointer);
  values[placeholder]=escapeHtml(value);
 }
 assert.deepEqual([...new Set([...fragment.matchAll(/\{\{([^{}]+)\}\}/g)].map(m=>m[1]))].sort(),[...KEYS].sort());
 const parts=[],segments=[];let outputOffset=0,cursor=0;
 const routeConfigPointer=(key)=>"/routes/"+routeIndex+"/"+(key.endsWith("Current")?"current":key);
 for(const match of fragment.matchAll(/\{\{([^{}]+)\}\}/g)) {
  const key=match[1],literal=fragment.slice(cursor,match.index);
  if(literal) {
   const sourceStart=codePointLength(fragment.slice(0,cursor));
   outputOffset=appendMapped(parts,segments,outputOffset,literal,"copy",{
    kind:"shared-fragment",path:FRAGMENT,range:{start:sourceStart,end:sourceStart+codePointLength(literal)}
   });
  }
  const replacement=values[key];
  assert.equal(typeof replacement,"string","Placeholder has no resolved value: "+key);
  const placeholderStart=codePointLength(fragment.slice(0,match.index));
  const template={path:FRAGMENT,range:{start:placeholderStart,end:placeholderStart+codePointLength(match[0])}};
  if(COPY_POINTERS[key]) {
   outputOffset=appendMapped(parts,segments,outputOffset,replacement,"catalog-key-substitution",{
    kind:"catalog-key",path:COPY_CATALOG,pointer:COPY_POINTERS[key],template
   });
   cursor=match.index+match[0].length;
   continue;
  }
  const configOrigin={kind:"route-config",path:ROUTES,pointer:routeConfigPointer(key),template};
  const generatedRules={
   ambientesCurrent:"current-route-to-ambientes-aria-current",
   howCurrent:"current-route-to-how-aria-current",
   aboutCurrent:"current-route-to-about-aria-current",
   whatsAppIconAriaHidden:"true-config-flag-to-aria-hidden"
  };
  const generatedOrigin={kind:"generator-rule",rule:generatedRules[key],inputs:[{
   kind:"route-config",path:ROUTES,pointer:routeConfigPointer(key)
  }],template};
  const directConfigKey=["brandHref","ambientesHref","howHref","aboutHref"].includes(key);
  outputOffset=appendMapped(parts,segments,outputOffset,replacement,
   directConfigKey?"route-placeholder-substitution":"conditional-attribute-generation",
   directConfigKey?configOrigin:generatedOrigin);
  cursor=match.index+match[0].length;
 }
 const trailing=fragment.slice(cursor);
 if(trailing) {
  const sourceStart=codePointLength(fragment.slice(0,cursor));
  outputOffset=appendMapped(parts,segments,outputOffset,trailing,"copy",{
   kind:"shared-fragment",path:FRAGMENT,range:{start:sourceStart,end:sourceStart+codePointLength(trailing)}
  });
 }
 const result=trimRendered(parts,segments);
 assert.ok(!result.text.includes("{{"),"Unresolved placeholder");
 return result;
}
export async function projectPages() {
 const [routeText,fragment]=await Promise.all([
  readCanonical(ROUTES),readCanonical(FRAGMENT)
 ]);
 const catalog=require(join(ROOT,COPY_CATALOG));
 assert.equal(catalog?.schema,"M2DUIStringCatalog/1","Unsupported UI copy catalog schema");
 assert.equal(catalog?.locale,"pt-BR","This static header family requires pt-BR copy");
 const config=JSON.parse(routeText);
 assert.equal(config.schema,"M2DPrimaryHeaderRoutes/0.1");
 assert.equal(config.status,"BUILD_AUTHORITATIVE_ARC03C");
 assert.equal(config.template,FRAGMENT);
 assert.deepEqual(config.routes.map(r=>r.route),MAP.map(p=>p.route));
 assert.deepEqual(config.routes.map(r=>r.source),MAP.map(p=>p.source));
 assert.deepEqual(config.scope.doesNotInclude,["/viewer/","/config/","/admin.html","/access/","/access/manage.html"]);
 assert.equal(config.scope.mayOverwriteAuthoredPages,false);
 assert.equal(config.scope.mayModifyNetlifyBuild,true);
 const compilerSource=await readCanonical(COMPILER);
 const manifest={
  schema:"M2DARC03CPublishedPages/3",authority:"architecture/pages",
  sourceMap:{schema:SOURCE_MAP_SCHEMA,offsetUnit:"unicode-codepoints",
   generator:{path:COMPILER,gitBlobSha:gitBlobSha(compilerSource)}},
  copyCatalog:{path:COPY_CATALOG,gitBlobSha:gitBlobSha(await readCanonical(COPY_CATALOG)),schema:catalog.schema,locale:catalog.locale},
  fragment:{path:FRAGMENT,gitBlobSha:gitBlobSha(fragment)},
  routesConfig:{path:ROUTES,gitBlobSha:gitBlobSha(routeText)},pages:[]
 };
 const pages=[];
 for(let i=0;i<MAP.length;i++) {
  const p=MAP[i],source=await readCanonical(p.source);
  assert.equal(source.split(SLOT).length,2,"Exactly one header slot required in "+p.source);
  assert.ok(!headerHasClass(source,"site-header"),"Duplicate authorial header");
  assert.ok(!headerHasClass(source,"viewer-header"),"NAV-005 excluded");
  const renderedHeader=header(fragment,config.routes[i],i,catalog);
  const slotStart=source.indexOf(SLOT),slotEnd=slotStart+SLOT.length;
  const before=source.slice(0,slotStart),after=source.slice(slotEnd);
  const pageParts=[],pageSegments=[];let pageOffset=0;
  const renderedBefore=renderPageCopy(before,p.source,0,catalog);
  pageParts.push(renderedBefore.text);
  pageSegments.push(...renderedBefore.segments.map(segment=>({...segment,output:{
   start:segment.output.start+pageOffset,end:segment.output.end+pageOffset
  }})));
  pageOffset+=codePointLength(renderedBefore.text);
  const headerOffset=pageOffset;
  pageParts.push(renderedHeader.text);
  pageSegments.push(...renderedHeader.segments.map(segment=>({...segment,output:{
   start:segment.output.start+headerOffset,end:segment.output.end+headerOffset
  }})));
  pageOffset+=codePointLength(renderedHeader.text);
  const renderedAfter=renderPageCopy(after,p.source,codePointLength(source.slice(0,slotEnd)),catalog);
  pageParts.push(renderedAfter.text);
  pageSegments.push(...renderedAfter.segments.map(segment=>({...segment,output:{
   start:segment.output.start+pageOffset,end:segment.output.end+pageOffset
  }})));
  pageOffset+=codePointLength(renderedAfter.text);
  const html=pageParts.join("");
  assert.ok(!html.includes(SLOT)&&!html.includes("{{"),"Unresolved page");
  let mapCursor=0;
  for(const segment of pageSegments) {
   assert.equal(segment.output.start,mapCursor,"Source-map gap or overlap in "+p.output);
   assert.ok(segment.output.end>segment.output.start,"Empty source-map segment in "+p.output);
   mapCursor=segment.output.end;
  }
  assert.equal(mapCursor,codePointLength(html),"Source map must cover every output character in "+p.output);
  manifest.pages.push({route:p.route,source:p.source,output:p.output,
   sourceGitBlobSha:gitBlobSha(source),outputGitBlobSha:gitBlobSha(html),
   sourceMap:{segments:pageSegments}});
  pages.push({output:p.output,html,sourceMap:pageSegments});
 }
 return {manifest,pages,text:JSON.stringify(manifest,null,2)+"\n"};
}
async function check(r) {
 assert.equal(await readCanonical(MANIFEST),r.text,
  "Generated manifest drift; run pages:sync and review changes");
 for(const p of r.pages)
  assert.equal(await readCanonical(p.output),p.html,
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
