import test from "node:test";
import assert from "node:assert/strict";
import {access,copyFile,mkdtemp,mkdir,readFile,rm,writeFile} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {projectPages} from "../scripts/compile-primary-pages.mjs";
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const SLOT="<!-- ARC03_PRIMARY_HEADER -->";
const SOURCE_INPUTS=[
 "scripts/compile-primary-pages.mjs",
 "app/core/ui-copy.js",
 "architecture/fragments/primary-header.fragment.html",
 "architecture/fragments/primary-header.routes.json",
 "architecture/pages/root.page.html",
 "architecture/pages/about.page.html",
 "architecture/pages/how-it-works.page.html",
 "architecture/pages/viewer.page.html"
];
const ISOLATED_INPUTS=[
 ...SOURCE_INPUTS,
 "architecture/generated/primary-pages.manifest.json",
 "app/index.html",
 "app/about/index.html",
 "app/how-it-works/index.html",
 "app/viewer/index.html"
];
const gate=(mode="--check",root=ROOT)=>spawnSync(
 process.execPath,[join(root,"scripts/compile-primary-pages.mjs"),mode],
 {cwd:root,encoding:"utf8",timeout:20000}
);
async function runIsolatedMutation(path,mutate,mode="--check",inputs=ISOLATED_INPUTS) {
 const root=await mkdtemp(join(tmpdir(),"m2d-arc03-source-authority-"));
 try {
  const liveBefore=await readFile(join(ROOT,path),"utf8");
  for(const file of inputs) {
   const destination=join(root,file);
   await mkdir(dirname(destination),{recursive:true});
   await copyFile(join(ROOT,file),destination);
  }
  const target=join(root,path),before=await readFile(target,"utf8");
  await mutate(target,before);
  const mutation=await readFile(target,"utf8");
  const result=gate(mode,root),after=await readFile(target,"utf8");
  const liveAfter=await readFile(join(ROOT,path),"utf8");
  return {root,mutation,after,liveBefore,liveAfter,...result};
 } finally {
  await rm(root,{recursive:true,force:true});
 }
}
async function assertRejectedMutation(path,mutate,expected) {
 const r=await runIsolatedMutation(path,mutate,"--check",SOURCE_INPUTS);
 assert.notEqual(r.status,0,"the isolated invalid source must fail");
 assert.match(r.stderr,expected);
 assert.equal(r.after,r.mutation,"the check must leave the negative fixture unchanged");
 assert.equal(r.liveAfter,r.liveBefore,"the active checkout must remain unchanged");
 await assert.rejects(access(r.root),{code:"ENOENT"},"the temporary fixture must be removed");
}

test("generated pages and provenance manifest match authoritative source",async()=>{
 const r=await projectPages();
 assert.equal(r.manifest.authority,"architecture/pages");
 assert.deepEqual(r.manifest.pages.map(x=>x.route),["/","/about/","/how-it-works/","/viewer/"]);
 assert.equal(await readFile("architecture/generated/primary-pages.manifest.json","utf8"),r.text);
 for(const p of r.pages) {
  assert.equal(await readFile(p.output,"utf8"),p.html);
  assert.match(p.html,p.output==="app/viewer/index.html"?/<header class="viewer-header">/:/<header class="site-header site-header--public">/);
  assert.doesNotMatch(p.html,/<!-- ARC03_PRIMARY_HEADER -->/);
 }
 const x=gate();assert.equal(x.status,0,x.stderr);
});
test("generated-page drift fails closed in isolated fixtures",async()=>{
 const htmlPath="app/about/index.html",htmlBefore=await readFile(join(ROOT,htmlPath),"utf8");
 const html=await runIsolatedMutation(htmlPath,
  (target,before)=>writeFile(target,before+"\n<!-- MANUAL_DRIFT -->\n"),"--build");
 assert.notEqual(html.status,0);
 assert.match(html.stderr,/Generated HTML drift/);
 assert.equal(html.after,html.mutation,"the compiler must not overwrite the negative fixture");
 assert.equal(html.liveAfter,htmlBefore,"the active checkout must remain unchanged");
 await assert.rejects(access(html.root),{code:"ENOENT"},"the temporary fixture must be removed");

 const manifestPath="architecture/generated/primary-pages.manifest.json";
 const manifestBefore=await readFile(join(ROOT,manifestPath),"utf8");
 const manifest=await runIsolatedMutation(manifestPath,
  (target,before)=>writeFile(target,before+" \n"));
 assert.notEqual(manifest.status,0);
 assert.match(manifest.stderr,/Generated manifest drift/);
 assert.equal(manifest.after,manifest.mutation,"the check must leave the negative fixture unchanged");
 assert.equal(manifest.liveAfter,manifestBefore,"the active checkout must remain unchanged");
 await assert.rejects(access(manifest.root),{code:"ENOENT"},"the temporary fixture must be removed");
});
test("compiler rejects unsafe and out-of-scope sources in isolated fixtures",async()=>{
 await assertRejectedMutation("architecture/fragments/primary-header.routes.json",
  async(target)=> {
   const config=JSON.parse(await readFile(target,"utf8"));
   config.routes[0].brandHref="javascript:alert(1)";
   await writeFile(target,JSON.stringify(config,null,2)+"\n");
  },/Unsafe static link: brandHref/);
 await assertRejectedMutation("architecture/pages/root.page.html",
  (target,before)=>writeFile(target,before+"\n"+SLOT+"\n"),
  /Exactly one header slot required/);
 await assertRejectedMutation("architecture/pages/root.page.html",
  (target,before)=>writeFile(target,before+'\n<header class="site-header site-header--public"></header>\n'),
  /Duplicate authorial header/);
 await assertRejectedMutation("architecture/pages/root.page.html",
  (target,before)=>writeFile(target,before+'\n<header class="viewer-header"></header>\n'),
  /NAV-005 excluded/);
 await assertRejectedMutation("architecture/pages/viewer.page.html",
  (target,before)=>writeFile(target,before.replace('class="viewer-header"','class="site-header"')),
  /Viewer must retain its independent header/);
 await assertRejectedMutation("architecture/pages/viewer.page.html",
  (target,before)=>writeFile(target,before+'\n<header class="viewer-header"></header>\n'),
  /Viewer must have exactly one header/);
 await assertRejectedMutation("architecture/pages/viewer.page.html",
  (target,before)=>writeFile(target,before.replace("{{copy.viewer.shell.heading}}","{{copy.viewer.shell.unapproved}}")),
  /Page copy placeholder is not approved/);
 await assertRejectedMutation("architecture/fragments/primary-header.routes.json",
  async(target)=> {
   const config=JSON.parse(await readFile(target,"utf8"));
   config.status="EXPERIMENTAL_BUILD_TIME_ONLY_NOT_PUBLISHED";
   await writeFile(target,JSON.stringify(config,null,2)+"\n");
  },/BUILD_AUTHORITATIVE_ARC03C/);
});
test("Viewer NAV-005 stays independently authored",async()=>{
 const html=await readFile("app/viewer/index.html","utf8");
 assert.match(html,/<header class="viewer-header">/);
 assert.doesNotMatch(html,/<header class="site-header/);
 assert.match(html,/aria-label="Casa em Módulos — início"/);
 assert.match(html,/<nav id="primaryNav" class="viewer-header__nav" aria-label="Navegação pública">/);
 assert.match(html,/<h1>Cozinha Casa em Módulos<\/h1>/);
 assert.match(html,/<a href="\/">Voltar aos ambientes ↑<\/a>/);
 const viewer=(await projectPages()).pages.find(page=>page.output==="app/viewer/index.html");
 assert.ok(viewer.sourceMap.some(segment=>segment.origin.pointer==="/viewer/shell/heading"));
 assert.doesNotMatch(viewer.html,/\{\{copy\./);
});
