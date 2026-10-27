// Migration Inspector V0: conservative, read-only source inventory.
// Only direct HTML script/style references and lexical class candidates are inferred.
// NEVER treat missing graph edges as proof of no impact or class overlap as a defect.
import {readFileSync,existsSync,mkdirSync,writeFileSync} from "node:fs";
import {resolve,dirname,relative,sep} from "node:path";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";

export const DEFAULT_ROUTES = Object.freeze([
  ["landing","index.html"],
  ["about","about/index.html"],
  ["how-it-works","how-it-works/index.html"],
  ["viewer","viewer/index.html"],
  ["config","config/index.html"],
  ["admin","admin.html"],
  ["access","access/index.html"],
  ["access-manage","access/manage.html"]
]);
const sorted = values => [...new Set(values)].sort((a,b)=>a.localeCompare(b,"en"));
const sha256 = data => createHash("sha256").update(data).digest("hex");
const posix = value => value.split(sep).join("/");
const safeName = value => /^[A-Za-z][\w-]*$/.test(value);

function attributes(tag){
  const result={};
  const rx=/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while((match=rx.exec(tag)))result[match[1].toLowerCase()]=match[2]??match[3]??match[4];
  return result;
}
function localAsset(appRoot,pageAbsolute,source){
  if(!source || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(source))return null;
  const bare=source.split(/[?#]/,1)[0];
  if(!bare)return null;
  const target=resolve(source.startsWith("/")?appRoot:dirname(pageAbsolute),source.startsWith("/")?bare.slice(1):bare);
  const rel=relative(appRoot,target);
  if(rel===".."||rel.startsWith(".."+sep)||rel.startsWith(sep))return {unsafe:source};
  return {path:posix(rel),absolute:target};
}
function cssCandidates(css){
  // CSS lexical evidence only: @rules, custom properties and strings can confound extraction.
  // Do not use this list as a parsed selector AST or automatically remove duplicates.
  const withoutComments=css.replace(/\/\*[\s\S]*?\*\//g,"");
  return sorted([...withoutComments.matchAll(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)]
    .map(m=>m[1]).filter(safeName));
}
function htmlClasses(html){
  const values=[];
  for(const match of html.matchAll(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)){
    values.push(...(match[1]??match[2]).split(/\s+/).filter(safeName));
  }
  return sorted(values);
}
// The current root build declares the expected missing artifacts explicitly.
// This is an observation of scripts.build; no command is executed.
function buildOutputPaths(root){
  const candidate=resolve(root,"..","package.json");
  if(!existsSync(candidate))return [];
  try{
    const pkg=JSON.parse(readFileSync(candidate,"utf8"));
    const outputs=[];
    for(const command of Object.values(pkg.scripts??{})){
      if(typeof command!=="string")continue;
      for(const match of command.matchAll(/--outfile=app\/([A-Za-z0-9_./-]+)/g))outputs.push(match[1]);
    }
    return sorted(outputs);
  }catch{return [];} // unknown remains unknown, not treated as valid output
}
export function inspect({appRoot=resolve("app"),routes=DEFAULT_ROUTES,focus=null,changed=[]}={}){
  const root=resolve(appRoot);
  if(focus!==null&&!safeName(focus))throw new Error("Invalid --focus class");
  const buildOutputs=new Set(buildOutputPaths(root));
  const files=new Map(), routeRecords=[], diagnostics=[];
  function evidence(path,kind){
    if(!files.has(path)){
      const absolute=resolve(root,path);
      if(!existsSync(absolute)){
        files.set(path,buildOutputs.has(path)?
          {path,kind,status:"DECLARED_BUILD_OUTPUT_NOT_IN_SOURCE",provenance:"package.json:scripts"}:
          {path,kind,status:"MISSING"});
      }
      else{
        const content=readFileSync(absolute,"utf8");
        files.set(path,{path,kind,status:"FOUND",sha256:sha256(content),
          classes:kind==="css"?cssCandidates(content):undefined});
      }
    }
    return files.get(path);
  }
  for(const [id,page] of routes){
    const pageAbsolute=resolve(root,page);
    const route={id,page,status:"MISSING",htmlClasses:[],stylesheets:[],scripts:[],generated:[],unresolved:[]};
    const pageEvidence=evidence(page,"html");
    if(pageEvidence.status==="MISSING"){
      diagnostics.push({kind:"PAGE_NOT_FOUND",route:id,path:page});
      routeRecords.push(route);
      continue;
    }
    const html=readFileSync(pageAbsolute,"utf8");
    route.status="FOUND";
    route.htmlClasses=htmlClasses(html);
    // Honor the HTML base element. /config/ uses <base href="/"> so relative
    // core/*.js resolves at the site root, NOT beneath /config/.
    let assetBase=pageAbsolute;
    const baseTag=html.match(/<base\b[^>]*>/i)?.[0];
    if(baseTag){
      const href=attributes(baseTag).href;
      const base=localAsset(root,pageAbsolute,href);
      if(base&&!base.unsafe&&href.endsWith("/")){
        assetBase=resolve(base.absolute,"__base_document__.html");
      }else{
        route.unresolved.push({kind:"BASE_HREF_NOT_MODELED",source:href??""});
      }
    }
    const tags=html.match(/<(?:script|link)\b[^>]*>/gi)??[];
    for(const tag of tags){
      const script=/^<script\b/i.test(tag),attrs=attributes(tag);
      const kind=script?"script":attrs.rel?.toLowerCase().split(/\s+/).includes("stylesheet")?"stylesheet":null;
      if(!kind)continue;
      const src=script?attrs.src:attrs.href;
      if(!src)continue; // inline script not modeled
      const resolved=localAsset(root,assetBase,src);
      if(!resolved){
        route.unresolved.push({kind:"EXTERNAL_OR_DYNAMIC_ASSET",source:src});
        continue;
      }
      if(resolved.unsafe){
        route.unresolved.push({kind:"PATH_OUTSIDE_APP",source:resolved.unsafe});
        continue;
      }
      const file=evidence(resolved.path,kind==="stylesheet"?"css":"js");
      const slot=kind==="stylesheet"?"stylesheets":"scripts";
      route[slot].push(file.path);
      if(file.status==="DECLARED_BUILD_OUTPUT_NOT_IN_SOURCE"){
        route.generated.push(file.path); // expected after running the build, not a source error
      }else if(file.status!=="FOUND"){
        route.unresolved.push({kind:"REFERENCED_FILE_MISSING",path:file.path});
        diagnostics.push({kind:"REFERENCED_FILE_MISSING",route:id,path:file.path});
      }
    }
    route.stylesheets=sorted(route.stylesheets);
    route.scripts=sorted(route.scripts);
    routeRecords.push(route);
  }
  const consumers=new Map();
  for(const route of routeRecords){
    for(const path of [...route.stylesheets,...route.scripts]){
      if(!consumers.has(path))consumers.set(path,[]);
      consumers.get(path).push(route.id);
    }
  }
  const sharedDependencies=[...consumers].filter(([,ids])=>ids.length>1)
    .map(([path,ids])=>({path,routes:sorted(ids)}))
    .sort((a,b)=>a.path.localeCompare(b.path,"en"));
  const overlaps=[];
  for(const route of routeRecords){
    for(let a=0;a<route.stylesheets.length;a++)for(let b=a+1;b<route.stylesheets.length;b++){
      const left=files.get(route.stylesheets[a]),right=files.get(route.stylesheets[b]);
      if(left?.status!=="FOUND"||right?.status!=="FOUND")continue;
      const same=left.classes.filter(value=>(!focus||value===focus)&&right.classes.includes(value));
      if(same.length)overlaps.push({route:route.id,files:[left.path,right.path],
        classes:same,classification:"LEXICAL_CANDIDATE_UNVERIFIED"});
    }
  }
  // Impact is a positive-only observation; lack of a direct HTML link is NEVER a safe skip.
  const changedPaths=sorted(changed.map(value=>posix(value.replace(/^app[\\/]/,""))));
  const impact=changedPaths.map(path=>({
    path,directConsumers:sorted(consumers.get(path)??[]),
    interpretation:"POSITIVE_ONLY_NOT_A_COMPLETE_IMPACT_GRAPH",
    requireReview:(consumers.get(path)?.length??0)===0
  }));
  const focusEvidence=focus?routeRecords.map(route=>({
    route:route.id,htmlStatic:route.htmlClasses.includes(focus),
    cssFiles:route.stylesheets.filter(path=>files.get(path)?.classes?.includes(focus))
  })).filter(row=>row.htmlStatic||row.cssFiles.length):undefined;
  const fileEvidence=[...files.values()].sort((a,b)=>a.path.localeCompare(b.path,"en"))
    .map(({classes,...file})=>({ ...file, cssCandidateCount:classes?.length }));
  const routeEvidence=routeRecords.map(route=>({
    ...route,htmlClassCount:route.htmlClasses.length,
    htmlClasses:focus?route.htmlClasses.filter(c=>c===focus):undefined
  }));
  return {
    schema:"M2DMigrationInspector/0.1",
    authority:"SOURCE_ONLY_NON_HOMOLOGATING",
    coverage:{
      linkedAssets:"direct static HTML link[rel=stylesheet]/script[src] only",
      jsImports:"NOT_TRACED",cssImports:"NOT_TRACED",
      dynamicDom:"NOT_TRACED",runtimeCssom:"NOT_TRACED",
      ownersAndApprovedTokens:"NOT_INFERRED",
      negativeImpact:"NOT_PROVEN",buildOutputs:"package.json scripts --outfile=app/* only"
    },
    summary:{
      routes:routeRecords.length,found:routeRecords.filter(r=>r.status==="FOUND").length,
      uniqueDirectAssets:consumers.size,sharedDirectAssets:sharedDependencies.length,
      lexicalOverlapPairs:overlaps.length,missingReferences:diagnostics.length,
      declaredGeneratedAssets:buildOutputs.size,generatedReferences:routeRecords.reduce((n,r)=>n+r.generated.length,0)
    },
    routes:routeEvidence,files:fileEvidence,sharedDependencies,
    cssOverlapCandidates:overlaps,focusClass:focus,
    focusEvidence,changedImpact:impact,diagnostics
  };
}
function args(argv){
  const options={changed:[]};
  for(let i=0;i<argv.length;i++){
    const key=argv[i],value=argv[i+1];
    if(["--app","--focus","--out","--changed"].includes(key)&&value){
      if(key==="--app")options.appRoot=resolve(value);
      if(key==="--focus")options.focus=value;
      if(key==="--out")options.out=resolve(value);
      if(key==="--changed")options.changed.push(value);
      i++;
    }else throw new Error("Usage: node tools/migration-inspector.mjs [--app DIR] [--focus CLASS] [--changed PATH] [--out PATH]");
  }
  return options;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const options=args(process.argv.slice(2));
    const output=JSON.stringify(inspect(options),null,2)+"\n";
    if(options.out){mkdirSync(dirname(options.out),{recursive:true});writeFileSync(options.out,output);}
    else process.stdout.write(output);
  }catch(error){console.error("MIGRATION_INSPECTOR_ERROR "+error.message);process.exitCode=1;}
}
