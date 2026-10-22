// ARC-03B: Stage an authored HTML -> deterministic static HTML pipeline.
// NO mutations inside Netlify publish=app; output exists only in ignored CI artifacts.
// A product cutover needs an explicit integration PR after browser parity gates.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderHeader, compareSourceHTML } from "./compile-primary-header-prototype.mjs";

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
export const OUT=join(ROOT,"artifacts/arc03b/pages");
const SLOT="<!-- ARC03_PRIMARY_HEADER -->";
const sha=text=>createHash("sha256").update(text).digest("hex");
const MAP=[
  {route:"/",authored:"architecture/pages/root.page.html",target:"index.html",live:"app/index.html"},
  {route:"/about/",authored:"architecture/pages/about.page.html",target:"about/index.html",live:"app/about/index.html"},
  {route:"/how-it-works/",authored:"architecture/pages/how-it-works.page.html",target:"how-it-works/index.html",live:"app/how-it-works/index.html"}
];

export async function compile({write=false}={}){
  const config=JSON.parse(await readFile(join(ROOT,"architecture/fragments/primary-header.routes.json"),"utf8"));
  const fragment=await readFile(join(ROOT,"architecture/fragments/primary-header.fragment.html"),"utf8");
  assert.equal(config.schema,"M2DPrimaryHeaderRoutes/0.1");
  assert.equal(config.status,"EXPERIMENTAL_BUILD_TIME_ONLY_NOT_PUBLISHED");
  assert.deepEqual(config.routes.map(r=>r.route),MAP.map(x=>x.route));
  const report={schema:"M2DARC03BStaticPageCompiler/0.1",
    buildPipeline:"STAGING_ONLY",authoritativeOutputDirectory:"artifacts/arc03b/pages",
    netlifyPublishUntouched:true,existingAppHtmlUntouched:true,
    viewerSecondaryHeaderExcluded:true,generatedPages:[]};
  for(let i=0;i<MAP.length;i++){
    const entry=MAP[i],route=config.routes[i];
    const [source,current]=await Promise.all([
      readFile(join(ROOT,entry.authored),"utf8"),
      readFile(join(ROOT,entry.live),"utf8")
    ]);
    assert.equal(source.split(SLOT).length,2,"Expected exactly one primary header slot in "+entry.authored);
    assert.equal(/<header class="site-header">/.test(source),false,"Authored page contains duplicative header markup");
    assert.equal(source.includes("<header class=\"viewer-header\">"),false,"Viewer variant cannot use public header fragment");
    const found=[...current.matchAll(/<header class="site-header">[\s\S]*?<\/header>/g)];
    assert.equal(found.length,1,"Runtime baseline header changed");
    const nativeHeader=found[0][0];
    assert.equal(source,current.replace(nativeHeader,SLOT),
      "Authored page drifted outside shared header from the published reference "+entry.route);
    const generated=renderHeader(fragment,route);
    const checked=compareSourceHTML(current,generated);
    const output=source.replace(SLOT,generated);
    assert.equal(output,checked.renderedPage,"Generated page did not reproduce original body and header");
    assert.equal(checked.baselineDigest,checked.generatedDigest,
      "Header normal form changed unexpectedly");
    assert.equal(output.includes(SLOT),false);
    const data={route:entry.route,input:entry.authored,liveReference:entry.live,
      generatedRelativePath:entry.target,sourceSha256:sha(source),
      liveSha256:sha(current),outputSha256:sha(output),
      normalizedHeaderSha256:checked.generatedDigest,
      bodyOutsideHeaderExact:true,visualEquivalenceNotYetProven:true};
    report.generatedPages.push(data);
    if(write){
      const path=join(OUT,entry.target);
      await mkdir(dirname(path),{recursive:true});
      await writeFile(path,output,"utf8");
    }
  }
  if(write){
    await mkdir(OUT,{recursive:true});
    await writeFile(join(OUT,"arc03b-manifest.json"),JSON.stringify(report,null,2)+"\n","utf8");
  }
  return report;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const opts=process.argv.slice(2);
  assert.ok(opts.every(x=>["--check","--emit-scratch"].includes(x)),"Invalid ARC03B arguments");
  compile({write:opts.includes("--emit-scratch")}).then(r=>{
    console.log("ARC03B_STAGED_COMPILE_PASS "+JSON.stringify({
      pages:r.generatedPages.length,routes:r.generatedPages.map(x=>x.route),
      publishedRuntimeUntouched:r.netlifyPublishUntouched}));
  }).catch(e=>{console.error(e);process.exitCode=1;});
}
