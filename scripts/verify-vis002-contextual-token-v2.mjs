// P-TOKEN-02B / VIS-002C reconciliation v0.2: one active generated
// value from VIS-002, exact route/component consumers from the DS map.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=resolve(fileURLToPath(new URL("..",import.meta.url)));
const read=path=>readFile(resolve(ROOT,path),"utf8");
const hash=text=>createHash("sha1").update("blob "+Buffer.byteLength(text,"utf8")+"\0").update(text,"utf8").digest("hex");
const token="--ds-vis002-approved-support-text-light";
const mapPages={
 "/":"app/index.html",
 "/about/":"app/about/index.html",
 "/how-it-works/":"app/how-it-works/index.html"
};
const pageCSS={
 "/":"app/landing/landing.css",
 "/about/":"app/about/about.css",
 "/how-it-works/":"app/how-it-works/how-it-works.css"
};
const newRules={
 "/":[
  ".story-section > p:not(.eyebrow)",
  ".feature-copy > p:not(.eyebrow):not(.feature-availability)"
 ],
 "/about/":[
  ".about-closing > p:not(.eyebrow):not(.about-closing__signature)",
  ".about-scale__stat > span"
 ],
 "/how-it-works/":[
  ".finish-copy > p:not(.eyebrow):not(.finish-signature)"
 ]
};
function luminance(hex){
 const rgb=hex.slice(1).match(/.{2}/g).map(x=>parseInt(x,16)/255);
 const f=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
 return .2126*f(rgb[0])+.7152*f(rgb[1])+.0722*f(rgb[2]);
}
function ratio(a,b){
 const x=luminance(a),y=luminance(b);
 return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
function expectedCSS(contexts,value,paletteSHA,mappingSHA){
 const pre=[
  "/* GENERATED — VIS-002C mapped contextual distribution v0.2.0.",
  " * Source decision Git blob: "+paletteSHA,
  " * Source mapping Git blob: "+mappingSHA,
  " * Light-theme exact consumers only; no global role assignment.",
  " * The historical v0.1 distribution stays pinned and must not be loaded.",
  " */"
 ].join("\n");
 return pre+"\n"+contexts.map((c,i)=>
  'html[data-theme="light"] '+c.selector+(i===contexts.length-1?" {":",")
 ).join("\n")+"\n  "+token+": "+value+";\n}\n";
}
export async function verify(){
 const old=JSON.parse(await read("design-system/pins/vis-002/context-v0.1.0/PIN.json"));
 const originalCSS=await read(old.artifact.path);
 const originalManifest=await read(old.manifest.path);
 assert.equal(hash(originalCSS),old.artifact.gitBlob,"v0.1 CSS archival pin invalid");
 assert.equal(hash(originalManifest),old.manifest.gitBlob,"v0.1 manifest archival pin invalid");
 assert.equal(originalCSS.includes("html[data-theme=\"light\"] .hero-description"),true);
 const pin=JSON.parse(await read("design-system/pins/vis-002/context-v0.2.0/PIN.json"));
 assert.equal(pin.schema,"M2DApprovedContextualTextPin/0.2");
 assert.equal(pin.status,"SCOPED_INTEGRATION_CANDIDATE_NOT_RELEASED");
 assert.equal(pin.previousVersion,"design-system/pins/vis-002/context-v0.1.0/PIN.json");
 const manifestText=await read(pin.manifest.path);
 const contextText=await read(pin.mapping.path);
 const cssText=await read(pin.artifact.path);
 assert.equal(hash(manifestText),pin.manifest.gitBlob,"v0.2 manifest tampered");
 assert.equal(hash(contextText),pin.mapping.gitBlob,"v0.2 source context map tampered");
 assert.equal(hash(cssText),pin.artifact.gitBlob,"v0.2 generated CSS tampered");
 assert.equal(pin.designSystem.mappingGitBlob,pin.mapping.gitBlob,"DS source map hash mismatch");
 const manifest=JSON.parse(manifestText),mapping=JSON.parse(contextText);
 assert.equal(manifest.schema,"M2DApprovedContextualTextToken/0.2");
 assert.equal(manifest.source.mappingGitBlobSha,pin.mapping.gitBlob);
 assert.equal(mapping.sourceDecisionGitBlob,pin.designSystem.decisionGitBlob);
 assert.equal(manifest.source.decisionGitBlobSha,pin.designSystem.decisionGitBlob);
 const palette=JSON.parse(await read("design-system/pins/vis-002/v0.1.0/approved-palette-reference.manifest.json"));
 assert.equal(palette.source.gitBlobSha,pin.designSystem.decisionGitBlob);
 const row=palette.entries.find(x=>x.sourcePath===mapping.roleRef);
 assert.ok(row,"Palette-approved source role absent");
 assert.equal(row.cssName,"--ds-reference-text-secondary-light");
 assert.equal(manifest.value,row.value);
 assert.equal(manifest.token,token);
 assert.equal(manifest.theme,"light");
 assert.equal(mapping.theme,"light");
 assert.equal(mapping.constraints.globalUsage,false);
 assert.equal(manifest.constraints.allowsGlobalUsage,false);
 assert.equal(manifest.contexts.length,8);
 assert.deepEqual(manifest.contexts,mapping.contexts);
 assert.equal(new Set(mapping.contexts.map(x=>x.route+"|"+x.selector)).size,8);
 const original=JSON.parse(originalManifest);
 assert.deepEqual(mapping.contexts.slice(0,3).map(x=>[x.route,x.selector]),
  original.contexts.map(x=>[x.route,x.selector]),"Original three approved consumers must remain unchanged");
 const revised=mapping.contexts.slice(3);
 assert.deepEqual(revised.flatMap(x=>[x.selector]).sort(),
   Object.values(newRules).flat().sort(),"VIS-002C five approved consumers drifted");
 for(const c of mapping.contexts){
  assert.ok(Object.hasOwn(mapPages,c.route),"Unauthorized route "+c.route);
  assert.match(c.selector,/^[a-zA-Z.# :>()_-]+$/,"Suspicious CSS selector");
  assert.ok(["VIS-002.approvedRuntimePairs[0]","VIS-002C"].includes(c.authorization));
  assert.ok(ratio(row.value,c.background)>=4.5,"Approved contextual contrast invalid "+c.selector);
 }
 assert.equal(cssText,expectedCSS(mapping.contexts,row.value,pin.designSystem.decisionGitBlob,pin.mapping.gitBlob),
   "Generated CSS must be exact deterministic data projection");
 assert.equal((cssText.match(/--ds-vis002-approved-support-text-light:/g)||[]).length,1);
 assert.doesNotMatch(cssText,/color\s*:/,"Generated mapping must not declare color itself");
 assert.ok(!cssText.includes(":root"),"No global token scope allowed");
 const href="/design-system/approved-contextual-support-text-v2.css?v=vis002-ctx-0.2.0";
 for(const [route,page] of Object.entries(mapPages)){
  const html=await read(page),styles=await read(pageCSS[route]);
  assert.equal(html.split(href).length,2,"Exactly one active v0.2 import "+route);
  assert.doesNotMatch(html,/approved-contextual-support-text\.css/,"Historical v0.1 must not be loaded "+route);
  for(const c of mapping.contexts.filter(x=>x.route===route))
   assert.ok(styles.includes('html[data-theme="light"] '+c.selector),
    "Missing component-owned CSS selector "+c.selector);
  assert.equal(styles.split("var("+token+")").length,3,
    "Exactly one original plus one new contextual color rule on "+route);
  const add=newRules[route];
  assert.ok(add.every(x=>styles.includes('html[data-theme="light"] '+x)),"Missing explicit light-only consumer "+route);
  assert.doesNotMatch(styles,/color:\s*#705C4B\s*;/,"No competing literal VIS-002C role "+route);
 }
 for(const file of ["app/viewer/index.html","app/config/index.html","app/admin.html",
  "app/access/index.html","app/access/manage.html"]){
  assert.doesNotMatch(await read(file),/approved-contextual-support-text(?:-v2)?\.css/,
    "Token activated outside approved public pages "+file);
 }
 return {oldPin:"INTACT",newPin:"VALID",contexts:8,approvedValue:row.value,
  role:mapping.roleRef,visualScope:"three existing unchanged; five approved new contexts",privatePagesUntouched:5};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 verify().then(x=>console.log("P_TOKEN_02B_V2_PIN_PASS "+JSON.stringify(x)))
  .catch(error=>{console.error(error);process.exitCode=1;});
}
