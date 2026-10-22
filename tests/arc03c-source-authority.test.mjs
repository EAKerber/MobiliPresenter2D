import test from "node:test";
import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {projectPages} from "../scripts/compile-primary-pages.mjs";
const gate=(mode="--check")=>spawnSync(process.execPath,["scripts/compile-primary-pages.mjs",mode],{encoding:"utf8"});

test("three generated pages and provenance manifest match authoritative source",async()=>{
 const r=await projectPages();
 assert.equal(r.manifest.authority,"architecture/pages");
 assert.deepEqual(r.manifest.pages.map(x=>x.route),["/","/about/","/how-it-works/"]);
 assert.equal(await readFile("architecture/generated/primary-pages.manifest.json","utf8"),r.text);
 for(const p of r.pages) {
  assert.equal(await readFile(p.output,"utf8"),p.html);
  assert.match(p.html,/<header class="site-header">/);
  assert.doesNotMatch(p.html,/<!-- ARC03_PRIMARY_HEADER -->/);
 }
 const x=gate();assert.equal(x.status,0,x.stderr);
});
test("modified generated HTML aborts without silent overwrite",async()=>{
 const path="app/about/index.html",old=await readFile(path,"utf8");
 try {
  await writeFile(path,old+"\n<!-- MANUAL_DRIFT -->\n");
  const x=gate("--build");
  assert.notEqual(x.status,0);
  assert.match(x.stderr,/Generated HTML drift/);
  assert.equal(await readFile(path,"utf8"),old+"\n<!-- MANUAL_DRIFT -->\n");
 }finally{await writeFile(path,old)}
 assert.equal(gate().status,0);
});
test("manifest modification fails closed",async()=>{
 const path="architecture/generated/primary-pages.manifest.json",old=await readFile(path,"utf8");
 try{
  await writeFile(path,old+" \n");
  const x=gate();assert.notEqual(x.status,0);
  assert.match(x.stderr,/Generated manifest drift/);
 }finally{await writeFile(path,old)}
 assert.equal(gate().status,0);
});
test("Viewer NAV-005 stays independently authored",async()=>{
 const html=await readFile("app/viewer/index.html","utf8");
 assert.match(html,/<header class="viewer-header">/);
 assert.doesNotMatch(html,/<header class="site-header">/);
});
