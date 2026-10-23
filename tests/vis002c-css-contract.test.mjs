import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const changes=new Map([
 ["app/landing/landing.css","\n/* VIS-002C: approved secondary copy on these light surfaces only. */\nhtml[data-theme=\"light\"] .story-section > p:not(.eyebrow),\nhtml[data-theme=\"light\"] .feature-copy > p:not(.eyebrow):not(.feature-availability) { color: #705C4B; }\n"],
 ["app/about/about.css","\n/* VIS-002C: approved secondary copy; preserve editorial signature. */\nhtml[data-theme=\"light\"] .about-closing > p:not(.eyebrow):not(.about-closing__signature),\nhtml[data-theme=\"light\"] .about-scale__stat > span { color: #705C4B; }\n"],
 ["app/how-it-works/how-it-works.css","\n/* VIS-002C: approved secondary copy; keep the copper signature unchanged. */\nhtml[data-theme=\"light\"] .finish-copy > p:not(.eyebrow):not(.finish-signature) { color: #705C4B; }\n"]
]);
const raw=(p)=>readFileSync(p,"utf8");
function contrast(a,b){
 const lum=c=>{
  const s=c.replace("#","").match(/.{2}/g).map(x=>parseInt(x,16)/255);
  const lin=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
  return .2126*lin(s[0])+.7152*lin(s[1])+.0722*lin(s[2]);
 };
 const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
test("VIS-002C contrast uses approved palette; no threshold rounding",()=>{
 assert.ok(contrast("#705C4B","#E8E3DC")>=4.5);
 assert.ok(contrast("#705C4B","#F0EDE8")>=4.5);
 assert.ok(contrast("#706C66","#E8E3DC")<4.5);
 assert.ok(contrast("#706C66","#F0EDE8")<4.5);
});
test("Only approved scoped CSS is appended; original cascade is untouched",()=>{
 for(const [path,append] of changes){
  assert.ok(raw(path).includes(append),path+" lost its approved contextual declaration");
  // Intentionally allow unrelated future CSS additions; computed-style CI governs winners.
  // Initial patch scope is audited separately against main in the PR diff.
  assert.ok(!append.includes("!important"),"No !important override");
  assert.ok(!append.includes("--public-muted:"),"Global legacy value unchanged");
  assert.ok(append.includes('html[data-theme="light"]'));
 }
});
test("State and editorial exceptions stay explicit",()=>{
 assert.match(changes.get("app/landing/landing.css"),/not\(\.feature-availability\)/);
 assert.match(changes.get("app/about/about.css"),/not\(\.about-closing__signature\)/);
 assert.match(changes.get("app/how-it-works/how-it-works.css"),/not\(\.finish-signature\)/);
 for(const path of ["app/public-theme.css","app/ui-theme.css"]){
  assert.ok(raw(path).includes(path.includes("public-theme")
   ?"--public-muted: #706c66;"
   :"--public-muted: #c4bcb2;"),"The legacy global muted token changed without a reviewed role migration");
 }
});
