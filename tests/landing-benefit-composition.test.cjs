"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../app/core/page-composition.js");
const feature = require("../app/landing/benefit-strip.js");

// The data is an intentionally frozen, public local fixture; no admin or API access.
const benefits = [
  { label:"Qualidade de móvel planejado",icon:"/landing/assets/icons/ui/white/qualidade.svg" },
  { label:"Praticidade de um sistema modular",icon:"/landing/assets/icons/ui/white/modularidade.svg" },
  { label:"Preço pensado para o seu projeto",icon:"/landing/assets/icons/ui/white/preco.svg" },
  { label:"Entrega e instalação especializada",icon:"/landing/assets/icons/ui/white/entrega.svg" }
];
function fakeDOM() {
  const create = (tag, nodeType) => ({
    tag, nodeType, children: [], className:"", src:undefined,alt:undefined,textContent:undefined,
    append(...nodes) { this.children.push(...nodes); }
  });
  const doc = {createElement(tag) { return create(tag,1); },createDocumentFragment(){ return create("#fragment",11); }};
  const host = {children:[],replaceChildren(fragment){this.children=fragment.children;}};
  return {doc,host};
}
function snapshotNodes(children) {
  return children.map(node => ({
    tag:node.tag,className:node.className,children:node.children.map(child=>child.tag==="img"?
      {tag:"img",src:child.src,alt:child.alt}:{tag:"span",text:child.textContent})
  }));
}
function baselineLegacyBenefits(items) {
  const {doc,host}=fakeDOM();
  items.forEach(item=>{
    const row=doc.createElement("div");row.className="benefit-item";
    const icon=doc.createElement("img");icon.src=item.icon;icon.alt="";
    const copy=doc.createElement("span");copy.textContent=item.label;
    row.append(icon,copy);host.children.push(row);
  });
  return snapshotNodes(host.children);
}
test("four published Landing benefit rows match the previous DOM contract",()=>{
  const {doc,host}=fakeDOM();
  feature.mount(host,{benefits},doc);
  assert.deepEqual(snapshotNodes(host.children),baselineLegacyBenefits(benefits));
  assert.equal(host.children.length,4);
});
test("snapshot does not reuse mutable authoring objects",()=>{
  const input=benefits.map(v=>({...v}));
  const model=core.compilePage(feature.manifest,{landing:{benefits:input}},core.createRegistry([feature.definition]));
  const expected=model.sections[0].data[0].label;
  input[0].label="changed";
  assert.equal(model.sections[0].data[0].label,expected);
  assert.equal(Object.isFrozen(model.sections[0].data[0]),true);
});
test("invalid component types and style fields are rejected",()=>{
  const registry=core.createRegistry([feature.definition]);
  const m=(s)=>({...feature.manifest,sections:[{...feature.manifest.sections[0],...s}]});
  assert.throws(()=>core.compilePage(m({type:"layout/unregistered@1"}),{landing:{benefits}},registry),{code:"unknown-component"});
  assert.throws(()=>core.compilePage(m({style:"display:none"}),{landing:{benefits}},registry),{code:"unsupported-field"});
  assert.throws(()=>core.compilePage(m({variant:"unsupported"}),{landing:{benefits}},registry),{code:"unsupported-variant"});
  assert.throws(()=>core.compilePage(m({dataRef:"landing.unavailable"}),{landing:{benefits}},registry),{code:"missing-reference"});
});
test("incompatible icons and empty data reject, leaving mounted DOM intact",()=>{
  const {doc,host}=fakeDOM();
  host.children.push({tag:"sentinel"});
  for(const source of [
    [], [{label:"unsafe",icon:"https://remote.example/injected.svg"}],
    [{label:"incomplete"}]
  ]){
    assert.throws(()=>feature.mount(host,{benefits:source},doc),{code:"invalid-data"});
    assert.deepEqual(host.children,[{tag:"sentinel"}]);
  }
});
test("data getters are not executed by manifest references",()=>{
  let calls=0;
  const source={landing:{}};
  Object.defineProperty(source.landing,"benefits",{enumerable:true,get(){calls++;return benefits;}});
  assert.throws(()=>core.compilePage(feature.manifest,source,core.createRegistry([feature.definition])),{code:"invalid-reference"});
  assert.equal(calls,0);
});
test("all section data validated before any DOM mount",()=>{
  const registry=core.createRegistry([feature.definition]);
  const m={...feature.manifest,sections:[feature.manifest.sections[0],{...feature.manifest.sections[0],id:"other",dataRef:"landing.absent"}]};
  assert.throws(()=>core.compilePage(m,{landing:{benefits}},registry),{code:"missing-reference"});
});
test("invalid component renderer cannot partially replace host",()=>{
  const registry=core.createRegistry([{...feature.definition,render(){throw new Error("injected error");}}]);
  const model=core.compilePage(feature.manifest,{landing:{benefits}},registry);
  const {doc,host}=fakeDOM();host.children.push({tag:"sentinel"});
  assert.throws(()=>core.mountSection(model,"benefits",host,doc),/injected error/);
  assert.deepEqual(host.children,[{tag:"sentinel"}]);
});
