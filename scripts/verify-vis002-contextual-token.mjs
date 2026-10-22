import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=resolve(fileURLToPath(new URL("..",import.meta.url)));
const read=p=>readFile(resolve(ROOT,p),"utf8");
const blob=text=>createHash("sha1").update("blob "+Buffer.byteLength(text,"utf8")+"\0").update(text,"utf8").digest("hex");
const mapping=[
  {route:"/",page:"app/index.html",css:"app/landing/landing.css",selector:".hero-description"},
  {route:"/how-it-works/",page:"app/how-it-works/index.html",css:"app/how-it-works/how-it-works.css",selector:".how-hero-note"},
  {route:"/about/",page:"app/about/index.html",css:"app/about/about.css",selector:".about-scale p:not(.eyebrow)"}
];
export async function verify(){
  const pin=JSON.parse(await read("design-system/pins/vis-002/context-v0.1.0/PIN.json"));
  const manifestText=await read(pin.manifest.path),css=await read(pin.artifact.path);
  assert.equal(blob(css),pin.artifact.gitBlob);
  assert.equal(blob(manifestText),pin.manifest.gitBlob);
  const manifest=JSON.parse(manifestText);
  assert.equal(manifest.source.gitBlobSha,pin.designSystem.decisionGitBlob);
  assert.equal(manifest.token,"--ds-vis002-approved-support-text-light");
  assert.equal(manifest.value,"#705C4B");
  assert.equal(manifest.constraints.allowsGlobalUsage,false);
  assert.deepEqual(manifest.contexts.map(x=>x.route),mapping.map(x=>x.route));
  assert.deepEqual(manifest.contexts.map(x=>x.selector),mapping.map(x=>x.selector));
  assert.equal((css.match(/html\[data-theme="light"\]/g)||[]).length,3);
  assert.doesNotMatch(css,/(^|[\s;])color\s*:/m,"Distribution only declares scoped custom properties");
  const token=manifest.token,stylesheet="/design-system/approved-contextual-support-text.css?v=vis002-ctx-0.1.0";
  for(const {page,css:cssPath,selector} of mapping){
    const html=await read(page),styles=await read(cssPath);
    assert.equal(html.split(stylesheet).length,2,"Exactly one imported generated CSS in "+page);
    const rule='html[data-theme="light"] '+selector+" { color: var("+token+"); }";
    assert.ok(styles.includes(rule),"Missing component-owned color mapping "+selector);
    assert.equal(styles.split("var("+token+")").length,2,"No double mappings");
  }
  for(const page of ["app/viewer/index.html","app/config/index.html","app/admin.html","app/access/index.html","app/access/manage.html"]) {
    assert.doesNotMatch(await read(page),/approved-contextual-support-text\.css/,
      "Unapproved distribution activation on "+page);
  }
  return {contexts:3,theme:"light",token,sourceDecisionBlob:pin.designSystem.decisionGitBlob,importedBy:3};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  verify().then(x=>console.log("P_TOKEN_02B_SOURCE_PASS "+JSON.stringify(x)))
    .catch(e=>{console.error(e);process.exitCode=1;});
}
