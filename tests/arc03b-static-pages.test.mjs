import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compile, OUT } from "../scripts/compile-primary-pages.mjs";
import { join } from "node:path";

test("three authored sources rebuild deterministically without changing app/",async()=>{
 const a=await compile({write:true});
 const b=await compile({write:true});
 assert.deepEqual(a,b);
 assert.equal(a.generatedPages.length,3);
 for(const item of a.generatedPages){
   const text=await readFile(join(OUT,item.generatedRelativePath),"utf8");
   assert.doesNotMatch(text,/<!-- ARC03_PRIMARY_HEADER -->/);
   assert.match(text,/<header class="site-header">/);
   assert.equal(item.bodyOutsideHeaderExact,true);
   assert.equal(item.normalizedHeaderSha256.length,64);
 }
});
test("authored sources have one slot, no copied primary header",async()=>{
 const config=JSON.parse(await readFile("architecture/fragments/primary-header.routes.json","utf8"));
 const sources=["architecture/pages/root.page.html","architecture/pages/about.page.html",
   "architecture/pages/how-it-works.page.html"];
 assert.deepEqual(config.routes.map(x=>x.route),["/","/about/","/how-it-works/"]);
 for(const path of sources){
  const content=await readFile(path,"utf8");
  assert.equal(content.split("<!-- ARC03_PRIMARY_HEADER -->").length,2);
  assert.doesNotMatch(content,/<header class="site-header">/);
 }
});
test("Viewer remains a separate secondary header; no published content modified",async()=>{
 const viewer=await readFile("app/viewer/index.html","utf8");
 assert.match(viewer,/<header class="viewer-header">/);
 assert.doesNotMatch(viewer,/<header class="site-header">/);
 assert.match(viewer,/class="back-link">← Ambientes<\/a>/);
 assert.equal(JSON.parse(await readFile(join(OUT,"arc03b-manifest.json"),"utf8")).netlifyPublishUntouched,true);
});
