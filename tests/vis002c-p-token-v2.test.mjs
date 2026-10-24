import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {verify} from "../scripts/verify-vis002-contextual-token-v2.mjs";

const read=path=>readFile(path,"utf8");
test("P-TOKEN-02B v0.2 is pinned to immutable DS-approved role and exact eight contexts",async()=>{
 const result=await verify();
 assert.equal(result.oldPin,"INTACT");
 assert.equal(result.newPin,"VALID");
 assert.equal(result.contexts,8);
 assert.equal(result.approvedValue,"#705C4B");
});
test("VIS-002C has component-owned CSS, no extra colors, exclusions and no global promotion",async()=>{
 const perPage={
 "app/landing/landing.css":[
  ".story-section > p:not(.eyebrow)",
  ".feature-copy > p:not(.eyebrow):not(.feature-availability)"
 ],
 "app/about/about.css":[
  ".about-closing > p:not(.eyebrow):not(.about-closing__signature)",
  ".about-scale__stat > span"
 ],
 "app/how-it-works/how-it-works.css":[
  ".finish-copy > p:not(.eyebrow):not(.finish-signature)"
 ]
 };
 for(const [path,selectors] of Object.entries(perPage)){
  const css=await read(path);
  for(const selector of selectors)
   assert.ok(css.includes('html[data-theme="light"] '+selector),path+" missing "+selector);
  assert.ok(css.includes("color: var(--ds-vis002-approved-support-text-light);"));
  assert.doesNotMatch(css,/color:\s*#705C4B\s*;/);
 }
 const global=await read("app/public-theme.css");
 assert.match(global,/--public-muted:\s*#706c66\s*;/i);
 const theme=await read("app/ui-theme.css");
 assert.match(theme,/--public-muted:\s*#c4bcb2\s*;/i);
});
test("No token usage on private pages and original v0.1 distribution retained",async()=>{
 const v1=await read("app/design-system/approved-contextual-support-text.css");
 const v2=await read("app/design-system/approved-contextual-support-text-v2.css");
 assert.notEqual(v1,v2);
 assert.equal((v1.match(/html\[data-theme="light"\]/g)||[]).length,3);
 assert.equal((v2.match(/html\[data-theme="light"\]/g)||[]).length,8);
 for(const path of ["app/admin.html","app/config/index.html","app/viewer/index.html","app/access/index.html","app/access/manage.html"]){
  assert.doesNotMatch(await read(path),/approved-contextual-support-text(?:-v2)?\.css/);
 }
});
