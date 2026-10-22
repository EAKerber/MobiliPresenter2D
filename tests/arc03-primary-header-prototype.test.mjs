import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderHeader,compareSourceHTML,validateAndCompile } from "../scripts/compile-primary-header-prototype.mjs";

const template=await readFile("architecture/fragments/primary-header.fragment.html","utf8");
const routes=JSON.parse(await readFile("architecture/fragments/primary-header.routes.json","utf8")).routes;

test("three approved primary public headers reconstruct identical normalized markup",async()=>{
  const report=await validateAndCompile();
  assert.equal(report.pages.length,3);
  assert.equal(report.runtimeModified,false);
  assert.equal(report.viewerNAV005Touched,false);
  assert.equal(report.publishBuildModified,false);
  for(const p of report.pages){
    assert.equal(p.originalHeaderSha256,p.generatedHeaderSha256);
    assert.equal(p.normalizedMarkupIdentical,true);
  }
});

test("no duplicate current nav, preserve intentional accessibility variants",()=>{
  for(const route of routes){
    const header=renderHeader(template,route);
    assert.equal((header.match(/aria-current="page"/g)||[]).length,1);
    assert.equal(header.includes('alt="" aria-hidden="true"'),route.whatsAppIconAriaHidden);
    assert.equal((header.match(/id="primaryNav"/g)||[]).length,1);
    assert.equal((header.match(/id="menuToggle"/g)||[]).length,1);
    assert.doesNotMatch(header,/viewer-header|private-header/);
  }
});

test("malformed source cannot be compiled or silently normalized away",async()=>{
  const sample=await readFile("app/index.html","utf8");
  const header=renderHeader(template,routes[0]);
  assert.throws(()=>compareSourceHTML(sample.replace('aria-current="page"','aria-current="false"'),header));
  assert.throws(()=>compareSourceHTML(sample.replace('<header class="site-header">','<header class="different">'),header));
  assert.throws(()=>compareSourceHTML(sample+'<header class="site-header"></header>',header));
  assert.throws(()=>renderHeader(template,{...routes[0],brandHref:'" onmouseover="bad'}));
});

test("Viewer NAV-005 stays distinct",async()=>{
  const viewer=await readFile("app/viewer/index.html","utf8");
  assert.match(viewer,/<header class="viewer-header">/);
  assert.doesNotMatch(viewer,/<header class="site-header">/);
  assert.match(viewer,/class="viewer-header__actions header-actions"/);
  assert.match(viewer,/class="back-link">← Ambientes<\/a>/);
  assert.match(viewer,/<nav id="primaryNav" class="viewer-header__nav"/);
});
