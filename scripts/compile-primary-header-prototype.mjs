// ARC-03 build-time HTML fragment prototype. NO writes under app/ or Netlify's publish dir.
// Enforces semantic-HTML equivalence with the three existing primary headers.
// Runtime code and Viewer NAV-005 are deliberately outside scope.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname, join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE="architecture/fragments/primary-header.routes.json";
const TEMPLATE="architecture/fragments/primary-header.fragment.html";
const OUT="artifacts/arc03-preview-only";
const headerMatcher=/<header class="site-header">[\s\S]*?<\/header>/g;
const placeholders=["brandHref","ambientesHref","ambientesCurrent","howHref","howCurrent","aboutHref","aboutCurrent","whatsAppIconAriaHidden"];
const sha256=text=>createHash("sha256").update(text,"utf8").digest("hex");
const normalize=markup=>markup.trim().replace(/>\s+</g,"><");

export function renderHeader(template,route){
  assert.ok(["ambientes","how","about"].includes(route.current),"Invalid current menu selection");
  for(const key of ["brandHref","ambientesHref","howHref","aboutHref"]){
    const href=route[key];
    assert.ok(/^(?:\/[^\s"'<>]*|\.\.\/[^\s"'<>]*|\.\/)$/.test(href),
      "Unsafe/non-static href "+key+" for "+route.route);
  }
  const map={
    brandHref:route.brandHref,
    ambientesHref:route.ambientesHref,
    howHref:route.howHref,
    aboutHref:route.aboutHref,
    ambientesCurrent:route.current==="ambientes"?' aria-current="page"':"",
    howCurrent:route.current==="how"?' aria-current="page"':"",
    aboutCurrent:route.current==="about"?' aria-current="page"':"",
    whatsAppIconAriaHidden:route.whatsAppIconAriaHidden?' aria-hidden="true"':""
  };
  const found=[...template.matchAll(/\{\{([^{}]+)\}\}/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(found)].sort(),[...placeholders].sort(),"Template contract changed");
  const rendered=template.replace(/\{\{([^{}]+)\}\}/g,(_,key)=>map[key]);
  assert.equal(/\{\{/.test(rendered),false,"Unresolved fragment slot");
  return rendered.trim();
}

export function compareSourceHTML(html,generatedHeader){
  const matches=[...html.matchAll(headerMatcher)];
  assert.equal(matches.length,1,"Expected exactly one primary public header");
  const baseline=matches[0][0],generated=generatedHeader.trim();
  assert.equal(normalize(generated),normalize(baseline),
    "Extracted primary header is not structurally identical; do not migrate page");
  const renderedPage=html.replace(headerMatcher,generated);
  assert.equal(renderedPage.replace(generated,baseline),html,
    "Reconstruction changed content outside the header");
  return {renderedPage,baseline,generated,baselineDigest:sha256(normalize(baseline)),
    generatedDigest:sha256(normalize(generated))};
}

export async function validateAndCompile({root=ROOT,outDir=join(ROOT,OUT),write=false}={}){
  const config=JSON.parse(await readFile(join(root,SOURCE),"utf8"));
  assert.equal(config.schema,"M2DPrimaryHeaderRoutes/0.1");
  assert.equal(config.status,"EXPERIMENTAL_BUILD_TIME_ONLY_NOT_PUBLISHED");
  assert.equal(config.routes.length,3);
  assert.deepEqual(config.routes.map(x=>x.route),["/","/about/","/how-it-works/"]);
  assert.deepEqual(config.scope.doesNotInclude,
    ["/viewer/","/config/","/admin.html","/access/","/access/manage.html"]);
  const fragment=await readFile(join(root,TEMPLATE),"utf8");
  const report={schema:"M2DARC03PrimaryHeaderProbe/0.1",authority:"ARC-03/04 NAV-004",
    runtimeModified:false,viewerNAV005Touched:false,publishBuildModified:false,pages:[]};
  for(const route of config.routes){
    const source=await readFile(join(root,route.source),"utf8");
    const header=renderHeader(fragment,route);
    const compared=compareSourceHTML(source,header);
    const name=route.route==="/"?"root":route.route.slice(1,-1);
    const dest=join(outDir,name+".html");
    if(write){
      await mkdir(outDir,{recursive:true});
      await writeFile(dest,compared.renderedPage,"utf8");
    }
    report.pages.push({route:route.route,source:route.source,
      sourceSha256:sha256(source),outputSha256:sha256(compared.renderedPage),
      originalHeaderSha256:compared.baselineDigest,
      generatedHeaderSha256:compared.generatedDigest,
      normalizedMarkupIdentical:true,bodyOutsideHeaderPreserved:true});
  }
  if(write)await writeFile(join(outDir,"report.json"),JSON.stringify(report,null,2)+"\n","utf8");
  return report;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  assert.ok(args.every(x=>x==="--check"||x==="--emit-scratch"),"Only --check or --emit-scratch allowed");
  const write=args.includes("--emit-scratch");
  validateAndCompile({write}).then(report=>{
    console.log("ARC03_PRIMARY_HEADER_"+(write?"SCRATCH":"CHECK")+"_PASS "+
      JSON.stringify({routes:report.pages.map(x=>x.route),exactSemanticHeader:true,
        noPublishChanges:true}));
  }).catch(error=>{console.error(error);process.exitCode=1;});
}
