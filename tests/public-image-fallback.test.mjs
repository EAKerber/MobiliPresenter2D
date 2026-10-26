import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
class FakeElement {
 constructor(tagName,alt=""){this.tagName=tagName;this.alt=alt;this.hidden=false;this.complete=false;this.naturalWidth=0;this.dataset={};this.attributes=new Map();this.children=[];this.listeners=new Map();this.textContent=""}
 set className(v){this.attributes.set("class",v)} get className(){return this.attributes.get("class")||""}
 setAttribute(n,v){this.attributes.set(n,v)} getAttribute(n){return this.attributes.get(n)??null} removeAttribute(n){this.attributes.delete(n)}
 append(...children){this.children.push(...children)} addEventListener(t,h){const a=this.listeners.get(t)||[];a.push(h);this.listeners.set(t,a)} dispatch(t){for(const h of this.listeners.get(t)||[])h()}
 querySelector(s){if(s.startsWith("."))return this.children.find(x=>x.className.split(" ").includes(s.slice(1)))||null;return null}
 querySelectorAll(s){if(s==="img[alt]")return this.children.filter(x=>x.tagName==="IMG"&&x.alt!==null);return []}
}
const source=await readFile(new URL("../app/core/image-fallback.js",import.meta.url),"utf8");
function fixture({alt="Descrição da imagem",complete=false,naturalWidth=0}={}){const image=new FakeElement("IMG",alt);image.complete=complete;image.naturalWidth=naturalWidth;const frame=new FakeElement("DIV");frame.dataset.imageFallback="";frame.children.push(image);const document={querySelectorAll:()=>[frame],createElement:t=>new FakeElement(t.toUpperCase())};const ctx={document,globalThis:null};ctx.globalThis=ctx;vm.runInNewContext(source,ctx);return{frame,image,api:ctx.PublicImageFallback}}
{
 const {frame,image,api}=fixture();image.dispatch("error");const fb=frame.querySelector(".image-fallback");assert.equal(image.hidden,true);assert.equal(fb.hidden,false);assert.equal(fb.getAttribute("role"),"img");assert.equal(fb.getAttribute("aria-label"),"Imagem indisponível: Descrição da imagem");assert.equal(fb.querySelector(".image-fallback__description").textContent,"Descrição da imagem");image.dispatch("load");assert.equal(image.hidden,false);assert.equal(fb.hidden,true);api.scan();assert.equal(image.listeners.get("error").length,1,"scan is idempotent")
}
{const {frame}=fixture({complete:true,naturalWidth:0});assert.equal(frame.querySelector(".image-fallback").hidden,false,"cached failure is shown")}
{const {frame}=fixture({alt:""});assert.equal(frame.querySelector(".image-fallback"),null,"decorative images are ignored")}
console.log("PUBLIC_IMAGE_FALLBACK_PASS");
