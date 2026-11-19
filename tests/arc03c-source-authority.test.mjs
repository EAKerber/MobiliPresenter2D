import test from "node:test";
import assert from "node:assert/strict";
import {access,copyFile,mkdtemp,mkdir,readFile,rm,writeFile} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {projectPages} from "../scripts/compile-primary-pages.mjs";
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const ISOLATED_INPUTS=[
 "scripts/compile-primary-pages.mjs",
 "architecture/fragments/primary-header.fragment.html",
 "architecture/fragments/primary-header.routes.json",
 "architecture/pages/root.page.html",
 "architecture/pages/about.page.html",
 "architecture/pages/how-it-works.page.html",
 "architecture/generated/primary-pages.manifest.json",
 "app/index.html",
 "app/about/index.html",
 "app/how-it-works/index.html"
];
const gate=(mode="--check",root=ROOT)=>spawnSync(
 process.execPath,[join(root,"scripts/compile-primary-pages.mjs"),mode],
 {cwd:root,encoding:"utf8",timeout:20000}
);
async function runIsolatedDrift(path,mode,suffix) {
 const root=await mkdtemp(join(tmpdir(),"m2d-arc03-source-authority-"));
 try {
  for(const file of ISOLATED_INPUTS) {
   const destination=join(root,file);
   await mkdir(dirname(destination),{recursive:true});
   await copyFile(join(ROOT,file),destination);
  }
  const target=join(root,path),before=await readFile(target,"utf8"),mutation=before+suffix;
  await writeFile(target,mutation,"utf8");
  const result=gate(mode,root),after=await readFile(target,"utf8");
  return {root,before,mutation,after,...result};
 } finally {
  await rm(root,{recursive:true,force:true});
 }
}

test("three generated pages and provenance manifest match authoritative source",async()=>{
 const r=await projectPages();
 assert.equal(r.manifest.authority,"architecture/pages");
 assert.deepEqual(r.manifest.pages.map(x=>x.route),["/","/about/","/how-it-works/"]);
 assert.equal(await readFile("architecture/generated/primary-pages.manifest.json","utf8"),r.text);
 for(const p of r.pages) {
  assert.equal(await readFile(p.output,"utf8"),p.html);
  assert.match(p.html,/<header class="site-header site-header--public">/);
  assert.doesNotMatch(p.html,/<!-- ARC03_PRIMARY_HEADER -->/);
 }
 const x=gate();assert.equal(x.status,0,x.stderr);
});
test("modified generated HTML fails closed in an isolated fixture",async()=>{
 const path="app/about/index.html",liveBefore=await readFile(join(ROOT,path),"utf8");
 const r=await runIsolatedDrift(path,"--build","\n<!-- MANUAL_DRIFT -->\n");
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/Generated HTML drift/);
 assert.equal(r.after,r.mutation,"the compiler must not overwrite the negative fixture");
 assert.equal(await readFile(join(ROOT,path),"utf8"),liveBefore,"the active checkout must remain unchanged");
 await assert.rejects(access(r.root),{code:"ENOENT"},"the temporary fixture must be removed");
});
test("manifest modification fails closed in an isolated fixture",async()=>{
 const path="architecture/generated/primary-pages.manifest.json",liveBefore=await readFile(join(ROOT,path),"utf8");
 const r=await runIsolatedDrift(path,"--check"," \n");
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/Generated manifest drift/);
 assert.equal(r.after,r.mutation,"the check must leave the negative fixture unchanged");
 assert.equal(await readFile(join(ROOT,path),"utf8"),liveBefore,"the active checkout must remain unchanged");
 await assert.rejects(access(r.root),{code:"ENOENT"},"the temporary fixture must be removed");
});
test("Viewer NAV-005 stays independently authored",async()=>{
 const html=await readFile("app/viewer/index.html","utf8");
 assert.match(html,/<header class="viewer-header">/);
 assert.doesNotMatch(html,/<header class="site-header/);
});
