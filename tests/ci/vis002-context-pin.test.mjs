import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve} from "node:path";

const root="design-system/pins/vis-002/context-v0.3.0/";
const json=async file=>JSON.parse(await readFile(resolve(file),"utf8"));
const blobSha=async path=>{
  const data=await readFile(resolve(path));
  return createHash("sha1").update(Buffer.from("blob "+data.length+"\0")).update(data).digest("hex");
};
function luminance(hex){
  const s=hex.slice(1);const v=[0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255)
    .map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
  return .2126*v[0]+.7152*v[1]+.0722*v[2];
}
function contrast(a,b){
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
test("VIS-002 pin matches content-addressed decision, mapping, CSS, and manifest",async()=>{
  const [pin,mapping,manifest]=await Promise.all([
    json(root+"PIN.json"),json(root+"contextual-mapping.json"),json(root+"manifest.json")]);
  const source="63b60f8d87327c6fd1e80c8cdf4ff832c4089bfa";
  assert.equal(pin.designSystem.repository,"EAKerber/MobiliPresenter2D_DesignSystem");
  assert.equal(pin.designSystem.decisionGitBlob,source);
  assert.equal(mapping.sourceDecisionGitBlob,source);
  assert.equal(manifest.source.gitBlobSha,source);
  assert.equal(pin.designSystem.sourceCommit,"2f11ecf8948c779706a0ce0795e088d29633fb7e");
  for(const entry of [pin.artifact,pin.mapping,pin.manifest]){
    assert.equal(await blobSha(entry.path),entry.gitBlob,
      "non-silent blob mismatch: "+entry.path);
  }
  assert.equal(pin.status,"SCOPED_INTEGRATION_CANDIDATE_NOT_RELEASED");
  assert.equal(pin.changesCanonicalDecision,false);
  assert.equal(pin.darkThemeUnchanged,true);
  assert.equal(mapping.constraints.globalUsage,false);
  assert.equal(manifest.constraints.allowsGlobalUsage,false);
  assert.equal(mapping.constraints.onlyMeasuredContexts,true);
  assert.equal(mapping.status,"scoped-candidate-user-authorized-2026-10-24; canonical-decision-file-unchanged");
});
test("ten exact routes and selectors remain the only authorized light consumers",async()=>{
  const map=await json(root+"contextual-mapping.json");
  const css=await readFile("app/design-system/vis002c-long-copy-light-v0.3.0.css","utf8");
  const routes=["/","/about/","/how-it-works/"];
  assert.equal(map.version,"0.3.0");
  assert.equal(map.roleRef,"VIS-002.approvedPalette.colors.textPrimary.light");
  assert.equal(map.value,"#292723");
  assert.equal(map.contexts.length,10);
  assert.deepEqual(routes.map(route=>map.contexts.filter(x=>x.route===route).length),[3,3,4]);
  assert.equal(new Set(map.contexts.map(x=>x.route+"|"+x.selector)).size,10);
  const prefix='html[data-theme="light"] ';
  const rules=css.replace(/\/\*[\s\S]*?\*\//g,"").trim();
  const m=rules.match(/^([\s\S]*?)\{\s*(--ds-vis002c-long-copy-light:\s*#292723;)\s*\}$/);
  assert.ok(m,"single authorized CSS block only; no global dark/semantic state injection");
  const actual=m[1].split(",").map(x=>x.trim());
  assert.deepEqual(actual.map(x=>x.slice(prefix.length)).sort(),
    map.contexts.map(x=>x.selector).sort());
  assert.ok(actual.every(x=>x.startsWith(prefix)),"each selector explicitly light-only");
  assert.ok(!css.includes("!important"),"new mapping must not bypass cascade");
  const consumers=[
    "app/landing/landing.css","app/about/about.css","app/how-it-works/how-it-works.css"];
  const files=await Promise.all(consumers.map(p=>readFile(p,"utf8")));
  assert.ok(files[0].includes('vis002c-long-copy-light-v0.3.0.css'));
  assert.ok(files.every(x=>x.includes("color: var(--ds-vis002c-long-copy-light);")));
  assert.ok(!files.some(x=>/--public-muted:\s*#292723/i.test(x)),"avoid silent global tokens");
});
test("contrast is independently recomputed, without rounding threshold",async()=>{
  const m=await json(root+"contextual-mapping.json");
  for(const x of m.contexts){
    const ratio=contrast(x.foreground,x.background);
    assert.ok(ratio>=7,"approved context below AAA normal text: "+x.selector);
    assert.ok(Math.abs(ratio-Number.parseFloat(x.contrast))<=0.04,
      "approved ratio drift: "+x.selector+" computed="+ratio+" documented="+x.contrast);
  }
  const statusPairs=[
    ["#245D87","#F0EDE8",6.01],["#A7D1F0","#211F1C",10.19],
    ["#8E382F","#F0E5E1",6.17],["#E7AAA2","#352522",7.41],
    ["#35634A","#E5ECE6",5.76],["#A8CAB1","#223129",7.63],
    ["#70531E","#EEE7D8",5.79],["#E4C989","#332C1E",8.56]
  ];
  for(const [fg,bg,approved] of statusPairs){
    const value=contrast(fg,bg);
    assert.ok(value>=4.5,"approved contextual pair no longer meets AA");
    assert.ok(Math.abs(value-approved)<0.06,
      "decision-recorded contrast and recomputation disagree "+fg+"/"+bg);
  }
  // These approvals do NOT authorize a global token or a component mapping.
});
