// Verify the product-side copy of the VIS-002C v0.3 Design System artifact.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");
const gitBlob=text=>createHash("sha1").update("blob "+Buffer.byteLength(text,"utf8")+"\0").update(text,"utf8").digest("hex");
const pin=JSON.parse(await read("design-system/pins/vis-002/context-v0.3.0/PIN.json"));
const css=await read(pin.artifact.path);
const mapText=await read(pin.mapping.path);
const manifestText=await read(pin.manifest.path);
const mapping=JSON.parse(mapText),manifest=JSON.parse(manifestText);
assert.equal(pin.schema,"M2DProductContextualTextPin/0.3");
assert.equal(pin.status,"SCOPED_INTEGRATION_CANDIDATE_NOT_RELEASED");
assert.equal(pin.designSystem.repository,"EAKerber/MobiliPresenter2D_DesignSystem");
assert.equal(pin.designSystem.sourceCommit,"3144735173b2a4d3c978acc26b6daea6f21d2e27");
assert.equal(pin.designSystem.decisionGitBlob,"63b60f8d87327c6fd1e80c8cdf4ff832c4089bfa");
assert.equal(gitBlob(css),pin.artifact.gitBlob);
assert.equal(gitBlob(mapText),pin.mapping.gitBlob);
assert.equal(gitBlob(manifestText),pin.manifest.gitBlob);
assert.equal(pin.artifact.gitBlob,pin.designSystem.artifactGitBlob);
assert.equal(pin.mapping.gitBlob,pin.designSystem.mappingGitBlob);
assert.equal(pin.manifest.gitBlob,pin.designSystem.manifestGitBlob);
assert.equal(mapping.version,"0.3.0");
assert.equal(mapping.roleRef,"VIS-002.approvedPalette.colors.textPrimary.light");
assert.equal(mapping.value,"#292723");
assert.equal(mapping.contexts.length,7);
assert.equal(manifest.version,"0.3.0");
assert.equal(manifest.token,"--ds-vis002c-long-copy-light");
assert.equal(manifest.value,"#292723");
assert.deepEqual(manifest.contexts.map(({route,selector,background})=>({route,selector,background})),
 mapping.contexts.map(({route,selector,background})=>({route,selector,background})));
assert.equal(mapping.contexts.filter(c=>c.route==="/how-it-works/").length,3);
assert.ok(css.includes("--ds-vis002c-long-copy-light: #292723;"));
assert.equal((css.match(/--ds-vis002c-long-copy-light:/g)||[]).length,1);
assert.doesNotMatch(css,/\bcolor\s*:/i);
assert.doesNotMatch(css,/:root\s*\{/);
const importRule='@import url("/design-system/vis002c-long-copy-light-v0.3.0.css?v=vis002c-0.3.0");';
const landing=await read("app/landing/landing.css");
assert.ok(landing.startsWith(importRule),"Scoped artifact must be imported before page styles");
const pageCss={
 "app/landing/landing.css":[
  ".environment-feature .feature-copy > p:not(.eyebrow):not(.feature-availability)",
  ".story-section > p:not(.eyebrow)"
 ],
 "app/about/about.css":[
  ".about-closing > p:not(.eyebrow):not(.about-closing__signature)",
  ".about-scale__stat > span"
 ],
 "app/how-it-works/how-it-works.css":[
  ".finish-copy > p:not(.eyebrow):not(.finish-signature)",
  ".commercial-clarity > p:not(.eyebrow)",
  ".launch-card .launch-copy > p"
 ]
};
for(const [path,selectors] of Object.entries(pageCss)){
 const text=await read(path);
 assert.ok(text.includes("color: var(--ds-vis002c-long-copy-light);"),path+" does not consume the pinned role");
 for(const selector of selectors)assert.ok(text.includes('html[data-theme="light"] '+selector),path+" missing "+selector);
}
for(const path of ["app/index.html","app/about/index.html","app/how-it-works/index.html"]){
 const html=await read(path);
 assert.match(html,/landing\/landing\.css/,"Landing stylesheet must be present on "+path);
}
console.log("VIS002C_PRODUCT_PIN_V03_PASS seven-contexts dark-theme-preserved");
